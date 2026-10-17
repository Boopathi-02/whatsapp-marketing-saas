import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './helpers/db.js';
import { emailService } from '../utils/email.js';

describe('Authentication & Session Integration Tests', () => {
  const app = createApp();

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new user, issue tokens, and provision a workspace', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'Password123!',
          displayName: 'Alice Johnson',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.displayName).toBe('Alice Johnson');
      expect(res.body.data.user.isEmailVerified).toBe(false);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('workspace');
      expect(res.body.data.workspace.role).toBe('owner');

      // Check HttpOnly refresh token cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should reject duplicate email registration with 409 EMAIL_ALREADY_EXISTS', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          displayName: 'First User',
        });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'DUPLICATE@example.com', // Case-insensitive normalization check
          password: 'Password456!',
          displayName: 'Second User',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject invalid password formats (too short or missing digits)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'weak@example.com',
          password: 'weak',
          displayName: 'Weak User',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'bob@example.com',
          password: 'SecurePassword123!',
          displayName: 'Bob Smith',
        });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'SecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('bob@example.com');
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid password with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh (Rotation & Reuse Detection)', () => {
    it('should rotate refresh token and issue a new access token', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'charlie@example.com',
          password: 'Password123!',
          displayName: 'Charlie',
        });

      const initialRefreshToken = regRes.body.data.refreshToken;

      // 1. First refresh with initial token
      const refresh1 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      expect(refresh1.status).toBe(200);
      expect(refresh1.body.success).toBe(true);
      expect(refresh1.body.data).toHaveProperty('accessToken');
      expect(refresh1.body.data).toHaveProperty('refreshToken');

      const secondRefreshToken = refresh1.body.data.refreshToken;
      expect(secondRefreshToken).not.toBe(initialRefreshToken);

      // 2. Refresh with second token works
      const refresh2 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: secondRefreshToken });

      expect(refresh2.status).toBe(200);
    });

    it('should detect token reuse and immediately revoke the entire token family', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'reuse@example.com',
          password: 'Password123!',
          displayName: 'Reuse Tester',
        });

      const initialRefreshToken = regRes.body.data.refreshToken;

      // Legitimate client rotates token
      const refresh1 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      const newLegitToken = refresh1.body.data.refreshToken;

      // Attacker or replay attempts to use the OLD (already rotated) token
      const reuseAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      expect(reuseAttempt.status).toBe(401);
      expect(reuseAttempt.body.error.code).toBe('TOKEN_REVOKED');

      // Now legitimate client's new token MUST ALSO BE REVOKED because the whole family is invalidated!
      const legitAttemptAfterReuse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: newLegitToken });

      expect(legitAttemptAfterReuse.status).toBe(401);
      expect(legitAttemptAfterReuse.body.error.code).toBe('TOKEN_REVOKED');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user when authenticated with Bearer token', async () => {
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'david@example.com',
          password: 'Password123!',
          displayName: 'David Miller',
        });

      const token = reg.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('david@example.com');
      expect(res.body.data.displayName).toBe('David Miller');
    });

    it('should reject requests without authorization token with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Email Verification Workflow', () => {
    it('should verify email address with valid single-use token', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'verify@example.com',
          password: 'Password123!',
          displayName: 'Verify User',
        });

      const token = emailService.lastSentVerificationToken?.token;
      expect(token).toBeDefined();

      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      // Consuming the token a second time MUST fail (single-use enforcement)
      const secondAttempt = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token });

      expect(secondAttempt.status).toBe(400);
      expect(secondAttempt.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Password Reset Workflow', () => {
    it('should handle forgot password and reset password with session revocation', async () => {
      // 1. Register user
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'resetme@example.com',
          password: 'OldPassword123!',
          displayName: 'Reset User',
        });

      const oldRefreshToken = reg.body.data.refreshToken;

      // 2. Request password reset
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'resetme@example.com' });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);

      const resetToken = emailService.lastSentPasswordResetToken?.token;
      expect(resetToken).toBeDefined();

      // 3. Reset password with single-use token
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123!',
        });

      expect(resetRes.status).toBe(200);

      // 4. Token cannot be reused
      const replayRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'AnotherPassword123!',
        });
      expect(replayRes.status).toBe(400);

      // 5. Old sessions must be revoked
      const refreshOld = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken });
      expect(refreshOld.status).toBe(401);

      // 6. Old password fails, new password succeeds
      const oldLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'resetme@example.com', password: 'OldPassword123!' });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'resetme@example.com', password: 'NewPassword123!' });
      expect(newLogin.status).toBe(200);
    });
  });
});
