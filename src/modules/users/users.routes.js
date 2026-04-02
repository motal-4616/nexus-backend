const router = require("express").Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const { uploadAvatar } = require("../../middlewares/upload.middleware");
const usersController = require("./users.controller");

// All routes require authentication
router.use(authMiddleware);

// GET /users/search?q=...&page=1
router.get("/search", usersController.searchUsers);

// GET /users/suggestions
router.get("/suggestions", usersController.getSuggestions);

// GET /users/me
router.get("/me", usersController.getMyProfile);

// PATCH /users/me
router.patch(
    "/me",
    uploadAvatar.single("avatar"),
    usersController.updateProfile,
);

// PATCH /users/me/password
router.patch("/me/password", usersController.changePassword);

// DELETE /users/me
router.delete("/me", usersController.deleteAccount);

// GET /users/:id
router.get("/:id", usersController.getUserProfile);

// GET /users/:id/online-status
router.get("/:id/online-status", usersController.getOnlineStatus);

// GET /users/:id/posts
const postsController = require("../posts/posts.controller");
router.get("/:id/posts", postsController.getUserPosts);

// GET /users/:id/tagged-posts
router.get("/:id/tagged-posts", postsController.getTaggedPosts);

module.exports = router;
