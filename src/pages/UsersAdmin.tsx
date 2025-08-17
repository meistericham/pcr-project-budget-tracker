import { useEffect, useState } from 'react';
import { useIsSuperAdmin } from '../lib/authz';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';

// Dedicated reset password button component with proper edge function call
function ResetPasswordButton({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onReset = async () => {
    try {
      setBusy(true);
      setMsg(null);

      const newPassword = prompt(`Enter new password for ${email} (min 8 chars)`) || '';
      if (newPassword.length < 8) {
        setMsg('Password must be at least 8 characters');
        return;
      }

      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) {
        setMsg('Not signed in');
        return;
      }

      const res = await fetch(
        'https://ddqisrmoleupgqigmbhr.supabase.co/functions/v1/admin-reset-password',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, newPassword })
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Reset failed (${res.status})`);

      setMsg('Reset OK');
    } catch (e: any) {
      setMsg(e?.message || 'Reset failed');
      console.error('[UsersAdmin] reset error', e);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onReset}
        disabled={busy}
        className="px-3 py-1 rounded bg-purple-600 text-white disabled:opacity-50"
      >
        {busy ? 'Resetting…' : 'Reset Password'}
      </button>
      {msg && <span className="text-sm text-gray-600">{msg}</span>}
    </div>
  );
}

export default function UsersAdmin() {
  const { allowed, error, role } = useIsSuperAdmin();
  const { users } = useApp();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[UsersAdmin] allowed:', allowed, 'role:', role, 'error:', error);
    }
  }, [allowed, role, error]);

  // Guard: show "Checking permission..." while loading, "Not Authorized" only when definitively false
  if (allowed === null) {
    return <div className="p-6 text-sm">Checking permission…</div>;
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-2">Not Authorized</h2>
        <p className="text-sm text-gray-600">You must be a Super Admin to access this page.</p>
        {error && <p className="text-xs text-red-500 mt-2">({error})</p>}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Password Management (Super Admin)</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left p-2 border-b border-gray-200 dark:border-gray-700">Name</th>
              <th className="text-left p-2 border-b border-gray-200 dark:border-gray-700">Email</th>
              <th className="text-left p-2 border-b border-gray-200 dark:border-gray-700">Role</th>
              <th className="text-left p-2 border-b border-gray-200 dark:border-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => (
              <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-2">{user.name}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2 capitalize">{(user.role || '').replace('_',' ')}</td>
                <td className="p-2">
                  <ResetPasswordButton email={user.email} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}