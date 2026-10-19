import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMetaEmbeddedSignup } from '../features/whatsapp-accounts/hooks/useMetaEmbeddedSignup.js';
import { api, ApiClientError } from '../lib/api.js';

// Mock API client
vi.mock('../lib/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiClientError: class ApiClientError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiClientError';
    }
  },
}));

describe('useMetaEmbeddedSignup Hook Tests', () => {
  const originalFB = window.FB;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.FB = originalFB;
  });

  it('should initialize with NOT_CONNECTED status and null errors', () => {
    const { result } = renderHook(() =>
      useMetaEmbeddedSignup({ workspaceId: 'ws-123' })
    );

    expect(result.current.status).toBe('NOT_CONNECTED');
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.connectingStep).toBeNull();
  });

  it('should successfully launch signup, initialize FB, and complete code exchange', async () => {
    const mockSession = {
      sessionId: 'sess-123',
      stateToken: 'mock_state_token_123',
      appId: 'mock_meta_app_123',
      configId: 'mock_config_456',
      graphApiVersion: 'v26.0',
      expiresAt: new Date().toISOString(),
    };

    const mockAccountDto = {
      id: 'acc-new-1',
      workspaceId: 'ws-123',
      wabaId: 'waba_999',
      phoneNumberId: 'phone_999',
      displayName: 'Pingza Verified Support',
      displayPhoneNumber: '+1 555-0100',
      qualityRating: 'GREEN',
      status: 'connected',
      lastSyncedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(api.post)
      .mockResolvedValueOnce(mockSession)
      .mockResolvedValueOnce(mockAccountDto);

    // Mock window.FB
    const mockLogin = vi.fn((callback) => {
      callback({
        authResponse: {
          code: 'fb_auth_code_xyz',
        },
        status: 'connected',
      });
    });

    window.FB = {
      init: vi.fn(),
      login: mockLogin,
    };

    const onSuccess = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useMetaEmbeddedSignup({
        workspaceId: 'ws-123',
        onSuccess,
        onError,
      })
    );

    await act(async () => {
      await result.current.launchEmbeddedSignup();
    });

    expect(api.post).toHaveBeenCalledWith(
      '/workspaces/ws-123/whatsapp-accounts/onboarding/session',
      {}
    );
    expect(mockLogin).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        config_id: 'mock_config_456',
        response_type: 'code',
        override_default_response_type: true,
        state: 'mock_state_token_123',
      })
    );
    expect(api.post).toHaveBeenCalledWith(
      '/workspaces/ws-123/whatsapp-accounts/embedded-signup',
      expect.objectContaining({
        code: 'fb_auth_code_xyz',
        stateToken: 'mock_state_token_123',
      })
    );
    expect(result.current.status).toBe('CONNECTED');
    expect(onSuccess).toHaveBeenCalledWith(mockAccountDto);
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle user cancellation or permission denial from FB popup', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      sessionId: 'sess-123',
      stateToken: 'mock_state_token_123',
      appId: 'mock_meta_app_123',
      configId: 'mock_config_456',
      graphApiVersion: 'v26.0',
      expiresAt: new Date().toISOString(),
    });

    // Mock window.FB returning empty/denied authResponse
    window.FB = {
      init: vi.fn(),
      login: vi.fn((callback) => {
        callback({
          authResponse: undefined,
          status: 'not_authorized',
        });
      }),
    };

    const onError = vi.fn();

    const { result } = renderHook(() =>
      useMetaEmbeddedSignup({
        workspaceId: 'ws-123',
        onError,
      })
    );

    await act(async () => {
      await result.current.launchEmbeddedSignup();
    });

    expect(result.current.status).toBe('FAILED');
    expect(result.current.errorMessage).toContain(
      'Meta WhatsApp signup was cancelled or required permissions were not granted'
    );
    expect(onError).toHaveBeenCalled();
  });

  it('should capture session messages from facebook.com cross-window event and pass wabaId and phoneNumberId', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({
        sessionId: 'sess-123',
        stateToken: 'mock_state_token_123',
        appId: 'mock_meta_app_123',
        configId: 'mock_config_456',
        graphApiVersion: 'v26.0',
        expiresAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: 'acc-session',
        workspaceId: 'ws-123',
        wabaId: 'waba_from_msg',
        phoneNumberId: 'phone_from_msg',
        displayName: 'Business',
        displayPhoneNumber: '+1 555-4321',
        qualityRating: 'GREEN',
        status: 'connected',
        lastSyncedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    window.FB = {
      init: vi.fn(),
      login: vi.fn((callback) => {
        // Meta Embedded Signup sends cross-window postMessage during popup flow
        const messageEvent = new MessageEvent('message', {
          origin: 'https://www.facebook.com',
          data: JSON.stringify({
            type: 'WA_EMBEDDED_SIGNUP',
            event: 'FINISH',
            data: {
              phone_number_id: 'phone_from_msg',
              waba_id: 'waba_from_msg',
            },
          }),
        });
        window.dispatchEvent(messageEvent);

        callback({
          authResponse: { code: 'code_with_session_data' },
          status: 'connected',
        });
      }),
    };

    const { result } = renderHook(() =>
      useMetaEmbeddedSignup({ workspaceId: 'ws-123' })
    );

    await act(async () => {
      await result.current.launchEmbeddedSignup();
    });

    expect(api.post).toHaveBeenCalledWith(
      '/workspaces/ws-123/whatsapp-accounts/embedded-signup',
      {
        code: 'code_with_session_data',
        stateToken: 'mock_state_token_123',
        wabaId: 'waba_from_msg',
        phoneNumberId: 'phone_from_msg',
      }
    );
    expect(result.current.status).toBe('CONNECTED');
  });

  it('should handle backend API failure safely and provide non-sensitive error message', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({
        sessionId: 'sess-123',
        stateToken: 'mock_state_token_123',
        appId: 'mock_meta_app_123',
        configId: 'mock_config_456',
        graphApiVersion: 'v26.0',
        expiresAt: new Date().toISOString(),
      })
      .mockRejectedValueOnce(
        new ApiClientError('This WhatsApp Phone Number ID is already connected to another workspace.')
      );

    window.FB = {
      init: vi.fn(),
      login: vi.fn((callback) => {
        callback({
          authResponse: { code: 'bad_code' },
          status: 'connected',
        });
      }),
    };

    const onError = vi.fn();

    const { result } = renderHook(() =>
      useMetaEmbeddedSignup({ workspaceId: 'ws-123', onError })
    );

    await act(async () => {
      await result.current.launchEmbeddedSignup();
    });

    expect(result.current.status).toBe('FAILED');
    expect(result.current.errorMessage).toContain(
      'This WhatsApp Phone Number ID is already connected to another workspace.'
    );
    expect(onError).toHaveBeenCalled();
  });

  it('REGRESSION: should pass a synchronous Function (not AsyncFunction) to FB.login to satisfy Meta SDK type assertions', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({
        sessionId: 'sess-123',
        stateToken: 'mock_state_token_123',
        appId: 'mock_meta_app_123',
        configId: 'mock_config_456',
        graphApiVersion: 'v26.0',
        expiresAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: 'acc-regression',
        workspaceId: 'ws-123',
        wabaId: 'waba_reg',
        phoneNumberId: 'phone_reg',
        displayName: 'Business',
        displayPhoneNumber: '+1 555-9999',
        qualityRating: 'GREEN',
        status: 'connected',
        lastSyncedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    let passedCallback: unknown = null;

    window.FB = {
      init: vi.fn(),
      login: vi.fn((callback) => {
        passedCallback = callback;
        // Meta's strict SDK check: if the expression is an AsyncFunction, it throws:
        // "Expression is of type asyncfunction, not function"
        const tag = Object.prototype.toString.call(callback);
        if (tag === '[object AsyncFunction]') {
          throw new TypeError('Expression is of type asyncfunction, not function');
        }

        // Simulate successful popup authorization
        callback({
          authResponse: { code: 'code_regression' },
          status: 'connected',
        });
      }),
    };

    const { result } = renderHook(() =>
      useMetaEmbeddedSignup({ workspaceId: 'ws-123' })
    );

    await act(async () => {
      await result.current.launchEmbeddedSignup();
    });

    expect(typeof passedCallback).toBe('function');
    expect(Object.prototype.toString.call(passedCallback)).toBe('[object Function]');
    expect(Object.prototype.toString.call(passedCallback)).not.toBe('[object AsyncFunction]');
    expect(result.current.status).toBe('CONNECTED');
    expect(result.current.errorMessage).toBeNull();
  });
});
