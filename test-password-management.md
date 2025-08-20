# Password Management Test Plan

## Test Environment
- Dev server running on http://localhost:3000
- Test user: hisyamudin@sarawaktourism.com (super_admin)
- Test target: /admin/users page

## Test Cases

### 1. Access Control Test
- **Objective**: Verify only Super Admins can access /admin/users
- **Steps**:
  1. Visit http://localhost:3000/admin/users as non-authenticated user
  2. Expected: Redirected to login page
  3. Login as regular user (non-super_admin)
  4. Visit /admin/users
  5. Expected: 403 Not Authorized page with Back button

### 2. Super Admin Access Test
- **Objective**: Verify Super Admin can access the page
- **Steps**:
  1. Login as hisyamudin@sarawaktourism.com (super_admin)
  2. Visit /admin/users
  3. Expected: Page loads with modern UI, breadcrumbs, user table

### 3. UI Components Test
- **Objective**: Verify all UI components render correctly
- **Steps**:
  1. Check breadcrumb: Home / Admin / Users
  2. Verify page title: "Password Management"
  3. Check Back button functionality
  4. Verify user table with columns: User, Role, Division, Unit, Actions
  5. Check user avatars and role badges
  6. Verify action buttons: "Send Reset Email" and "Force Reset (fallback)"

### 4. Send Reset Email Test
- **Objective**: Verify password reset email functionality
- **Steps**:
  1. Click "Send Reset Email" on a test user
  2. Expected: Loading state, success toast, email sent
  3. Check browser console for: [AdminUsers] resetPasswordForEmail -> email=<email>, redirectTo=<url>
  4. Verify redirectTo URL construction (VITE_SITE_URL + '/update-password')

### 5. Force Reset Test
- **Objective**: Verify fallback password reset functionality
- **Steps**:
  1. Click "Force Reset (fallback)" on a test user
  2. Expected: Confirm dialog appears
  3. Confirm action
  4. Expected: Prompt for new password, adminResetPassword called
  5. Verify success toast

### 6. Toast Notifications Test
- **Objective**: Verify toast system works
- **Steps**:
  1. Perform various actions (success/error cases)
  2. Expected: Toasts appear in top-right corner
  3. Verify auto-dismiss after 5 seconds
  4. Test manual close button

### 7. UpdatePassword Page Test
- **Objective**: Verify enhanced password update page
- **Steps**:
  1. Visit /update-password directly
  2. Expected: Modern styled page with password strength indicator
  3. Test password visibility toggles
  4. Test password strength indicator
  5. Test form validation
  6. Submit form with valid password
  7. Expected: Success state, redirect to home

### 8. Responsive Design Test
- **Objective**: Verify responsive behavior
- **Steps**:
  1. Test on different screen sizes
  2. Verify table horizontal scroll on small screens
  3. Check button and text sizing
  4. Verify dark mode support

### 9. Error Handling Test
- **Objective**: Verify error scenarios are handled gracefully
- **Steps**:
  1. Test with missing VITE_SITE_URL (should show warning toast)
  2. Test network failures
  3. Test invalid password inputs
  4. Expected: Appropriate error messages and toasts

### 10. Integration Test
- **Objective**: Verify no duplicate Supabase clients
- **Steps**:
  1. Check browser console for any warnings
  2. Verify all components use shared supabase instance
  3. Expected: No duplicate client warnings

## Expected Results
- All tests pass
- Modern, responsive UI
- Proper access control
- Toast notifications work
- Password reset emails sent successfully
- UpdatePassword page functional and styled
- No TypeScript or build errors
- No duplicate Supabase client warnings

## Notes
- Test with real Supabase backend if available
- Verify email delivery in Supabase dashboard
- Check RLS policies allow Super Admin access
- Monitor console for any errors or warnings
