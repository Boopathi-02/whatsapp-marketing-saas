import { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from '@whatsapp-saas/contracts';

export class ApiClientError extends Error {
  code?: string;
  details?: unknown;
  status?: number;

  constructor(message: string, code?: string, details?: unknown, status?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

const API_BASE = '/api/v1';

class ApiClient {
  private accessToken: string | null = null;
  private currentWorkspaceId: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  setWorkspaceId(workspaceId: string | null) {
    this.currentWorkspaceId = workspaceId;
  }

  getWorkspaceId() {
    return this.currentWorkspaceId;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (this.currentWorkspaceId) {
      headers['X-Workspace-Id'] = this.currentWorkspaceId;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Ensures HttpOnly cookies (refreshToken) are sent
    });

    const data = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !data.success) {
      const errorData = data as ApiErrorResponse;
      const errorMsg = errorData.error?.message || `Request failed with status ${response.status}`;
      throw new ApiClientError(
        errorMsg,
        errorData.error?.code,
        errorData.error?.details,
        response.status
      );
    }

    return (data as ApiSuccessResponse<T>).data;
  }

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async downloadBlob(endpoint: string): Promise<Blob> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    if (this.currentWorkspaceId) {
      headers['X-Workspace-Id'] = this.currentWorkspaceId;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    return response.blob();
  }
}

export const api = new ApiClient();
