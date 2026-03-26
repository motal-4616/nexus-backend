const notificationsService = require("./notifications.service");
const { sendResponse, sendError } = require("../../utils/response.util");

const getNotifications = async (req, res) => {
    try {
        const { cursor, limit = 20 } = req.query;
        const data = await notificationsService.getNotifications(
            req.user.id,
            cursor || null,
            parseInt(limit),
        );
        sendResponse(res, 200, "Notifications retrieved", data);
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const markAllRead = async (req, res) => {
    try {
        await notificationsService.markAllRead(req.user.id);
        sendResponse(res, 200, "All notifications marked as read");
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const count = await notificationsService.getUnreadCount(req.user.id);
        sendResponse(res, 200, "Unread count retrieved", { count });
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

module.exports = { getNotifications, markAllRead, getUnreadCount };
