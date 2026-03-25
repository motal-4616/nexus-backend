const crypto = require("crypto");
const User = require("../../models/User.model");
const {
    signAccessToken,
    signRefreshToken,
    verifyToken,
} = require("../../utils/token.util");
const { sendResetEmail } = require("../../utils/email.util");
const { sendResponse, sendError } = require("../../utils/response.util");

// POST /auth/register
const register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return sendError(res, 409, "Email is already registered");
        }

        const existingUsername = await User.findOne({
            username: username.toLowerCase(),
        });
        if (existingUsername) {
            return sendError(res, 409, "Username is already taken");
        }

        const user = await User.create({
            name,
            username: username.toLowerCase(),
            email,
            password,
        });

        const accessToken = signAccessToken(user._id);
        const refreshToken = signRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return sendResponse(res, 201, "Account created successfully", {
            user,
            accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error("register error:", err);
        return sendError(res, 500, "Registration failed");
    }
};

// POST /auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select(
            "+password +refreshToken",
        );
        if (!user || !(await user.comparePassword(password))) {
            return sendError(res, 401, "Invalid email or password");
        }

        const accessToken = signAccessToken(user._id);
        const refreshToken = signRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // Strip sensitive fields before returning
        const userObj = user.toJSON();

        return sendResponse(res, 200, "Login successful", {
            user: userObj,
            accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error("login error:", err);
        return sendError(res, 500, "Login failed");
    }
};

// POST /auth/refresh
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        if (!token) {
            return sendError(res, 400, "Refresh token is required");
        }

        let payload;
        try {
            payload = verifyToken(token, process.env.JWT_REFRESH_SECRET);
        } catch {
            return sendError(res, 401, "Invalid or expired refresh token");
        }

        const user = await User.findById(payload.sub).select("+refreshToken");
        if (!user || user.refreshToken !== token) {
            return sendError(res, 401, "Refresh token mismatch");
        }

        const newAccessToken = signAccessToken(user._id);

        return sendResponse(res, 200, "Token refreshed", {
            accessToken: newAccessToken,
        });
    } catch (err) {
        console.error("refreshToken error:", err);
        return sendError(res, 500, "Token refresh failed");
    }
};

// POST /auth/logout
const logout = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        if (token) {
            await User.findOneAndUpdate(
                { refreshToken: token },
                { refreshToken: null },
            );
        }
        return sendResponse(res, 200, "Logged out successfully");
    } catch (err) {
        console.error("logout error:", err);
        return sendError(res, 500, "Logout failed");
    }
};

// POST /auth/forgot-password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Always respond 200 to prevent user enumeration
        const user = await User.findOne({ email });
        if (!user) {
            return sendResponse(
                res,
                200,
                "If that email exists, a reset link has been sent",
            );
        }

        // Generate 32-byte random token, store SHA-256 hash
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save({ validateBeforeSave: false });

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

        await sendResetEmail(email, resetLink);

        return sendResponse(
            res,
            200,
            "If that email exists, a reset link has been sent",
        );
    } catch (err) {
        console.error("forgotPassword error:", err);
        return sendError(res, 500, "Failed to process request");
    }
};

// POST /auth/reset-password/:token
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpiry: { $gt: Date.now() },
        }).select("+resetPasswordToken +resetPasswordExpiry");

        if (!user) {
            return sendError(res, 400, "Reset token is invalid or has expired");
        }

        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpiry = null;
        user.refreshToken = null; // invalidate all sessions
        await user.save();

        return sendResponse(
            res,
            200,
            "Password reset successfully. Please log in.",
        );
    } catch (err) {
        console.error("resetPassword error:", err);
        return sendError(res, 500, "Password reset failed");
    }
};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
};
