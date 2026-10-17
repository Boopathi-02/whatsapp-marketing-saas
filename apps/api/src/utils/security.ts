import argon2 from 'argon2';
import crypto from 'node:crypto';

/**
 * Security utilities implementing industry-standard password hashing (Argon2id)
 * and cryptographically secure random token generation and hashing.
 */
export class SecurityUtil {
  /**
   * Hashes a password using Argon2id with OWASP recommended configuration.
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,       // 3 iterations
      parallelism: 1,
    });
  }

  /**
   * Verifies a plain password against an Argon2 hash.
   */
  static async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * Generates a cryptographically secure random token (e.g. for refresh tokens, verification, invites).
   */
  static generateRandomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Computes a SHA-256 hex hash of a raw token for server-side persistence and lookup.
   * Plain tokens are NEVER stored in the database.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a unique token family ID to track session rotation and detect token reuse attacks.
   */
  static generateTokenFamily(): string {
    return crypto.randomUUID();
  }
}
