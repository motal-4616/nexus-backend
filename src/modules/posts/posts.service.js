const Post = require("../../models/Post.model");
const Comment = require("../../models/Comment.model");
const User = require("../../models/User.model");
const Report = require("../../models/Report.model");
const { createAndPushNotification } = require("../../utils/notification.util");
const { getEmbedding, moderateContent, cosineSimilarity } = require("../../utils/ai.util");

/**
 * Parse @username mentions from content and resolve to user IDs
 */
const resolveTaggedUsers = async (content) => {
    if (!content) return [];
    const mentions = content.match(/@(\w+)/g);
    if (!mentions || mentions.length === 0) return [];
    const usernames = [...new Set(mentions.map((m) => m.slice(1)))];
    const users = await User.find(
        { username: { $in: usernames } },
        "_id",
    ).lean();
    return users.map((u) => u._id);
};

const createPost = async (authorId, content, files, audience = "public") => {
    const media = (files || []).map((f) => ({
        url: f.path,
        publicId: f.filename,
        type: f.mimetype?.startsWith("video") ? "video" : "image",
    }));

    if (!content && media.length === 0) {
        throw Object.assign(new Error("Post must have content or media"), {
            status: 400,
        });
    }

    const validAudience = ["public", "friends", "private"].includes(audience)
        ? audience
        : "public";

    const taggedUsers = await resolveTaggedUsers(content);

    const post = await Post.create({
        author: authorId,
        content,
        media,
        audience: validAudience,
        taggedUsers,
    });

    // AI: moderation + embedding (non-blocking)
    if (content) {
        (async () => {
            try {
                const [modResult, embedding] = await Promise.all([
                    moderateContent(content),
                    getEmbedding(content),
                ]);
                if (modResult.flagged) {
                    await Report.create({
                        reporter: authorId,
                        targetType: "post",
                        targetPost: post._id,
                        reason: "AI detected: " + Object.keys(modResult.categories).filter((k) => modResult.categories[k]).join(", "),
                        autoFlagged: true,
                    });
                }
                if (embedding) {
                    await Post.updateOne({ _id: post._id }, { embedding });
                    // Update user embedding (average of all their post embeddings)
                    const userPosts = await Post.find(
                        { author: authorId, embedding: { $exists: true, $ne: [] } },
                        "embedding",
                    ).lean();
                    if (userPosts.length > 0) {
                        const dim = userPosts[0].embedding.length;
                        const avg = new Array(dim).fill(0);
                        for (const p of userPosts) {
                            for (let i = 0; i < dim; i++) avg[i] += p.embedding[i];
                        }
                        for (let i = 0; i < dim; i++) avg[i] /= userPosts.length;
                        await User.updateOne({ _id: authorId }, { embedding: avg });
                    }
                }
            } catch (err) {
                console.error("AI post processing error:", err.message);
            }
        })();
    }

    // Notify tagged users
    for (const taggedId of taggedUsers) {
        createAndPushNotification({
            recipientId: taggedId,
            actorId: authorId,
            type: "tag",
            targetRef: post._id,
            targetModel: "Post",
            message: "tagged you in a post",
        }).catch(() => {});
    }

    return Post.findById(post._id).populate("author", "name username avatar");
};

const getFeed = async (userId, cursor, limit = 10) => {
    // Get friend IDs for audience filtering
    const Friendship = require("../../models/Friendship.model");
    const friendships = await Friendship.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: "accepted",
    }).lean();
    const friendIds = friendships.map((f) =>
        f.requester.toString() === userId.toString()
            ? f.recipient
            : f.requester,
    );

    const query = {
        $or: [
            { audience: "public" },
            { audience: { $exists: false } },
            { audience: null },
            { audience: "friends", author: { $in: [...friendIds, userId] } },
            { audience: "private", author: userId },
        ],
    };
    if (cursor) {
        query._id = { $lt: cursor };
    }

    const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate("author", "name username avatar")
        .lean();

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;

    // Add isLiked flag for current user, strip likes array
    const enriched = posts.map((p) => {
        const { likes, ...rest } = p;
        return {
            ...rest,
            isLiked: likes?.some((id) => id.toString() === userId.toString()),
        };
    });

    return { posts: enriched, hasMore, nextCursor };
};

const getPostById = async (postId, userId) => {
    const post = await Post.findById(postId)
        .populate("author", "name username avatar")
        .lean();
    if (!post) return null;

    const { likes, ...rest } = post;
    return {
        ...rest,
        isLiked: likes?.some((id) => id.toString() === userId.toString()),
    };
};

const deletePost = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) return null;
    if (post.author.toString() !== userId.toString()) {
        throw Object.assign(new Error("Not authorized"), { status: 403 });
    }

    // Delete all comments for this post
    await Comment.deleteMany({ post: postId });
    await post.deleteOne();
    return true;
};

const updatePost = async (postId, userId, updates) => {
    const post = await Post.findById(postId);
    if (!post) return null;
    if (post.author.toString() !== userId.toString()) {
        throw Object.assign(new Error("Not authorized"), { status: 403 });
    }

    if (updates.content !== undefined) {
        post.content = updates.content;
        post.taggedUsers = await resolveTaggedUsers(updates.content);
    }
    if (
        updates.audience &&
        ["public", "friends", "private"].includes(updates.audience)
    ) {
        post.audience = updates.audience;
    }

    await post.save();
    return Post.findById(post._id)
        .populate("author", "name username avatar")
        .lean();
};

