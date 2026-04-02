const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
    {
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        targetType: {
            type: String,
            enum: ["post", "user", "comment"],
            required: true,
        },
        targetPost: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: null,
        },
        targetUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        targetComment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
        reason: {
            type: String,
            required: [true, "Reason is required"],
            maxlength: [500, "Reason cannot exceed 500 characters"],
        },
        status: {
            type: String,
            enum: ["pending", "resolved", "dismissed"],
            default: "pending",
        },
        autoFlagged: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
);

reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
