import crypto from 'node:crypto';
import { env } from '../../config/env.js';

export interface CreatedPayment {
  providerReference: string;
}

export interface PaymentProvider {
  name: string;
  createPayment(input: { workspaceId: string; amountMinor: number; currency: string }): Promise<CreatedPayment>;
}

/**
 * Test provider: only creates a pending payment reference. It can never mark a payment
 * successful; completion only happens through the signed callback like any real provider.
 */
class TestPaymentProvider implements PaymentProvider {
  name = 'test';
  async createPayment(): Promise<CreatedPayment> {
    return { providerReference: `test_${crypto.randomBytes(12).toString('hex')}` };
  }
}

export function getPaymentProvider(): PaymentProvider | null {
  if (env.PAYMENT_PROVIDER === 'test' && env.NODE_ENV !== 'production') return new TestPaymentProvider();
  return null;
}

export function signPayload(rawBody: Buffer | string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifySignature(rawBody: Buffer | undefined, header: string | undefined, secret: string | undefined): boolean {
  if (!rawBody || !header || !secret) return false;
  const expected = Buffer.from(signPayload(rawBody, secret), 'hex');
  let given: Buffer;
  try {
    given = Buffer.from(header.replace(/^sha256=/, ''), 'hex');
  } catch {
    return false;
  }
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
