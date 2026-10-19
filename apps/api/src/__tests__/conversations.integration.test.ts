import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './helpers/db.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WhatsAppAccountModel,
  ContactModel,
  ConversationModel,
  MessageModel,
} from '@whatsapp-saas/database';
import { JwtUtil } from '../utils/jwt.js';
import { encryptCredential } from '../utils/crypto.js';
import {
  WhatsAppAccountStatus,
  ContactOptInStatus,
  MessageStatus,
} from '@whatsapp-saas/domain';

describe('WhatsApp Live Inbox & Conversations Integration Tests', () => {
  const app = createApp();

  let userA: any;
  let userB: any;
  let workspaceA: any;
  let workspaceB: any;
  let tokenA: string;
  let tokenB: string;
  let accountA: any;
  let contactA1: any;
  let contactA2: any;
  let conversationA1: any;
  let conversationA2: any;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // User & Workspace A
    userA = await UserModel.create({
      email: 'agent_a@enterprise.com',
      passwordHash: 'dummy_hash',
      displayName: 'Agent A',
      emailVerified: true,
      accountStatus: 'active',
    });
    workspaceA = await WorkspaceModel.create({
      name: 'Workspace Alpha',
      slug: 'workspace-alpha',
      ownerId: userA._id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspaceA._id,
      userId: userA._id,
      role: 'owner',
      status: 'active',
    });
    tokenA = JwtUtil.signAccessToken({
      sub: userA._id.toString(),
      email: userA.email,
      displayName: userA.displayName,
    });

    // User & Workspace B (Attacker / Different Tenant)
    userB = await UserModel.create({
      email: 'agent_b@competitor.com',
      passwordHash: 'dummy_hash',
      displayName: 'Agent B',
      emailVerified: true,
      accountStatus: 'active',
    });
    workspaceB = await WorkspaceModel.create({
      name: 'Workspace Beta',
      slug: 'workspace-beta',
      ownerId: userB._id,
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspaceB._id,
      userId: userB._id,
      role: 'owner',
      status: 'active',
    });
    tokenB = JwtUtil.signAccessToken({
      sub: userB._id.toString(),
      email: userB.email,
      displayName: userB.displayName,
    });

    // Connected WhatsApp Account in Workspace A
    accountA = await WhatsAppAccountModel.create({
      workspaceId: workspaceA._id,
      wabaId: 'waba_test_1001',
      phoneNumberId: 'phone_num_test_1001',
      displayName: 'Customer Support Alpha',
      displayPhoneNumber: '+15551002000',
      accessTokenEncrypted: encryptCredential('EAAG_test_mock_token'),
      status: WhatsAppAccountStatus.CONNECTED,
      qualityRating: 'GREEN',
    });

    // Contacts in Workspace A
    contactA1 = await ContactModel.create({
      workspaceId: workspaceA._id,
      phoneNumber: '+15559876543',
      displayName: 'Alice Johnson',
      consentStatus: ContactOptInStatus.OPTED_IN,
      isSuppressed: false,
      tags: ['VIP', 'Support'],
    });

    contactA2 = await ContactModel.create({
      workspaceId: workspaceA._id,
      phoneNumber: '+15551112222',
      displayName: 'Bob Smith',
      consentStatus: ContactOptInStatus.OPTED_IN,
      isSuppressed: false,
      tags: ['Retail'],
    });

    // Conversations in Workspace A
    conversationA1 = await ConversationModel.create({
      workspaceId: workspaceA._id,
      contactId: contactA1._id,
      phoneNumber: contactA1.phoneNumber,
      contactName: contactA1.displayName,
      lastMessage: 'Hello, I need assistance with my order',
      lastMessageTimestamp: new Date(),
      unreadCount: 2,
      status: 'open',
    });

    conversationA2 = await ConversationModel.create({
      workspaceId: workspaceA._id,
      contactId: contactA2._id,
      phoneNumber: contactA2.phoneNumber,
      contactName: contactA2.displayName,
      lastMessage: 'Thanks for the quick update!',
      lastMessageTimestamp: new Date(Date.now() - 3600000),
      unreadCount: 0,
      status: 'open',
    });

    // Messages in conversation A1
    await MessageModel.create({
      conversationId: conversationA1._id,
      workspaceId: workspaceA._id,
      contactId: contactA1._id,
      direction: 'inbound',
      type: 'text',
      content: 'Hello, I need assistance with my order',
      status: MessageStatus.DELIVERED,
      metaMessageId: 'wamid_inbound_001',
      timestamp: new Date(),
    });
  });

  describe('GET /workspaces/:workspaceId/conversations', () => {
    it('should list all conversation threads for the workspace with pagination and metadata', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/conversations`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.total).toBe(2);

      const aliceThread = res.body.data.items.find((c: any) => c.phoneNumber === '+15559876543');
      expect(aliceThread).toBeDefined();
      expect(aliceThread.contactName).toBe('Alice Johnson');
      expect(aliceThread.unreadCount).toBe(2);
      expect(aliceThread.lastMessage).toBe('Hello, I need assistance with my order');
    });

    it('should filter conversations by search query', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/conversations?search=Alice`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].contactName).toBe('Alice Johnson');
    });

    it('should filter conversations by unread status', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/conversations?unreadOnly=true`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].phoneNumber).toBe('+15559876543');
    });

    it('should reject unauthorized cross-tenant read attempt (IDOR protection)', async () => {
      // User B tries to list Workspace A's conversations
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/conversations`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /workspaces/:workspaceId/conversations/:conversationId', () => {
    it('should retrieve single conversation thread details', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/conversations/${conversationA2._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(conversationA2._id.toString());
      expect(res.body.data.contactName).toBe('Bob Smith');
    });

    it('should reject cross-tenant retrieval of conversation thread', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/conversations/${conversationA2._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /workspaces/:workspaceId/conversations/:conversationId/messages', () => {
    it('should list message history for a specific conversation thread', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/conversations/${conversationA1._id}/messages`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].direction).toBe('inbound');
      expect(res.body.data.items[0].content).toBe('Hello, I need assistance with my order');
      expect(res.body.data.items[0].metaMessageId).toBe('wamid_inbound_001');
    });

    it('should reject cross-tenant message read', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/conversations/${conversationA1._id}/messages`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /workspaces/:workspaceId/conversations/:conversationId/messages', () => {
    it('should dispatch an outbound text reply and record message in thread', async () => {
      const payload = {
        phoneNumberId: accountA.phoneNumberId,
        recipientPhoneNumber: contactA1.phoneNumber,
        type: 'text',
        text: 'Hi Alice! We are looking into your order right now.',
      };

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/conversations/${conversationA1._id}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.direction).toBe('outbound');
      expect(res.body.data.content).toBe(payload.text);
      expect(res.body.data.status).toBe(MessageStatus.SENT);
      expect(res.body.data.metaMessageId).toBeDefined();

      // Verify conversation updated
      const updatedConv = await ConversationModel.findById(conversationA1._id);
      expect(updatedConv?.lastMessage).toBe(payload.text);
    });

    it('should reject outbound message when recipient phone number is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/conversations/${conversationA1._id}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          phoneNumberId: accountA.phoneNumberId,
          type: 'text',
          text: 'Incomplete request',
        });

      expect(res.status).toBe(422);
    });

    it('should reject cross-tenant outbound message injection', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/conversations/${conversationA1._id}/messages`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          phoneNumberId: 'some_phone_id',
          recipientPhoneNumber: contactA1.phoneNumber,
          type: 'text',
          text: 'Attacker injected message',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /workspaces/:workspaceId/conversations/:conversationId/read', () => {
    it('should reset unread count for conversation thread', async () => {
      expect(conversationA1.unreadCount).toBe(2);

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/conversations/${conversationA1._id}/read`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const refreshed = await ConversationModel.findById(conversationA1._id);
      expect(refreshed?.unreadCount).toBe(0);
    });

    it('should reject marking read for non-member', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/conversations/${conversationA1._id}/read`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
    });
  });
});
