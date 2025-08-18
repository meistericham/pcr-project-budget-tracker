# PCR Tracker — Implementation Plan

## Phase 1: Core Infrastructure & Database Setup
**Goals**: Establish database schema, RLS policies, and basic Supabase functions

### Subtasks:
- [ ] Create divisions and units tables in database schema
- [ ] Add division_id and unit_id to users table
- [ ] Implement RLS policies for all tables per PRD requirements
- [ ] Create database triggers for division/unit assignment restrictions
- [ ] Set up Supabase Edge Functions for admin operations
- [ ] Configure email notification system

### Code Touchpoints:
- `database/init.sql` - Add missing tables and RLS policies
- `supabase/functions/` - Create admin-reset-password, ensure-profile functions
- `src/lib/database.ts` - Database service functions
- `src/lib/supabase.ts` - Supabase client configuration

### Test Steps:
- Run `database/init.sql` in Supabase SQL editor
- Verify RLS policies block unauthorized access
- Test division/unit assignment restrictions for non-super_admin users
- Confirm email functions work in Supabase dashboard

## Phase 2: Authentication & User Management
**Goals**: Complete user role system with division/unit assignment controls

### Subtasks:
- [ ] **CRITICAL**: Fix field mapping mismatch in UserModal.tsx (division_id → divisionId, unit_id → unitId)
- [ ] **CRITICAL**: Fix AppContext updateUser state update logic to use server response data
- [ ] **CRITICAL**: Add profile refresh after user updates to prevent stale division/unit data
- [ ] Implement user division/unit assignment (super_admin only)
- [ ] Add user profile management with role-based restrictions
- [ ] Create user invitation system for admins
- [ ] Implement password change functionality
- [ ] Add user search and filtering by division/unit

### Code Touchpoints:
- `src/components/UserModal.tsx` - Division/unit assignment controls
- `src/components/UsersView.tsx` - User management interface
- `src/components/UserProfileModal.tsx` - Profile editing
- `src/components/PasswordChangeModal.tsx` - Password updates
- `src/hooks/useIsSuperAdmin.ts` - Role checking

### Test Steps:
- Login as super_admin and assign division/unit to users
- Verify admin users cannot change division/unit assignments
- Test user invitation flow
- Confirm password change works for all roles

## Phase 3: Project Management & Budget System
**Goals**: Implement project CRUD with budget tracking and access controls

### Subtasks:
- [ ] Complete project creation/editing with unit assignment
- [ ] Implement budget code management system
- [ ] Add budget entry creation with project access validation
- [ ] Create project budget breakdown views
- [ ] Implement project status and priority management

### Code Touchpoints:
- `src/components/ProjectModal.tsx` - Project CRUD operations
- `src/components/ProjectsView.tsx` - Project listing and filtering
- `src/components/BudgetCodesView.tsx` - Budget code management
- `src/components/BudgetView.tsx` - Budget tracking interface
- `src/components/ProjectBudgetBreakdown.tsx` - Budget analysis

### Test Steps:
- Create projects with different units and budget codes
- Verify users only see projects in their division/assigned projects
- Test budget entry creation for visible projects only
- Confirm budget calculations update correctly

## Phase 4: Notification System & Real-time Updates
**Goals**: Implement comprehensive notification system with real-time updates

### Subtasks:
- [ ] Set up real-time subscriptions for notifications
- [ ] Implement notification creation for project/budget events
- [ ] Add notification read/unread functionality
- [ ] Create notification preferences and settings
- [ ] Implement notification badges and counters

### Code Touchpoints:
- `src/components/NotificationPanel.tsx` - Notification interface
- `src/contexts/AppContext.tsx` - Real-time subscription management
- `src/lib/database.ts` - Notification service functions
- Supabase Edge Functions for notification triggers

### Test Steps:
- Create notifications for project updates
- Verify real-time updates work across browser tabs
- Test notification read/unread functionality
- Confirm notification badges update correctly

## Phase 5: Reporting & Analytics
**Goals**: Implement comprehensive reporting and budget analytics

### Subtasks:
- [ ] Create budget spending charts and visualizations
- [ ] Implement project progress tracking
- [ ] Add export functionality (PDF, CSV)
- [ ] Create division/unit budget summaries
- [ ] Implement budget alert system

### Code Touchpoints:
- `src/components/charts/` - All chart components
- `src/components/ReportExportModal.tsx` - Export functionality
- `src/lib/pdfExport.ts` - PDF generation
- `src/components/ProjectBudgetBreakdown.tsx` - Budget analysis

### Test Steps:
- Generate various chart views with sample data
- Test export functionality for different formats
- Verify budget alerts trigger at threshold levels
- Confirm division/unit summaries are accurate

## Phase 6: Settings & Configuration
**Goals**: Complete application settings and configuration management

### Subtasks:
- [ ] Implement app settings management
- [ ] Add currency and date format configuration
- [ ] Create backup and restore functionality
- [ ] Implement email notification settings
- [ ] Add company branding configuration

### Code Touchpoints:
- `src/components/SettingsView.tsx` - Settings interface
- `src/types/index.ts` - AppSettings interface
- `src/lib/database.ts` - Settings service functions
- `src/contexts/AppContext.tsx` - Settings state management

### Test Steps:
- Change app settings and verify persistence
- Test currency and date format changes
- Verify email notification settings work
- Confirm company branding updates display correctly

## Phase 7: Testing & Deployment
**Goals**: Comprehensive testing and production deployment

### Subtasks:
- [ ] Implement unit tests for core functions
- [ ] Add integration tests for database operations
- [ ] Perform security testing for RLS policies
- [ ] Set up production deployment pipeline
- [ ] Configure monitoring and error tracking

### Code Touchpoints:
- Test files for components and services
- `docker-compose.prod.yml` - Production configuration
- `nginx/nginx.conf` - Production web server config
- `monitoring/` - Application monitoring setup

### Test Steps:
- Run automated test suite
- Verify RLS policies in production environment
- Test deployment pipeline end-to-end
- Confirm monitoring and error tracking work

## Deployment Notes
- **Vite base path**: Must remain `'/'` as specified in PRD for Coolify deployment
- **Build output**: `dist/` directory as configured in vite.config.js
- **Database**: Supabase with RLS policies for security
- **Authentication**: JWT-based with role-based access control
- **Real-time**: Supabase subscriptions for live updates

## Critical Constraints
- Division/unit assignment restricted to super_admin only
- Users can only see projects in their division or assigned projects
- Budget entries require project access validation
- RLS policies must enforce all access rules
- Base path must remain `'/'` for Coolify deployment