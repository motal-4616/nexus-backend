const { sendResponse, sendError } = require("../../utils/response.util");
const storiesService = require("./stories.service");

const createStory = async (req, res) => {
    try {
        const story = await storiesService.createStory(
            req.user._id,
            req.file,
            req.body.duration,
        );
        sendResponse(res, 201, "Story created", story);
    } catch (err) {
        console.error("createStory error:", err);
        sendError(
            res,
            err.status || 500,
            err.message || "Failed to create story",
        );
    }
};

const getFeedStories = async (req, res) => {
    try {
        const stories = await storiesService.getFeedStories(req.user._id);
        sendResponse(res, 200, "Stories retrieved", stories);
    } catch (err) {
        console.error("getFeedStories error:", err);
        sendError(res, 500, "Failed to retrieve stories");
    }
};

const viewStory = async (req, res) => {
    try {
        const result = await storiesService.viewStory(
            req.params.id,
            req.user._id,
        );
        if (!result) return sendError(res, 404, "Story not found");
        sendResponse(res, 200, "Story viewed", result);
    } catch (err) {
        console.error("viewStory error:", err);
        sendError(res, 500, "Failed to view story");
    }
};

module.exports = { createStory, getFeedStories, viewStory };
