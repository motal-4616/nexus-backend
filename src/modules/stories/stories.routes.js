const router = require("express").Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const { uploadPostMedia } = require("../../middlewares/upload.middleware");
const storiesController = require("./stories.controller");

router.use(authMiddleware);

// POST /stories — create a story (single image or video)
router.post(
    "/",
    uploadPostMedia.single("media"),
    storiesController.createStory,
);

// GET /stories/feed — get stories from friends
router.get("/feed", storiesController.getFeedStories);

// POST /stories/:id/view — mark story as viewed
router.post("/:id/view", storiesController.viewStory);

module.exports = router;
