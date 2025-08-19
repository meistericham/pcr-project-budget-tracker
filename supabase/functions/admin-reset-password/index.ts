// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ORIGIN = 'https://pcrtracker.meistericham.com';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Max-Age': '86400',
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function noContent(status = 204) {
  return new Response(null, { status, headers: CORS_HEADERS });
}

async function parseBearer(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) return null;
  return auth.slice(7).trim();
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return noContent(200);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const token = await parseBearer(req);
    if (!token) return json({ error: 'Unauthorized: missing token' }, 401);

    // env
    const url = Deno.env.get('SB_URL');
    const serviceRole = Deno.env.get('SB_SERVICE_ROLE_KEY');
    if (!url || !serviceRole) {
      return json({ error: 'Server misconfigured: missing SB_URL or SB_SERVICE_ROLE_KEY' }, 500);
    }

    // 1) Client from caller token (to know who is calling)
    const caller = createClient(url, token);

    // Who is calling?
    const { data: callerUser, error: callerErr } = await caller.auth.getUser();
    if (callerErr || !callerUser?.user) return json({ error: 'Unauthorized: invalid token' }, 401);

    // Look up caller's role in public.users
    const db = createClient(url, serviceRole); // use service role to read users table safely
    const { data: me, error: meErr } = await db
      .from('users')
      .select('id, role')
      .eq('id', callerUser.user.id)
      .single();

    if (meErr || !me) return json({ error: 'Forbidden: user not found in users table' }, 403);
    if (me.role !== 'super_admin') return json({ error: 'Forbidden: super_admin only' }, 403);

    // 2) Read input
    const body = await req.json().catch(() => null) as { email?: string; newPassword?: string } | null;
    const emailRaw = (body?.email || '').toLowerCase().trim();
    const newPassword = (body?.newPassword || '').trim();
    if (!emailRaw || !newPassword) return json({ error: 'email and newPassword are required' }, 400);

    // 3) Admin client for auth admin ops
    const admin = createClient(url, serviceRole);

    // helper: find user by email using listUsers (v2 does not have getUserByEmail)
    async function findAuthUserByEmail(email: string) {
      // basic single-page search; expand if you expect >1000 users
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const users = data?.users || [];
      const match = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
      return match || null;
    }

    let authUser = await findAuthUserByEmail(emailRaw);

    if (!authUser) {
      // Create auth user if not exist
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: emailRaw,
        password: newPassword,
        email_confirm: true,
      });
      if (createErr) return json({ error: `Create user failed: ${createErr.message}` }, 400);
      authUser = created.user ?? null;
      if (!authUser) return json({ error: 'Create user returned no user' }, 500);
    } else {
      // Update password for existing user
      const { error: updErr } = await admin.auth.admin.updateUserById(authUser.id, {
        password: newPassword,
      });
      if (updErr) return json({ error: `Update password failed: ${updErr.message}` }, 400);
    }

    return json({ ok: true, userId: authUser.id });
  } catch (e: any) {
    return json({ error: e?.message || 'Unexpected error' }, 500);
  }
}