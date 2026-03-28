const router = require("express").Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const { createReport } = require("./reports.controller");

router.post("/", authMiddleware, createReport);

module.exports = router;
