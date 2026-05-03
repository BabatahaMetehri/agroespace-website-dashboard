import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, FUNCTIONS_BASE } from './supabase';

type AdminProfile = { user: User; isAdmin: boolean };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  /** True while the /admin/whoami request is still in-flight. Use this to
   *  avoid showing a "forbidden" flash before the check finishes. */
  adminCheckPending: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  // Authenticated fetch — automatically attaches the access token. Uses the
  // edge function base URL by default so callers can pass a path like "/quotes".
  api: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheckPending, setAdminCheckPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Validate admin membership against the server (the email allowlist lives
  // in the edge function env). Re-runs whenever the session changes.
  useEffect(() => {
    let cancelled = false;
    if (!session?.user) {
      setProfile(null);
      setAdminCheckPending(false);
      return;
    }
    setAdminCheckPending(true);
    fetch(`${FUNCTIONS_BASE}/admin/whoami`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (r) => {
        if (cancelled) return;
        if (r.ok) {
          setProfile({ user: session.user, isAdmin: true });
        } else {
          setProfile({ user: session.user, isAdmin: false });
        }
      })
      .catch(() => {
        if (!cancelled) setProfile({ user: session.user, isAdmin: false });
      })
      .finally(() => {
        if (!cancelled) setAdminCheckPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.access_token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin: !!profile?.isAdmin,
      adminCheckPending,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return {};
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      api: async (path, init = {}) => {
        const headers = new Headers(init.headers ?? {});
        if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
          headers.set('Content-Type', 'application/json');
        }
        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`);
        }
        const url = path.startsWith('http') ? path : `${FUNCTIONS_BASE}${path}`;
        const res = await fetch(url, { ...init, headers });
        const text = await res.text();
        const data = text ? safeJson(text) : null;
        if (!res.ok) {
          const message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
          throw new Error(message);
        }
        return data as never;
      },
    }),
    [session, profile, loading, adminCheckPending]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const useAdminAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
