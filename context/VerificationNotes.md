# Verification Notes

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