const toggleLike = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) return null;

    const idx = post.likes.indexOf(userId);
    if (idx === -1) {
        post.likes.push(userId);
        post.likesCount = post.likes.length;
        await post.save();

        // Notify post author about the like
        createAndPushNotification({
            recipientId: post.author,
            actorId: userId,
            type: "like",
            targetRef: post._id,
            targetModel: "Post",
            message: "liked your post",
        }).catch(() => {});

        return { liked: true, likesCount: post.likesCount };
    } else {
        post.likes.splice(idx, 1);
        post.likesCount = post.likes.length;
        await post.save();
        return { liked: false, likesCount: post.likesCount };
    }
};

const addComment = async (postId, authorId, content) => {
    const post = await Post.findById(postId);
    if (!post) return null;

    const comment = await Comment.create({
        post: postId,
        author: authorId,
        content,
    });

    post.commentsCount += 1;
    await post.save();

    // AI: moderate comment (non-blocking)
    moderateContent(content)
        .then(async (modResult) => {
            if (modResult.flagged) {
                await Report.create({
                    reporter: authorId,
                    targetType: "post",
                    targetPost: postId,
                    reason: "AI detected comment: " + Object.keys(modResult.categories).filter((k) => modResult.categories[k]).join(", "),
                    autoFlagged: true,
                });
            }
        })
        .catch(() => {});

    // Notify post author about the comment
    createAndPushNotification({
        recipientId: post.author,
        actorId: authorId,
        type: "comment",
        targetRef: post._id,
        targetModel: "Post",
        message: "commented on your post",
    }).catch(() => {});

    return Comment.findById(comment._id).populate(
        "author",
        "name username avatar",
    );
};

const getComments = async (postId, cursor, limit = 20) => {
    const query = { post: postId };
    if (cursor) {
        query._id = { $lt: cursor };
    }

    const comments = await Comment.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate("author", "name username avatar")
        .lean();

    const hasMore = comments.length > limit;
    if (hasMore) comments.pop();

    const nextCursor =
        comments.length > 0 ? comments[comments.length - 1]._id : null;

    return { comments, hasMore, nextCursor };
};

const getUserPosts = async (userId, cursor, limit = 10) => {
    const query = { author: userId };
    if (cursor) {
        query._id = { $lt: cursor };
    }

    const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate("author", "name username avatar")
        .lean();

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;
    const cleaned = posts.map(({ likes, ...rest }) => rest);
    return { posts: cleaned, hasMore, nextCursor };
};

const searchPosts = async (query, userId, cursor, limit = 10) => {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const filter = { content: regex };
    if (cursor) {
        filter._id = { $lt: cursor };
    }

    const textPosts = await Post.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate("author", "name username avatar")
        .lean();

    const textHasMore = textPosts.length > limit;
    if (textHasMore) textPosts.pop();

    // Semantic search (non-blocking fallback — merge with text results)
    let semanticPosts = [];
    try {
        const queryEmbedding = await getEmbedding(query);
        if (queryEmbedding) {
            const candidates = await Post.find({
                embedding: { $exists: true, $ne: [] },
            })
                .populate("author", "name username avatar")
                .lean();

            const scored = candidates
                .map((p) => ({
                    ...p,
                    _similarity: cosineSimilarity(queryEmbedding, p.embedding),
                }))
                .filter((p) => p._similarity > 0.3)
                .sort((a, b) => b._similarity - a._similarity)
                .slice(0, limit);

            semanticPosts = scored;
        }
    } catch (_) {}

    // Merge: text results first, then semantic results not already included
    const seenIds = new Set(textPosts.map((p) => p._id.toString()));
    const merged = [...textPosts];
    for (const sp of semanticPosts) {
        if (!seenIds.has(sp._id.toString())) {
            merged.push(sp);
            seenIds.add(sp._id.toString());
        }
    }

    const finalPosts = merged.slice(0, limit);
    const hasMore = textHasMore || merged.length > limit;
    const nextCursor = textPosts.length > 0 ? textPosts[textPosts.length - 1]._id : null;

    const enriched = finalPosts.map((p) => {
        const { likes, embedding, _similarity, ...rest } = p;
        return {
            ...rest,
            isLiked: likes?.some((id) => id.toString() === userId.toString()),
        };
    });

    return { posts: enriched, hasMore, nextCursor };
};

const getTaggedPosts = async (userId, cursor, limit = 10) => {
    const query = { taggedUsers: userId };
    if (cursor) {
        query._id = { $lt: cursor };
    }

    const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate("author", "name username avatar")
        .lean();

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;
    const cleaned = posts.map(({ likes, ...rest }) => rest);
    return { posts: cleaned, hasMore, nextCursor };
};

module.exports = {
    createPost,
    getFeed,
    getPostById,
    deletePost,
    updatePost,
    toggleLike,
    addComment,
    getComments,
    getUserPosts,
    searchPosts,
    getTaggedPosts,
};
