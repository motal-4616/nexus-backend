const router = require("express").Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const adminMiddleware = require("../../middlewares/admin.middleware");
const ctrl = require("./admin.controller");

router.use(authMiddleware, adminMiddleware);

router.get("/dashboard", ctrl.getDashboard);

router.get("/users", ctrl.getUsers);
router.patch("/users/:id/ban", ctrl.banUser);
router.patch("/users/:id/unban", ctrl.unbanUser);
router.delete("/users/:id", ctrl.deleteUser);

router.get("/posts", ctrl.getPosts);
router.delete("/posts/:id", ctrl.deletePost);

router.get("/reports", ctrl.getReports);
router.patch("/reports/:id/resolve", ctrl.resolveReport);
router.patch("/reports/:id/dismiss", ctrl.dismissReport);
router.delete("/reports/:id/delete-post", ctrl.deleteReportedPost);

module.exports = router;
