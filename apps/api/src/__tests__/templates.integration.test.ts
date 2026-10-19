import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './helpers/db.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WhatsAppAccountModel,
  MessageTemplateModel,
} from '@whatsapp-saas/database';
import { JwtUtil } from '../utils/jwt.js';
import { encryptCredential } from '../utils/crypto.js';
import { TemplateCategory, TemplateStatus, WhatsAppAccountStatus } from '@whatsapp-saas/domain';

describe('Message Templates Integration Tests', () => {
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

    // Owner for Workspace A
    userOwner = await UserModel.create({
      email: 'owner@example.com',
      passwordHash: 'hash',
      displayName: 'Owner User',
      emailVerified: true,
      accountStatus: 'active',
    });
    workspaceA = await WorkspaceModel.create({
      name: 'Workspace A',
      slug: 'workspace-a',
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

    // Viewer for Workspace A
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

    // Other user for Workspace B
    userOther = await UserModel.create({
      email: 'other@example.com',
      passwordHash: 'hash',
      displayName: 'Other User',
      emailVerified: true,
      accountStatus: 'active',
    });
    workspaceB = await WorkspaceModel.create({
      name: 'Workspace B',
      slug: 'workspace-b',
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

    // Connect WhatsApp account to Workspace A
    await WhatsAppAccountModel.create({
      workspaceId: workspaceA._id,
      wabaId: 'waba_123',
      phoneNumberId: 'phone_123',
      displayName: 'Workspace A Phone',
      displayPhoneNumber: '+1 555-0199',
      status: WhatsAppAccountStatus.CONNECTED,
      accessTokenEncrypted: encryptCredential('mock_meta_token'),
    });
  });

  it('allows owner to create a message template and validates schema', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/templates`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'order_receipt',
        category: 'MARKETING',
        language: 'en_US',
        components: [
          { type: 'HEADER', format: 'TEXT', text: 'Receipt' },
          { type: 'BODY', text: 'Hello {{1}}, your order #{{2}} is confirmed.' },
          { type: 'FOOTER', text: 'Thank you for shopping with us' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('order_receipt');
    expect(res.body.data.category).toBe(TemplateCategory.MARKETING);
    expect(res.body.data.workspaceId).toBe(workspaceA._id.toString());
  });

  it('rejects template creation with invalid name formatting', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/templates`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Invalid Template Name With Spaces!',
        category: 'MARKETING',
        language: 'en_US',
        components: [{ type: 'BODY', text: 'Test body' }],
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('rejects duplicate template name and language in the same workspace', async () => {
    await MessageTemplateModel.create({
      workspaceId: workspaceA._id,
      name: 'duplicate_test',
      category: TemplateCategory.UTILITY,
      language: 'en_US',
      status: TemplateStatus.APPROVED,
      components: [{ type: 'BODY', text: 'Existing template body' }],
    });

    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/templates`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'duplicate_test',
        category: 'UTILITY',
        language: 'en_US',
        components: [{ type: 'BODY', text: 'Another body' }],
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('enforces RBAC: viewer cannot create or delete templates', async () => {
    const createRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/templates`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .send({
        name: 'viewer_template',
        category: 'MARKETING',
        language: 'en_US',
        components: [{ type: 'BODY', text: 'Viewer test' }],
      });

    expect(createRes.status).toBe(403);

    const template = await MessageTemplateModel.create({
      workspaceId: workspaceA._id,
      name: 'viewer_delete_test',
      category: TemplateCategory.UTILITY,
      language: 'en_US',
      components: [{ type: 'BODY', text: 'Test' }],
    });

    const deleteRes = await request(app)
      .delete(`/api/v1/workspaces/${workspaceA._id}/templates/${template._id}`)
      .set('Authorization', `Bearer ${tokenViewer}`);

    expect(deleteRes.status).toBe(403);
  });

  it('synchronizes templates from Meta adapter into workspace database', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/templates/sync`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.syncedCount).toBeGreaterThan(0);

    const listRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceA._id}/templates`)
      .set('Authorization', `Bearer ${tokenOwner}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.items.length).toBeGreaterThan(0);
  });

  it('enforces strict tenant isolation: Workspace B cannot view Workspace A templates', async () => {
    const templateA = await MessageTemplateModel.create({
      workspaceId: workspaceA._id,
      name: 'workspace_a_secret_template',
      category: TemplateCategory.MARKETING,
      language: 'en_US',
      status: TemplateStatus.APPROVED,
      components: [{ type: 'BODY', text: 'Confidential promo' }],
    });

    // Workspace B queries Workspace A's template ID under Workspace B path -> 404
    const resB = await request(app)
      .get(`/api/v1/workspaces/${workspaceB._id}/templates/${templateA._id}`)
      .set('Authorization', `Bearer ${tokenOther}`);

    expect(resB.status).toBe(404);

    // Workspace B attempts to access Workspace A directly -> 403 Forbidden
    const resA = await request(app)
      .get(`/api/v1/workspaces/${workspaceA._id}/templates/${templateA._id}`)
      .set('Authorization', `Bearer ${tokenOther}`);

    expect(resA.status).toBe(403);
  });
});
