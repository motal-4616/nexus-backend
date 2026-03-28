const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");

const app = express();

// Parse allowed origins from FRONTEND_URL env var (comma-separated)
const configuredOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Always allow Capacitor/Ionic mobile app origins
const mobileOrigins = [
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    "https://localhost",
    "http://localhost:8100",
    "http://localhost:4200",
];

// Allow the backend's own public URL (for admin panel same-origin API calls)
const selfOrigins = process.env.RAILWAY_PUBLIC_DOMAIN
    ? [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`]
    : [];

const allowedOrigins = [...mobileOrigins, ...configuredOrigins, ...selfOrigins];

// Security & logging middleware
app.use(compression());

// Relaxed helmet for admin panel (allows CDN scripts/styles)
app.use(
    "/admin",
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }),
);
// Strict helmet for API routes
app.use("/api", helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (Postman, curl, server-to-server)
            if (!origin) return callback(null, true);
            if (
                configuredOrigins.length === 0 ||
                allowedOrigins.includes(origin)
            ) {
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
app.use("/api/v1/stories", require("./modules/stories/stories.routes"));
app.use("/api/v1/reports", require("./modules/reports/reports.routes"));
app.use("/api/v1/admin", require("./modules/admin/admin.routes"));

// Serve admin panel
app.use("/admin", express.static(path.join(__dirname, "admin")));

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
