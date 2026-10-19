import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './helpers/db.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  ContactModel,
} from '@whatsapp-saas/database';
import { ContactOptInStatus } from '@whatsapp-saas/domain';
import { JwtUtil } from '../utils/jwt.js';

describe('Contact Directory & Tenant Isolation Integration Tests', () => {
  const app = createApp();

  // Test state
  let userA: any;
  let userB: any;
  let workspaceA: any;
  let workspaceB: any;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Create User A with Workspace A (Owner)
    userA = await UserModel.create({
      email: 'usera@example.com',
      passwordHash: 'hashA',
      displayName: 'User A',
      emailVerified: true,
      accountStatus: 'active',
    });
    workspaceA = await WorkspaceModel.create({
      name: 'Workspace A',
      slug: 'workspace-a',
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

    // Create User B with Workspace B (Owner)
    userB = await UserModel.create({
      email: 'userb@example.com',
      passwordHash: 'hashB',
      displayName: 'User B',
      emailVerified: true,
      accountStatus: 'active',
    });
    workspaceB = await WorkspaceModel.create({
      name: 'Workspace B',
      slug: 'workspace-b',
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
  });

  describe('Contact Normalization & Validation', () => {
    it('should normalize international numbers to E.164 and store contact', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/contacts`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          phoneNumber: '+1 (415) 555-2671',
          displayName: 'John Doe',
          email: 'john@example.com',
          tags: ['VIP', 'Newsletter'],
          consentStatus: ContactOptInStatus.OPTED_IN,
          consentSource: 'web_form',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phoneNumber).toBe('+14155552671');
      expect(res.body.data.displayName).toBe('John Doe');
      expect(res.body.data.consentStatus).toBe('opted_in');
      expect(res.body.data.consentTimestamp).toBeDefined();
    });

    it('should reject invalid phone numbers with 422 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/contacts`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          phoneNumber: '123', // Invalid phone number
          displayName: 'Invalid Contact',
        });

      expect(res.status).toBe(422);
    });

    it('should prevent duplicate contacts within the same workspace', async () => {
      await ContactModel.create({
        workspaceId: workspaceA._id,
        phoneNumber: '+14155552671',
        displayName: 'Existing Contact',
      });

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/contacts`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          phoneNumber: '+14155552671',
          displayName: 'Duplicate Attempt',
        });

      expect(res.status).toBe(409);
    });

    it('should allow the same phone number in a different workspace (Strict Isolation)', async () => {
      // Create in Workspace A
      await ContactModel.create({
        workspaceId: workspaceA._id,
        phoneNumber: '+14155552671',
        displayName: 'Contact in Workspace A',
      });

      // User B creates identical phone number in Workspace B -> Should succeed!
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceB._id}/contacts`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          phoneNumber: '+14155552671',
          displayName: 'Contact in Workspace B',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.workspaceId).toBe(workspaceB._id.toString());
    });
  });

  describe('Multi-Tenant Access Isolation (IDOR Defense)', () => {
    it('should prevent User A from reading User B contacts', async () => {
      const contactB = await ContactModel.create({
        workspaceId: workspaceB._id,
        phoneNumber: '+14155550002',
        displayName: 'Customer B Secret Contact',
      });

      // User A attempts to access contactB via Workspace A
      const res1 = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/contacts/${contactB._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res1.status).toBe(404);

      // User A attempts to access Workspace B directly
      const res2 = await request(app)
        .get(`/api/v1/workspaces/${workspaceB._id}/contacts/${contactB._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res2.status).toBe(403);
    });

    it('should prevent User A from updating or deleting User B contacts', async () => {
      const contactB = await ContactModel.create({
        workspaceId: workspaceB._id,
        phoneNumber: '+14155550002',
        displayName: 'Customer B Contact',
      });

      // User A attempts to update contactB via Workspace A
      const resUpdate = await request(app)
        .patch(`/api/v1/workspaces/${workspaceA._id}/contacts/${contactB._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ displayName: 'Hacked Contact' });

      expect(resUpdate.status).toBe(404);

      // Verify Contact B remains unchanged
      const freshB = await ContactModel.findById(contactB._id);
      expect(freshB?.displayName).toBe('Customer B Contact');
    });
  });

  describe('Suppression & Opt-Out Controls', () => {
    it('should toggle contact suppression with reason and timestamp', async () => {
      const contact = await ContactModel.create({
        workspaceId: workspaceA._id,
        phoneNumber: '+14155552671',
        displayName: 'Suppression Test',
        isSuppressed: false,
      });

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/contacts/${contact._id}/suppression`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          isSuppressed: true,
          suppressionReason: 'User sent STOP keyword',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isSuppressed).toBe(true);
      expect(res.body.data.suppressionReason).toBe('User sent STOP keyword');
      expect(res.body.data.suppressedAt).toBeDefined();
    });
  });

  describe('CSV Import & Export Pipelines', () => {
    it('should bulk import contacts from CSV with partial failure reporting', async () => {
      const csvData = [
        'phone,name,email,tags,consent',
        '+14155550001,Alice,alice@example.com,VIP;Retail,opted_in',
        '+14155550002,Bob,bob@example.com,Wholesale,pending',
        'invalid-phone,Charlie,charlie@example.com,Retail,opted_in', // Invalid phone row
        '+14155550001,DuplicateAlice,alice@example.com,Retail,opted_in', // Duplicate phone in batch
      ].join('\n');

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/contacts/import`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ csvContent: csvData });

      expect(res.status).toBe(200);
      expect(res.body.data.totalProcessed).toBe(4);
      expect(res.body.data.createdCount).toBe(2); // Alice and Bob
      expect(res.body.data.failedCount).toBe(2); // Charlie and DuplicateAlice
      expect(res.body.data.errors.length).toBe(2);
    });

    it('should export contacts as CSV scoped strictly to the workspace', async () => {
      await ContactModel.create({
        workspaceId: workspaceA._id,
        phoneNumber: '+14155550001',
        displayName: 'Workspace A Contact',
        consentStatus: 'opted_in',
      });
      await ContactModel.create({
        workspaceId: workspaceB._id,
        phoneNumber: '+14155559999',
        displayName: 'Workspace B Private Contact',
        consentStatus: 'opted_in',
      });

      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/contacts/export`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('+14155550001');
      expect(res.text).toContain('Workspace A Contact');
      expect(res.text).not.toContain('+14155559999'); // Must never leak Workspace B!
      expect(res.text).not.toContain('Workspace B Private Contact');
    });

    it('should neutralize CSV spreadsheet formula injection characters during export (CWE-1236)', async () => {
      await ContactModel.create({
        workspaceId: workspaceA._id,
        phoneNumber: '+14155554321',
        displayName: '=cmd|\'/C calc\'!A0',
        consentStatus: 'opted_in',
      });

      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/contacts/export`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      // Prepending single-quote neutralizes formula execution in spreadsheet software
      expect(res.text).toContain("`=cmd|'/C calc'!A0".replace('`', "'"));
    });

    it('should strictly preserve opted_out and suppressed status across bulk CSV import', async () => {
      // Seed a contact that opted out / was suppressed
      await ContactModel.create({
        workspaceId: workspaceA._id,
        phoneNumber: '+14155558888',
        displayName: 'Protected Opted Out Contact',
        consentStatus: 'opted_out',
        isSuppressed: true,
        suppressionReason: 'User text STOP',
      });

      // Attempt to bulk import CSV with opted_in status for the same phone number
      const csvData = [
        'phone,name,email,tags,consent',
        '+14155558888,OverwrittenName,hacked@example.com,VIP,opted_in',
      ].join('\n');

      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceA._id}/contacts/import`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ csvContent: csvData });

      expect(res.status).toBe(200);

      // Verify database record has NOT been flipped to opted_in
      const contact = await ContactModel.findOne({
        workspaceId: workspaceA._id,
        phoneNumber: '+14155558888',
      });
      expect(contact).toBeDefined();
      expect(contact?.consentStatus).toBe('opted_out');
      expect(contact?.isSuppressed).toBe(true);
      expect(contact?.suppressionReason).toBe('User text STOP');
    });
  });

  describe('Search, Filter, and Pagination', () => {
    it('should filter contacts by tag and search term', async () => {
      await ContactModel.create({
        workspaceId: workspaceA._id,
        phoneNumber: '+14155550001',
        displayName: 'Alice Cooper',
        tags: ['VIP', 'Music'],
      });
      await ContactModel.create({
        workspaceId: workspaceA._id,
        phoneNumber: '+14155550002',
        displayName: 'Bob Marley',
        tags: ['Music'],
      });

      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceA._id}/contacts`)
        .query({ search: 'Alice' })
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.contacts.length).toBe(1);
      expect(res.body.data.contacts[0].displayName).toBe('Alice Cooper');
    });
  });
});
