import { useState, useEffect, useRef, useCallback } from 'react';
import { api, ApiClientError } from '../../../lib/api.js';
import {
  EmbeddedSignupConfigResponse,
  WhatsAppAccountDto,
} from '@whatsapp-saas/contracts';

export type EmbeddedSignupStatus = 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'FAILED';

export interface UseMetaEmbeddedSignupProps {
  workspaceId?: string;
  onSuccess?: (account: WhatsAppAccountDto) => void;
  onError?: (error: string) => void;
}

export function useMetaEmbeddedSignup({
  workspaceId,
  onSuccess,
  onError,
}: UseMetaEmbeddedSignupProps) {
  const [status, setStatus] = useState<EmbeddedSignupStatus>('NOT_CONNECTED');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectingStep, setConnectingStep] = useState<string | null>(null);

  const capturedIdsRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});
  const stateTokenRef = useRef<string | null>(null);
  const configCacheRef = useRef<EmbeddedSignupConfigResponse | null>(null);
  const isExchangingRef = useRef<boolean>(false);

  // 1. Listen for cross-window session messages from Meta Embedded Signup v4
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: verify event origin originates from Facebook
      const origin = event.origin || '';
      if (!origin.endsWith('.facebook.com') && origin !== 'https://facebook.com') {
        return;
      }

      let parsedData: {
        type?: string;
        event?: string;
        data?: {
          waba_id?: string;
          phone_number_id?: string;
          error_message?: string;
          [key: string]: unknown;
        };
      } | null = null;
      try {
        parsedData = typeof event.data === 'string' ? JSON.parse(event.data) : (event.data as typeof parsedData);
      } catch {
        return;
      }

      if (parsedData?.type === 'WA_EMBEDDED_SIGNUP') {
        const { event: waEvent, data: waData } = parsedData;

        if (waEvent === 'FINISH') {
          capturedIdsRef.current = {
            wabaId: waData?.waba_id,
            phoneNumberId: waData?.phone_number_id,
          };
          setConnectingStep('Verifying ownership and registering phone number with Meta...');
        } else if (waEvent === 'CANCEL') {
          setStatus('FAILED');
          const reason = waData?.error_message || 'WhatsApp signup was cancelled.';
          setErrorMessage(reason);
          onError?.(reason);
        } else if (waEvent === 'ERROR') {
          setStatus('FAILED');
          const reason = waData?.error_message || 'An error occurred during WhatsApp signup.';
          setErrorMessage(reason);
          onError?.(reason);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onError]);

  // 2. Fetch public configuration & secure onboarding CSRF session
  const fetchSessionAndConfig = useCallback(async (): Promise<{
    appId: string;
    configId: string;
    graphApiVersion: string;
    stateToken?: string;
  }> => {
    if (!workspaceId) throw new Error('Workspace ID is missing');

    try {
      // Attempt to establish a server-validated CSRF onboarding session
      const session = await api.post<{
        sessionId: string;
        stateToken: string;
        appId: string;
        configId: string;
        graphApiVersion: string;
        expiresAt: string;
      }>(`/workspaces/${workspaceId}/whatsapp-accounts/onboarding/session`, {});

      stateTokenRef.current = session.stateToken;
      return {
        appId: session.appId,
        configId: session.configId,
        graphApiVersion: session.graphApiVersion,
        stateToken: session.stateToken,
      };
    } catch {
      // Fallback to legacy config endpoint if session creation fails
      if (configCacheRef.current) return configCacheRef.current;
      const config = await api.get<EmbeddedSignupConfigResponse>(
        `/workspaces/${workspaceId}/whatsapp-accounts/config`
      );
      configCacheRef.current = config;
      return config;
    }
  }, [workspaceId]);

  // 3. Load and initialize Meta Facebook JavaScript SDK
  const loadFacebookSdk = useCallback((appId: string, version: string): Promise<void> => {
    return new Promise((resolve) => {
      if (window.FB) {
        window.FB.init({
          appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: version || 'v26.0',
        });
        resolve();
        return;
      }

      window.fbAsyncInit = function () {
        window.FB?.init({
          appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: version || 'v26.0',
        });
        resolve();
      };

      const existingScript = document.getElementById('facebook-jssdk');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          // If CDN is blocked or unavailable, still resolve so mock/fallback can handle
          resolve();
        };
        document.body.appendChild(script);
      }
    });
  }, []);

  // 4. Launch Meta Embedded Signup v4
  const launchEmbeddedSignup = useCallback(async () => {
    if (!workspaceId) {
      setErrorMessage('Please select a workspace before connecting WhatsApp.');
      setStatus('FAILED');
      return;
    }

    if (isExchangingRef.current) {
      return;
    }

    try {
      setStatus('CONNECTING');
      setErrorMessage(null);
      setConnectingStep('Creating secure Meta onboarding session...');
      capturedIdsRef.current = {};
      stateTokenRef.current = null;

      const sessionConfig = await fetchSessionAndConfig();
      setConnectingStep('Initializing Meta Facebook Login for Business...');
      await loadFacebookSdk(sessionConfig.appId, sessionConfig.graphApiVersion);

      if (!window.FB) {
        throw new Error(
          'Meta Facebook SDK could not be loaded. Please disable ad-blockers or use manual credentials setup.'
        );
      }

      setConnectingStep('Awaiting your authorization in the Meta popup window...');

      // Handler for auth response from Meta popup window
      const handleAuthResponse = async (response: {
        authResponse?: { code?: string; [key: string]: unknown };
        status?: string;
      }) => {
        if (isExchangingRef.current) return;
        isExchangingRef.current = true;

        try {
          if (response.authResponse?.code) {
            setConnectingStep('Exchanging authorization code and configuring Meta webhooks...');

            const connectedAccount = await api.post<WhatsAppAccountDto>(
              `/workspaces/${workspaceId}/whatsapp-accounts/embedded-signup`,
              {
                code: response.authResponse.code,
                stateToken: stateTokenRef.current || undefined,
                wabaId: capturedIdsRef.current.wabaId,
                phoneNumberId: capturedIdsRef.current.phoneNumberId,
              }
            );

            setStatus('CONNECTED');
            setConnectingStep(null);
            onSuccess?.(connectedAccount);
          } else {
            setStatus('FAILED');
            setConnectingStep(null);
            const msg = 'Meta WhatsApp signup was cancelled or required permissions were not granted.';
            setErrorMessage(msg);
            onError?.(msg);
          }
        } catch (backendErr: unknown) {
          const msg =
            backendErr instanceof ApiClientError
              ? backendErr.message
              : 'Failed to complete Meta WhatsApp onboarding.';
          setStatus('FAILED');
          setConnectingStep(null);
          setErrorMessage(msg);
          onError?.(msg);
        } finally {
          isExchangingRef.current = false;
        }
      };

      // CRITICAL FIX: Pass a standard, synchronous callback function to FB.login.
      // Meta Facebook JS SDK strictly asserts that the callback is a regular Function,
      // rejecting AsyncFunction objects with: "Expression is of type asyncfunction, not function".
      window.FB.login(
        function (response) {
          void handleAuthResponse(response);
        },
        {
          config_id: sessionConfig.configId,
          response_type: 'code',
          override_default_response_type: true,
          state: sessionConfig.stateToken,
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to launch Meta signup flow.';
      setStatus('FAILED');
      setConnectingStep(null);
      setErrorMessage(msg);
      onError?.(msg);
    }
  }, [workspaceId, fetchSessionAndConfig, loadFacebookSdk, onSuccess, onError]);

  const resetStatus = useCallback(() => {
    isExchangingRef.current = false;
    setStatus('NOT_CONNECTED');
    setErrorMessage(null);
    setConnectingStep(null);
  }, []);

  return {
    status,
    errorMessage,
    connectingStep,
    launchEmbeddedSignup,
    resetStatus,
  };
}
