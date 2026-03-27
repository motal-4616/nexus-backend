const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        content: {
            type: String,
            default: "",
            maxlength: [2000, "Post content cannot exceed 2000 characters"],
        },
        media: [
            {
                url: { type: String, required: true },
                publicId: { type: String },
                type: {
                    type: String,
                    enum: ["image", "video"],
                    default: "image",
                },
            },
        ],
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        likesCount: { type: Number, default: 0 },
        commentsCount: { type: Number, default: 0 },
        audience: {
            type: String,
            enum: ["public", "friends", "private"],
            default: "public",
        },
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

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, _id: -1 });
postSchema.index({ audience: 1, _id: -1 });

module.exports = mongoose.model("Post", postSchema);
