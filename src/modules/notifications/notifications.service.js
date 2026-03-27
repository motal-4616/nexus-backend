const Notification = require("../../models/Notification.model");

const getNotifications = async (userId, cursor, limit = 20) => {
    const query = { recipient: userId };
    if (cursor) {
        query._id = { $lt: cursor };
    }

    const [notifications, unreadCount] = await Promise.all([
        Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate("actor", "name username avatar")
            .lean(),
        Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    const hasMore = notifications.length > limit;
    if (hasMore) notifications.pop();

    const nextCursor =
        notifications.length > 0
            ? notifications[notifications.length - 1]._id
            : null;

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
