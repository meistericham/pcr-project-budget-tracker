import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type AppRole = 'super_admin' | 'admin' | 'user';

export function useIsSuperAdmin(): {
  allowed: boolean | null;
  role?: AppRole;
  error?: string;
} {
  const [state, setState] = useState<{allowed: boolean|null, role?: AppRole, error?: string}>({allowed: null});

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Wait for session to be available
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        
        if (!uid) { 
          if (!alive) return;
          setState({ allowed: null }); 
          return; 
        }

        // Try to get role from JWT metadata first (faster)
        const jwtRole = session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role ?? null;
        
        // Fallback to database query
        let dbRole = null;
        if (uid) {
          const { data, error: qErr } = await supabase
            .from('users')
            .select('role')
            .eq('id', uid)
            .single();

          if (!qErr && data?.role) {
            dbRole = data.role;
          }
        }

        // Use database role if available, otherwise JWT role, fallback to 'user'
        const role = (dbRole || jwtRole || 'user') as AppRole;
        
        if (!alive) return;
        setState({ allowed: role === 'super_admin', role });
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
            const uid = session?.user?.id;
            
            if (!uid) { 
              if (!alive) return;
              setState({ allowed: null }); 
              return; 
            }

            const jwtRole = session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role ?? null;
            let dbRole = null;
            
            if (uid) {
              const { data, error: qErr } = await supabase
                .from('users')
                .select('role')
                .eq('id', uid)
                .single();

              if (!qErr && data?.role) {
                dbRole = data.role;
              }
            }

            const role = (dbRole || jwtRole || 'user') as AppRole;
            
            if (!alive) return;
            setState({ allowed: role === 'super_admin', role });
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

  return state;
}


