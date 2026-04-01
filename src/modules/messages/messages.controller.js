const messagesService = require("./messages.service");
const { sendResponse, sendError } = require("../../utils/response.util");

const getConversations = async (req, res) => {
    try {
        const data = await messagesService.getConversations(req.user.id);
        sendResponse(res, 200, "Conversations retrieved", data);
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const createConversation = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return sendError(res, 400, "userId is required");
        const data = await messagesService.getOrCreateConversation(
            req.user.id,
            userId,
        );
        sendResponse(res, 200, "Conversation retrieved", data);
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const getMessages = async (req, res) => {
    try {
        const { cursor, limit = 30 } = req.query;
        const data = await messagesService.getMessages(
            req.params.id,
            req.user.id,
            cursor,
            parseInt(limit),
        );
        sendResponse(res, 200, "Messages retrieved", data);
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const sendMessage = async (req, res) => {
    try {
        const { text } = req.body;
        const media = req.files
            ? req.files.map((f) => ({
                  url: f.path,
                  publicId: f.filename,
                  type: f.mimetype.startsWith("video") ? "video" : "image",
              }))
            : [];
        const data = await messagesService.sendMessage(
            req.params.id,
            req.user.id,
            text,
            media,
        );
        sendResponse(res, 201, "Message sent", data);
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const markSeen = async (req, res) => {
    try {
        await messagesService.markSeen(req.params.id, req.user.id);
        sendResponse(res, 200, "Messages marked as seen");
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const sendTyping = async (req, res) => {
    try {
        await messagesService.sendTyping(req.params.id, req.user.id);
        sendResponse(res, 200, "Typing event sent");
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

module.exports = {
    getConversations,
    createConversation,
    getMessages,
    sendMessage,
    markSeen,
    sendTyping,
};
