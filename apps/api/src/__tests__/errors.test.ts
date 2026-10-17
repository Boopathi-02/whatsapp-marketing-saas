import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { ErrorCode } from '@whatsapp-saas/contracts';

describe('Error Handling Middleware', () => {
  const app = createApp();

  describe('Standardized 404 Not Found Handling', () => {
    it('should return 404 with standardized error response envelope for nonexistent routes', async () => {
      const res = await request(app).get('/api/v1/non-existent-endpoint');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Endpoint GET /api/v1/non-existent-endpoint not found',
        },
        requestId: expect.any(String),
      });
      expect(res.headers['x-request-id']).toBe(res.body.requestId);
    });
  });

  describe('Malformed JSON Request Parsing', () => {
    it('should intercept malformed JSON and return standardized 400 error without crash', async () => {
      const res = await request(app)
        .post('/api/v1/health') // Post to valid path with malformed payload
        .set('Content-Type', 'application/json')
        .send('{ "brokenJson": ');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', ErrorCode.BAD_REQUEST);
      expect(res.body.error.message).toContain('Malformed JSON payload');
      expect(res.body).toHaveProperty('requestId');
    });
  });

  describe('Correlation ID propagation', () => {
    it('should honor upstream X-Request-Id header when provided', async () => {
      const customId = 'client-custom-corr-12345';
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Request-Id', customId);

      expect(res.status).toBe(200);
      expect(res.body.requestId).toBe(customId);
      expect(res.headers['x-request-id']).toBe(customId);
    });
  });
});
