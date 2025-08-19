// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ORIGIN = 'https://pcrtracker.meistericham.com';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

export default async function handler(req: Request): Promise<Response> {
  console.log('[admin-reset-password] Function started');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return noContent(204);
  }
  
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // Get environment variables
    const url = Deno.env.get('SB_URL');
    const serviceRole = Deno.env.get('SB_SERVICE_ROLE_KEY');
    
    if (!url || !serviceRole) {
      console.error('[admin-reset-password] Missing environment variables');
      return json({ error: 'Server misconfigured: missing SB_URL or SB_SERVICE_ROLE_KEY' }, 500);
    }

    // Create admin client with service role
    const admin = createClient(url, serviceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    const body = await req.json().catch(() => null) as { email?: string; newPassword?: string } | null;
    const email = (body?.email || '').toLowerCase().trim();
    const newPassword = (body?.newPassword || '').trim();
    
    if (!email || !newPassword) {
      return json({ error: 'email and newPassword are required' }, 400);
    }

    console.log(`[admin-reset-password] Processing request for email: ${email}`);

    // Find existing user by email using listUsers
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers({ 
      page: 1, 
      perPage: 1000 
    });
    
    if (listError) {
      console.error('[admin-reset-password] Error listing users:', listError);
      return json({ error: `Failed to search users: ${listError.message}` }, 500);
    }

    const users = usersData?.users || [];
    const existingUser = users.find(u => (u.email || '').toLowerCase() === email);
    
    console.log(`[admin-reset-password] Found ${users.length} users, existing user: ${existingUser ? 'yes' : 'no'}`);

    let userId: string;
    let status: 'created' | 'updated';

    if (existingUser) {
      // Update password for existing user
      console.log('[admin-reset-password] Updating existing user password');
      
      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password: newPassword
      });
      
      if (updateError) {
        console.error('[admin-reset-password] Error updating user:', updateError);
        return json({ error: `Update password failed: ${updateError.message}` }, 400);
      }
      
      userId = existingUser.id;
      status = 'updated';
      console.log('[admin-reset-password] User password updated successfully');
    } else {
      // Create new user
      console.log('[admin-reset-password] Creating new user');
      
      const { data: createData, error: createError } = await admin.auth.admin.createUser({
        email: email,
        password: newPassword,
        email_confirm: true
      });
      
      if (createError) {
        console.error('[admin-reset-password] Error creating user:', createError);
        return json({ error: `Create user failed: ${createError.message}` }, 400);
      }
      
      if (!createData?.user) {
        console.error('[admin-reset-password] Create user returned no user data');
        return json({ error: 'Create user returned no user data' }, 500);
      }
      
      userId = createData.user.id;
      status = 'created';
      console.log('[admin-reset-password] New user created successfully');
    }

    // Return success response
    const responseData = { status, userId };
    const responseStatus = status === 'created' ? 201 : 200;
    
    console.log(`[admin-reset-password] Function completed successfully: ${status} user ${userId}`);
    return json(responseData, responseStatus);

  } catch (error: any) {
    console.error('[admin-reset-password] Unexpected error:', error);
    return json({ error: error?.message || 'Unexpected error occurred' }, 500);
  }
}