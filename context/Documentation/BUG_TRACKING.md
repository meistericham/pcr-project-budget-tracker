# Bug Tracking Documentation

## Admin Password Reset Edge Function Issue

### Root Cause
- **Missing Edge Function**: `admin-reset-password` function was not deployed, causing 404 errors
- **Inconsistent User State**: User rows were created in `public.users` table but no corresponding Auth users existed
- **Race Condition**: Modal closed before password function completed, leaving users in inconsistent state

### Fix Implemented
- **Edge Function Created**: `supabase/functions/admin-reset-password/index.ts`
  - Handles both creating new Auth users and updating existing passwords
  - Validates caller is super_admin via JWT token
  - Uses service role client for Admin API operations
  - Creates Auth user if doesn't exist, updates password if does exist

- **Frontend Flow Fixed**: 
  - User creation: `addUser()` → `adminResetPassword()` → close modal
  - User editing: Only calls password function when new password provided
  - Proper error handling and user feedback

### Verification Steps
1. **Deploy Function**: `supabase functions deploy admin-reset-password --no-verify-jwt`
2. **Create User Test**:
   - Open UserModal, fill form with temp password
   - Submit → should see POST to `/rest/v1/users` (201) then POST to `/functions/v1/admin-reset-password` (200)
   - Modal closes, list refreshes, new user appears
3. **Edit User Test**:
   - Edit user without password → should NOT call password function
   - Edit user with password → should call function and update password (200 OK)
4. **Console Logs**: Check for request/response messages during operations

### Technical Details
- **Function URL**: `https://<project-ref>.functions.supabase.co/admin-reset-password`
- **Authentication**: Requires `Authorization: Bearer <access_token>` header
- **Role Check**: Verifies caller has `super_admin` role in `users` table
- **Admin API**: Uses service role key for Auth user creation/updates
- **CORS**: Configured for web origin access
