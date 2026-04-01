const Conversation = require("../../models/Conversation.model");
const Message = require("../../models/Message.model");
const pusher = require("../../config/pusher");

const getOrCreateConversation = async (currentUserId, otherUserId) => {
    if (currentUserId.toString() === otherUserId.toString()) {
        throw Object.assign(
            new Error("Cannot create conversation with yourself"),
            {
                status: 400,
            },
        );
    }

    // Find existing private conversation between these two users
    let conversation = await Conversation.findOne({
        type: "private",
        participants: { $all: [currentUserId, otherUserId], $size: 2 },
    })
        .populate("participants", "name username avatar")
        .lean();

    if (conversation) return conversation;

    // Create new conversation
    const created = await Conversation.create({
        participants: [currentUserId, otherUserId],
        type: "private",
    });

    conversation = await Conversation.findById(created._id)
        .populate("participants", "name username avatar")
        .lean();

    return conversation;
};

const getConversations = async (userId) => {
    const conversations = await Conversation.find({
        participants: userId,
    })
        .sort({ updatedAt: -1 })
        .populate("participants", "name username avatar")
        .lean();

    // Attach unreadCount for the current user
    return conversations.map((c) => ({
        ...c,
        unread:
            c.unreadCount?.get?.(userId.toString()) ||
            (c.unreadCount?.[userId.toString()] ?? 0),
    }));
};

const getMessages = async (conversationId, userId, cursor, limit = 30) => {
    // Verify user is a participant
    const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
    });

    if (!conversation) {
        throw Object.assign(new Error("Conversation not found"), {
            status: 404,
        });
    }

    const query = { conversation: conversationId };
    if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate("sender", "name username avatar")
        .lean();

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Reverse to chronological order for client
    messages.reverse();

    const nextCursor =
        hasMore && messages.length > 0
            ? messages[0].createdAt.toISOString()
            : null;

    return { messages, hasMore, nextCursor };
};

const sendMessage = async (conversationId, senderId, text, media = []) => {
    // Verify sender is a participant
    const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: senderId,
    });

    if (!conversation) {
        throw Object.assign(new Error("Conversation not found"), {
            status: 404,
        });
    }

    if (!text && (!media || media.length === 0)) {
        throw Object.assign(new Error("Message must have text or media"), {
            status: 400,
        });
    }

    // Create message
    const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        text: text || "",
        media: media || [],
        seenBy: [senderId],
    });

    // Update conversation lastMessage and unreadCount
    const updateObj = {
        lastMessage: {
            sender: senderId,
            text: text || (media.length > 0 ? "Sent a photo" : ""),
            createdAt: message.createdAt,
        },
        updatedAt: new Date(),
    };

    // Increment unread count for all other participants
    const incObj = {};
    conversation.participants.forEach((p) => {
        if (p.toString() !== senderId.toString()) {
            incObj[`unreadCount.${p.toString()}`] = 1;
        }
    });

    await Conversation.findByIdAndUpdate(conversationId, {
        $set: updateObj,
        $inc: incObj,
    });

    const populated = await Message.findById(message._id)
        .populate("sender", "name username avatar")
        .lean();

    // Trigger Pusher event to all other participants
    conversation.participants.forEach((participantId) => {
        if (participantId.toString() !== senderId.toString()) {
            pusher.trigger(
                `private-user-${participantId.toString()}`,
                "new-message",
                {
                    message: populated,
                    conversationId,
                },
            );
        }
    });

    return populated;
};

const markSeen = async (conversationId, userId) => {
    const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
    });

    if (!conversation) {
        throw Object.assign(new Error("Conversation not found"), {
            status: 404,
        });
    }

    // Mark all messages in this conversation as seen by this user
    await Message.updateMany(
        {
            conversation: conversationId,
            sender: { $ne: userId },
            seenBy: { $ne: userId },
        },
        { $addToSet: { seenBy: userId } },
    );

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(conversationId, {
        $set: { [`unreadCount.${userId.toString()}`]: 0 },
    });

    // Notify sender that messages were seen
    conversation.participants.forEach((participantId) => {
        if (participantId.toString() !== userId.toString()) {
            pusher.trigger(
                `private-user-${participantId.toString()}`,
                "messages-seen",
                {
                    conversationId,
                    seenBy: userId,
                },
            );
        }
    });

    return true;
};

const sendTyping = async (conversationId, userId) => {
    const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
    });

    if (!conversation) {
        throw Object.assign(new Error("Conversation not found"), {
            status: 404,
        });
    }

    // Trigger typing event to other participants
    conversation.participants.forEach((participantId) => {
        if (participantId.toString() !== userId.toString()) {
            pusher.trigger(
                `private-user-${participantId.toString()}`,
                "typing",
                {
                    conversationId,
                    userId,
                },
            );
        }
    });
};

module.exports = {
    getOrCreateConversation,
    getConversations,
    getMessages,
    sendMessage,
    markSeen,
    sendTyping,
};
