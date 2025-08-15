import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type AppRole = 'super_admin' | 'admin' | 'user';

export function useIsSuperAdmin(): {
  allowed: boolean | null;
  role?: AppRole;
  error?: string;
} {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [role, setRole] = useState<AppRole | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = s?.session?.user?.id;
        if (!uid) { setAllowed(null); return; }

        const { data, error: qErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .single();

        if (qErr) { if (!cancelled) { setError(qErr.message); setAllowed(null); } return; }

        const r = (data?.role ?? '').trim() as AppRole;
        if (!cancelled) { setRole(r); setAllowed(r === 'super_admin'); }
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || 'Unknown error'); setAllowed(null); }
      }
    }

    check();
    const sub = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_IN' || evt === 'TOKEN_REFRESHED') {
        setAllowed(null);
        check();
      }
    });

    return () => { sub.data.subscription.unsubscribe(); cancelled = true; };
  }, []);

  return { allowed, role, error };
}


