const { sendError } = require("../utils/response.util");

const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return sendError(res, 403, "Admin access required");
    }
    next();
};

module.exports = adminMiddleware;
