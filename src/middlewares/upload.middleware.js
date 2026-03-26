const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "nexus/avatars",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
        ],
    },
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

const postMediaStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "nexus/posts",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "mov"],
        resource_type: "auto",
    },
});

const uploadPostMedia = multer({
    storage: postMediaStorage,
    limits: { fileSize: 20 * 1024 * 1024 },
});

const chatMediaStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "nexus/chat",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "mov"],
        resource_type: "auto",
    },
});

const uploadChatMedia = multer({
    storage: chatMediaStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { uploadAvatar, uploadPostMedia, uploadChatMedia };
