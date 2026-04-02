const { sendResponse, sendError } = require("../../utils/response.util");
const usersService = require("./users.service");

const getMyProfile = async (req, res) => {
    try {
        const user = await usersService.getMyProfile(req.user._id);
        sendResponse(res, 200, "Profile retrieved", user);
    } catch (err) {
        console.error("getMyProfile error:", err);
        sendError(res, 500, "Failed to retrieve profile");
    }
};

const getUserProfile = async (req, res) => {
    try {
        const result = await usersService.getUserProfile(req.params.id);
        if (!result) return sendError(res, 404, "User not found");
        sendResponse(res, 200, "User profile retrieved", result);
    } catch (err) {
        console.error("getUserProfile error:", err);
        sendError(res, 500, "Failed to retrieve user profile");
    }
};

const updateProfile = async (req, res) => {
    try {
        const user = await usersService.updateProfile(
            req.user._id,
            req.body,
            req.file,
        );
        sendResponse(res, 200, "Profile updated", user);
    } catch (err) {
        console.error("updateProfile error:", err);
        sendError(res, 500, "Failed to update profile");
    }
};

const searchUsers = async (req, res) => {
    try {
        const { q, page } = req.query;
        if (!q || !q.trim()) {
            return sendResponse(res, 200, "Search results", {
                users: [],
                total: 0,
                page: 1,
                totalPages: 0,
            });
        }

        const result = await usersService.searchUsers(
            q.trim(),
            req.user._id,
            parseInt(page) || 1,
        );
        sendResponse(res, 200, "Search results", result);
    } catch (err) {
        console.error("searchUsers error:", err);
        sendError(res, 500, "Search failed");
    }
};

const getOnlineStatus = async (req, res) => {
    try {
        const result = await usersService.getOnlineStatus(req.params.id);
        if (!result) return sendError(res, 404, "User not found");
        sendResponse(res, 200, "Online status retrieved", result);
    } catch (err) {
        sendError(res, 500, "Failed to get online status");
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return sendError(res, 400, "Current and new password are required");
        }
        if (newPassword.length < 6) {
            return sendError(
                res,
                400,
                "New password must be at least 6 characters",
            );
        }
        await usersService.changePassword(
            req.user._id,
            currentPassword,
            newPassword,
        );
        sendResponse(res, 200, "Password changed successfully");
    } catch (err) {
        console.error("changePassword error:", err);
        sendError(
            res,
            err.status || 500,
            err.message || "Failed to change password",
        );
    }
};

const deleteAccount = async (req, res) => {
    try {
        await usersService.deleteAccount(req.user._id);
        sendResponse(res, 200, "Account deleted");
    } catch (err) {
        console.error("deleteAccount error:", err);
        sendError(res, 500, "Failed to delete account");
    }
};

const getSuggestions = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const suggestions = await usersService.getSuggestions(
            req.user._id,
            limit,
        );
        sendResponse(res, 200, "Suggestions retrieved", suggestions);
    } catch (err) {
        console.error("getSuggestions error:", err);
        sendError(res, 500, "Failed to get suggestions");
    }
};

module.exports = {
    getMyProfile,
    getUserProfile,
    updateProfile,
    searchUsers,
    getOnlineStatus,
    changePassword,
    deleteAccount,
    getSuggestions,
};
