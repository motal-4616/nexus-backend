/**
 * Flow 3: Quên mật khẩu → Nhận email → Reset password
 */
const crypto = require("crypto");
const request = require("supertest");
const { setup, teardown } = require("../setup");

jest.mock("../../src/config/pusher", () => ({
    trigger: jest.fn().mockResolvedValue(true),
    authorizeChannel: jest.fn(() => ({ auth: "mock" })),
}));

jest.mock("../../src/middlewares/upload.middleware", () => {
    const multer = require("multer");
    const storage = multer.memoryStorage();
    return {
        uploadAvatar: multer({ storage }),
        uploadPostMedia: multer({ storage }),
        uploadChatMedia: multer({ storage }),
    };
});

// Mock Brevo email — capture the reset link instead of sending
let capturedResetLink = null;
jest.mock("../../src/utils/email.util", () => ({
    sendResetEmail: jest.fn(async (email, resetLink) => {
        capturedResetLink = resetLink;
    }),
}));

let app;

beforeAll(async () => {
    await setup();
    app = require("../../src/app");
});

afterAll(async () => {
    await teardown();
});

describe("Flow 3: Forgot Password → Email → Reset", () => {
    const email = "forgot@example.com";
    const oldPassword = "OldPassword123";
    const newPassword = "NewPassword456";
    let resetToken;

    // ── Setup: Register a user ─────────────────────────────────────────
    it("should register a user", async () => {
        const res = await request(app).post("/api/v1/auth/register").send({
            name: "Forgot User",
            username: "forgotuser",
            email,
            password: oldPassword,
        });

        expect(res.status).toBe(201);
    });

    // ── Step 1: Request password reset ─────────────────────────────────
    it("should accept forgot-password request", async () => {
        capturedResetLink = null;

        const res = await request(app)
            .post("/api/v1/auth/forgot-password")
            .send({ email });

        expect(res.status).toBe(200);
        // Should always say the same message (anti-enumeration)
        expect(res.body.message).toContain("reset link");

        // The email mock should have captured the link
        expect(capturedResetLink).toBeTruthy();

        // Extract raw token from the link (last path segment)
        const url = new URL(capturedResetLink);
        resetToken = url.pathname.split("/").pop();
        expect(resetToken).toBeDefined();
        expect(resetToken.length).toBe(64); // 32 bytes hex
    });

    it("forgot-password for non-existent email should also return 200", async () => {
        const res = await request(app)
            .post("/api/v1/auth/forgot-password")
            .send({ email: "notexist@example.com" });

        expect(res.status).toBe(200);
    });

    // ── Step 2: Reset password with token ──────────────────────────────
    it("should reset password with valid token", async () => {
        const res = await request(app)
            .post(`/api/v1/auth/reset-password/${resetToken}`)
            .send({ password: newPassword });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain("reset successfully");
    });

    it("should reject reusing the same reset token", async () => {
        const res = await request(app)
            .post(`/api/v1/auth/reset-password/${resetToken}`)
            .send({ password: "AnotherPassword789" });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("invalid or has expired");
    });

    // ── Step 3: Login with new password ────────────────────────────────
    it("should login with the new password", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password: newPassword });

        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toBeDefined();
    });

    it("should reject login with the old password", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password: oldPassword });

        expect(res.status).toBe(401);
    });

    // ── Step 4: Invalid token should fail ──────────────────────────────
    it("should reject invalid reset token", async () => {
        const fakeToken = crypto.randomBytes(32).toString("hex");
        const res = await request(app)
            .post(`/api/v1/auth/reset-password/${fakeToken}`)
            .send({ password: "SomePassword123" });

        expect(res.status).toBe(400);
    });
});
