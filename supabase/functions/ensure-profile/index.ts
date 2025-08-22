// supabase/functions/ensure-profile/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...(init.headers || {}) }
  })
}

function toInitials(input: string): string {
  if (!input) return ''
  const letters = input.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase()
  return letters || input.slice(0, 2).toUpperCase()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SB_URL')
    const anon = Deno.env.get('SB_ANON_KEY')
    const service = Deno.env.get('SB_SERVICE_ROLE_KEY')
    const superAdminEmail = (Deno.env.get('SUPERADMIN_EMAIL') || '').toLowerCase()

    if (!url || !anon || !service) {
      return json({ error: 'Server configuration missing' }, { status: 500 })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return json({ error: 'Unauthorized: missing token' }, { status: 401 })
    }

    // User-scoped client (to resolve the caller's user)
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const adminClient = createClient(url, service)

    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return json({ error: 'Unauthorized: invalid token' }, { status: 401 })
    }

    const uid = userData.user.id
    const email = (userData.user.email || '').toLowerCase()
    const nameFromEmail = email.split('@')[0] || ''
    const initials = toInitials(nameFromEmail)

    // Try to read existing profile
    const { data: existing, error: readErr, status } = await adminClient
      .from('users')
      .select('id, email, name, role, initials, division_id, unit_id')
      .eq('id', uid)
      .single()

    if (!readErr && existing) {
      return json({ ok: true, profile: existing }, { status: 200 })
    }

    if (status !== 406 && readErr) {
      // Other read errors
      return json({ error: readErr.message }, { status: 500 })
    }

    // Build new profile with default role
    const role = email && email === superAdminEmail ? 'super_admin' : 'user'
    const profile = {
      id: uid,
      email,
      name: nameFromEmail || email,
      role,
      initials
    }

    const { data: upserted, error: upErr } = await adminClient
      .from('users')
      .upsert(profile, { onConflict: 'id' })
      .select('id, email, name, role, initials, division_id, unit_id')
      .single()

    if (upErr) {
      return json({ error: upErr.message }, { status: 500 })
    }

    return json({ ok: true, profile: upserted }, { status: 200 })
  } catch (e) {
    const message = (e as Error)?.message ?? 'Unknown server error'
    return json({ error: message }, { status: 500 })
  }
})


