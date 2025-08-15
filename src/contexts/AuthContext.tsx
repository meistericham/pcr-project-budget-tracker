import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMyProfile, ensureMyProfile } from '../lib/profile';

// Shape of the profile row we need
type Role = 'super_admin' | 'admin' | 'user';
// kept for reference of shape
// type ProfileRow = { role: Role } | null;

interface AuthContextType {
  user: ReturnType<typeof mapUser> | null;
  profile: any | null;
  role: Role | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // optional helpers you already referenced
  changePassword: (newPassword: string) => Promise<void>;
  updateProfileName: (newName: string) => Promise<void>;

  // server-side (edge function) admin reset by super_admin
  adminResetPassword: (email: string, newPassword: string) => Promise<void>;
  reloadProfile: () => Promise<void>;

  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

// map supabase user → minimal app user
function mapUser(u: any) {
  if (!u) return null;
  return {
    id: u.id as string,
    email: u.email as string | null,
    // add more if you store user_metadata, etc.
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ReturnType<typeof mapUser> | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  // Seed from current session + subscribe to changes
  useEffect(() => {
    let mounted = true;

    const seed = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const u = data.session?.user ?? null;
        if (!mounted) return;
        setUser(mapUser(u));
        if (u?.id) {
          await syncProfile();
        } else {
          setRole(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    seed();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(mapUser(u));
      if (u?.id) {
        syncProfile();
      } else {
        setRole(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync profile & role; auto-create if missing
  const syncProfile = async (): Promise<void> => {
    const { profile: p, status } = await getMyProfile();
    if (import.meta.env.DEV) console.debug('[PROFILE] status', status, 'role', p?.role);
    if (status === 406 || status === 404) {
      const created = await ensureMyProfile();
      if (created) {
        const again = await getMyProfile();
        setProfile(again.profile);
        setRole((again.profile?.role as Role) ?? null);
        if (import.meta.env.DEV && again.profile) {
          console.debug('[PROFILE] loaded', { email: again.profile.email, role: again.profile.role });
        }
      } else {
        setProfile(null);
        setRole(null);
        setError('Your profile is not set up yet. Please contact an administrator.');
      }
      return;
    }
    setProfile(p);
    setRole((p?.role as Role) ?? null);
    if (import.meta.env.DEV && p) {
      console.debug('[PROFILE] loaded', { email: p.email, role: p.role });
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await syncProfile();
  };

  const logout = async () => {
    setError(null);
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  // change own password (logged-in user)
  const changePassword = async (newPassword: string) => {
    setError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  // update display name in your profiles table (if you store it there)
  const updateProfileName = async (newName: string) => {
    setError(null);
    if (!user?.id) return;
    const { error } = await supabase.from('profiles').update({ name: newName }).eq('id', user.id);
    if (error) throw new Error(error.message);
    // optional: refetch role or user profile if you show it
  };

  // super_admin resets another user's password via Edge Function
  const adminResetPassword = async (email: string, newPassword: string) => {
    setError(null);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(
      'https://ddqisrmoleupgqigmbhr.functions.supabase.co/admin-reset-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword }),
      }
    );

    const text = await res.text();
    let payload: any = text;
    try { payload = JSON.parse(text); } catch {}
    if (!res.ok) {
      throw new Error(payload?.error || `Failed (HTTP ${res.status})`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAuthenticated: !!user,
        login,
        logout,
        changePassword,
        updateProfileName,
        adminResetPassword,
        reloadProfile: syncProfile,
        loading,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};