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
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] admin-reset-password function started`);
  
  // Fast preflight - must complete in <50ms
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] OPTIONS preflight - returning 204`);
    return noContent(204);
  }
  
  if (req.method !== 'POST') {
    console.log(`[${requestId}] Method not allowed: ${req.method}`);
    return json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    console.log(`[${requestId}] Parsing request body`);
    
    // Parse request body
    const body = await req.json().catch(() => null) as { email?: string; newPassword?: string } | null;
    const email = (body?.email || '').toLowerCase().trim();
    const newPassword = (body?.newPassword || '').trim();
    
    if (!email || !newPassword) {
      console.log(`[${requestId}] Bad input - email: ${!!email}, password: ${!!newPassword}`);
      return json({ error: 'email and newPassword are required', code: 'BAD_INPUT' }, 400);
    }

    console.log(`[${requestId}] Processing request for email: ${email}`);

    // Validate environment variables
    const url = Deno.env.get('SB_URL');
    const serviceRole = Deno.env.get('SB_SERVICE_ROLE_KEY');
    
    if (!url || !serviceRole) {
      console.error(`[${requestId}] Missing environment variables`);
      return json({ error: 'Missing SB_URL/SB_SERVICE_ROLE_KEY', code: 'SERVER_CONFIG' }, 500);
    }

    console.log(`[${requestId}] Creating admin client`);
    
    // Create admin client with service role
    const admin = createClient(url, serviceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`[${requestId}] Listing users to find email match`);
    
    // Find existing user by email using listUsers
    // TODO: Implement pagination if >1000 users (log warning)
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers({ 
      page: 1, 
      perPage: 1000 
    });
    
    if (listError) {
      console.error(`[${requestId}] Error listing users:`, listError);
      return json({ error: `Failed to search users: ${listError.message}`, code: 'LIST_USERS_FAILED' }, 500);
    }

    const users = usersData?.users || [];
    const existingUser = users.find(u => (u.email || '').toLowerCase() === email);
    
    console.log(`[${requestId}] Found ${users.length} users, existing user: ${existingUser ? 'yes' : 'no'}`);

    let userId: string;
    let status: 'created' | 'updated';

    if (existingUser) {
      // Update password for existing user
      console.log(`[${requestId}] Updating existing user password for ID: ${existingUser.id}`);
      
      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password: newPassword
      });
      
      if (updateError) {
        console.error(`[${requestId}] Error updating user:`, updateError);
        return json({ error: `Update password failed: ${updateError.message}`, code: 'UPDATE_PASSWORD' }, 400);
      }
      
      userId = existingUser.id;
      status = 'updated';
      console.log(`[${requestId}] User password updated successfully`);
    } else {
      // Create new user
      console.log(`[${requestId}] Creating new user`);
      
      const { data: createData, error: createError } = await admin.auth.admin.createUser({
        email: email,
        password: newPassword,
        email_confirm: true
      });
      
      if (createError) {
        console.error(`[${requestId}] Error creating user:`, createError);
        return json({ error: `Create user failed: ${createError.message}`, code: 'CREATE_USER' }, 400);
      }
      
      if (!createData?.user) {
        console.error(`[${requestId}] Create user returned no user data`);
        return json({ error: 'Create user returned no user data', code: 'CREATE_USER_NO_DATA' }, 500);
      }
      
      userId = createData.user.id;
      status = 'created';
      console.log(`[${requestId}] New user created successfully with ID: ${userId}`);
    }

    // Return success response
    const responseData = { status, userId };
    const responseStatus = status === 'created' ? 201 : 200;
    
    console.log(`[${requestId}] Function completed successfully: ${status} user ${userId}`);
    return json(responseData, responseStatus);

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return json({ error: error?.message || 'Unexpected error occurred', code: 'UNEXPECTED_ERROR' }, 500);
  }
}