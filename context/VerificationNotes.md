# Verification Notes

## Users.name Revert Bug Investigation Checklist

### How to Reproduce
1. **Change name in profile modal** → save successfully
2. **Hard refresh page** (F5) → name reverts to email-localpart
3. **Check console logs** for `[USERS:WRITE]` and `[PROFILE:SET]` messages

### What to Copy from Console
1. **Before refresh**: Look for `[USERS:WRITE]` logs showing name update
2. **After refresh**: Look for `[PROFILE:SET]` logs showing loaded profile
3. **Check `window.__LAST_PROFILE`**: Shows last profile loaded in memory
4. **Look for unwanted writes**: Any `[USERS:WRITE]` that includes name field

## Project Editing Permissions Testing

### 1. Test Admin Editing Someone Else's Project
1. **Login as admin** (not super_admin)
2. **Navigate to Projects** and find a project you didn't create
3. **Click Edit button** → should open ProjectModal (was blocked before)
4. **Make changes and save** → should succeed
5. **Check dev console** for: `[EDIT GUARD] { role: 'admin', createdBy: 'other-user-id', assigned: [...], me: 'your-id', allowed: true }`

### 2. Test Creator Editing Own Project
1. **Login as regular user**
2. **Create a new project** or find one you created
3. **Click Edit button** → should open ProjectModal
4. **Make changes and save** → should succeed
5. **Check dev console** for: `[EDIT GUARD] { role: 'user', createdBy: 'your-id', assigned: [...], me: 'your-id', allowed: true }`

### 3. Test Assignee Editing Assigned Project
1. **Login as regular user**
2. **Find a project you're assigned to** (but didn't create)
3. **Click Edit button** → should open ProjectModal
4. **Make changes and save** → should succeed
5. **Check dev console** for: `[EDIT GUARD] { role: 'user', createdBy: 'other-id', assigned: ['your-id', ...], me: 'your-id', allowed: true }`

### 4. Test Unrelated User (Blocked)
1. **Login as regular user**
2. **Find a project you didn't create and aren't assigned to**
3. **Click Edit button** → should show "Access Denied" modal
4. **Check dev console** for: `[EDIT GUARD] { role: 'user', createdBy: 'other-id', assigned: [...], me: 'your-id', allowed: false }`

### 5. Verify Dev Helper
1. **Inspect Edit button** in browser dev tools
2. **Look for hidden span** with `data-edit-guard="allowed"` or `data-edit-guard="blocked"`
3. **Verify attribute matches** the actual permission status

### Expected Results
- ✅ Admin users can edit any project
- ✅ Project creators can edit their own projects
- ✅ Project assignees can edit assigned projects
- ✅ Unrelated users still see Access Denied
- ✅ Dev console shows detailed permission logs
- ✅ Edit button has debug helper attribute

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

## User Creation with Temporary Passwords Testing

### 1. Test Temporary Password Creation
1. **Login as super_admin** and navigate to User Management
2. **Click "Add User"** button → UserModal opens
3. **Verify default selection**: "Set temporary password now" should be selected
4. **Fill form** with:
   - Name: "Temp User"
   - Email: "temp@example.com" (unique email)
   - Role: "user" or "admin"
   - Division: Select any division
   - Unit: Select any unit
5. **Password field**: Should show with validation (min 8 chars)
6. **Click "Generate"** → should generate 12-character secure password
7. **Submit form** → should see:
   - Network request to `/functions/v1/admin-create-user` (200 OK)
   - Success toast: "User created with temporary password. They can log in and change it later."
   - Modal closes
   - New user appears in users list

### 2. Test Email Invite Creation
1. **In UserModal**, select "Send invite email" radio button
2. **Password field should disappear** (not needed for email invite)
3. **Submit form** → should see:
   - Network request to `/functions/v1/invite-user` (200 OK)
   - Success toast: "User invited successfully. They will receive an email to set their password."
   - Modal closes
   - New user appears in users list

### 3. Test Role Restrictions
1. **As admin user** (not super_admin):
   - Try to create super_admin account → should be blocked
   - Try to create admin/user account → should succeed
2. **As regular user**:
   - Try to create any account → should be blocked

### 4. Verify Edge Function Response
Check Network tab for successful admin-create-user response:
```json
{
  "ok": true,
  "userId": "uuid-here",
  "message": "User created successfully with temporary password"
}
```

## Project Editing Permissions & Lock Badges Testing

### 1. Test Lock Badge Display
1. **Login as regular user** and navigate to Projects
2. **Find a project you didn't create and aren't assigned to**
3. **Hover over project card** → should see:
   - Red "Locked" badge with lock icon
   - Edit button disabled with tooltip: "You're not assigned. Ask an admin to add you, or click Add me."

