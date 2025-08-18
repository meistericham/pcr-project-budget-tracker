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

## Fixed / Verified
- [x] Division/Unit updates blocked unless super_admin (trigger)
- [x] Projects visibility by assignment/division
- [x] Vite base path `/` + Nginx SPA fallback