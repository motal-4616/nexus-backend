const { verifyToken } = require("../utils/token.util");
const { sendError } = require("../utils/response.util");
const User = require("../models/User.model");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return sendError(res, 401, "Authentication required");
        }

        const token = authHeader.split(" ")[1];

        let payload;
        try {
            payload = verifyToken(token, process.env.JWT_SECRET);
        } catch {
            return sendError(res, 401, "Invalid or expired token");
        }

        const user = await User.findById(payload.sub);
        if (!user) {
            return sendError(res, 401, "User no longer exists");
        }

        if (user.isBanned) {
            return sendError(res, 403, "Your account has been banned");
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("authMiddleware error:", err);
        return sendError(res, 500, "Authentication failed");
    }
};

module.exports = authMiddleware;
