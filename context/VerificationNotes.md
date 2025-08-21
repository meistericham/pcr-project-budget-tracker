# Verification Notes

## User Invitation Flow Testing (Edge Function)

### 1. Deploy Edge Function
```bash
# Deploy the invite-user function
supabase functions deploy invite-user --no-verify-jwt

# Verify function is deployed
supabase functions list
```

### 2. Test User Invitation
1. **Login as super_admin** and navigate to User Management
2. **Click "Add User"** button → UserModal opens
3. **Fill form** with:
   - Name: "Test User"
   - Email: "test@example.com" (unique email)
   - Role: "user" or "admin"
   - Division: Select any division
   - Unit: Select any unit
4. **Submit form** → should see:
   - Network request to `/functions/v1/invite-user` (200 OK)
   - Success toast: "User invited successfully. They will receive an email to set their password."
   - Modal closes
   - New user appears in users list with "invited" status

### 3. Verify Edge Function Response
Check Network tab for successful response:
```json
{
  "ok": true,
  "userId": "uuid-here",
  "message": "Invite sent successfully to test@example.com",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    "role": "user",
    "initials": "TU",
    "divisionId": "division-id",
    "unitId": "unit-id"
  }
}
```

### 4. Check Supabase Dashboard
- **Auth → Users**: New user should appear with "Invited" status
- **Database → users**: Profile row should be created with role/division/unit

### 5. Test Email Flow
- Check email inbox for invite link
- Click invite link → should redirect to `/auth/callback`
- User sets password → profile row updated with auth user ID

### 6. Test Authorization Guards
- **Non-super-admin user** tries to invite → should get 403 error
- **Invalid token** → should get 401 error
- **Missing fields** → should get 400 error with BAD_INPUT code

### Expected Results
- ✅ Super Admin can invite users successfully
- ✅ Edge Function validates caller role before allowing invites
- ✅ Profile rows created in public.users table
- ✅ Invite emails sent with proper redirect URLs
- ✅ Non-super-admin users blocked with 403 errors
- ✅ Proper error handling and user feedback
- ✅ No direct client calls to admin endpoints

## Dev Console Checklist

Paste these commands in the browser console after building to verify user division/unit assignment functionality:

### 1. Verify Session & User ID
```javascript
// Check if session exists
(await window.supabase.auth.getSession()).data?.session ? '✅ session OK' : '❌ no session'

// Get current user ID
(await window.supabase.auth.getUser()).data?.user?.id
```

### 2. Check User Row (Replace <TARGET_USER_ID>)
```javascript
// Verify current user data in database
(await window.supabase.from('users').select('id,email,division_id,unit_id').eq('id','<TARGET_USER_ID>').single()).data
```

### 3. Test Update Flow
1. Open UserModal for a user
2. Change division/unit assignment
3. Submit the form
4. Run the check from step 2 again
5. Verify `division_id`/`unit_id` changed in database
6. Confirm UI reflects changes without full page reload

### Expected Results
- ✅ Session should be valid
- ✅ User ID should be returned
- ✅ Database row should show updated `division_id`/`unit_id`
- ✅ UI should immediately reflect changes
- ✅ No full page reload required

### Troubleshooting
- If session fails: Check authentication state
- If user ID is null: User not logged in
- If database values don't change: Check RLS policies or update logic
- If UI doesn't update: Check AppContext state management
