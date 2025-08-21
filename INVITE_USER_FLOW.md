# User Invitation Flow Documentation

## Overview

The PCR Tracker now uses a secure Edge Function-based user invitation system instead of direct client-side admin API calls. This ensures proper role validation and prevents 403 errors.

## Architecture

### Before (Broken)
```
UserModal → AppContext.addUser() → supabase.auth.admin.inviteUserByEmail() → ❌ 403 Error
```

### After (Fixed)
```
UserModal → AppContext.addUser() → Edge Function (/functions/v1/invite-user) → ✅ Success
```

## Components

### 1. Edge Function: `supabase/functions/invite-user/`
- **Purpose**: Handles user invitations with server-side role validation
- **Security**: Verifies caller is super_admin via JWT token
- **Operations**: 
  - Sends invite email via `auth.admin.inviteUserByEmail`
  - Creates profile row in `public.users` table
  - Returns structured success/error responses

### 2. Frontend: `src/contexts/AppContext.tsx`
- **Changes**: Updated `addUser()` to call Edge Function instead of direct admin API
- **Authorization**: Passes current session token for role validation
- **Error Handling**: Proper error handling with user-friendly messages

### 3. Configuration: `supabase/config.toml`
- **Function**: Added `invite-user` function configuration
- **Settings**: `verify_jwt = false` (we handle JWT validation manually)

## Environment Variables

### Required (Server-side)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_URL=https://yourdomain.com  # Optional, for custom redirect URLs
```

### Required (Client-side)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SITE_URL=https://yourdomain.com  # Optional
```

## Deployment

### 1. Deploy Edge Function
```bash
# Make script executable (if not already)
chmod +x deploy-invite-function.sh

# Run deployment script
./deploy-invite-function.sh
```

### 2. Set Environment Variables
In Supabase dashboard → Settings → Edge Functions:
- `SUPABASE_URL`: Your project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
- `SITE_URL`: Your site URL (optional)

### 3. Verify Deployment
```bash
supabase functions list
# Should show invite-user as deployed
```

## Testing

### 1. Basic Invitation Flow
1. Login as super_admin
2. Navigate to User Management
3. Click "Add User"
4. Fill form and submit
5. Verify success toast and modal closure

### 2. Network Verification
Check Network tab for:
- `POST /functions/v1/invite-user` (200 OK)
- Proper request headers (Authorization, Content-Type)
- Structured JSON response

### 3. Authorization Testing
- **Super Admin**: Should succeed
- **Admin/User**: Should get 403 error
- **Invalid Token**: Should get 401 error

### 4. Database Verification
Check Supabase dashboard:
- **Auth → Users**: Invited user with "Invited" status
- **Database → users**: Profile row with role/division/unit

## Error Codes

The Edge Function returns structured error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `BAD_INPUT`: Missing required fields
- `INVALID_ROLE`: Role not admin/user
- `UNAUTHORIZED`: Missing/invalid authorization header
- `INVALID_TOKEN`: Expired/invalid JWT token
- `INSUFFICIENT_PERMISSIONS`: Caller not super_admin
- `USER_EXISTS`: Email already registered
- `INVITE_FAILED`: Email sending failed
- `SERVER_CONFIG`: Missing environment variables

## Security Features

### 1. Role Validation
- JWT token verified via `admin.auth.getUser()`
- Only super_admin can invite users
- Role checked from `app_metadata.role` or `user_metadata.role`

### 2. Input Validation
- Required fields: email, name, role
- Role validation: only 'admin' or 'user' allowed
- Email normalization and duplicate checking

### 3. Rate Limiting
- Basic anti-abuse protection via request ID tracking
- Structured logging for monitoring

## Troubleshooting

### Common Issues

#### 1. Function Not Found (404)
```bash
# Check if function is deployed
supabase functions list

# Redeploy if needed
supabase functions deploy invite-user --no-verify-jwt
```

#### 2. Environment Variable Errors
```bash
# Check Supabase dashboard → Settings → Edge Functions
# Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
```

#### 3. CORS Errors
- Function includes proper CORS headers
- Check browser console for CORS issues
- Verify function is accessible from your domain

#### 4. Authorization Errors (403)
- Verify caller has super_admin role
- Check JWT token is valid and not expired
- Ensure function can access users table

### Debug Steps
1. Check Edge Function logs in Supabase dashboard
2. Verify environment variables are set correctly
3. Test function directly with curl/Postman
4. Check browser Network tab for request/response details

## Migration Notes

### Breaking Changes
- `addUser()` now calls Edge Function instead of direct admin API
- Requires proper environment variable configuration
- Frontend must handle structured error responses

### Backward Compatibility
- Local mode (non-server) still works as before
- User interface remains unchanged
- Toast notifications and error handling improved

## Future Enhancements

### Potential Improvements
1. **Rate Limiting**: Implement proper rate limiting per user/IP
2. **Email Templates**: Customizable invite email templates
3. **Bulk Invites**: Support for inviting multiple users at once
4. **Audit Logging**: Track all invitation attempts and outcomes
5. **Webhook Support**: Notify external systems of user invitations
