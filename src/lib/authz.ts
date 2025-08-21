import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type AppRole = 'super_admin' | 'admin' | 'user';

export function useIsSuperAdmin(): {
  allowed: boolean | null;
  role?: AppRole;
  error?: string;
} {
  const [state, setState] = useState<{allowed: boolean|null, role?: AppRole, error?: string}>({allowed: null});
  const [jwtRole, setJwtRole] = useState<AppRole | null>(null);
  const [dbRole, setDbRole] = useState<AppRole | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 1. Get session JWT role as primary source of truth
        const { data: { session } } = await supabase.auth.getSession();
        const jwtRole = (session?.user?.app_metadata?.role as AppRole) || null;
        setJwtRole(jwtRole);
        
        // 2. If JWT says super_admin, trust it immediately
        if (jwtRole === 'super_admin') {
          if (!alive) return;
          setState({ allowed: true, role: 'super_admin' });
          setDbRole(null); // No DB lookup needed
          return;
        }

        // 3. Otherwise, fall back to users table lookup
        const uid = session?.user?.id;
        if (!uid) { 
          if (!alive) return;
          setState({ allowed: null }); 
          return; 
        }

        const { data, error: qErr } = await supabase
          .from('users')
          .select('role')
          .eq('id', uid)
          .single();

        if (qErr) { 
          if (!alive) return;
          setState({ allowed: false, role: undefined, error: qErr.message }); 
          return; 
        }

        const dbRole = (data?.role ?? '').trim() as AppRole;
        setDbRole(dbRole);
        if (!alive) return;
        setState({ allowed: dbRole === 'super_admin', role: dbRole });
      } catch (e: any) {
        if (!alive) return;
        console.error('[useIsSuperAdmin] Error:', e);
        setState({ allowed: false, role: undefined, error: e?.message ?? 'authz check failed' });
      }
    })();

    // Listen for auth state changes
    const sub = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_IN' || evt === 'TOKEN_REFRESHED') {
        setState({ allowed: null });
        // Re-check after auth state change
        (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const jwtRole = (session?.user?.app_metadata?.role as AppRole) || null;
            setJwtRole(jwtRole);
            
            // Trust JWT super_admin immediately
            if (jwtRole === 'super_admin') {
              if (!alive) return;
              setState({ allowed: true, role: 'super_admin' });
              setDbRole(null); // No DB lookup needed
              return;
            }

            const uid = session?.user?.id;
            if (!uid) { 
              if (!alive) return;
              setState({ allowed: null }); 
              return; 
            }

            const { data, error: qErr } = await supabase
              .from('users')
              .select('role')
              .eq('id', uid)
              .single();

            if (qErr) { 
              if (!alive) return;
              setState({ allowed: false, role: undefined, error: qErr.message }); 
              return; 
            }

            const dbRole = (data?.role ?? '').trim() as AppRole;
            setDbRole(dbRole);
            if (!alive) return;
            setState({ allowed: dbRole === 'super_admin', role: dbRole });
          } catch (e: any) {
            if (!alive) return;
            console.error('[useIsSuperAdmin] Re-check error:', e);
            setState({ allowed: false, role: undefined, error: e?.message ?? 'authz re-check failed' });
          }
        })();
      }
    });

    return () => { 
      alive = false; 
      sub.data.subscription.unsubscribe(); 
    };
  }, []);

  // Dev-only sentinel for debugging JWT vs DB role
  useEffect(() => {
    if (import.meta.env.DEV) {
      const sentinel = document.getElementById('__AUTHZ_ROLE_CHECK__');
      if (sentinel) {
        sentinel.textContent = `JWT: ${jwtRole || 'null'} | DB: ${dbRole || 'null'} | Allowed: ${state.allowed}`;
      }
    }
  }, [jwtRole, dbRole, state.allowed]);

  return state;
}


