/**
 * Flow 4: Thông báo realtime khi có like, comment, friend request
 */
const request = require('supertest');
const { setup, teardown } = require('../setup');

const mockPusher = {
  trigger: jest.fn().mockResolvedValue(true),
  authorizeChannel: jest.fn(() => ({ auth: 'mock' })),
};

jest.mock('../../src/config/pusher', () => mockPusher);

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

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  await setup();
  app = require('../../src/app');
});

afterAll(async () => {
  await teardown();
});

describe('Flow 4: Realtime Notifications', () => {
  let tokenA, tokenB;
  let userAId, userBId;
  let postId;

  // ── Setup: create 2 users, A creates a post ───────────────────────
  it('register User A (post author)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Author',
        username: 'author',
        email: 'author@example.com',
        password: 'Password123',
      });
    tokenA = res.body.data.accessToken;
    userAId = res.body.data.user._id;
  });

  it('register User B (interactor)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Liker',
        username: 'liker',
        email: 'liker@example.com',
        password: 'Password123',
      });
    tokenB = res.body.data.accessToken;
    userBId = res.body.data.user._id;
  });

  it('A creates a post', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('content', 'Notification test post');

    expect(res.status).toBe(201);
    postId = res.body.data._id;
  });

  // ── Notification 1: Like → notify post author ─────────────────────
  it('B likes A\'s post → A gets notification via Pusher', async () => {
    mockPusher.trigger.mockClear();

    const res = await request(app)
      .post(`/api/v1/posts/${postId}/like`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data.liked).toBe(true);

    // Wait for async notification to be created and pushed
    await delay(200);

    // Pusher should push notification to A
    expect(mockPusher.trigger).toHaveBeenCalledWith(
      `private-user-${userAId}`,
      'new-notification',
      expect.objectContaining({
        type: 'like',
        message: 'liked your post',
        actor: expect.objectContaining({ name: 'Liker' }),
      }),
    );
  });

  // ── Notification 2: Comment → notify post author ───────────────────
  it('B comments on A\'s post → A gets notification via Pusher', async () => {
    mockPusher.trigger.mockClear();

    const res = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'Nice post!' });

    expect(res.status).toBe(201);

    // Wait for async notification
    await delay(200);

    // Pusher should push notification to A
    expect(mockPusher.trigger).toHaveBeenCalledWith(
      `private-user-${userAId}`,
      'new-notification',
      expect.objectContaining({
        type: 'comment',
        message: 'commented on your post',
        actor: expect.objectContaining({ name: 'Liker' }),
      }),
    );
  });

  // ── Self-like should NOT create notification ───────────────────────
  it('A likes own post → no notification pushed', async () => {
    mockPusher.trigger.mockClear();

    const res = await request(app)
      .post(`/api/v1/posts/${postId}/like`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);

    // Wait for any potential async notification
    await delay(200);

    // Pusher should NOT be called for self-like notification
    const notifCalls = mockPusher.trigger.mock.calls.filter(
      (call) => call[1] === 'new-notification'
    );
    expect(notifCalls).toHaveLength(0);
  });

  // ── Notification 3: Friend request → notify recipient ─────────────
  it('B sends friend request to A → A gets notification', async () => {
    mockPusher.trigger.mockClear();

    const res = await request(app)
      .post(`/api/v1/friends/request/${userAId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(201);

    await delay(200);

    expect(mockPusher.trigger).toHaveBeenCalledWith(
      `private-user-${userAId}`,
      'new-notification',
      expect.objectContaining({
        type: 'friend_request',
        message: 'sent you a friend request',
      }),
    );
  });

  // ── Notification 4: Accept friend → notify requester ───────────────
  it('A accepts friend request → B gets notification', async () => {
    mockPusher.trigger.mockClear();

    const res = await request(app)
      .patch(`/api/v1/friends/request/${userBId}/accept`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);

    await delay(200);

    expect(mockPusher.trigger).toHaveBeenCalledWith(
      `private-user-${userBId}`,
      'new-notification',
      expect.objectContaining({
        type: 'friend_accept',
        message: 'accepted your friend request',
      }),
    );
  });

  // ── Verify notifications stored in DB ──────────────────────────────
  it('A should have 3 notifications (like, comment, friend_request)', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const types = res.body.data.notifications.map((n) => n.type);
    expect(types).toContain('like');
    expect(types).toContain('comment');
    expect(types).toContain('friend_request');
    expect(res.body.data.unreadCount).toBe(3);
  });

  it('B should have 1 notification (friend_accept)', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.notifications[0].type).toBe('friend_accept');
  });

  // ── Mark all read ──────────────────────────────────────────────────
  it('A marks all notifications as read', async () => {
    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
  });

  it('unread count should be 0 after marking all read', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(0);
  });
});
