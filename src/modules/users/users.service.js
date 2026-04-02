const User = require("../../models/User.model");
const Post = require("../../models/Post.model");
const Friendship = require("../../models/Friendship.model");

const getMyProfile = async (userId) => {
    const [user, postsCount, friendsCount] = await Promise.all([
        User.findById(userId).lean(),
        Post.countDocuments({ author: userId }),
        Friendship.countDocuments({
            $or: [{ requester: userId }, { recipient: userId }],
            status: "accepted",
        }),
    ]);
    if (!user) return null;
    return { ...user, postsCount, friendsCount };
};

const getUserProfile = async (userId) => {
    const [user, postsCount, friendsCount] = await Promise.all([
        User.findById(userId).lean(),
        Post.countDocuments({ author: userId }),
        Friendship.countDocuments({
            $or: [{ requester: userId }, { recipient: userId }],
            status: "accepted",
        }),
    ]);
    if (!user) return null;

    return { ...user, postsCount, friendsCount };
};

const updateProfile = async (userId, updates, file) => {
    const allowed = ["name", "bio"];
    const sanitized = {};

    for (const key of allowed) {
        if (updates[key] !== undefined) {
            sanitized[key] = updates[key];
        }
    }

    if (file && file.path) {
        sanitized.avatar = file.path;
    }

    const user = await User.findByIdAndUpdate(userId, sanitized, {
        new: true,
        runValidators: true,
    });

    return user;
};

const searchUsers = async (query, currentUserId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const users = await User.find({
        _id: { $ne: currentUserId },
        $or: [{ name: regex }, { username: regex }],
    })
        .select("name username avatar bio")
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await User.countDocuments({
        _id: { $ne: currentUserId },
        $or: [{ name: regex }, { username: regex }],
    });

    return { users, total, page, totalPages: Math.ceil(total / limit) };
};

const getOnlineStatus = async (userId) => {
    const user = await User.findById(userId).select("lastActive").lean();
    if (!user) return null;
    return { lastActive: user.lastActive };
};

const changePassword = async (userId, currentPassword, newPassword) => {
    const bcrypt = require("bcryptjs");
    const user = await User.findById(userId).select("+password");
    if (!user) {
        throw Object.assign(new Error("User not found"), { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw Object.assign(new Error("Mật khẩu hiện tại không đúng"), {
            status: 400,
        });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return true;
};

const deleteAccount = async (userId) => {
    const Comment = require("../../models/Comment.model");
    const Message = require("../../models/Message.model");
    const Conversation = require("../../models/Conversation.model");
    const Notification = require("../../models/Notification.model");

    // Delete user's posts and their comments
    const userPosts = await Post.find({ author: userId }).select("_id").lean();
    const postIds = userPosts.map((p) => p._id);
    await Comment.deleteMany({
        $or: [{ author: userId }, { post: { $in: postIds } }],
    });
    await Post.deleteMany({ author: userId });

    // Delete friendships
    await Friendship.deleteMany({
        $or: [{ requester: userId }, { recipient: userId }],
    });

    // Delete conversations & messages
    const convos = await Conversation.find({ participants: userId })
        .select("_id")
        .lean();
    const convoIds = convos.map((c) => c._id);
    await Message.deleteMany({ conversation: { $in: convoIds } });
    await Conversation.deleteMany({ _id: { $in: convoIds } });

    // Delete notifications
    await Notification.deleteMany({
        $or: [{ recipient: userId }, { actor: userId }],
    });

    // Delete user
    await User.findByIdAndDelete(userId);
    return true;
};

const getSuggestions = async (userId, limit = 10) => {
    const { cosineSimilarity } = require("../../utils/ai.util");

    const currentUser = await User.findById(userId).lean();
    if (
        !currentUser ||
        !currentUser.embedding ||
        currentUser.embedding.length === 0
    ) {
        // Fallback: return random non-friend users
        const friendships = await Friendship.find({
            $or: [{ requester: userId }, { recipient: userId }],
        }).lean();
        const friendIds = friendships.map((f) =>
            f.requester.toString() === userId.toString()
                ? f.recipient
                : f.requester,
        );
        friendIds.push(userId);

        const users = await User.find({ _id: { $nin: friendIds } })
            .select("name username avatar bio")
            .limit(limit)
            .lean();
        return users.map((u) => ({ ...u, score: 0 }));
    }

    // Get friend IDs to exclude
    const friendships = await Friendship.find({
        $or: [{ requester: userId }, { recipient: userId }],
    }).lean();
    const excludeIds = friendships.map((f) =>
        f.requester.toString() === userId.toString()
            ? f.recipient
            : f.requester,
    );
    excludeIds.push(userId);

    // Find users with embeddings (excluding friends & self)
    const candidates = await User.find({
        _id: { $nin: excludeIds },
        embedding: { $exists: true, $ne: [] },
    })
        .select("name username avatar bio embedding")
        .lean();

    // Compute similarity scores
    const scored = candidates.map((u) => ({
        _id: u._id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
        score: cosineSimilarity(currentUser.embedding, u.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
};

module.exports = {
    getMyProfile,
    getUserProfile,
    updateProfile,
    searchUsers,
    getOnlineStatus,
    changePassword,
    deleteAccount,
    getSuggestions,
};
