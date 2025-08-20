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
  forgotPassword: (email: string, redirectTo?: string) => Promise<void>;
  updateProfileName: (newName: string) => Promise<void>;

  // server-side (edge function) admin reset by super_admin
  adminResetPassword: (email: string, newPassword: string) => Promise<void>;
  reloadProfile: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;

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
          await upsertUserProfile(data.session);
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
        upsertUserProfile(session);
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

  // First-login profile upsert (sync auth.users → public.users)
  const upsertUserProfile = async (session: any): Promise<void> => {
    const u = session?.user;
    if (u?.id && u.email) {
      const m = u.user_metadata || {};
      const role = (m.role ?? 'user') as 'super_admin'|'admin'|'user';
      const name = m.name ?? (u.email.split('@')[0] ?? 'User');
      const initials = m.initials ?? (name ? name.split(' ').map((s: string) => s[0]).join('').slice(0,2).toUpperCase() : 'U');

      try {
        await supabase.from('users').upsert({
          id: u.id,
          name,
          email: u.email,
          role,
          initials,
          division_id: m.divisionId ?? null,
          unit_id: m.unitId ?? null,
          created_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
        if (import.meta.env.DEV) {
          console.debug('[AUTH] Profile upserted for first login:', { id: u.id, email: u.email, role });
        }
      } catch (err) {
        console.error('[AUTH] Failed to upsert profile on first login:', err);
      }
    }
  };

  // Refresh current user profile from database (useful after updates)
  const refreshCurrentUser = async (): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('[AUTH] Failed to refresh current user:', error);
        return;
      }
      
      // Update profile with fresh data including division_id and unit_id
      const freshProfile = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        initials: data.initials,
        division: data.division_id,
        unit: data.unit_id
      };
      
      setProfile(freshProfile);
      setRole((data.role as Role) ?? null);
      
      if (import.meta.env.DEV) {
        console.debug('[AUTH] Current user refreshed:', freshProfile);
      }
    } catch (err) {
      console.error('[AUTH] Error refreshing current user:', err);
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

  // forgot password (self-service)
  const forgotPassword = async (email: string, redirectTo?: string) => {
    setError(null);
    
    // Use provided redirectTo or fallback to current logic
    const defaultRedirectTo = window.location.hostname === 'localhost'
      ? 'http://localhost:5173/update-password'
      : 'https://pcrtracker.meistericham.com/update-password';
    
    const finalRedirectTo = redirectTo || defaultRedirectTo;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: finalRedirectTo });
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
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword }),
        signal: controller.signal,
      });
      
      clearTimeout(id);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error', code: 'UNKNOWN' }));
        throw new Error(`${errorData.error} (${errorData.code || 'NO_CODE'})`);
      }
      
      const data = await res.json();
      console.log('[AUTH] Password reset successful:', data);
      
    } catch (err: any) {
      clearTimeout(id);
      
      if (err.name === 'AbortError') {
        throw new Error('Password service timed out, please retry');
      }
      
      throw new Error(err.message || 'Password reset failed');
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
        forgotPassword,
        updateProfileName,
        adminResetPassword,
        reloadProfile: syncProfile,
        refreshCurrentUser,
        loading,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};