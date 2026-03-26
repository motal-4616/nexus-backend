/**
 * Flow 2: Kết bạn → Chat realtime giữa 2 tài khoản
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

beforeAll(async () => {
  await setup();
  app = require('../../src/app');
});

afterAll(async () => {
  await teardown();
});

describe('Flow 2: Friends → Chat', () => {
  let tokenA, tokenB;
  let userAId, userBId;
  let conversationId;

  // ── Setup: create 2 users ──────────────────────────────────────────
  it('should register User A', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Alice',
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password123',
      });

    expect(res.status).toBe(201);
    tokenA = res.body.data.accessToken;
    userAId = res.body.data.user._id;
  });

  it('should register User B', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bob',
        username: 'bob',
        email: 'bob@example.com',
        password: 'Password123',
      });

    expect(res.status).toBe(201);
    tokenB = res.body.data.accessToken;
    userBId = res.body.data.user._id;
  });

  // ── Step 1: Send friend request ────────────────────────────────────
  it('A sends friend request to B', async () => {
    const res = await request(app)
      .post(`/api/v1/friends/request/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
  });

  it('B should see the pending request', async () => {
    const res = await request(app)
      .get('/api/v1/friends/requests')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data.requests).toHaveLength(1);
    expect(res.body.data.requests[0].name).toBe('Alice');
  });

  it('duplicate friend request should fail', async () => {
    const res = await request(app)
      .post(`/api/v1/friends/request/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
  });

  // ── Step 2: Accept friend request ──────────────────────────────────
  it('B accepts the friend request from A', async () => {
    const res = await request(app)
      .patch(`/api/v1/friends/request/${userAId}/accept`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });

  it('both should appear in each other\'s friends list', async () => {
    const resA = await request(app)
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.data.friends).toHaveLength(1);
    expect(resA.body.data.friends[0].name).toBe('Bob');

    const resB = await request(app)
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.data.friends).toHaveLength(1);
    expect(resB.body.data.friends[0].name).toBe('Alice');
  });

  it('friendship status should be "friends"', async () => {
    const res = await request(app)
      .get(`/api/v1/friends/status/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('friends');
  });

  // ── Step 3: Create conversation ────────────────────────────────────
  it('A creates a conversation with B', async () => {
    const res = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userBId });

    expect(res.status).toBe(200);
    expect(res.body.data.participants).toHaveLength(2);
    expect(res.body.data.type).toBe('private');

    conversationId = res.body.data._id;
  });

  it('creating same conversation again returns the existing one', async () => {
    const res = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userBId });

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(conversationId);
  });

  // ── Step 4: Send messages ──────────────────────────────────────────
  it('A sends a message to B', async () => {
    mockPusher.trigger.mockClear();

    const res = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('text', 'Hello Bob!');

    expect(res.status).toBe(201);
    expect(res.body.data.text).toBe('Hello Bob!');
    expect(res.body.data.sender.name).toBe('Alice');

    // Pusher should have been triggered for B
    expect(mockPusher.trigger).toHaveBeenCalledWith(
      `private-user-${userBId}`,
      'new-message',
      expect.objectContaining({
        message: expect.objectContaining({ text: 'Hello Bob!' }),
        conversationId,
      }),
    );
  });

  it('B sends a reply to A', async () => {
    mockPusher.trigger.mockClear();

    const res = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenB}`)
      .field('text', 'Hey Alice!');

    expect(res.status).toBe(201);
    expect(res.body.data.text).toBe('Hey Alice!');

    // Pusher should have been triggered for A
    expect(mockPusher.trigger).toHaveBeenCalledWith(
      `private-user-${userAId}`,
      'new-message',
      expect.objectContaining({
        message: expect.objectContaining({ text: 'Hey Alice!' }),
      }),
    );
  });

  // ── Step 5: Get messages ───────────────────────────────────────────
  it('should retrieve messages in chronological order', async () => {
    const res = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.messages).toHaveLength(2);
    expect(res.body.data.messages[0].text).toBe('Hello Bob!');
    expect(res.body.data.messages[1].text).toBe('Hey Alice!');
  });

  // ── Step 6: Mark seen ──────────────────────────────────────────────
  it('B marks messages as seen', async () => {
    mockPusher.trigger.mockClear();

    const res = await request(app)
      .patch(`/api/v1/conversations/${conversationId}/seen`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);

    // Pusher should notify A about seen
    expect(mockPusher.trigger).toHaveBeenCalledWith(
      `private-user-${userAId}`,
      'messages-seen',
      expect.objectContaining({
        conversationId,
        seenBy: expect.any(String),
      }),
    );
  });

  // ── Step 7: Conversations list ─────────────────────────────────────
  it('A should see the conversation with last message', async () => {
    const res = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].lastMessage.text).toBe('Hey Alice!');
  });

  // ── Step 8: Unfriend ───────────────────────────────────────────────
  it('A unfriends B', async () => {
    const res = await request(app)
      .delete(`/api/v1/friends/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
  });

  it('friendship status should be "none" after unfriend', async () => {
    const res = await request(app)
      .get(`/api/v1/friends/status/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('none');
  });
});
