const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

// Parse allowed origins from FRONTEND_URL env var (comma-separated)
const allowedOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Security & logging middleware
app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, curl)
            if (!origin) return callback(null, true);
            if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            callback(new Error(`CORS: origin '${origin}' not allowed`));
        },
        credentials: true,
    }),
);
if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/v1/health", (req, res) => {
    res.json({ status: "ok", app: "Nexus API", timestamp: new Date() });
});

// Routes
app.use("/api/v1/auth", require("./modules/auth/auth.routes"));
app.use("/api/v1/users", require("./modules/users/users.routes"));
app.use("/api/v1/posts", require("./modules/posts/posts.routes"));
app.use("/api/v1/friends", require("./modules/friends/friends.routes"));
app.use("/api/v1/conversations", require("./modules/messages/messages.routes"));
app.use(
    "/api/v1/notifications",
    require("./modules/notifications/notifications.routes"),
);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
    });
});

module.exports = app;
