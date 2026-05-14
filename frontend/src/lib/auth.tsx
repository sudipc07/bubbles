import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await api<{ user: AuthUser }>('/api/auth/me');
    return res.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const state: AuthState = {
    user: query.data ?? null,
    isLoading: query.isLoading,
    refresh: async () => {
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  };
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/api/auth/logout', { method: 'POST' }),
    onSuccess: async () => {
      qc.setQueryData(['auth', 'me'], null);
      await qc.invalidateQueries();
    },
  });
}

export function useRequestCode() {
  return useMutation({
    mutationFn: (email: string) =>
      api<{ ok: boolean }>('/api/auth/request-code', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  });
}

export function useVerifyCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; code: string }) =>
      api<{ user: AuthUser }>('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async (data) => {
      qc.setQueryData(['auth', 'me'], data.user);
    },
  });
}
