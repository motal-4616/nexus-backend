const Notification = require("../../models/Notification.model");

const getNotifications = async (userId, cursor, limit = 20) => {
    const query = { recipient: userId };
    if (cursor) {
        query._id = { $lt: cursor };
    }

    const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate("actor", "name username avatar")
        .lean();

    const hasMore = notifications.length > limit;
    if (hasMore) notifications.pop();

    const nextCursor =
        notifications.length > 0
            ? notifications[notifications.length - 1]._id
            : null;

    // Count total unread
    const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
    });

    return { notifications, hasMore, nextCursor, unreadCount };
};

const markAllRead = async (userId) => {
    await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true },
    );
    return true;
};

const getUnreadCount = async (userId) => {
    return Notification.countDocuments({ recipient: userId, isRead: false });
};

module.exports = { getNotifications, markAllRead, getUnreadCount };
