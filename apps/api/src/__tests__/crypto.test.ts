import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  encryptCredential,
  decryptCredential,
  getEncryptionKey,
} from '../utils/crypto.js';

describe('Credential Encryption Security Tests (AES-256-GCM)', () => {
  it('should encrypt and decrypt plaintext strings successfully using versioned v1 envelope', () => {
    const plaintext = 'EAAG...MetaSecretAccessToken1234567890';
    const encrypted = encryptCredential(plaintext);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toContain(plaintext);
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted.split(':').length).toBe(4); // v1:iv:authTag:ciphertext

    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should support backward-compatible decryption of legacy unversioned 3-part payloads', () => {
    const plaintext = 'legacy_stored_token_value';
    // Manually craft a valid 3-part unversioned payload: iv:authTag:ciphertext
    const encryptionKey = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv, { authTagLength: 16 });
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    const legacyPayload = `${iv.toString('hex')}:${authTag}:${ciphertext}`;

    expect(legacyPayload.split(':').length).toBe(3);
    const decrypted = decryptCredential(legacyPayload);
    expect(decrypted).toBe(plaintext);
  });

  it('should generate unique IVs for identical plaintext inputs', () => {
    const plaintext = 'identical_secret_token_value';
    const enc1 = encryptCredential(plaintext);
    const enc2 = encryptCredential(plaintext);

    expect(enc1).not.toBe(enc2); // Different IVs and auth tags
    expect(decryptCredential(enc1)).toBe(plaintext);
    expect(decryptCredential(enc2)).toBe(plaintext);
  });

  it('should throw an error if the ciphertext or authentication tag is tampered with', () => {
    const plaintext = 'confidential_waba_system_user_token';
    const encrypted = encryptCredential(plaintext);
    const [version, iv, authTag, ciphertext] = encrypted.split(':');

    // Tamper with ciphertext by altering the last character
    const tamperedCiphertext =
      ciphertext.slice(0, -1) + (ciphertext.slice(-1) === 'a' ? 'b' : 'a');
    const tamperedPayload = `${version}:${iv}:${authTag}:${tamperedCiphertext}`;

    expect(() => decryptCredential(tamperedPayload)).toThrow();

    // Tamper with auth tag
    const tamperedTag =
      authTag.slice(0, -1) + (authTag.slice(-1) === '0' ? '1' : '0');
    const tamperedTagPayload = `${version}:${iv}:${tamperedTag}:${ciphertext}`;

    expect(() => decryptCredential(tamperedTagPayload)).toThrow();
  });

  it('should fail decryption if an incorrect key is provided', () => {
    const key1 = crypto.randomBytes(32);
    const key2 = crypto.randomBytes(32);
    const plaintext = 'secret_meta_cloud_token';

    const encrypted = encryptCredential(plaintext, key1);
    expect(() => decryptCredential(encrypted, key2)).toThrow();
  });

  it('should reject malformed or empty payloads', () => {
    expect(() => decryptCredential('')).toThrow('Encrypted payload cannot be empty');
    expect(() => decryptCredential('invalid-payload')).toThrow('Invalid encrypted payload format');
    expect(() => decryptCredential('a:b')).toThrow('Invalid encrypted payload format');
  });

  it('should accept 32-byte key from 64-hex string or 32-byte UTF-8 string', () => {
    const hex64 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const keyFromHex = getEncryptionKey(hex64);
    expect(keyFromHex.length).toBe(32);

    const raw32 = '12345678901234567890123456789012';
    const keyFromRaw = getEncryptionKey(raw32);
    expect(keyFromRaw.length).toBe(32);
  });

  it('should reject invalid encryption keys with unexpected length or format', () => {
    expect(() => getEncryptionKey('short-passphrase')).toThrow(
      'Invalid CREDENTIAL_ENCRYPTION_KEY'
    );
    expect(() => getEncryptionKey('not-64-hex-characters-1234567890123456789012345678901234567890123')).toThrow(
      'Invalid CREDENTIAL_ENCRYPTION_KEY'
    );
  });
});
