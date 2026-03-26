const router = require("express").Router();
const friendsController = require("./friends.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware);

router.post("/request/:userId", friendsController.sendRequest);
router.patch("/request/:userId/accept", friendsController.acceptRequest);
router.delete("/:userId", friendsController.rejectOrUnfriend);
router.get("/", friendsController.getFriends);
router.get("/requests", friendsController.getRequests);
router.get("/status/:userId", friendsController.getFriendshipStatus);

module.exports = router;
