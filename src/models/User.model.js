const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            maxlength: [100, "Name cannot exceed 100 characters"],
        },
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            lowercase: true,
            trim: true,
            minlength: [3, "Username must be at least 3 characters"],
            maxlength: [30, "Username cannot exceed 30 characters"],
            match: [
                /^[a-z0-9_.]+$/,
                "Username can only contain letters, numbers, dots and underscores",
            ],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false,
        },
        bio: {
            type: String,
            default: "",
            maxlength: [300, "Bio cannot exceed 300 characters"],
        },
        avatar: {
            type: String,
            default: "",
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
        isBanned: {
            type: Boolean,
            default: false,
        },
        refreshToken: {
            type: String,
            default: null,
            select: false,
        },
        resetOTP: {
            type: String,
            default: null,
            select: false,
        },
        resetOTPExpiry: {
            type: Date,
            default: null,
            select: false,
        },
        lastActive: {
            type: Date,
            default: Date.now,
        },
        embedding: [Number],
        violationCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.password;
                delete ret.refreshToken;
                delete ret.resetOTP;
                delete ret.resetOTPExpiry;
                delete ret.__v;
                return ret;
            },
        },
    },
);

// Hash password before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Compare plain password with hashed
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
