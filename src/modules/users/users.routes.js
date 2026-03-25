const router = require("express").Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const { uploadAvatar } = require("../../middlewares/upload.middleware");
const usersController = require("./users.controller");

// All routes require authentication
router.use(authMiddleware);

// GET /users/search?q=...&page=1
router.get("/search", usersController.searchUsers);

// GET /users/me
router.get("/me", usersController.getMyProfile);

// PATCH /users/me
router.patch("/me", uploadAvatar.single("avatar"), usersController.updateProfile);

// GET /users/:id
router.get("/:id", usersController.getUserProfile);

module.exports = router;
