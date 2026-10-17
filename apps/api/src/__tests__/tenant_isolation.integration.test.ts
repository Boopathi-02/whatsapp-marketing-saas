import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './helpers/db.js';

describe('Strict Multi-Tenant Isolation & IDOR Protection Tests', () => {
  const app = createApp();

  let userAToken: string;
  let userAWorkspaceId: string;

  let userBToken: string;
  let userBWorkspaceId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Register Customer A
    const regA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'customer_a@enterprise-a.com',
        password: 'Password123!',
        displayName: 'Customer A',
      });

    userAToken = regA.body.data.accessToken;
    userAWorkspaceId = regA.body.data.workspace.id;

    // Register Customer B
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'customer_b@enterprise-b.com',
        password: 'Password123!',
        displayName: 'Customer B',
      });

    userBToken = regB.body.data.accessToken;
    userBWorkspaceId = regB.body.data.workspace.id;
  });

  describe('Direct Object Reference & Cross-Tenant Read/Write Protection', () => {
    it('Customer A cannot read Customer B workspace details (IDOR blocked)', async () => {
      // User A attempts to read User B's workspace by providing User B's workspace ID
      const res = await request(app)
        .get(`/api/v1/workspaces/${userBWorkspaceId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Customer A cannot modify Customer B workspace name (IDOR blocked)', async () => {
      // User A attempts to update User B's workspace
      const res = await request(app)
        .patch(`/api/v1/workspaces/${userBWorkspaceId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Hacked by Customer A' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Customer A cannot list Customer B workspace members', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${userBWorkspaceId}/members`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Customer A cannot invite members into Customer B workspace', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${userBWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          email: 'infiltrator@example.com',
          role: 'admin',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Customer B can read own workspace but cannot access Customer A workspace', async () => {
      const ownRes = await request(app)
        .get(`/api/v1/workspaces/${userBWorkspaceId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(ownRes.status).toBe(200);
      expect(ownRes.body.data.id).toBe(userBWorkspaceId);

      const crossRes = await request(app)
        .get(`/api/v1/workspaces/${userAWorkspaceId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(crossRes.status).toBe(403);
      expect(crossRes.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    let viewerToken: string;
    let viewerUserId: string;

    beforeEach(async () => {
      // Register a third user and add them to Workspace A as a 'viewer'
      const regViewer = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'viewer@enterprise-a.com',
          password: 'Password123!',
          displayName: 'Viewer User',
        });

      viewerToken = regViewer.body.data.accessToken;
      viewerUserId = regViewer.body.data.user.id;

      // Owner invites viewer
      const invite = await request(app)
        .post(`/api/v1/workspaces/${userAWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          email: 'viewer@enterprise-a.com',
          role: 'viewer',
        });

      // Viewer accepts
      await request(app)
        .post(`/api/v1/invitations/${invite.body.data.inviteToken}/accept`)
        .set('Authorization', `Bearer ${viewerToken}`);
    });

    it('A viewer can read workspace details and members', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${userAWorkspaceId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);

      const members = await request(app)
        .get(`/api/v1/workspaces/${userAWorkspaceId}/members`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(members.status).toBe(200);
    });

    it('A viewer cannot update workspace name', async () => {
      const res = await request(app)
        .patch(`/api/v1/workspaces/${userAWorkspaceId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Viewer Renamed WS' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('A viewer cannot invite users', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${userAWorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ email: 'newbie@example.com', role: 'member' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Revoked members immediately lose all workspace access', async () => {
      // Confirm viewer can read initially
      const initialRead = await request(app)
        .get(`/api/v1/workspaces/${userAWorkspaceId}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(initialRead.status).toBe(200);

      // Owner removes the viewer
      const removeRes = await request(app)
        .delete(`/api/v1/workspaces/${userAWorkspaceId}/members/${viewerUserId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(removeRes.status).toBe(200);

      // Subsequent access by removed viewer is immediately FORBIDDEN
      const revokedRead = await request(app)
        .get(`/api/v1/workspaces/${userAWorkspaceId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(revokedRead.status).toBe(403);
      expect(revokedRead.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Unauthenticated and Invalid Request Guarding', () => {
    it('Unauthenticated requests to workspace endpoints are rejected with 401', async () => {
      const res = await request(app).get(`/api/v1/workspaces/${userAWorkspaceId}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('Invalid workspace IDs return 400 Bad Request instead of server error', async () => {
      const res = await request(app)
        .get('/api/v1/workspaces/invalid-not-an-objectid')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });
});
