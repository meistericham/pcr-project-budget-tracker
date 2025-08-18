# PCR Tracker — Project Requirement Document (PRD)

## Goal
A lightweight internal Project & Budget tracker with role-based access by Division/Unit, running on React + Supabase, deployed on Coolify. Clean RLS, minimal backend, modern UI.

## Tech Stack
- Frontend: Vite + React + TypeScript, Tailwind, lucide-react
- State: React Context (`AppContext`, `AuthContext`)
- Backend: Supabase (Postgres, RLS, Policies, Functions)
- Auth: Supabase Auth (JWT), roles: `super_admin`, `admin`, `user`
- Deployment: Coolify on subpath `/` (Vite `base: '/'`)
- Build output: `dist/`

## Core Entities
- **users**: id, name, email, role, initials, division_id?, unit_id?
- **divisions**: id, code?, name
- **units**: id, division_id, code?, name
- **projects**: id, name, description?, status, priority, start_date, end_date, budget, spent, assigned_users[], budget_codes[], unit_id, created_by, created_at, updated_at
- **budget_codes**: id, code, name, description?, budget, spent, is_active, created_by, timestamps
- **budget_entries**: id, project_id, budget_code_id?, description, amount, type (expense|income), category, date, created_by, created_at
- **notifications**: id, user_id, type, title, message, data (json), read, action_url?, created_at

## Access Rules (RLS summary)
- **users**
  - SELECT: authenticated can read all
  - INSERT: only self (`id = auth.uid()`)
  - UPDATE: self OR admin/super_admin; **only super_admin can change** `division_id` / `unit_id` (enforced by trigger)
  - DELETE: admin/super_admin
- **projects**
  - SELECT: 
    - super_admin → all
    - admin/user → projects where: `auth.uid()` in `assigned_users` OR project’s `unit_id` belongs to user’s `division_id` via units
  - INSERT/UPDATE/DELETE: admin/super_admin only
- **budget_codes**
  - SELECT: all authenticated
  - INSERT/UPDATE/DELETE: admin/super_admin
- **budget_entries**
  - SELECT/INSERT/UPDATE: allowed if the related project is visible by the user (same rule as projects SELECT); DELETE: admin/super_admin
- **divisions / units**
  - SELECT: all authenticated
  - INSERT/UPDATE/DELETE: admin/super_admin
- **notifications**
  - SELECT: `user_id = auth.uid()`
  - INSERT: admin/super_admin or self
  - UPDATE (mark read): owner or admin/super_admin
  - DELETE: admin/super_admin

## UX Requirements
- Dashboard: projects list (filtered by access), budgets summary, unread notifications badge
- Settings:
  - Users: only super_admin can change division/unit for any user; admins can edit basic fields (not division/unit)
  - Divisions/Units management for admins/super_admin
- Projects:
  - Admin/super_admin: full CRUD
  - User: view; may add budget entries **only** for assigned/visible projects
- Notifications panel: load only current user’s, mark read, mark-all read

## Non-Functional
- Consistent error handling & toasts
- Minimal network calls; lazy refresh helpers (e.g., `refreshNotifications`)
- Clear console debugging in DEV
- SPA subpath: `/admin` (Nginx try_files → `/admin/index.html`)

## Acceptance Criteria (high level)
- RLS enforces all visibility rules as above
- Super_admin can assign division/unit to users; others cannot
- Normal users only see projects per division/assignment
- Budget entries can only be created where the user has project access
- Notifications panel shows user’s own items; unread badge matches RLS