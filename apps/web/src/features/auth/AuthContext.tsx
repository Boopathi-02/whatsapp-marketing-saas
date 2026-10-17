import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api.js';
import {
  AuthUserDto,
  LoginRequest,
  RegisterRequest,
  WorkspaceDto,
} from '@whatsapp-saas/contracts';

interface AuthContextValue {
  user: AuthUserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentWorkspace: WorkspaceDto | null;
  workspaces: WorkspaceDto[];
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<WorkspaceDto[]>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const WORKSPACE_STORAGE_KEY = 'whatsapp_saas_active_ws';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceDto | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchWorkspaces = useCallback(async (): Promise<WorkspaceDto[]> => {
    try {
      const list = await api.get<WorkspaceDto[]>('/workspaces');
      setWorkspaces(list);

      // Restore active workspace from sessionStorage if valid, otherwise select first workspace
      const savedWsId = sessionStorage.getItem(WORKSPACE_STORAGE_KEY);
      const matched = list.find(w => w.id === savedWsId);
      const active = matched || list[0] || null;

      if (active) {
        setCurrentWorkspace(active);
        api.setWorkspaceId(active.id);
        sessionStorage.setItem(WORKSPACE_STORAGE_KEY, active.id);
      }

      return list;
    } catch {
      return [];
    }
  }, []);

  const switchWorkspace = useCallback((workspaceId: string) => {
    setWorkspaces(prev => {
      const found = prev.find(w => w.id === workspaceId);
      if (found) {
        setCurrentWorkspace(found);
        api.setWorkspaceId(found.id);
        sessionStorage.setItem(WORKSPACE_STORAGE_KEY, found.id);
      }
      return prev;
    });
  }, []);

  // Try silent session restoration on mount via HttpOnly cookie refresh
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const refreshData = await api.post<{
          accessToken: string;
          user: AuthUserDto;
        }>('/auth/refresh');

        if (!isMounted) return;

        api.setAccessToken(refreshData.accessToken);
        setUser(refreshData.user);

        // Fetch workspaces for authenticated user
        await fetchWorkspaces();
      } catch {
        // Unauthenticated or expired session
        if (isMounted) {
          api.setAccessToken(null);
          api.setWorkspaceId(null);
          setUser(null);
          setCurrentWorkspace(null);
          setWorkspaces([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [fetchWorkspaces]);

  const login = async (data: LoginRequest) => {
    const res = await api.post<{
      user: AuthUserDto;
      accessToken: string;
    }>('/auth/login', data);

    api.setAccessToken(res.accessToken);
    setUser(res.user);

    await fetchWorkspaces();
  };

  const register = async (data: RegisterRequest) => {
    const res = await api.post<{
      user: AuthUserDto;
      accessToken: string;
      workspace?: { id: string; name: string; slug: string; role: string };
    }>('/auth/register', data);

    api.setAccessToken(res.accessToken);
    setUser(res.user);

    await fetchWorkspaces();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      api.setAccessToken(null);
      api.setWorkspaceId(null);
      setUser(null);
      setCurrentWorkspace(null);
      setWorkspaces([]);
      sessionStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    currentWorkspace,
    workspaces,
    login,
    register,
    logout,
    switchWorkspace,
    refreshWorkspaces: fetchWorkspaces,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useOptionalAuth(): AuthContextValue | undefined {
  return useContext(AuthContext);
}

