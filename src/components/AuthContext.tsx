import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Role = 'admin' | 'manager' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ ok: false, error: 'not initialized' }),
  register: async () => ({ ok: false, error: 'not initialized' }),
  logout: async () => {},
  refresh: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/**
 * Role-based capability helper.
 * Admin: all. Manager: edit+view. Viewer: view only.
 */
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;

  return {
    canView: !!user,
    canEdit: role === 'admin' || role === 'manager',
    canManage: role === 'admin', // add/delete members, settings
    role,
  };
}

async function apiCall<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(path, {
      ...options,
      credentials: 'include', // send HttpOnly cookie
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };

    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }

    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const res = await apiCall<{
      user: (User & {
        fb_connected?: boolean;
        fb_token_expires_at?: number | null;
      }) | null;
    }>('/api/auth/me');
    const u = res.ok ? res.data.user : null;
    setUser(u);

    // Sync FB connection state from server (token stays server-side only).
    // Both branches dispatch 'fb-connection-change' so listeners see the
    // flip from true→false as well as false→true.
    if (u?.fb_connected) {
      localStorage.setItem('adbot_fb_connected', 'true');
      if (u.fb_token_expires_at) {
        localStorage.setItem('fb_token_expires_at', String(u.fb_token_expires_at));
      }
    } else {
      localStorage.removeItem('adbot_fb_connected');
      localStorage.removeItem('fb_token_expires_at');
    }
    window.dispatchEvent(new Event('fb-connection-change'));

    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const login: AuthContextType['login'] = async (email, password) => {
    const res = await apiCall<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) return { ok: false, error: res.error };

    // Refresh from /me to sync fb_connected and other server-side state
    await refresh();

    return { ok: true };
  };

  const register: AuthContextType['register'] = async (name, email, password) => {
    const res = await apiCall<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) return { ok: false, error: res.error };

    setUser(res.data.user);

    return { ok: true };
  };

  const logout = async () => {
    await apiCall('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
