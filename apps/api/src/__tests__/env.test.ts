import { describe, it, expect } from 'vitest';
import { loadAndValidateEnv } from '../config/env.js';

describe('Environment Variable Validation', () => {
  it('should successfully validate and apply defaults for empty or standard config', () => {
    const parsed = loadAndValidateEnv({
      NODE_ENV: 'test',
      API_PORT: '4500',
    });

    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.API_PORT).toBe(4500);
    expect(parsed.API_HOST).toBe('0.0.0.0');
    expect(parsed.API_PREFIX).toBe('/api/v1');
  });

  it('should throw safe, descriptive validation error for invalid port', () => {
    expect(() => {
      loadAndValidateEnv({
        API_PORT: 'invalid-port',
      });
    }).toThrow(/Invalid environment configuration/);
  });

  it('should throw safe, descriptive validation error for out-of-range port', () => {
    expect(() => {
      loadAndValidateEnv({
        API_PORT: '99999', // Exceeds max 65535
      });
    }).toThrow(/Invalid environment configuration/);
  });

  it('should reject invalid NODE_ENV values', () => {
    expect(() => {
      loadAndValidateEnv({
        NODE_ENV: 'staging' as unknown as string,
      });
    }).toThrow(/Invalid environment configuration/);
  });
});
