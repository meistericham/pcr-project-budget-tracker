# TODO: Fix Add User Button on Users Management Screen

## 1. Read Required Files ✅
- [x] context/BugTracking.md
- [x] src/components/UsersView.tsx
- [x] src/components/UserTable.tsx
- [x] src/pages/UsersAdmin.tsx
- [x] src/components/UserModal.tsx
- [x] src/index.css and src/App.css

## 2. Fix UsersView.tsx Add User Button ✅
- [x] Find "Add User" button handler
- [x] Ensure handler does ONLY: setEditUser(null); setShowUserModal(true);
- [x] Add console.debug in DEV: '[UsersView] Add User clicked'
- [x] Ensure modal renders with single boolean gate: {showUserModal && (...)}
- [x] Do NOT gate rendering on editUser
- [x] Confirm UserModal import path is correct

## 3. Fix UserModal.tsx ✅
- [x] Keep early return: if (!isOpen) return null;
- [x] Ensure outermost wrapper has: className="fixed inset-0 z-50 ..."
- [x] Ensure backdrop uses onClick={onClose}
- [x] Ensure inner panel uses onClick={e => e.stopPropagation()}
- [x] Add data-testid="user-modal" to outer wrapper

## 4. Z-index / Overlay Audit ✅
- [x] Inspect stats/tiles row for absolute positioning with z-index >= 50
- [x] Reduce z-index or add pointer-events-none if needed
- [x] Ensure scrollable list/container uses relative z-10
- [x] Ensure no element overlays header bar with Add User button
- [x] Reduce z-index or add pointer-events-none if needed

## 5. Make Buttons Resilient ✅
- [x] Ensure Edit and Assign Now actions call e.stopPropagation()
- [x] Ensure they call: setEditUser(user); setShowUserModal(true);
- [x] Add DEV logs: console.debug('[UsersView] Edit/Assign clicked', user.id);

## 6. Build and Typecheck ✅
- [x] npm run build
- [x] npx tsc --noEmit

## 7. Update BugTracking.md ✅
- [x] Add entry "Fix: Add User modal not opening"
- [x] Document root cause (overlay OR extra conditional)
- [x] List files changed and verification steps

## 8. Commit
- [ ] git add .
- [ ] git commit -m "fix(users): make Add User reliably open modal; simplify modal gating; harden z-index and click handlers"
