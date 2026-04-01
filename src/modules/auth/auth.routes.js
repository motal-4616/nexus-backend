const express = require("express");
const rateLimit = require("express-rate-limit");
const {
    register,
    login,
    refreshToken,
    logout,
    forgotPassword,
    verifyOTP,
    resetPassword,
} = require("./auth.controller");
const {
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateResetPassword,
    validateVerifyOTP,
} = require("./auth.validator");

const router = express.Router();

// Rate limiter: max 10 requests per 15 minutes per IP on all auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again in 15 minutes.",
    },
});

// Stricter limiter for sensitive actions
const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts. Please try again in 1 hour.",
    },
});

router.post("/register", authLimiter, validateRegister, register);
router.post("/login", authLimiter, validateLogin, login);
router.post("/refresh", authLimiter, refreshToken);
router.post("/logout", logout);
router.post(
    "/forgot-password",
    strictLimiter,
    validateForgotPassword,
    forgotPassword,
);
router.post("/verify-otp", strictLimiter, validateVerifyOTP, verifyOTP);
router.post(
    "/reset-password",
    strictLimiter,
    validateResetPassword,
    resetPassword,
);

module.exports = router;
