import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './helpers/db.js';

describe('Workspace Management Integration Tests', () => {
  const app = createApp();

  let ownerToken: string;
  let ownerUserId: string;
  let memberToken: string;
  let memberUserId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Register primary owner
    const regOwner = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'ws_owner@example.com',
        password: 'Password123!',
        displayName: 'Workspace Owner',
      });

    ownerToken = regOwner.body.data.accessToken;
    ownerUserId = regOwner.body.data.user.id;

    // Register second user for membership testing
    const regMember = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'ws_member@example.com',
        password: 'Password123!',
        displayName: 'Team Member',
      });

    memberToken = regMember.body.data.accessToken;
    memberUserId = regMember.body.data.user.id;
  });

  it('should allow user to create multiple workspaces and list them with correct role', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Acme Marketing' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Acme Marketing');
    expect(res.body.data.role).toBe('owner');

    const listRes = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(2); // Default workspace + Acme Marketing
  });

  it('should support inviting a member, accepting invitation, and updating roles', async () => {
    // 1. Create a workspace
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Alpha Project' });

    const workspaceId = wsRes.body.data.id;

    // 2. Invite member
    const inviteRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'ws_member@example.com',
        role: 'member',
      });

    expect(inviteRes.status).toBe(201);
    const inviteToken = inviteRes.body.data.inviteToken;
    expect(inviteToken).toBeDefined();

    // 3. Member accepts invitation
    const acceptRes = await request(app)
      .post(`/api/v1/invitations/${inviteToken}/accept`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(acceptRes.status).toBe(200);

    // 4. Listing workspace members includes the new member
    const membersRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(membersRes.status).toBe(200);
    const memberEntry = membersRes.body.data.find(
      (m: { userId: string; role: string }) => m.userId === memberUserId
    );
    expect(memberEntry).toBeDefined();
    expect(memberEntry.role).toBe('member');

    // 5. Update role: promote to admin
    const updateRoleRes = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'admin' });

    expect(updateRoleRes.status).toBe(200);

    // 6. Removing member
    const removeRes = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(removeRes.status).toBe(200);
  });

  it('should prevent removing the last remaining owner of a workspace', async () => {
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Owner Shield WS' });

    const workspaceId = wsRes.body.data.id;

    const removeRes = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}/members/${ownerUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(removeRes.status).toBe(400);
    expect(removeRes.body.error.code).toBe('LAST_OWNER_CANNOT_BE_REMOVED');
  });

  it('should support ownership transfer to an active team member', async () => {
    // 1. Create workspace
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Transferable WS' });

    const workspaceId = wsRes.body.data.id;

    // 2. Invite and accept member
    const inviteRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'ws_member@example.com', role: 'admin' });

    await request(app)
      .post(`/api/v1/invitations/${inviteRes.body.data.inviteToken}/accept`)
      .set('Authorization', `Bearer ${memberToken}`);

    // 3. Transfer ownership
    const transferRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/transfer-ownership`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ targetUserId: memberUserId });

    expect(transferRes.status).toBe(200);

    // 4. Verify new owner has owner role
    const membersRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${memberToken}`);

    const newOwner = membersRes.body.data.find((m: { userId: string; role: string }) => m.userId === memberUserId);
    const oldOwner = membersRes.body.data.find((m: { userId: string; role: string }) => m.userId === ownerUserId);

    expect(newOwner.role).toBe('owner');
    expect(oldOwner.role).toBe('admin');
  });
});
