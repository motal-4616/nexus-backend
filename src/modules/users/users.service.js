const User = require("../../models/User.model");

const getMyProfile = async (userId) => {
  return User.findById(userId);
};

const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const mongoose = require("mongoose");

  let postsCount = 0;
  let friendsCount = 0;

  try {
    const Post = mongoose.model("Post");
    postsCount = await Post.countDocuments({ author: userId });
  } catch {}

  try {
    const Friendship = mongoose.model("Friendship");
    friendsCount = await Friendship.countDocuments({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "accepted",
    });
  } catch {}

  return {
    ...user.toJSON(),
    postsCount,
    friendsCount,
  };
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

module.exports = { getMyProfile, getUserProfile, updateProfile, searchUsers };
