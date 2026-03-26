const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["like", "comment", "friend_request", "friend_accept"],
            required: true,
        },
        targetRef: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "targetModel",
        },
        targetModel: {
            type: String,
            enum: ["Post", "Friendship"],
        },
        message: {
            type: String,
            default: "",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
);

// Index for fast retrieval of user's notifications
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
