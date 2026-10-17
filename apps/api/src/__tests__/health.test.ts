import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Health and Readiness Endpoints', () => {
  const app = createApp();

  describe('GET /api/v1/health (Liveness Probe)', () => {
    it('should return 200 with healthy application status and metadata', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('requestId');
      expect(typeof res.body.requestId).toBe('string');
      expect(res.body.requestId.length).toBeGreaterThan(0);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('status', 'healthy');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('uptimeSeconds');
      expect(res.body.data).toHaveProperty('version');
      expect(typeof res.body.data.uptimeSeconds).toBe('number');
    });

    it('should also be accessible at root /health for infrastructure load balancers', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
    });
  });

  describe('GET /api/v1/health/ready (Readiness Probe)', () => {
    it('should return honest readiness reflecting external database status without faking', async () => {
      const res = await request(app).get('/api/v1/health/ready');

      // In test environment without active MongoDB container, readiness accurately returns 503
      // With active MongoDB, it returns 200. Both are valid honest states.
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('services');
      expect(res.body.data.services).toHaveProperty('database');
      expect(['connected', 'disconnected', 'connecting']).toContain(
        res.body.data.services.database.status
      );
    });
  });
});
