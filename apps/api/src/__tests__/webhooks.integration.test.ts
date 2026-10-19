import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './helpers/db.js';
import {
  WhatsAppAccountModel,
  WebhookEventModel,
  WorkspaceModel,
  UserModel,
} from '@whatsapp-saas/database';
import { WhatsAppAccountStatus, QualityRating } from '@whatsapp-saas/domain';

describe('Meta WhatsApp Cloud API Webhook Integration Tests', () => {
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

  describe('GET /api/v1/webhooks/whatsapp (Meta Verification Handshake)', () => {
    it('should return 200 with raw challenge when verify token matches', async () => {
      const challenge = 'random_meta_challenge_12345';
      const res = await request(app)
        .get('/api/v1/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': env.META_WEBHOOK_VERIFY_TOKEN,
          'hub.challenge': challenge,
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe(challenge);
    });

    it('should return 403 when verify token does not match', async () => {
      const res = await request(app)
        .get('/api/v1/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'some_challenge',
        });

      expect(res.status).toBe(403);
    });

    it('should return 400 when required parameters are missing', async () => {
      const res = await request(app).get('/api/v1/webhooks/whatsapp').query({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/webhooks/whatsapp (Event Ingestion & Deduplication)', () => {
    function generateMetaSignature(body: string, secret: string = env.META_APP_SECRET): string {
      const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
      return `sha256=${hash}`;
    }

    it('should ingest valid webhook and persist event with HMAC signature', async () => {
      // Seed a workspace and WhatsApp account to test account resolution
      const user = await UserModel.create({
        email: 'waba-owner@example.com',
        passwordHash: 'hash',
        displayName: 'Owner',
      });
      const workspace = await WorkspaceModel.create({
        name: 'WABA Workspace',
        slug: 'waba-workspace',
        ownerId: user._id,
      });
      await WhatsAppAccountModel.create({
        workspaceId: workspace._id,
        wabaId: 'waba_meta_123',
        phoneNumberId: 'phone_num_999',
        displayPhoneNumber: '+15550199',
        displayName: 'Test Phone',
        qualityRating: QualityRating.GREEN,
        status: WhatsAppAccountStatus.CONNECTED,
        accessTokenEncrypted: 'iv:tag:cipher',
      });

      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba_meta_123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+15550199',
                    phone_number_id: 'phone_num_999',
                  },
                  statuses: [
                    {
                      id: 'wamid.HBgLMTIzNDU2Nzg5MA==',
                      status: 'delivered',
                      timestamp: '1700000000',
                      recipient_id: '15550100',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const rawBody = JSON.stringify(payload);
      const signature = generateMetaSignature(rawBody);

      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-hub-signature-256', signature)
        .set('content-type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.persisted).toBe(true);
      expect(res.body.isDuplicate).toBe(false);

      // Verify event was durably persisted in database and resolved to workspace
      const saved = await WebhookEventModel.findOne({
        providerEventId: 'wamid.HBgLMTIzNDU2Nzg5MA==_delivered_1700000000',
      });
      expect(saved).not.toBeNull();
      expect(saved?.workspaceId?.toString()).toBe(workspace._id.toString());
      expect(saved?.eventType).toBe('statuses');
    });

    it('should reject webhook request when signature is invalid', async () => {
      const payload = { object: 'whatsapp_business_account', entry: [] };
      const rawBody = JSON.stringify(payload);

      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-hub-signature-256', 'sha256=invalid_hash_value_1234567890abcdef')
        .set('content-type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(401);
    });

    it('should reject webhook request when signature header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('content-type', 'application/json')
        .send({ object: 'whatsapp_business_account' });

      expect(res.status).toBe(401);
    });

    it('should safely deduplicate duplicate webhook events', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba_123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: 'phone_123' },
                  messages: [
                    {
                      id: 'wamid.DUPLICATE_TEST_ID_1',
                      from: '15550100',
                      timestamp: '1700000000',
                      type: 'text',
                      text: { body: 'Hello' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const rawBody = JSON.stringify(payload);
      const signature = generateMetaSignature(rawBody);

      // First dispatch
      const res1 = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-hub-signature-256', signature)
        .set('content-type', 'application/json')
        .send(rawBody);

      expect(res1.status).toBe(200);
      expect(res1.body.isDuplicate).toBe(false);

      // Second identical dispatch (Meta duplicate delivery retry)
      const res2 = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-hub-signature-256', signature)
        .set('content-type', 'application/json')
        .send(rawBody);

      expect(res2.status).toBe(200);
      expect(res2.body.isDuplicate).toBe(true);

      // Database should contain exactly 1 event
      const count = await WebhookEventModel.countDocuments({
        providerEventId: 'wamid.DUPLICATE_TEST_ID_1',
      });
      expect(count).toBe(1);
    });

    it('should ingest sequential message status transitions (sent -> delivered -> read) without false duplication', async () => {
      const msgId = 'wamid.LIFECYCLE_TEST_001';

      // 1. Sent status
      const sentPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'waba_test',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'phone_test' },
              statuses: [{ id: msgId, status: 'sent', timestamp: '1700000001', recipient_id: '15550100' }],
            },
            field: 'messages',
          }],
        }],
      };
      const resSent = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-hub-signature-256', generateMetaSignature(JSON.stringify(sentPayload)))
        .set('content-type', 'application/json')
        .send(JSON.stringify(sentPayload));
      expect(resSent.status).toBe(200);
      expect(resSent.body.isDuplicate).toBe(false);

      // 2. Delivered status (Must NOT be dropped as duplicate of 'sent'!)
      const deliveredPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'waba_test',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'phone_test' },
              statuses: [{ id: msgId, status: 'delivered', timestamp: '1700000005', recipient_id: '15550100' }],
            },
            field: 'messages',
          }],
        }],
      };
      const resDelivered = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-hub-signature-256', generateMetaSignature(JSON.stringify(deliveredPayload)))
        .set('content-type', 'application/json')
        .send(JSON.stringify(deliveredPayload));
      expect(resDelivered.status).toBe(200);
      expect(resDelivered.body.isDuplicate).toBe(false);

      // 3. Duplicate delivered delivery (retry from Meta) -> Should be recognized as duplicate
      const resDeliveredDup = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-hub-signature-256', generateMetaSignature(JSON.stringify(deliveredPayload)))
        .set('content-type', 'application/json')
        .send(JSON.stringify(deliveredPayload));
      expect(resDeliveredDup.status).toBe(200);
      expect(resDeliveredDup.body.isDuplicate).toBe(true);
    });

    it('should reject when body is tampered even if signature was valid for original body', async () => {
      const originalPayload = {
        object: 'whatsapp_business_account',
        entry: [{ id: 'waba_tamper_test' }],
      };
      const validSigForOriginal = generateMetaSignature(JSON.stringify(originalPayload));

      const tamperedPayload = {
        object: 'whatsapp_business_account',
        entry: [{ id: 'waba_tamper_test_TAMPERED' }],
      };

      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-hub-signature-256', validSigForOriginal)
        .set('content-type', 'application/json')
        .send(JSON.stringify(tamperedPayload));

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid webhook cryptographic signature');
    });

    it('should acknowledge webhook even if WABA is unknown to prevent Meta retry loops', async () => {
      const unknownPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba_unknown_tenant_9999',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: 'phone_unknown_9999' },
                  messages: [
                    {
                      id: 'wamid.UNKNOWN_WABA_MSG',
                      from: '15550999',
                      timestamp: '1700000999',
                      type: 'text',
                      text: { body: 'Unknown test' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const raw = JSON.stringify(unknownPayload);
      const sig = generateMetaSignature(raw);

      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-hub-signature-256', sig)
        .set('content-type', 'application/json')
        .send(raw);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.persisted).toBe(true);

      const saved = await WebhookEventModel.findOne({ providerEventId: 'wamid.UNKNOWN_WABA_MSG' });
      expect(saved).not.toBeNull();
      expect(saved?.workspaceId == null).toBe(true); // no workspace mapped
    });
  });
});

