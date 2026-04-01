const User = require("../../models/User.model");
const Post = require("../../models/Post.model");
const Friendship = require("../../models/Friendship.model");

const getMyProfile = async (userId) => {
    return User.findById(userId).lean();
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

module.exports = { getMyProfile, getUserProfile, updateProfile, searchUsers, getOnlineStatus };
