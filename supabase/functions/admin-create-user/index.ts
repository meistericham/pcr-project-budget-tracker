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
    console.log(`[${requestId}] admin-create-user function started`)

    // Parse request body
    const { email, password, name, role, divisionId, unitId, initials } = await req.json()

    // Validate required fields
    if (!email || !password || !name || !role) {
      console.log(`[${requestId}] Bad input - email: ${!!email}, password: ${!!password}, name: ${!!name}, role: ${!!role}`)
      return new Response(
        JSON.stringify({ error: 'email, password, name, and role are required', code: 'BAD_INPUT' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Processing request for email: ${email}`)

    // Validate environment variables
    const url = Deno.env.get('SB_URL')
    const serviceRole = Deno.env.get('SB_SERVICE_ROLE_KEY')
    
    if (!url || !serviceRole) {
      console.error(`[${requestId}] Missing environment variables`)
      return new Response(
        JSON.stringify({ error: 'Missing SB_URL/SB_SERVICE_ROLE_KEY', code: 'SERVER_CONFIG' }), 
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

    console.log(`[${requestId}] Creating Auth user`)
    
    // Create Auth user first
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        role,
        divisionId: divisionId || null,
        unitId: unitId || null,
        name,
        initials: initials || name.split(' ').map(n => n[0]).join('').toUpperCase()
      }
    })
    
    if (createError) {
      console.error(`[${requestId}] Error creating Auth user:`, createError)
      return new Response(
        JSON.stringify({ error: `Create Auth user failed: ${createError.message}`, code: 'CREATE_AUTH_USER' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!createData?.user) {
      console.error(`[${requestId}] Create Auth user returned no user data`)
      return new Response(
        JSON.stringify({ error: 'Create Auth user returned no user data', code: 'CREATE_AUTH_USER_NO_DATA' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const userId = createData.user.id
    console.log(`[${requestId}] Auth user created successfully with ID: ${userId}`)

    // Now upsert the app profile
    console.log(`[${requestId}] Upserting app profile`)
    
    const profileData = {
      id: userId,
      name,
      email: email.trim().toLowerCase(),
      role,
      initials: initials || name.split(' ').map(n => n[0]).join('').toUpperCase(),
      division_id: divisionId || null,
      unit_id: unitId || null,
      created_at: new Date().toISOString()
    };
    
    console.log(`[${requestId}] Profile data:`, profileData)
    
    const { error: profileError } = await admin
      .from('users')
      .upsert(profileData, { onConflict: 'id' })

    if (profileError) {
      console.error(`[${requestId}] Error upserting profile:`, profileError)
      // Try to clean up the Auth user if profile creation fails
      try {
        await admin.auth.admin.deleteUser(userId)
        console.log(`[${requestId}] Cleaned up Auth user after profile failure`)
      } catch (cleanupError) {
        console.error(`[${requestId}] Failed to cleanup Auth user:`, cleanupError)
      }
      
      return new Response(
        JSON.stringify({ error: `Profile creation failed: ${profileError.message}`, code: 'PROFILE_CREATION' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Profile upserted successfully`)

    // Return success response
    const responseData = { 
      status: 'created', 
      userId,
      user: {
        id: userId,
        email: email.trim().toLowerCase(),
        name,
        role,
        initials: initials || name.split(' ').map(n => n[0]).join('').toUpperCase(),
        divisionId: divisionId || null,
        unitId: unitId || null
      }
    }
    
    console.log(`[${requestId}] Function completed successfully: created user ${userId}`)
    return new Response(
      JSON.stringify(responseData), 
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(`[admin-create-user] Unexpected error:`, error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unexpected error occurred', code: 'UNEXPECTED_ERROR' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
