/**
 * Flow 1: Đăng ký → Đăng nhập → Đổi avatar → Tạo bài → Like/comment
 */
const request = require('supertest');
const { setup, teardown } = require('../setup');

// Mock Pusher to prevent real API calls
jest.mock('../../src/config/pusher', () => ({
  trigger: jest.fn().mockResolvedValue(true),
  authorizeChannel: jest.fn(() => ({ auth: 'mock' })),
}));

// Mock Cloudinary upload middleware — just pass through with fake file data
jest.mock('../../src/middlewares/upload.middleware', () => {
  const multer = require('multer');
  const storage = multer.memoryStorage();
  return {
    uploadAvatar: multer({ storage }),
    uploadPostMedia: multer({ storage }),
    uploadChatMedia: multer({ storage }),
  };
});

let app;

beforeAll(async () => {
  await setup();
  app = require('../../src/app');
});

afterAll(async () => {
  await teardown();
});

describe('Flow 1: Register → Login → Profile → Post → Like/Comment', () => {
  let accessToken;
  let refreshToken;
  let userId;
  let postId;

  // ── Step 1: Register ──────────────────────────────────────────────
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.name).toBe('Test User');
    expect(res.body.data.user.username).toBe('testuser');
    // Password should NOT be in response
    expect(res.body.data.user.password).toBeUndefined();

    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
    userId = res.body.data.user._id;
  });

  // ── Step 2: Duplicate register should fail ─────────────────────────
  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Another User',
        username: 'another',
        email: 'test@example.com',
        password: 'Password123',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  // ── Step 3: Login ──────────────────────────────────────────────────
  it('should login with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');

    // Update tokens (login gives fresh ones)
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

    expect(res.status).toBe(401);
  });

  // ── Step 4: Update profile (name & bio) ────────────────────────────
  it('should update profile name and bio', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('name', 'Updated Name')
      .field('bio', 'Hello from tests');

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
    expect(res.body.data.bio).toBe('Hello from tests');
  });

  it('should get my profile with updated data', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
    expect(res.body.data.bio).toBe('Hello from tests');
  });

  // ── Step 5: Create post ────────────────────────────────────────────
  it('should create a text post', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('content', 'My first post!');

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('My first post!');
    expect(res.body.data.author.name).toBe('Updated Name');

    postId = res.body.data._id;
  });

  it('should reject empty post', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  // ── Step 6: Get post detail ────────────────────────────────────────
  it('should get post by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/posts/${postId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('My first post!');
    expect(res.body.data.likesCount).toBe(0);
  });

  // ── Step 7: Like post ──────────────────────────────────────────────
  it('should like the post', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${postId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.liked).toBe(true);
    expect(res.body.data.likesCount).toBe(1);
  });

  it('should unlike the post (toggle)', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${postId}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.liked).toBe(false);
    expect(res.body.data.likesCount).toBe(0);
  });

  // ── Step 8: Comment on post ────────────────────────────────────────
  it('should add a comment', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'Great post!' });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('Great post!');
    expect(res.body.data.author.name).toBe('Updated Name');
  });

  it('should get comments for the post', async () => {
    const res = await request(app)
      .get(`/api/v1/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.comments).toHaveLength(1);
    expect(res.body.data.comments[0].content).toBe('Great post!');
  });

  // ── Step 9: Feed should contain the post ───────────────────────────
  it('should show post in feed', async () => {
    const res = await request(app)
      .get('/api/v1/posts/feed')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.posts.length).toBeGreaterThan(0);
    expect(res.body.data.posts[0].content).toBe('My first post!');
  });

  // ── Step 10: Delete post ───────────────────────────────────────────
  it('should delete the post', async () => {
    const res = await request(app)
      .delete(`/api/v1/posts/${postId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });

  it('should return 404 for deleted post', async () => {
    const res = await request(app)
      .get(`/api/v1/posts/${postId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  // ── Step 11: Refresh token ─────────────────────────────────────────
  it('should refresh the access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  // ── Step 12: Logout ────────────────────────────────────────────────
  it('should logout successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken });

    expect(res.status).toBe(200);
  });
});
