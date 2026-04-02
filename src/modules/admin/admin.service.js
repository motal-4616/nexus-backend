const User = require("../../models/User.model");
const Post = require("../../models/Post.model");
const Report = require("../../models/Report.model");
const Comment = require("../../models/Comment.model");
const Friendship = require("../../models/Friendship.model");
const Notification = require("../../models/Notification.model");

const getDashboard = async () => {
    const [totalUsers, totalPosts, totalReports, pendingReports, bannedUsers] =
        await Promise.all([
            User.countDocuments(),
            Post.countDocuments(),
            Report.countDocuments(),
            Report.countDocuments({ status: "pending" }),
            User.countDocuments({ isBanned: true }),
        ]);

    return {
        totalUsers,
        totalPosts,
        totalReports,
        pendingReports,
        bannedUsers,
    };
};

const getUsers = async (page = 1, limit = 20, search = "", status = "", role = "", sort = "") => {
    const filter = {};
    if (search) {
        const regex = new RegExp(
            search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i",
        );
        filter.$or = [{ name: regex }, { username: regex }, { email: regex }];
    }
    if (status === "banned") filter.isBanned = true;
    else if (status === "active") filter.isBanned = { $ne: true };
    if (role) filter.role = role;

    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    else if (sort === "name") sortOption = { name: 1 };

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        User.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(filter),
    ]);
    return { users, total, page, totalPages: Math.ceil(total / limit) };
};

const banUser = async (userId) => {
    return User.findByIdAndUpdate(
        userId,
        { isBanned: true },
        { new: true },
    ).lean();
};

const unbanUser = async (userId) => {
    return User.findByIdAndUpdate(
        userId,
        { isBanned: false },
        { new: true },
    ).lean();
};

const deleteUser = async (userId) => {
    await Post.deleteMany({ author: userId });
    await Comment.deleteMany({ author: userId });
    await Friendship.deleteMany({
        $or: [{ requester: userId }, { recipient: userId }],
    });
    await Notification.deleteMany({
        $or: [{ recipient: userId }, { actor: userId }],
    });
    return User.findByIdAndDelete(userId);
};

const getPosts = async (page = 1, limit = 20, search = "", type = "", audience = "", sort = "") => {
    const filter = {};
    if (search) {
        const regex = new RegExp(
            search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i",
        );
        // Search by content OR by author name/username
        const matchingUsers = await User.find({
            $or: [{ name: regex }, { username: regex }],
        }).select("_id").lean();
        const userIds = matchingUsers.map((u) => u._id);
        filter.$or = [{ content: regex }];
        if (userIds.length > 0) filter.$or.push({ author: { $in: userIds } });
    }
    if (type === "media") filter["media.0"] = { $exists: true };
    else if (type === "text") filter.media = { $size: 0 };
    if (audience) filter.audience = audience;

    const skip = (page - 1) * limit;
    const total = await Post.countDocuments(filter);

    // Sort by author name requires aggregation
    if (sort === "authorName") {
        const pipeline = [
            { $match: filter },
            { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "_author" } },
            { $addFields: { _authorName: { $toLower: { $arrayElemAt: ["$_author.name", 0] } } } },
            { $sort: { _authorName: 1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { _author: 0, _authorName: 0 } },
        ];
        let posts = await Post.aggregate(pipeline);
        posts = await Post.populate(posts, { path: "author", select: "name username avatar" });
        return { posts, total, page, totalPages: Math.ceil(total / limit) };
    }

    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    else if (sort === "likes") sortOption = { likesCount: -1 };
    else if (sort === "comments") sortOption = { commentsCount: -1 };

    const posts = await Post.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("author", "name username avatar")
        .lean();
    return { posts, total, page, totalPages: Math.ceil(total / limit) };
};

const deletePost = async (postId) => {
    await Comment.deleteMany({ post: postId });
    return Post.findByIdAndDelete(postId);
};

const getReports = async (page = 1, limit = 20, status = "", targetType = "", autoFlagged = "", sort = "") => {
    const filter = {};
    if (status) filter.status = status;
    if (targetType) filter.targetType = targetType;
    if (autoFlagged === "true") filter.autoFlagged = true;
    else if (autoFlagged === "false") filter.autoFlagged = { $ne: true };

    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };

    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
        Report.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .populate("reporter", "name username avatar")
            .populate("targetPost", "content media author")
            .populate("targetUser", "name username avatar")
            .populate("targetComment", "content author")
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
    return Report.findByIdAndUpdate(
        reportId,
        { status: "resolved" },
        { new: true },
    );
};

const dismissReport = async (reportId) => {
    return Report.findByIdAndUpdate(
        reportId,
        { status: "dismissed" },
        { new: true },
    );
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
