import { supabase } from './supabase';

export type AppProfile = {
  id: string;
  email: string | null;
  name: string | null;
  role: 'super_admin' | 'admin' | 'user';
  initials: string | null;
  division_id?: string | null;
  unit_id?: string | null;
};

type GetProfileResult = {
  profile: AppProfile | null;
  error: any;
  status: number | null;
};

export const getMyProfile = async (): Promise<GetProfileResult> => {
  try {
    const { data: ures } = await supabase.auth.getUser();
    const uid = ures?.user?.id;
    if (!uid) return { profile: null, error: null, status: 401 };

    if (import.meta.env.DEV) console.debug('[AUTH] user loaded', uid);
    const { data, error, status } = await supabase
      .from('users')
      .select('id,email,name,initials,division_id,unit_id,role')
      .eq('id', uid)
      .single();

    if (status === 406) {              // no profile row yet
      return { profile: null, error, status }; 
    }
    
    if (import.meta.env.DEV) console.debug('[PROFILE] status', status, 'role', (data as any)?.role, error?.message);
    return { profile: (data as AppProfile) || null, error, status: status ?? null };
  } catch (error) {
    return { profile: null, error, status: null };
  }
};

export const ensureMyProfile = async (): Promise<AppProfile | null> => {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) return null;

    const res = await fetch('https://ddqisrmoleupgqigmbhr.functions.supabase.co/ensure-profile', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (res.ok) return (json?.profile as AppProfile) || null;
      if (import.meta.env.DEV) console.warn('[profile] ensure failed', json);
      return null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
};

export const upsertMyProfile = async (patch: Partial<AppProfile>): Promise<AppProfile | null> => {
  const { data: ures } = await supabase.auth.getUser();
  const uid = ures?.user?.id;
  if (!uid) return null;
  const payload = { id: uid, ...patch } as Partial<AppProfile> & { id: string };
  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id' })
    .select('id,email,name,initials,division_id,unit_id,role')
    .single();
  if (error) throw new Error(error.message);
  return data as AppProfile;
};


// ---- Added: reactive profile hook + inline name save ----
import { useEffect, useState, useCallback } from 'react';

export function useMyProfile() {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: ures } = await supabase.auth.getUser();
      const uid = ures?.user?.id;
      if (!uid) { setProfile(null); setLoading(false); return; }
      const { data, error, status } = await supabase
        .from('users')
        .select('id,email,name,initials,division_id,unit_id,role')
        .eq('id', uid)
        .single();
      if (error) setError(error.message || `Profile load failed (${status})`);
      else setProfile(data as AppProfile);
    } catch (e: any) {
      setError(e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onProfileUpdated = (e: any) => {
      const next = e?.detail as AppProfile | null;
      if (next && next.id === profile?.id) {
        setProfile(next);
      }
    };
    window.addEventListener('profile-updated', onProfileUpdated as EventListener);
    const sub = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_IN' || evt === 'TOKEN_REFRESHED') load();
    });
    return () => {
      sub.data.subscription.unsubscribe();
      window.removeEventListener('profile-updated', onProfileUpdated as EventListener);
    };
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return { profile, setProfile, loading, error, refresh };
}

/** Update only current user's name and return updated row. */
export async function saveMyNameInline(newName: string): Promise<AppProfile> {
  const { data: ures } = await supabase.auth.getUser();
  const uid = ures?.user?.id;
  if (!uid) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('users')
    .update({ name: newName })
    .eq('id', uid)
    .select('id,email,name,initials,division_id,unit_id,role')
    .single();

  if (error) throw new Error(error.message);
  const updated = data as AppProfile;
  try {
    window.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
  } catch {}
  return updated;
}

