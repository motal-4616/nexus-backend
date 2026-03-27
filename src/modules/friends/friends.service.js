const Friendship = require("../../models/Friendship.model");
const Notification = require("../../models/Notification.model");
const { createAndPushNotification } = require("../../utils/notification.util");

const sendRequest = async (requesterId, recipientId) => {
    if (requesterId.toString() === recipientId.toString()) {
        throw Object.assign(new Error("Cannot send request to yourself"), {
            status: 400,
        });
    }

    // Check if any friendship already exists between them
    const existing = await Friendship.findOne({
        $or: [
            { requester: requesterId, recipient: recipientId },
            { requester: recipientId, recipient: requesterId },
        ],
    });

    if (existing) {
        if (existing.status === "accepted") {
            throw Object.assign(new Error("Already friends"), { status: 400 });
        }
        if (existing.status === "pending") {
            throw Object.assign(new Error("Friend request already exists"), {
                status: 400,
            });
        }
        if (existing.status === "blocked") {
            throw Object.assign(new Error("Cannot send request"), {
                status: 400,
            });
        }
    }

    const friendship = await Friendship.create({
        requester: requesterId,
        recipient: recipientId,
    });

    // Notify recipient about the friend request
    createAndPushNotification({
        recipientId: recipientId,
        actorId: requesterId,
        type: "friend_request",
        targetRef: friendship._id,
        targetModel: "Friendship",
        message: "sent you a friend request",
    }).catch(() => {});

    return friendship;
};

const acceptRequest = async (currentUserId, requesterId) => {
    // Only the recipient can accept
    const friendship = await Friendship.findOne({
        requester: requesterId,
        recipient: currentUserId,
        status: "pending",
    });

    if (!friendship) return null;

    friendship.status = "accepted";
    await friendship.save();

    // Notify requester that their request was accepted
    createAndPushNotification({
        recipientId: requesterId,
        actorId: currentUserId,
        type: "friend_accept",
        targetRef: friendship._id,
        targetModel: "Friendship",
        message: "accepted your friend request",
    }).catch(() => {});

    return friendship;
};

const rejectOrUnfriend = async (currentUserId, otherUserId) => {
    const friendship = await Friendship.findOne({
        $or: [
            { requester: currentUserId, recipient: otherUserId },
            { requester: otherUserId, recipient: currentUserId },
        ],
    });

    if (!friendship) return null;

    // Clean up related friend_request notifications
    await Notification.deleteMany({
        $or: [
            { actor: currentUserId, recipient: otherUserId, type: "friend_request" },
            { actor: otherUserId, recipient: currentUserId, type: "friend_request" },
        ],
    });

    await friendship.deleteOne();
    return true;
};

const getFriends = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    const friendships = await Friendship.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: "accepted",
    })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("requester", "name username avatar")
        .populate("recipient", "name username avatar")
        .lean();

    const total = await Friendship.countDocuments({
        $or: [{ requester: userId }, { recipient: userId }],
        status: "accepted",
    });

    // Map to return the *other* user, not the current user
    const friends = friendships.map((f) => {
        const friend =
            f.requester._id.toString() === userId.toString()
                ? f.recipient
                : f.requester;
        return { ...friend, friendshipId: f._id, since: f.updatedAt };
    });

    return { friends, total, page, totalPages: Math.ceil(total / limit) };
};

const getRequests = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    const requests = await Friendship.find({
        recipient: userId,
        status: "pending",
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("requester", "name username avatar")
        .lean();

    const total = await Friendship.countDocuments({
        recipient: userId,
        status: "pending",
    });

    const mapped = requests.map((r) => ({
        ...r.requester,
        friendshipId: r._id,
        requestedAt: r.createdAt,
    }));

    return {
        requests: mapped,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
};

const getFriendshipStatus = async (currentUserId, otherUserId) => {
    const friendship = await Friendship.findOne({
        $or: [
            { requester: currentUserId, recipient: otherUserId },
            { requester: otherUserId, recipient: currentUserId },
        ],
    });

    if (!friendship) return { status: "none" };

    if (friendship.status === "accepted") return { status: "friends" };

    if (friendship.status === "pending") {
        if (friendship.requester.toString() === currentUserId.toString()) {
            return { status: "request_sent" };
        }
        return { status: "request_received" };
    }

    return { status: "none" };
};

module.exports = {
    sendRequest,
    acceptRequest,
    rejectOrUnfriend,
    getFriends,
    getRequests,
    getFriendshipStatus,
};
