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
  ContactModel,
  CampaignModel,
} from '@whatsapp-saas/database';
import { JwtUtil } from '../utils/jwt.js';
import { encryptCredential } from '../utils/crypto.js';
import {
  TemplateCategory,
  TemplateStatus,
  WhatsAppAccountStatus,
  ContactOptInStatus,
  CampaignStatus,
} from '@whatsapp-saas/domain';

describe('Broadcast Campaigns and Quick Replies Integration Tests', () => {
  const app = createApp();

  let userOwner: any;
  let userOther: any;
  let workspaceA: any;
  let workspaceB: any;
  let tokenOwner: string;
  let tokenOther: string;
  let accountA: any;
  let approvedTemplateA: any;
  let pendingTemplateA: any;

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

    // Owner for Workspace B
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

    // WhatsApp Account for Workspace A
    accountA = await WhatsAppAccountModel.create({
      workspaceId: workspaceA._id,
      wabaId: 'waba_101',
      phoneNumberId: 'phone_101',
      displayName: 'Workspace A Official',
      displayPhoneNumber: '+1 555-0100',
      status: WhatsAppAccountStatus.CONNECTED,
      accessTokenEncrypted: encryptCredential('mock_token_secret'),
    });

    // Approved Template for Workspace A
    approvedTemplateA = await MessageTemplateModel.create({
      workspaceId: workspaceA._id,
      name: 'spring_sale_promo',
      category: TemplateCategory.MARKETING,
      language: 'en_US',
      status: TemplateStatus.APPROVED,
      components: [{ type: 'BODY', text: '50% off all items today!' }],
    });

    // Pending Template for Workspace A
    pendingTemplateA = await MessageTemplateModel.create({
      workspaceId: workspaceA._id,
      name: 'unapproved_template',
      category: TemplateCategory.MARKETING,
      language: 'en_US',
      status: TemplateStatus.PENDING,
      components: [{ type: 'BODY', text: 'Unapproved draft text' }],
    });

    // Setup Contacts in Workspace A:
    // Contact 1: Opted in, VIP tag
    await ContactModel.create({
      workspaceId: workspaceA._id,
      phoneNumber: '+15551111111',
      displayName: 'Opted In VIP',
      consentStatus: ContactOptInStatus.OPTED_IN,
      tags: ['vip'],
      isSuppressed: false,
    });

    // Contact 2: Opted in, General tag
    await ContactModel.create({
      workspaceId: workspaceA._id,
      phoneNumber: '+15552222222',
      displayName: 'Opted In General',
      consentStatus: ContactOptInStatus.OPTED_IN,
      tags: ['general'],
      isSuppressed: false,
    });

    // Contact 3: Opted OUT (Must NEVER be messaged)
    await ContactModel.create({
      workspaceId: workspaceA._id,
      phoneNumber: '+15553333333',
      displayName: 'Opted Out User',
      consentStatus: ContactOptInStatus.OPTED_OUT,
      tags: ['vip'],
      isSuppressed: false,
    });

    // Contact 4: Opted in, but SUPPRESSED (Must NEVER be messaged)
    await ContactModel.create({
      workspaceId: workspaceA._id,
      phoneNumber: '+15554444444',
      displayName: 'Suppressed User',
      consentStatus: ContactOptInStatus.OPTED_IN,
      tags: ['vip'],
      isSuppressed: true,
      suppressionReason: 'Spam complaint',
    });
  });

  it('rejects campaign creation if template is not APPROVED', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/campaigns`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Rejected Draft Campaign',
        templateId: pendingTemplateA._id.toString(),
        whatsAppAccountId: accountA._id.toString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Only APPROVED templates may be used');
  });

  it('enforces consent and suppression: only opted-in, non-suppressed contacts are selected', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/campaigns`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'All Audience Broadcast',
        templateId: approvedTemplateA._id.toString(),
        whatsAppAccountId: accountA._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Exactly 2 contacts should be targeted (Opted-in VIP and Opted-in General)
    // Opted-out (+15553333333) and Suppressed (+15554444444) MUST be excluded
    expect(res.body.data.recipientCount).toBe(2);
  });

  it('filters audience correctly by tagFilter', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/campaigns`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'VIP Only Campaign',
        templateId: approvedTemplateA._id.toString(),
        whatsAppAccountId: accountA._id.toString(),
        tagFilter: ['vip'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Only 1 eligible contact has 'vip' tag AND opted_in AND !isSuppressed
    expect(res.body.data.recipientCount).toBe(1);
  });

  it('dispatches campaign and updates sent metrics atomically', async () => {
    // Create scheduled campaign so it does not auto-dispatch
    const scheduledDate = new Date(Date.now() + 86400000).toISOString();
    const createRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/campaigns`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Manual Dispatch Campaign',
        templateId: approvedTemplateA._id.toString(),
        whatsAppAccountId: accountA._id.toString(),
        scheduledAt: scheduledDate,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe(CampaignStatus.SCHEDULED);

    const campaignId = createRes.body.data.id;

    // Trigger dispatch endpoint
    const dispatchRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/campaigns/${campaignId}/dispatch`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({});

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.success).toBe(true);
    expect(dispatchRes.body.data.status).toBe(CampaignStatus.COMPLETED);
    expect(dispatchRes.body.data.sentCount).toBe(2);
  });

  it('cancels an active campaign', async () => {
    const scheduledDate = new Date(Date.now() + 86400000).toISOString();
    const createRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/campaigns`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'To Be Cancelled',
        templateId: approvedTemplateA._id.toString(),
        whatsAppAccountId: accountA._id.toString(),
        scheduledAt: scheduledDate,
      });

    const campaignId = createRes.body.data.id;

    const cancelRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/campaigns/${campaignId}/cancel`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({});

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe(CampaignStatus.CANCELLED);
  });

  it('enforces multi-tenant isolation on campaigns: Workspace B cannot view or dispatch Workspace A campaigns', async () => {
    const campaignA = await CampaignModel.create({
      workspaceId: workspaceA._id,
      name: 'Private Alpha Campaign',
      templateId: approvedTemplateA._id,
      whatsAppAccountId: accountA._id,
      status: CampaignStatus.DRAFT,
      recipientCount: 1,
    });

    const resB = await request(app)
      .get(`/api/v1/workspaces/${workspaceB._id}/campaigns/${campaignA._id}`)
      .set('Authorization', `Bearer ${tokenOther}`);

    expect(resB.status).toBe(404);
  });

  it('handles Quick Replies CRUD with shortcut validation and workspace isolation', async () => {
    // 1. Create quick reply
    const createRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/quick-replies`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        shortcut: '/welcome',
        title: 'Welcome Message',
        body: 'Hello! Thank you for contacting our support team.',
        category: 'Support',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.shortcut).toBe('/welcome');

    // 2. Reject duplicate shortcut in same workspace
    const dupRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceA._id}/quick-replies`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        shortcut: '/welcome',
        title: 'Another Welcome',
        body: 'Duplicate body',
      });

    expect(dupRes.status).toBe(409);

    // 3. Workspace B can create same shortcut without collision (workspace isolation)
    const bRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceB._id}/quick-replies`)
      .set('Authorization', `Bearer ${tokenOther}`)
      .send({
        shortcut: '/welcome',
        title: 'Workspace B Welcome',
        body: 'Welcome to Workspace B!',
      });

    expect(bRes.status).toBe(201);

    // 4. List quick replies
    const listRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceA._id}/quick-replies`)
      .set('Authorization', `Bearer ${tokenOwner}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].shortcut).toBe('/welcome');
  });
});
