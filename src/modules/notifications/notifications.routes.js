const router = require("express").Router();
const notificationsController = require("./notifications.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware);

router.get("/", notificationsController.getNotifications);
router.patch("/read-all", notificationsController.markAllRead);
router.get("/unread-count", notificationsController.getUnreadCount);

module.exports = router;
