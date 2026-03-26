const friendsService = require("./friends.service");
const { sendResponse, sendError } = require("../../utils/response.util");

const sendRequest = async (req, res) => {
    try {
        const friendship = await friendsService.sendRequest(
            req.user.id,
            req.params.userId,
        );
        sendResponse(res, 201, "Friend request sent", friendship);
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const acceptRequest = async (req, res) => {
    try {
        const friendship = await friendsService.acceptRequest(
            req.user.id,
            req.params.userId,
        );
        if (!friendship) return sendError(res, 404, "Friend request not found");
        sendResponse(res, 200, "Friend request accepted", friendship);
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const rejectOrUnfriend = async (req, res) => {
    try {
        const result = await friendsService.rejectOrUnfriend(
            req.user.id,
            req.params.userId,
        );
        if (!result) return sendError(res, 404, "Friendship not found");
        sendResponse(res, 200, "Friendship removed");
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const getFriends = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const data = await friendsService.getFriends(
            req.user.id,
            parseInt(page),
            parseInt(limit),
        );
        sendResponse(res, 200, "Friends retrieved", data);
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const getRequests = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const data = await friendsService.getRequests(
            req.user.id,
            parseInt(page),
            parseInt(limit),
        );
        sendResponse(res, 200, "Friend requests retrieved", data);
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

const getFriendshipStatus = async (req, res) => {
    try {
        const data = await friendsService.getFriendshipStatus(
            req.user.id,
            req.params.userId,
        );
        sendResponse(res, 200, "Friendship status retrieved", data);
    } catch (err) {
        sendError(res, err.status || 500, err.message);
    }
};

module.exports = {
    sendRequest,
    acceptRequest,
    rejectOrUnfriend,
    getFriends,
    getRequests,
    getFriendshipStatus,
};
