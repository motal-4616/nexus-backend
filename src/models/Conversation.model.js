const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        type: {
            type: String,
            enum: ["private", "group"],
            default: "private",
        },
        lastMessage: {
            sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            text: { type: String, default: "" },
            createdAt: { type: Date },
        },
        unreadCount: {
            type: Map,
            of: Number,
            default: {},
        },
    },
    { timestamps: true },
);

// Index for fast lookup of user's conversations
conversationSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
