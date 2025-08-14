// supabase/functions/admin-reset-password/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const url = Deno.env.get('SB_URL')
    const anon = Deno.env.get('SB_ANON_KEY')
    const service = Deno.env.get('SB_SERVICE_ROLE_KEY')
    if (!url || !anon || !service) {
      return new Response(JSON.stringify({ error: 'Server env missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Authorization
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    // Allow direct service access (skip role check)
    const isService = token === service

    // Always create admin client
    const supabaseAdmin = createClient(url, service)

    // If not using service_role, enforce super_admin role via profiles
    if (!isService) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const supabaseUser = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      })

      // Verify caller
      const { data: me, error: meErr } = await supabaseUser.auth.getUser()
      if (meErr || !me?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Check role in profiles
      const { data: prof, error: profErr } = await supabaseUser
        .from('profiles')
        .select('role')
        .eq('id', me.user.id)
        .single()

      if (profErr || !prof || prof.role !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: super_admin only' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Parse input
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const newPassword = String(body?.newPassword ?? '')

    if (!email || !newPassword || newPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Find target user by email
    let targetUserId: string | null = null
    const pageSize = 200
    for (let page = 1; page < 100 && !targetUserId; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: pageSize })
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      const hit = data.users.find(u => (u.email ?? '').toLowerCase() === email)
      if (hit) targetUserId = hit.id
      if (data.users.length < pageSize) break
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Update password
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword
    })
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    const msg = (e as Error)?.message ?? 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
