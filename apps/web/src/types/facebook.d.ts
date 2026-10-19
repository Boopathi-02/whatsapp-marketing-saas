export interface FacebookLoginResponse {
  authResponse?: {
    code?: string;
    accessToken?: string;
    expiresIn?: number;
    grantedScopes?: string;
    signedRequest?: string;
    userID?: string;
  };
  status?: 'connected' | 'not_authorized' | 'unknown';
}

export interface FacebookInitParams {
  appId: string;
  autoLogAppEvents?: boolean;
  xfbml?: boolean;
  version: string;
}

export interface FacebookLoginOptions {
  config_id: string;
  response_type: string;
  override_default_response_type: boolean;
  state?: string;
  scope?: string;
}

declare global {
  interface Window {
    FB?: {
      init: (params: FacebookInitParams) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: FacebookLoginOptions
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}
