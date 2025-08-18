# Bug / Issue Log

## Open
- [ ] Occasionally notifications count > list shown (ensure AppContext `refreshNotifications()` runs on auth change and sets empty arrays)
- [ ] After policy changes, UI may require a hard refresh to reflect RLS (documented)

## User Division/Unit Assignment 🚨 CRITICAL
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

## Fixed / Verified
- [x] Division/Unit updates blocked unless super_admin (trigger)
- [x] Projects visibility by assignment/division
- [x] Vite base path `/` + Nginx SPA fallback