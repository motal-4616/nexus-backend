const adminService = require("./admin.service");
const { sendResponse, sendError } = require("../../utils/response.util");

const getDashboard = async (req, res) => {
    try {
        const data = await adminService.getDashboard();
        sendResponse(res, 200, "Dashboard stats", data);
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "", status = "", role = "", sort = "" } = req.query;
        const data = await adminService.getUsers(+page, +limit, search, status, role, sort);
        sendResponse(res, 200, "Users list", data);
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

const banUser = async (req, res) => {
    try {
        const user = await adminService.banUser(req.params.id);
        if (!user) return sendError(res, 404, "User not found");
        sendResponse(res, 200, "User banned", user);
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

const unbanUser = async (req, res) => {
    try {
        const user = await adminService.unbanUser(req.params.id);
        if (!user) return sendError(res, 404, "User not found");
        sendResponse(res, 200, "User unbanned", user);
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await adminService.deleteUser(req.params.id);
        if (!user) return sendError(res, 404, "User not found");
        sendResponse(res, 200, "User deleted");
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

const getPosts = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "", type = "", audience = "", sort = "" } = req.query;
        const data = await adminService.getPosts(+page, +limit, search, type, audience, sort);
        sendResponse(res, 200, "Posts list", data);
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

const deletePost = async (req, res) => {
    try {
        const post = await adminService.deletePost(req.params.id);
        if (!post) return sendError(res, 404, "Post not found");
        sendResponse(res, 200, "Post deleted");
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

const getReports = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = "", targetType = "", autoFlagged = "", sort = "" } = req.query;
        const data = await adminService.getReports(+page, +limit, status, targetType, autoFlagged, sort);
        sendResponse(res, 200, "Reports list", data);
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

const resolveReport = async (req, res) => {
    try {
        const report = await adminService.resolveReport(req.params.id);
        if (!report) return sendError(res, 404, "Report not found");
        sendResponse(res, 200, "Report resolved", report);
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

const dismissReport = async (req, res) => {
    try {
        const report = await adminService.dismissReport(req.params.id);
        if (!report) return sendError(res, 404, "Report not found");
        sendResponse(res, 200, "Report dismissed", report);
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

const deleteReportedPost = async (req, res) => {
    try {
        const report = await adminService.deleteReportedPost(req.params.id);
        if (!report) return sendError(res, 404, "Report or post not found");
        sendResponse(res, 200, "Reported post deleted and report resolved");
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

module.exports = {
    getDashboard,
    getUsers,
    banUser,
    unbanUser,
    deleteUser,
    getPosts,
    deletePost,
    getReports,
    resolveReport,
    dismissReport,
    deleteReportedPost,
};
