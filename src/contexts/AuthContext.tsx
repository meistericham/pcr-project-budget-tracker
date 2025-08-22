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
  const [profileSyncInProgress, setProfileSyncInProgress] = useState<Set<string>>(new Set());

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
          await refreshCurrentUser(); // ⬅️ add this line
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
        // Always fetch the latest DB profile into React state
        syncProfile();
    
        // 🚫 Only run upsert on SIGNED_IN (first login),
        // not on every token refresh or state change
        if (_event === 'SIGNED_IN') {
          upsertUserProfile(session);
        }
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

  // First-login profile sync (sync auth.users → public.users) - merge-only approach
  const upsertUserProfile = async (session: any): Promise<void> => {
    const u = session?.user;
    if (!u?.id || !u.email) return;

    // Reentrancy guard - prevent multiple simultaneous syncs for the same user
    if (profileSyncInProgress.has(u.id)) {
      if (import.meta.env.DEV) {
        console.debug('[AUTH] Profile sync already in progress for user:', u.id);
      }
      return;
    }

    setProfileSyncInProgress(prev => new Set(prev).add(u.id));

    const m = u.user_metadata || {};
    const jwtRole = (u.app_metadata?.role as 'super_admin'|'admin'|'user') || null;
    const metadataRole = (m.role ?? 'user') as 'super_admin'|'admin'|'user';
    
    // Prefer JWT role over metadata role
    const role = jwtRole || metadataRole;
    const name = m.name ?? (u.email.split('@')[0] ?? 'User');
    const initials = m.initials ?? (name ? name.split(' ').map((s: string) => s[0]).join('').slice(0,2).toUpperCase() : 'U');

    try {
      // First, check if user row exists
      const { data: existingRow, error: selectError } = await supabase
        .from('users')
        .select('id, role, division_id, unit_id, name, email, initials, created_at')
        .eq('id', u.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[AUTH] Failed to check existing user:', selectError);
        return;
      }

      if (!existingRow) {
        // Creating new user row
        const newUserData = {
          id: u.id,
          name,
          email: u.email,
          role,
          initials,
          division_id: m.divisionId ?? null,
          unit_id: m.unitId ?? null,
          created_at: new Date().toISOString()
        };

        if (import.meta.env.DEV) {
          console.warn('[USERS:WRITE] about to write', {
            src: 'AuthContext:syncProfile',
            payload: newUserData,
            where: { id: u.id },
            stack: new Error().stack?.split('\n').slice(0,3)
          });
        }

        const { error: insertError } = await supabase
          .from('users')
          .insert(newUserData);

        if (import.meta.env.DEV) {
          console.warn('[USERS:WRITE:RESULT]', {
            src: 'AuthContext:syncProfile',
            error: insertError,
            row: null
          });
        }

        if (insertError) {
          console.error('[AUTH] Failed to create user profile:', insertError);
          return;
        }

        if (import.meta.env.DEV) {
          console.debug('[AUTH] Profile created for first login:', { id: u.id, email: u.email, role, mode: 'create' });
        }
      } else {
        // User exists - only update fields that are explicitly available and safe
        const patch: any = {};

        /**
        * IMPORTANT:
        * Do NOT overwrite a user's chosen name/initials from auth metadata.
        * Only set them if the DB has no value yet.
        * This prevents "reverting to email-localpart" after refresh/login.
        */     

        // name: only write if DB has no name yet
        if ((!existingRow.name || !existingRow.name.trim()) && name && name.trim()) {
          patch.name = name.trim();
        } 

        // initials: only write if DB has no initials yet
        if ((!existingRow.initials || !existingRow.initials.trim()) && initials && initials.trim()) {
          patch.initials = initials.trim();
        }

        /**
        * Role can still be promoted (e.g., user -> admin/super_admin),
        * but never demoted here.
        */
        if (role && role !== existingRow.role) {
          const roleHierarchy = { 'user': 1, 'admin': 2, 'super_admin': 3 };
          const currentLevel = roleHierarchy[existingRow.role as keyof typeof roleHierarchy] || 0;
          const newLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0;
          
          if (newLevel > currentLevel) {
            patch.role = role;
            if (import.meta.env.DEV) {
              console.debug('[AUTH] Role promoted:', { from: existingRow.role, to: role, userId: u.id });
            }
          }
        }
        
        // Only update role if we're promoting to a higher role
        if (role && role !== existingRow.role) {
          const roleHierarchy = { 'user': 1, 'admin': 2, 'super_admin': 3 };
          const currentLevel = roleHierarchy[existingRow.role as keyof typeof roleHierarchy] || 0;
          const newLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0;
          
          if (newLevel > currentLevel) {
            patch.role = role;
            if (import.meta.env.DEV) {
              console.debug('[AUTH] Role promoted:', { from: existingRow.role, to: role, userId: u.id });
            }
          }
        }
        
        // Only update if we have changes to make
        if (Object.keys(patch).length > 0) {
          if (import.meta.env.DEV) {
            console.warn('[USERS:WRITE] about to write', {
              src: 'AuthContext:syncProfile',
              payload: patch,
              where: { id: u.id },
              stack: new Error().stack?.split('\n').slice(0,3)
            });
          }

          const { error: updateError } = await supabase
            .from('users')
            .update(patch)
            .eq('id', u.id);

          if (import.meta.env.DEV) {
            console.warn('[USERS:WRITE:RESULT]', {
              src: 'AuthContext:syncProfile',
              error: updateError,
              row: null
            });
          }

          if (updateError) {
            console.error('[AUTH] Failed to update user profile:', updateError);
            return;
          }

          if (import.meta.env.DEV) {
            console.debug('[AUTH] Profile updated:', { id: u.id, patch, mode: 'update', existingRow });
          }
        } else if (import.meta.env.DEV) {
          console.debug('[AUTH] No profile updates needed:', { id: u.id, existingRow });
        }
      }
    } catch (err) {
      console.error('[AUTH] Failed to sync profile:', err);
    } finally {
      // Clear reentrancy guard
      setProfileSyncInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(u.id);
        return newSet;
      });
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
        window.__LAST_PROFILE = freshProfile;
        console.log('[PROFILE:SET]', freshProfile);
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
    
    if (import.meta.env.DEV) {
      console.warn('[USERS:WRITE] about to write', {
        src: 'AuthContext:updateProfileName',
        payload: { name: newName },
        where: { id: user.id },
        stack: new Error().stack?.split('\n').slice(0,3)
      });
    }
    
    const { error } = await supabase.from('users').update({ name: newName }).eq('id', user.id);
    
    if (import.meta.env.DEV) {
      console.warn('[USERS:WRITE:RESULT]', {
        src: 'AuthContext:updateProfileName',
        error,
        row: null
      });
    }
    
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