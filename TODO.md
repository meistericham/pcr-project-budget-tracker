# TODO: Fix Profile Sync & Bad SELECT Issues

## 1. Read Context ✅
- [x] Read context/BugTracking.md and context/VerificationNotes.md
- [x] Understand recent auth & users changes

## 2. Scan Repository for Issues ✅
- [x] Search for "first login" or "profile upsert" logic in AuthContext.tsx
- [x] Find code that queries users table selecting updated_at (invalid column)
- [x] Locate code issuing /rest/v1/users?on_conflict=id on page load

## 3. Fix Profile Sync to be Merge-Only and JWT-Truthful ✅
- [x] Replace blind upsert with SELECT→create-or-patch merge-only flow
- [x] Never demote role: prefer JWT app_metadata.role
- [x] Don't overwrite division_id/unit_id with null if DB has values
- [x] Only PATCH fields that are explicitly available and safe
- [x] Add defensive logging for profile sync operations

## 4. Fix Bad SELECT Queries ✅
- [x] Replace updated_at selection with valid columns (created_at)
- [x] Remove unused field selections

## 5. Hardening ✅
- [x] Ensure Super Admin check prioritizes JWT role in authz.ts
- [x] Add dev-only sentinel showing { jwtRole, dbRole } for debugging

## 6. Testing ✅
- [x] Build: npm run build
- [x] Test login as affected account
- [x] Assign division/unit via UI and confirm saved
- [x] Hard reload: verify no POST/UPSERT with nulls
- [x] Log out/in: values persist, JWT role remains super_admin

## 7. Documentation ✅
- [x] Append BugTracking.md entry: "Profile sync overwrote users row with nulls"

## 8. Commit
- [ ] Commit with message: "fix(auth/profile-sync): stop overwriting users with nulls; trust JWT role; remove bad updated_at select"
