import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './helpers/db.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WhatsAppAccountModel,
  OnboardingSessionModel,
} from '@whatsapp-saas/database';
import { JwtUtil } from '../utils/jwt.js';
import { decryptCredential } from '../utils/crypto.js';

describe('WhatsApp Business Account Management & Security Tests', () => {
  const app = createApp();

  let userOwner: any;
  let userViewer: any;
  let userOther: any;
  let workspaceA: any;
  let workspaceB: any;
  let tokenOwner: string;
  let tokenViewer: string;
  let tokenOther: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // User Owner for Workspace A
    userOwner = await UserModel.create({
      email: 'owner@example.com',
      passwordHash: 'hash',
      displayName: 'Owner User',
      emailVerified: true,
      accountStatus: 'active',
    });
    workspaceA = await WorkspaceModel.create({
      name: 'Workspace Alpha',
      slug: 'workspace-alpha',
      ownerId: userOwner._id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspaceA._id,
      userId: userOwner._id,
      role: 'owner',
      status: 'active',
    });
    tokenOwner = JwtUtil.signAccessToken({
      sub: userOwner._id.toString(),
      email: userOwner.email,
      displayName: userOwner.displayName,
    });

    // User Viewer for Workspace A
    userViewer = await UserModel.create({
      email: 'viewer@example.com',
      passwordHash: 'hash',
      displayName: 'Viewer User',
      emailVerified: true,
      accountStatus: 'active',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspaceA._id,
      userId: userViewer._id,
      role: 'viewer',
      status: 'active',
    });
    tokenViewer = JwtUtil.signAccessToken({
      sub: userViewer._id.toString(),
      email: userViewer.email,
      displayName: userViewer.displayName,
    });

    // User Other with Workspace B
    userOther = await UserModel.create({
      email: 'other@example.com',
      passwordHash: 'hash',
      displayName: 'Other User',
      emailVerified: true,
      accountStatus: 'active',
    });
    workspaceB = await WorkspaceModel.create({
      name: 'Workspace Beta',
      slug: 'workspace-beta',
      ownerId: userOther._id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspaceB._id,
      userId: userOther._id,
      role: 'owner',
      status: 'active',
    });
    tokenOther = JwtUtil.signAccessToken({
      sub: userOther._id.toString(),
      email: userOther.email,
      displayName: userOther.displayName,
    });
  });

  describe('Connect WhatsApp Business Account', () => {
    it('should connect WABA, encrypt access token at rest, and omit token from response', async () => {
      const plainToken = 'EAAG_Meta_Super_Secret_Production_Token_123';
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          wabaId: '1029384756',
          phoneNumberId: '9876543210',
          accessToken: plainToken,
          displayName: 'Alpha WhatsApp Support',
          displayPhoneNumber: '+1 555-0199',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.phoneNumberId).toBe('9876543210');
      expect(res.body.data.status).toBe('connected');

      // CRITICAL SECURITY ASSERTION: Token must never be present in the response
      expect(res.body.data.accessToken).toBeUndefined();
      expect(res.body.data.accessTokenEncrypted).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain(plainToken);

      // Verify stored database record: token must be stored encrypted using AES-256-GCM
      const storedAccount = await WhatsAppAccountModel.findById(res.body.data.id);
      expect(storedAccount).toBeDefined();
      expect(storedAccount?.accessTokenEncrypted).toBeDefined();
      expect(storedAccount?.accessTokenEncrypted).not.toContain(plainToken);

      // Decrypt to verify that authentic encryption was applied
      const decrypted = decryptCredential(storedAccount!.accessTokenEncrypted);
      expect(decrypted).toBe(plainToken);
    });

    it('should reject non-admin users from connecting accounts (RBAC)', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({
          wabaId: '1029384756',
          phoneNumberId: '9876543210',
          accessToken: 'some_token',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Metadata Synchronization & Disconnection', () => {
    it('should sync phone number metadata and templates from adapter', async () => {
      // Connect account first
      const connectRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          wabaId: 'waba_sync_test',
          phoneNumberId: 'phone_sync_test',
          accessToken: 'valid_mock_token',
          displayName: 'Initial Name',
          displayPhoneNumber: '+1 555-0000',
        });

      const accountId = connectRes.body.data.id;

      // Trigger sync
      const syncRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/${accountId}/sync`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(syncRes.status).toBe(200);
      expect(syncRes.body.success).toBe(true);
      expect(syncRes.body.data.syncedPhoneDetails).toBeDefined();
      expect(syncRes.body.data.account.qualityRating).toBeDefined();
    });

    it('should disconnect account safely', async () => {
      const connectRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          wabaId: 'waba_disconnect_test',
          phoneNumberId: 'phone_disconnect_test',
          accessToken: 'valid_mock_token',
          displayName: 'To Disconnect',
          displayPhoneNumber: '+1 555-0000',
        });

      const accountId = connectRes.body.data.id;

      const disconnectRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/${accountId}/disconnect`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(disconnectRes.status).toBe(200);
      expect(disconnectRes.body.data.status).toBe('disconnected');
    });
  });

  describe('Tenant Isolation for WhatsApp Accounts', () => {
    it('should never expose Workspace A accounts to User B', async () => {
      await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          wabaId: 'alpha_waba',
          phoneNumberId: 'alpha_phone',
          accessToken: 'alpha_token',
          displayName: 'Alpha Secret Line',
          displayPhoneNumber: '+1 555-1111',
        });

      // User B lists their accounts
      const resB = await request(app)
        .get(`/api/v1/workspaces/${workspaceB._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenOther}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.length).toBe(0); // Workspace B has 0 accounts

      // User B attempts to access Workspace A's endpoint
      const resTamper = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenOther}`);

      expect(resTamper.status).toBe(403);
    });

    it('should reject registering a phone number ID already active in another workspace (Phone Hijacking Defense)', async () => {
      // Connect in Workspace A
      const connectA = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          wabaId: 'waba_shared_id',
          phoneNumberId: 'phone_shared_id_123',
          accessToken: 'valid_mock_token',
          displayName: 'Workspace A Line',
          displayPhoneNumber: '+1 555-7777',
        });

      expect(connectA.status).toBe(201);

      // Workspace B tries to hijack the exact same phone number ID
      const connectB = await request(app)
        .post(`/api/v1/workspaces/${workspaceB._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenOther}`)
        .send({
          wabaId: 'waba_adversary_id',
          phoneNumberId: 'phone_shared_id_123',
          accessToken: 'valid_mock_token',
          displayName: 'Workspace B Hijack Attempt',
          displayPhoneNumber: '+1 555-7777',
        });

      expect(connectB.status).toBe(409);
      expect(connectB.body.error.message).toContain('already connected to another workspace');
    });
  });

  describe('Meta WhatsApp Embedded Signup v4 Integration Tests', () => {
    it('should return public Embedded Signup v4 configuration to authorized workspace members', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/config`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appId).toBeDefined();
      expect(res.body.data.configId).toBeDefined();
      expect(res.body.data.graphApiVersion).toBeDefined();
      // App secret must never be in config response
      expect(res.body.data.appSecret).toBeUndefined();
    });

    it('should reject unauthorized users from accessing signup config', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/config`);

      expect(res.status).toBe(401);
    });

    it('should successfully complete Embedded Signup v4, exchange code, encrypt token, and register phone', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          code: 'valid_auth_code_from_fb_login_123',
          wabaId: 'waba_mock_123',
          phoneNumberId: 'phone_mock_123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.phoneNumberId).toBe('phone_mock_123');
      expect(res.body.data.wabaId).toBe('waba_mock_123');
      expect(res.body.data.status).toBe('connected');

      // CRITICAL SECURITY ASSERTION: No tokens in API response
      expect(res.body.data.accessToken).toBeUndefined();
      expect(res.body.data.accessTokenEncrypted).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('mock_access_token');

      // Database verification: token is encrypted using AES-256-GCM
      const stored = await WhatsAppAccountModel.findById(res.body.data.id);
      expect(stored).toBeDefined();
      expect(stored?.accessTokenEncrypted).toBeDefined();
      expect(stored?.accessTokenEncrypted).not.toContain('mock_access_token');

      const decrypted = decryptCredential(stored!.accessTokenEncrypted);
      expect(decrypted).toBe('mock_access_token_for_valid_auth_code_from_fb_login_123');
    });

    it('should be idempotent and update account if reconnected with fresh code', async () => {
      // First connection
      const firstRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          code: 'code_initial',
          wabaId: 'waba_idempotent_test',
          phoneNumberId: 'phone_idempotent_test',
        });

      expect(firstRes.status).toBe(201);
      const initialId = firstRes.body.data.id;

      // Reconnect same phone number in same workspace with new code
      const secondRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          code: 'code_refreshed',
          wabaId: 'waba_idempotent_test',
          phoneNumberId: 'phone_idempotent_test',
        });

      expect(secondRes.status).toBe(201);
      // Upsert must update the existing record rather than creating a duplicate
      expect(secondRes.body.data.id).toBe(initialId);

      // Verify token in DB was updated to new token
      const stored = await WhatsAppAccountModel.findById(initialId);
      const decrypted = decryptCredential(stored!.accessTokenEncrypted);
      expect(decrypted).toBe('mock_access_token_for_code_refreshed');
    });

    it('should prevent cross-tenant phone hijacking via Embedded Signup (Tenant Isolation)', async () => {
      // Connect phone in Workspace A
      const resA = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          code: 'auth_code_workspace_a',
          wabaId: 'waba_tenant_isolation',
          phoneNumberId: 'phone_tenant_isolation_456',
        });

      expect(resA.status).toBe(201);

      // Workspace B tries to onboard the exact same phone number
      const resB = await request(app)
        .post(`/api/v1/workspaces/${workspaceB._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenOther}`)
        .send({
          code: 'auth_code_workspace_b',
          wabaId: 'waba_other_tenant',
          phoneNumberId: 'phone_tenant_isolation_456',
        });

      expect(resB.status).toBe(409);
      expect(resB.body.error.message).toContain('already connected to another workspace');
    });

    it('should reject invalid authorization code with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          code: 'invalid_code',
          wabaId: 'waba_invalid_test',
          phoneNumberId: 'phone_invalid_test',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Failed to exchange authorization code with Meta');
    });

    it('should enforce RBAC: reject non-admin members from connecting via Embedded Signup', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({
          code: 'valid_auth_code_from_fb_login_123',
          wabaId: 'waba_mock_123',
          phoneNumberId: 'phone_mock_123',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Onboarding Session & CSRF Replay Protection', () => {
    it('should create a cryptographically secure onboarding session with stateToken', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/onboarding/session`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.stateToken).toBeDefined();
      expect(res.body.data.stateToken.length).toBeGreaterThanOrEqual(32);
      expect(res.body.data.appId).toBeDefined();
      expect(res.body.data.configId).toBeDefined();
      expect(res.body.data.graphApiVersion).toBeDefined();
      expect(res.body.data.expiresAt).toBeDefined();

      // Verify stored in DB
      const session = await OnboardingSessionModel.findById(res.body.data.sessionId);
      expect(session).toBeDefined();
      expect(session?.workspaceId.toString()).toBe(workspaceA._id.toString());
      expect(session?.userId.toString()).toBe(userOwner._id.toString());
      expect(session?.status).toBe('pending');
    });

    it('should enforce RBAC: reject non-admin from creating onboarding session', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/onboarding/session`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('should complete Embedded Signup with a valid stateToken and mark session used', async () => {
      // 1. Create onboarding session
      const sessionRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/onboarding/session`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({});

      expect(sessionRes.status).toBe(201);
      const { stateToken, sessionId } = sessionRes.body.data;

      // 2. Complete signup using stateToken
      const signupRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          code: 'valid_auth_code_from_fb_login_123',
          stateToken,
          wabaId: 'waba_csrf_test_1',
          phoneNumberId: 'phone_csrf_test_1',
        });

      expect(signupRes.status).toBe(201);
      expect(signupRes.body.success).toBe(true);
      expect(signupRes.body.data.phoneNumberId).toBe('phone_csrf_test_1');

      // 3. Verify session is marked as completed in DB
      const sessionInDb = await OnboardingSessionModel.findById(sessionId);
      expect(sessionInDb?.status).toBe('completed');

      // 4. Replay attack attempt: Using the same stateToken again MUST fail with 400
      const replayRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          code: 'another_valid_code',
          stateToken,
          wabaId: 'waba_csrf_test_1',
          phoneNumberId: 'phone_csrf_test_1',
        });

      expect(replayRes.status).toBe(400);
      expect(replayRes.body.error.message).toContain('Invalid, expired, or previously used onboarding session');
    });

    it('should reject tampered or non-existent stateToken', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          code: 'valid_auth_code_from_fb_login_123',
          stateToken: 'tampered_or_fabricated_random_state_token_123',
          wabaId: 'waba_fake_csrf',
          phoneNumberId: 'phone_fake_csrf',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid, expired, or previously used onboarding session');
    });

    it('should reject stateToken issued for a different workspace (Cross-Tenant Replay Prevention)', async () => {
      // 1. Create session in Workspace A
      const sessionResA = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/onboarding/session`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({});

      const stateTokenA = sessionResA.body.data.stateToken;

      // 2. Try to use stateTokenA in Workspace B
      const resB = await request(app)
        .post(`/api/v1/workspaces/${workspaceB._id}/whatsapp-accounts/embedded-signup`)
        .set('Authorization', `Bearer ${tokenOther}`)
        .send({
          code: 'auth_code_workspace_b',
          stateToken: stateTokenA,
          wabaId: 'waba_cross_tenant_session',
          phoneNumberId: 'phone_cross_tenant_session',
        });

      expect(resB.status).toBe(400);
      expect(resB.body.error.message).toContain('Invalid, expired, or previously used onboarding session');
    });
  });

  describe('Connection Health & Security Observability', () => {
    it('should return connection health metrics for a connected account', async () => {
      // Create connected account
      const connectRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          wabaId: 'waba_health_test',
          phoneNumberId: 'phone_health_test',
          accessToken: 'EAAG_valid_health_token',
          displayName: 'Health Test Number',
          displayPhoneNumber: '+1 555-0199',
        });

      expect(connectRes.status).toBe(201);
      const accountId = connectRes.body.data.id;

      // Check health
      const healthRes = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts/${accountId}/health`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(healthRes.status).toBe(200);
      expect(healthRes.body.success).toBe(true);
      expect(healthRes.body.data.accountId).toBe(accountId);
      expect(healthRes.body.data.status).toBe('connected');
      expect(healthRes.body.data.tokenValid).toBe(true);
      expect(healthRes.body.data.permissionsValid).toBe(true);
      expect(healthRes.body.data.wabaSubscribed).toBe(true);
      expect(healthRes.body.data.phoneRegistered).toBe(true);
      expect(Array.isArray(healthRes.body.data.issues)).toBe(true);
      expect(healthRes.body.data.lastCheckedAt).toBeDefined();
    });

    it('should reject health check on accounts belonging to another workspace (Tenant Isolation)', async () => {
      // Account created in Workspace A
      const connectRes = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/whatsapp-accounts`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({
          wabaId: 'waba_isolation_health',
          phoneNumberId: 'phone_isolation_health',
          accessToken: 'EAAG_valid_health_token',
        });

      const accountId = connectRes.body.data.id;

      // User from Workspace B tries to query health of Workspace A's account
      const resB = await request(app)
        .get(`/api/v1/workspaces/${workspaceB._id}/whatsapp-accounts/${accountId}/health`)
        .set('Authorization', `Bearer ${tokenOther}`);

      expect(resB.status).toBe(404);
      expect(resB.body.error.message).toContain('not found in this workspace');
    });
  });
});

