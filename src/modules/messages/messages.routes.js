const router = require("express").Router();
const messagesController = require("./messages.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { uploadChatMedia } = require("../../middlewares/upload.middleware");
const pusher = require("../../config/pusher");
const { sendError } = require("../../utils/response.util");

// Pusher auth endpoint (must be before authMiddleware on router if we want a separate path)
router.post("/pusher/auth", authMiddleware, (req, res) => {
    try {
        const socketId = req.body.socket_id;
        const channel = req.body.channel_name;

        // Only allow users to subscribe to their own private channel
        const expectedChannel = `private-user-${req.user.id}`;
        if (channel !== expectedChannel) {
            return sendError(res, 403, "Forbidden channel");
        }

        const authResponse = pusher.authorizeChannel(socketId, channel);
        res.json(authResponse);
    } catch (err) {
        sendError(res, 500, "Pusher auth failed");
    }
});

// All routes below require auth
router.use(authMiddleware);

router.get("/", messagesController.getConversations);
router.post("/", messagesController.createConversation);
router.get("/:id/messages", messagesController.getMessages);
router.post(
    "/:id/messages",
    uploadChatMedia.array("media", 4),
    messagesController.sendMessage,
);
router.patch("/:id/seen", messagesController.markSeen);

module.exports = router;
