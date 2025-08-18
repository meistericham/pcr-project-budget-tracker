// supabase/functions/admin-reset-password/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// CORS headers for production-safe cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Read environment variables from Supabase secrets
    const url = Deno.env.get('SB_URL')
    const service = Deno.env.get('SB_SERVICE_ROLE_KEY')
    const anon = Deno.env.get('SB_ANON_KEY')
    
    if (!url || !service || !anon) {
      return new Response(JSON.stringify({ error: 'Server configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract Authorization token
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create admin client for user operations
    console.log(`[FUNCTION] Creating admin client with URL: ${url}`)
    const supabaseAdmin = createClient(url, service)
    console.log(`[FUNCTION] Admin client created successfully`)

    // Create user client with provided token to verify caller
    const supabaseUser = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    // Verify token is valid and get user
    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check user role in users table (not profiles)
    const { data: profile, error: profileError } = await supabaseUser
      .from('users')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profile || profile.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse and validate request body
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const newPassword = String(body?.newPassword ?? '')

    if (!email || !newPassword || newPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'Invalid input: email required, password min 8 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Try to find existing Auth user by email
    let targetUserId: string | null = null
    const pageSize = 200
    
    console.log(`[FUNCTION] Looking for Auth user with email: ${email}`)
    
    for (let page = 1; page <= 10 && !targetUserId; page++) { // Limit to 10 pages max
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ 
        page, 
        perPage: pageSize 
      })
      
      if (error) {
        console.error(`[FUNCTION] User lookup failed on page ${page}:`, error)
        return new Response(JSON.stringify({ error: `User lookup failed: ${error.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const matchedUser = data.users.find(user => 
        (user.email ?? '').toLowerCase() === email
      )
      
      if (matchedUser) {
        targetUserId = matchedUser.id
        console.log(`[FUNCTION] Found existing Auth user: ${targetUserId}`)
        break
      }

      // Break if we've seen all users
      if (data.users.length < pageSize) break
    }

    if (targetUserId) {
      // User exists in Auth - update password
      console.log(`[FUNCTION] Updating password for existing user: ${targetUserId}`)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: newPassword
      })

      if (updateError) {
        console.error(`[FUNCTION] Password update failed:`, updateError)
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      console.log(`[FUNCTION] Password updated successfully`)
    } else {
      // User doesn't exist in Auth - create new user
      console.log(`[FUNCTION] Creating new Auth user for email: ${email}`)
      
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: newPassword,
          email_confirm: true
        })

        if (createError) {
          console.error(`[FUNCTION] User creation failed:`, createError)
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        console.log(`[FUNCTION] New Auth user created successfully: ${newUser?.user?.id}`)
      } catch (createErr) {
        console.error(`[FUNCTION] Unexpected error during user creation:`, createErr)
        return new Response(JSON.stringify({ error: `User creation failed: ${(createErr as Error).message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Success response
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const message = (error as Error)?.message ?? 'Unknown server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})