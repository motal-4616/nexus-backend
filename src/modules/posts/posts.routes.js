const router = require("express").Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const { uploadPostMedia } = require("../../middlewares/upload.middleware");
const postsController = require("./posts.controller");

// All routes require authentication
router.use(authMiddleware);

// POST /posts — create post (up to 10 images/videos)
router.post("/", uploadPostMedia.array("media", 10), postsController.createPost);

// GET /posts/feed — news feed with cursor pagination
router.get("/feed", postsController.getFeed);

// GET /posts/search?q=...&cursor=...&limit=...
router.get("/search", postsController.searchPosts);

// GET /posts/:id — single post detail
router.get("/:id", postsController.getPostById);

// DELETE /posts/:id — delete post (author only)
router.delete("/:id", postsController.deletePost);

// POST /posts/:id/like — toggle like/unlike
router.post("/:id/like", postsController.toggleLike);

// POST /posts/:id/comments — add comment
router.post("/:id/comments", postsController.addComment);

// GET /posts/:id/comments — list comments with cursor pagination
router.get("/:id/comments", postsController.getComments);

module.exports = router;
