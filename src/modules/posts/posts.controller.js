const { sendResponse, sendError } = require("../../utils/response.util");
const postsService = require("./posts.service");

const createPost = async (req, res) => {
    try {
        const post = await postsService.createPost(
            req.user._id,
            req.body.content,
            req.files,
        );
        sendResponse(res, 201, "Post created", post);
    } catch (err) {
        console.error("createPost error:", err);
        sendError(
            res,
            err.status || 500,
            err.message || "Failed to create post",
        );
    }
};

const getFeed = async (req, res) => {
    try {
        const { cursor, limit } = req.query;
        const result = await postsService.getFeed(
            req.user._id,
            cursor || null,
            parseInt(limit) || 10,
        );
        sendResponse(res, 200, "Feed retrieved", result);
    } catch (err) {
        console.error("getFeed error:", err);
        sendError(res, 500, "Failed to retrieve feed");
    }
};

const getPostById = async (req, res) => {
    try {
        const post = await postsService.getPostById(
            req.params.id,
            req.user._id,
        );
        if (!post) return sendError(res, 404, "Post not found");
        sendResponse(res, 200, "Post retrieved", post);
    } catch (err) {
        console.error("getPostById error:", err);
        sendError(res, 500, "Failed to retrieve post");
    }
};

const deletePost = async (req, res) => {
    try {
        const result = await postsService.deletePost(
            req.params.id,
            req.user._id,
        );
        if (!result) return sendError(res, 404, "Post not found");
        sendResponse(res, 200, "Post deleted");
    } catch (err) {
        console.error("deletePost error:", err);
        sendError(
            res,
            err.status || 500,
            err.message || "Failed to delete post",
        );
    }
};

const toggleLike = async (req, res) => {
    try {
        const result = await postsService.toggleLike(
            req.params.id,
            req.user._id,
        );
        if (!result) return sendError(res, 404, "Post not found");
        sendResponse(res, 200, result.liked ? "Liked" : "Unliked", result);
    } catch (err) {
        console.error("toggleLike error:", err);
        sendError(res, 500, "Failed to toggle like");
    }
};

const addComment = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return sendError(res, 400, "Comment content is required");
        }
        const comment = await postsService.addComment(
            req.params.id,
            req.user._id,
            content.trim(),
        );
        if (!comment) return sendError(res, 404, "Post not found");
        sendResponse(res, 201, "Comment added", comment);
    } catch (err) {
        console.error("addComment error:", err);
        sendError(res, 500, "Failed to add comment");
    }
};

const getComments = async (req, res) => {
    try {
        const { cursor, limit } = req.query;
        const result = await postsService.getComments(
            req.params.id,
            cursor || null,
            parseInt(limit) || 20,
        );
        sendResponse(res, 200, "Comments retrieved", result);
    } catch (err) {
        console.error("getComments error:", err);
        sendError(res, 500, "Failed to retrieve comments");
    }
};

const getUserPosts = async (req, res) => {
    try {
        const { cursor, limit } = req.query;
        const result = await postsService.getUserPosts(
            req.params.id,
            cursor || null,
            parseInt(limit) || 10,
        );
        sendResponse(res, 200, "User posts retrieved", result);
    } catch (err) {
        console.error("getUserPosts error:", err);
        sendError(res, 500, "Failed to retrieve user posts");
    }
};

module.exports = {
    createPost,
    getFeed,
    getPostById,
    deletePost,
    toggleLike,
    addComment,
    getComments,
    getUserPosts,
};