### 2. Test "Add Me" Functionality
1. **Login as admin or super_admin**
2. **Find a project you're not assigned to**
3. **Hover over project card** → should see:
   - Blue "Add Me" button
   - Edit button enabled (admin can edit any project)
4. **Click "Add Me"** → should:
   - Add you to project's assigned users
   - Show success in console: "Successfully added [user-id] to project [project-id]"
   - Project becomes editable for you

### 3. Test Edit Button States
1. **As project creator**: Edit button should be enabled
2. **As project assignee**: Edit button should be enabled
3. **As admin/super_admin**: Edit button should be enabled for all projects
4. **As unrelated user**: Edit button should be disabled with explanatory tooltip

### 4. Verify Permission Logic
1. **Check dev console** for canEditProject debug logs
2. **Inspect Edit button** for data-edit-guard attribute
3. **Verify RLS enforcement**: Database should reject invalid updates

### Expected Results
- ✅ Temporary password creation works end-to-end
- ✅ Email invite creation works as before
- ✅ Lock badges show for non-editable projects
- ✅ "Add Me" button appears for admins on unassigned projects
- ✅ Edit button states reflect actual permissions
- ✅ canEditProject helper used consistently
- ✅ No direct client calls to admin endpoints for temp password path

## Profile Modal Unit/Division Lock Testing

### 0. Database Migration (Required First)
1. **Run Database Migration**: Execute `database/add-division-unit-fields.sql` in Supabase SQL editor
2. **Verify Schema Changes**: Check that users table now has `division_id` and `unit_id` columns
3. **Verify RLS Policies**: Confirm new policies are created:
   - `users_update_own_row` - restricts users to basic field updates only
   - `users_super_admin_update_division_unit` - allows super_admin to update any field
   - `users_super_admin_manage_all` - allows super_admin full access

### 1. Test Normal User Profile Access
1. **Login as regular user** (not super_admin or admin)
2. **Click avatar in top-right** → UserProfileModal opens
3. **Verify field states**:
   - Full Name: editable input field
   - Email: disabled input with note "Email cannot be changed"
   - Unit: disabled input with lock icon, shows current value or "—"
   - Division: disabled input with lock icon, shows current value or "—"
4. **Check contact note**: Should show "Unit & Division are managed by your organization. For changes, please contact Super Admin (Mohd Hisyamudin)."
5. **Verify DEV logging**: Console shows `[UserProfileModal] open`

### 2. Test Name Editing Functionality
1. **Change Full Name** to a new value
2. **Click "Save Profile"** → should show loading state
3. **Verify success**: Success animation appears, then modal closes
4. **Check DEV logging**: Console shows `[UserProfileModal] save: name=<new-name>` then `[UserProfileModal] saved`
5. **Refresh page** → new name should persist
6. **Re-login** → new name should still be there

### 3. Test Unit/Division Read-Only Behavior
1. **Try to click Unit field** → should not be focusable
2. **Try to click Division field** → should not be focusable
3. **Verify styling**: Fields have gray background and cursor-not-allowed
4. **Check lock icons**: Small lock icons appear next to Unit and Division labels
5. **Attempt to type**: No input should be possible

### 4. Test Super Admin User Management (Separate Test)
1. **Login as super_admin**
2. **Navigate to User Management** (Users table view)
3. **Find a user and click "Edit User"** → UserModal opens
4. **Verify Division/Unit fields are editable** in UserModal
5. **Change Division/Unit assignments** → should save successfully
6. **Return to profile modal** → should show updated Division/Unit values

### 5. Test RLS Policy Enforcement
1. **As non-super-admin user**: Try to update division_id/unit_id via direct API call
2. **Verify rejection**: Should get permission denied error
3. **As super_admin**: Update division_id/unit_id via UserModal
4. **Verify success**: Changes should persist in database

### Expected Results
- ✅ Database migration adds division_id and unit_id fields to users table
- ✅ RLS policies prevent non-super-admin from updating division/unit fields
- ✅ Normal users can edit Name only
- ✅ Unit and Division fields are visibly disabled with lock icons
- ✅ Contact note clearly shows who to contact for changes
- ✅ Name changes persist after refresh and re-login
- ✅ DEV console shows comprehensive logging
- ✅ Super Admin can still manage Division/Unit from User Management
- ✅ No TypeScript errors, build passes successfully

### Troubleshooting
- **If migration fails**: Check that divisions and units tables exist
- **If Unit/Division show "—"**: User may not have assignments yet
- **If lock icons don't appear**: Check if lucide-react Lock icon is imported
- **If DEV logging doesn't work**: Ensure NODE_ENV=development or import.meta.env.DEV is true
- **If build fails**: Check TypeScript compilation for any remaining errors
- **If RLS policies don't work**: Verify policies are created and RLS is enabled on users table
