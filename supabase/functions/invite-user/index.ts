import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestId = crypto.randomUUID().slice(0, 8)
    console.log(`[${requestId}] invite-user function started`)

    // Parse request body
    const { email, name, role, divisionId, unitId } = await req.json()

    // Validate required fields
    if (!email || !name || !role) {
      console.log(`[${requestId}] Bad input - email: ${!!email}, name: ${!!name}, role: ${!!role}`)
      return new Response(
        JSON.stringify({ error: 'email, name, and role are required', code: 'BAD_INPUT' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    if (!['admin', 'user'].includes(role)) {
      console.log(`[${requestId}] Invalid role: ${role}`)
      return new Response(
        JSON.stringify({ error: 'role must be admin or user', code: 'INVALID_ROLE' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Processing invite request for email: ${email}, role: ${role}`)

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`[${requestId}] Missing or invalid authorization header`)
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', code: 'UNAUTHORIZED' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Validate environment variables
    const url = Deno.env.get('SUPABASE_URL')
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const siteUrl = Deno.env.get('SITE_URL')
    
    if (!url || !serviceRole) {
      console.error(`[${requestId}] Missing environment variables`)
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY', code: 'SERVER_CONFIG' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Creating admin client`)
    
    // Create admin client with service role
    const admin = createClient(url, serviceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the caller's JWT token and check if they're super_admin
    console.log(`[${requestId}] Verifying caller authorization`)
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    
    if (authError || !caller) {
      console.log(`[${requestId}] Auth error:`, authError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if caller has super_admin role
    const callerRole = caller.app_metadata?.role || caller.user_metadata?.role
    if (callerRole !== 'super_admin') {
      console.log(`[${requestId}] Caller ${caller.id} is not super_admin (role: ${callerRole})`)
      return new Response(
        JSON.stringify({ error: 'Only super administrators can invite users', code: 'INSUFFICIENT_PERMISSIONS' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Caller ${caller.id} authorized as super_admin`)

    // Check if user already exists
    const { data: existingUser } = await admin.auth.admin.listUsers()
    const userExists = existingUser.users.some(u => u.email === email.trim().toLowerCase())
    
    if (userExists) {
      console.log(`[${requestId}] User with email ${email} already exists`)
      return new Response(
        JSON.stringify({ error: 'User with this email already exists', code: 'USER_EXISTS' }), 
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Compute initials
    const initials = name.trim().split(/\s+/).map(n => n[0]?.toUpperCase() ?? '').join('').slice(0, 2) || 'U'

    // Prepare user metadata
    const userMetadata = {
      name,
      initials,
      role,
      divisionId: divisionId || null,
      unitId: unitId || null,
    }

    // Compute redirect URL
    const redirectTo = siteUrl ? `${siteUrl}/auth/callback` : `${url.replace('/rest/v1', '')}/auth/callback`

    console.log(`[${requestId}] Sending invite email to ${email}`)
    
    // Send invite email
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
      redirectTo,
      data: userMetadata,
    })
    
    if (inviteError) {
      console.error(`[${requestId}] Error sending invite:`, inviteError)
      return new Response(
        JSON.stringify({ error: `Failed to send invite: ${inviteError.message}`, code: 'INVITE_FAILED' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!inviteData?.user) {
      console.error(`[${requestId}] Invite returned no user data`)
      return new Response(
        JSON.stringify({ error: 'Invite returned no user data', code: 'INVITE_NO_DATA' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const userId = inviteData.user.id
    console.log(`[${requestId}] Invite sent successfully, user ID: ${userId}`)

    // Create profile row in public.users table
    console.log(`[${requestId}] Creating profile row`)
    
    const profileData = {
      id: userId,
      name,
      email: email.trim().toLowerCase(),
      role,
      initials,
      division_id: divisionId || null,
      unit_id: unitId || null,
      created_at: new Date().toISOString()
    };
    
    console.log(`[${requestId}] Profile data:`, profileData)
    
    const { error: profileError } = await admin
      .from('users')
      .upsert(profileData, { onConflict: 'id' })

    if (profileError) {
      console.error(`[${requestId}] Error creating profile:`, profileError)
      // Note: We don't delete the Auth user here since the invite was already sent
      // The profile will be created on first login via ensure-profile function
      console.log(`[${requestId}] Profile creation failed, will be handled on first login`)
    } else {
      console.log(`[${requestId}] Profile row created successfully`)
    }

    // Return success response
    const responseData = { 
      ok: true,
      userId,
      message: `Invite sent successfully to ${email}`,
      user: {
        id: userId,
        email: email.trim().toLowerCase(),
        name,
        role,
        initials,
        divisionId: divisionId || null,
        unitId: unitId || null
      }
    }
    
    console.log(`[${requestId}] Function completed successfully: invited user ${userId}`)
    return new Response(
      JSON.stringify(responseData), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(`[invite-user] Unexpected error:`, error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unexpected error occurred', code: 'UNEXPECTED_ERROR' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
