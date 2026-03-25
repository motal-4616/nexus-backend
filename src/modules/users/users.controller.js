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

module.exports = { getMyProfile, getUserProfile, updateProfile, searchUsers };
