const Post = require("../../models/Post.model");
const Comment = require("../../models/Comment.model");
const { createAndPushNotification } = require("../../utils/notification.util");

const createPost = async (authorId, content, files, audience = 'public') => {
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

    const validAudience = ['public', 'friends', 'private'].includes(audience) ? audience : 'public';
    const post = await Post.create({ author: authorId, content, media, audience: validAudience });
    return Post.findById(post._id).populate("author", "name username avatar");
};

const getFeed = async (userId, cursor, limit = 10) => {
    // Get friend IDs for audience filtering
    const Friendship = require('../../models/Friendship.model');
    const friendships = await Friendship.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: 'accepted',
    }).lean();
    const friendIds = friendships.map((f) =>
        f.requester.toString() === userId.toString() ? f.recipient : f.requester,
    );

    const query = {
        $or: [
            { audience: 'public' },
            { audience: 'friends', author: { $in: [...friendIds, userId] } },
            { audience: 'private', author: userId },
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

    // Add isLiked flag for current user
    const enriched = posts.map((p) => ({
        ...p,
        isLiked: p.likes?.some((id) => id.toString() === userId.toString()),
    }));

    return { posts: enriched, hasMore, nextCursor };
};

const getPostById = async (postId, userId) => {
    const post = await Post.findById(postId)
        .populate("author", "name username avatar")
        .lean();
    if (!post) return null;

    return {
        ...post,
        isLiked: post.likes?.some((id) => id.toString() === userId.toString()),
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
    return { posts, hasMore, nextCursor };
};

const searchPosts = async (query, userId, cursor, limit = 10) => {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const filter = { content: regex };
    if (cursor) {
        filter._id = { $lt: cursor };
    }

    const posts = await Post.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate("author", "name username avatar")
        .lean();

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;
    const enriched = posts.map((p) => ({
        ...p,
        isLiked: p.likes?.some((id) => id.toString() === userId.toString()),
    }));

    return { posts: enriched, hasMore, nextCursor };
};

module.exports = {
    createPost,
    getFeed,
    getPostById,
    deletePost,
    toggleLike,
    addComment,
    getComments,
    getUserPosts,
    searchPosts,
};
