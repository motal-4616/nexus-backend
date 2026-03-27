const Notification = require("../models/Notification.model");
const pusher = require("../config/pusher");

/**
 * Create a notification and push it via Pusher.
 * Skips if recipient === actor (don't notify yourself).
 */
const createAndPushNotification = async ({
    recipientId,
    actorId,
    type,
    targetRef,
    targetModel,
    message,
}) => {
    // Don't notify yourself
    if (recipientId.toString() === actorId.toString()) return null;

    // For friend requests, remove old duplicate notifications first
    if (type === "friend_request") {
        await Notification.deleteMany({
            recipient: recipientId,
            actor: actorId,
            type: "friend_request",
        });
    }

    const notification = await Notification.create({
        recipient: recipientId,
        actor: actorId,
        type,
        targetRef,
        targetModel,
        message,
    });

    const populated = await Notification.findById(notification._id)
        .populate("actor", "name username avatar")
        .lean();

    // Push realtime notification
    pusher.trigger(
        `private-user-${recipientId.toString()}`,
        "new-notification",
        populated,
    );

    return populated;
};

module.exports = { createAndPushNotification };
