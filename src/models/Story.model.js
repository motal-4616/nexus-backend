const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        media: {
            url: { type: String, required: true },
            publicId: { type: String },
            type: {
                type: String,
                enum: ["image", "video"],
                default: "image",
            },
        },
        duration: {
            type: Number,
            enum: [1, 4, 8, 12, 24],
            default: 24,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expireAfterSeconds: 0 },
        },
        views: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    },
);

module.exports = mongoose.model("Story", storySchema);
