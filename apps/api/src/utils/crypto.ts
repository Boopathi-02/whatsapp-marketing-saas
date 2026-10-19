import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH_BYTES = 16; // 128 bits

/**
 * Derives a 32-byte Buffer key from the configured encryption key string.
 * Supports 64-character hex strings or arbitrary strings hashed with SHA-256.
 */
export function getEncryptionKey(customKey?: string): Buffer {
  const rawKey = customKey || env.CREDENTIAL_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is required for credential encryption');
  }

  // If 64 hex characters, parse directly as 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  // If already exactly 32 bytes in utf8
  if (Buffer.byteLength(rawKey, 'utf8') === 32) {
    return Buffer.from(rawKey, 'utf8');
  }

  throw new Error(
    'Invalid CREDENTIAL_ENCRYPTION_KEY: key must be exactly 32 bytes (64 hexadecimal characters or 32-byte UTF-8 string)'
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM with versioned envelope.
 * Returns formatted string: `v1:${ivHex}:${authTagHex}:${ciphertextHex}`
 */
export function encryptCredential(plaintext: string, key?: Buffer): string {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty');
  }

  const encryptionKey = key || getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a previously encrypted AES-256-GCM credential.
 * Supports both versioned `v1:iv:authTag:ciphertext` and legacy `iv:authTag:ciphertext`.
 */
export function decryptCredential(encryptedPayload: string, key?: Buffer): string {
  if (!encryptedPayload) {
    throw new Error('Encrypted payload cannot be empty');
  }

  const parts = encryptedPayload.split(':');
  let ivHex: string;
  let authTagHex: string;
  let ciphertextHex: string;

  if (parts.length === 4 && parts[0] === 'v1') {
    [, ivHex, authTagHex, ciphertextHex] = parts;
  } else if (parts.length === 3) {
    [ivHex, authTagHex, ciphertextHex] = parts;
  } else {
    throw new Error('Invalid encrypted payload format. Expected v1:iv:authTag:ciphertext or iv:authTag:ciphertext');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptionKey = key || getEncryptionKey();

  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error(`Invalid IV length. Expected ${IV_LENGTH_BYTES} bytes, got ${iv.length}`);
  }
  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error(`Invalid auth tag length. Expected ${AUTH_TAG_LENGTH_BYTES} bytes, got ${authTag.length}`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
