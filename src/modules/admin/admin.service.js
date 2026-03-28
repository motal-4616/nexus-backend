const User = require("../../models/User.model");
const Post = require("../../models/Post.model");
const Report = require("../../models/Report.model");
const Comment = require("../../models/Comment.model");

const getDashboard = async () => {
    const [totalUsers, totalPosts, totalReports, pendingReports, bannedUsers] =
        await Promise.all([
            User.countDocuments(),
            Post.countDocuments(),
            Report.countDocuments(),
            Report.countDocuments({ status: "pending" }),
            User.countDocuments({ isBanned: true }),
        ]);

    return { totalUsers, totalPosts, totalReports, pendingReports, bannedUsers };
};

const getUsers = async (page = 1, limit = 20, search = "") => {
    const filter = {};
    if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ name: regex }, { username: regex }, { email: regex }];
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        User.countDocuments(filter),
    ]);
    return { users, total, page, totalPages: Math.ceil(total / limit) };
};

const banUser = async (userId) => {
    return User.findByIdAndUpdate(userId, { isBanned: true }, { new: true }).lean();
};

const unbanUser = async (userId) => {
    return User.findByIdAndUpdate(userId, { isBanned: false }, { new: true }).lean();
};

const deleteUser = async (userId) => {
    await Post.deleteMany({ author: userId });
    await Comment.deleteMany({ author: userId });
    return User.findByIdAndDelete(userId);
};

const getPosts = async (page = 1, limit = 20, search = "") => {
    const filter = {};
    if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.content = regex;
    }
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
        Post.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("author", "name username avatar")
            .lean(),
        Post.countDocuments(filter),
    ]);
    return { posts, total, page, totalPages: Math.ceil(total / limit) };
};

const deletePost = async (postId) => {
    await Comment.deleteMany({ post: postId });
    return Post.findByIdAndDelete(postId);
};

const getReports = async (page = 1, limit = 20, status = "") => {
    const filter = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
        Report.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("reporter", "name username avatar")
            .populate("targetPost", "content media author")
            .populate("targetUser", "name username avatar")
            .lean(),
        Report.countDocuments(filter),
    ]);

    // Populate post author for targetPost
    for (const r of reports) {
        if (r.targetPost && r.targetPost.author) {
            const author = await User.findById(r.targetPost.author)
                .select("name username avatar")
                .lean();
            r.targetPost.author = author;
        }
    }

    return { reports, total, page, totalPages: Math.ceil(total / limit) };
};

const resolveReport = async (reportId) => {
    return Report.findByIdAndUpdate(reportId, { status: "resolved" }, { new: true });
};

const dismissReport = async (reportId) => {
    return Report.findByIdAndUpdate(reportId, { status: "dismissed" }, { new: true });
};

const deleteReportedPost = async (reportId) => {
    const report = await Report.findById(reportId);
    if (!report || !report.targetPost) return null;
    await Comment.deleteMany({ post: report.targetPost });
    await Post.findByIdAndDelete(report.targetPost);
    report.status = "resolved";
    await report.save();
    return report;
};

module.exports = {
    getDashboard,
    getUsers,
    banUser,
    unbanUser,
    deleteUser,
    getPosts,
    deletePost,
    getReports,
    resolveReport,
    dismissReport,
    deleteReportedPost,
};
