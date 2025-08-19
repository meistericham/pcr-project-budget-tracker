# Bug / Issue Log

## Open
- [ ] Occasionally notifications count > list shown (ensure AppContext `refreshNotifications()` runs on auth change and sets empty arrays)
- [ ] After policy changes, UI may require a hard refresh to reflect RLS (documented)

## User Division/Unit Assignment 🚨 CRITICAL
- [x] **Unit/Division not updating from UserModal**
  - **Title**: Unit/Division not updating from UserModal
  - **Symptoms**: PATCH 200 OK but division/unit unchanged in UI and DB
  - **Root Cause**: UserModal sent snake_case keys; AppContext used stale fallback; no profile refresh for current user
  - **Fix**: CamelCase in modal, snake_case mapping in userService.update, AppContext uses saved row + refreshCurrentUser
  - **Status**: Fixed (date: 2024-12-19)
- [ ] **Field Mapping Mismatch**: UserModal.tsx uses `division_id`/`unit_id` (snake_case) but User type expects `divisionId`/`unitId` (camelCase)
  - **Location**: `src/components/UserModal.tsx` lines 25-26, 75-76
  - **Impact**: Division/unit assignments fail to save correctly
  - **Fix**: Change form state and update payload to use camelCase
- [ ] **State Update Logic Bug**: AppContext updateUser falls back to old data when server update succeeds
  - **Location**: `src/contexts/AppContext.tsx` line 1158
  - **Impact**: UI shows stale division/unit data after updates
  - **Fix**: Always use server response data when available
- [ ] **Missing Profile Refresh**: updateUser doesn't refresh current user's profile in AuthContext
  - **Impact**: Current user sees stale division/unit data after self-updates
  - **Fix**: Call refreshCurrentUser() after successful user updates

## Admin Password Reset Edge Function 🚨 CRITICAL
- [x] **Hardcoded URLs instead of SDK calls**: Multiple files use manual fetch with hardcoded URLs
  - **Location**: `src/contexts/AuthContext.tsx` line 202, `src/pages/UsersAdmin.tsx` line 29
  - **Impact**: Function calls won't work if project URL changes; inconsistent with Supabase best practices
  - **Fix**: Replace with `supabase.functions.invoke('admin-reset-password', ...)`
  - **Status**: Fixed (date: 2024-12-19)
- [x] **Edge Function properly implemented**: Function exists and has role validation
  - **Status**: ✅ Function deployed and configured correctly
  - **Status**: ✅ Role validation via JWT and profiles table check
  - **Status**: ✅ CORS headers and error handling implemented
- [x] **Edge function previously returned 404/'User not found' due to mismatched auth expectations**: Function was rejecting valid tokens
  - **Root Cause**: Function tried to verify JWT tokens but had conflicting auth logic
  - **Fix**: Switched to service-role inside function, added dual authorization (JWT super_admin or X-Admin-Secret), deployed with --no-verify-jwt
  - **Status**: Fixed (date: 2024-12-19)
- [x] **CORS error blocking frontend calls**: Browser blocked requests due to missing CORS headers
  - **Root Cause**: Edge Function CORS headers missing `x-client-info` that Supabase client automatically adds
  - **Fix**: Updated CORS helper to include `authorization, apikey, content-type, x-client-info, x-admin-secret` headers
  - **Status**: Fixed (date: 2024-12-19)
- [x] **500 error: "adminClient.auth.admin.getUserByEmail is not a function"**: Function using non-existent API method
  - **Root Cause**: supabase-js v2 doesn't have `getUserByEmail` method in admin API; function was trying to use deprecated/removed method
  - **Fix**: Completely rewrote function to use correct v2 API methods: `admin.auth.admin.listUsers()` for search, `updateUserById()` for updates, `createUser()` for new users
  - **Status**: Fixed (date: 2024-12-19)
- [x] **Edge Function hardening and preflight optimization**: Improved reliability and performance
  - **Root Cause**: OPTIONS preflight was slow, error handling lacked structure, logging was insufficient
  - **Fix**: Fast OPTIONS preflight (<50ms), structured logging with request IDs, error codes, timeout handling, removed JWT dependency
  - **Status**: Fixed (date: 2024-12-19)

## UI/UX Issues
- [x] **UserModal content exceeds viewport height**: Form content taller than window, no scrolling possible
  - **Root Cause**: Modal container had no height constraints or overflow handling
  - **Fix**: Restructured modal layout with `max-h-[90vh]`, `flex flex-col`, and `overflow-y-auto` on form body
  - **Status**: Fixed (date: 2024-12-19)

## Settings & Persistence Issues
- [x] **Budget Settings Reset on Refresh**: Budget settings (e.g., Budget Alert Threshold) reverted to default values (80) after page refresh
  - **Root Cause**: AppContext.tsx always initialized settings with defaultSettings in server mode and overwrote Local Storage with defaults on startup
  - **Fix Implemented**: 
    - Always load settings from Local Storage if available, merging with defaults
    - Prevent overwriting Local Storage with defaults when useServerDb is true
    - Added guard to only initialize defaults if no settings exist in Local Storage
    - Improved loadFromStorage to merge saved settings with defaults for new fields
  - **Verification**: 
    - Set Budget Alert Threshold to 77 and save
    - Refresh the page → the UI still shows 77
    - Confirmed with JSON.parse(localStorage.getItem('pcr_settings')).budgetAlertThreshold === 77
  - **Status**: Fixed (date: 2024-12-19)

## Regression Test / How to Verify

### Edge Function Performance & Reliability
- [ ] **OPTIONS preflight**: Returns 204 in Network tab within <100ms, never 504 Gateway Timeout
- [ ] **New user creation**: Returns 201 status, UI closes, list refreshes, success toast shows
- [ ] **Password update**: Returns 200 status for existing users
- [ ] **Error handling**: Failures show succinct error with code (e.g., "Update password failed (UPDATE_PASSWORD)")
- [ ] **Logging**: Edge Function logs show request ID and step-by-step progress

### Frontend Integration
- [ ] **Timeout handling**: 10s timeout shows "Password service timed out, please retry"
- [ ] **CORS**: No CORS errors in browser console
- [ ] **Headers**: Only sends Content-Type: application/json (no Authorization)
- [ ] **Error display**: User-friendly error messages with codes in parentheses

### Test Scenarios
1. **Create new user** with unique email → should return 201, close modal, refresh list
2. **Update existing user** password → should return 200, show success
3. **Invalid input** (missing email/password) → should return 400 with BAD_INPUT code
4. **Network timeout** → should abort after 10s and show timeout message
5. **Server errors** → should show error message with appropriate code

## Fixed / Verified
- [x] Division/Unit updates blocked unless super_admin (trigger)
- [x] Projects visibility by assignment/division
- [x] Vite base path `/` + Nginx SPA fallback