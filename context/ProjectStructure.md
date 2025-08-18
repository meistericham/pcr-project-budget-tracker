# Project Structure (living doc)

## Root Structure
- `/` - Project root with configuration files
- `/context/` - Project documentation and planning
- `/database/` - Database schema and initialization
- `/monitoring/` - Application monitoring configuration
- `/nginx/` - Web server configuration
- `/supabase/` - Supabase configuration and Edge Functions
- `/src/` - Main application source code

## Source Code (`/src/`)
### Core Application Files
- `App.tsx` - Main application component
- `main.tsx` - Application entry point
- `App.css` - Global application styles
- `index.css` - Base CSS styles
- `vite-env.d.ts` - Vite environment types
- `questConfig.js` - Quest configuration

### Components (`/src/components/`)
#### Authentication & User Management
- `AuthPage.tsx` - Authentication interface
- `UserModal.tsx` - User creation/editing modal
- `UserProfileModal.tsx` - User profile management
- `PasswordChangeModal.tsx` - Password update interface
- `UsersView.tsx` - User management dashboard

#### Project & Budget Management
- `ProjectModal.tsx` - Project creation/editing
- `ProjectDetailModal.tsx` - Project details view
- `ProjectsView.tsx` - Projects listing and management
- `BudgetModal.tsx` - Budget entry creation/editing
- `BudgetView.tsx` - Budget tracking dashboard
- `BudgetCodeModal.tsx` - Budget code management
- `BudgetCodesView.tsx` - Budget codes listing
- `ProjectBudgetBreakdown.tsx` - Project budget analysis

#### Charts & Analytics (`/src/components/charts/`)
- `CategorySpendingChart.tsx` - Spending by category
- `MonthlySpendingChart.tsx` - Monthly spending trends
- `ProjectSpendingChart.tsx` - Project spending overview
- `YearlySpendingChart.tsx` - Yearly spending analysis

#### System & Settings
- `SettingsView.tsx` - Application settings
- `DatabaseSetup.tsx` - Database configuration
- `DatabaseStatus.tsx` - Database connection status
- `NotificationPanel.tsx` - Notifications interface
- `EmailModal.tsx` - Email configuration
- `ReportExportModal.tsx` - Report export functionality
- `GoogleSheetsIntegration.tsx` - Google Sheets integration
- `TopNavigation.tsx` - Top navigation bar
- `Sidebar.tsx` - Application sidebar navigation

#### Utility Components
- `ErrorBoundary.tsx` - Error handling wrapper
- `EnvWarning.tsx` - Environment warning display
- `GetStartedButton.jsx` - Onboarding button
- `QuestWrapper.jsx` - Quest system wrapper

### Contexts (`/src/contexts/`)
- `AppContext.tsx` - Main application state management
- `AuthContext.tsx` - Authentication state management
- `ThemeContext.tsx` - Theme and styling context

### Hooks (`/src/hooks/`)
- `useIsSuperAdmin.ts` - Super admin role checking hook

### Libraries (`/src/lib/`)
- `supabase.ts` - Supabase client configuration
- `database.ts` - Database service functions
- `pdfExport.ts` - PDF export functionality
- `profile.ts` - User profile management
- `authz.ts` - Authorization utilities

### Pages (`/src/pages/`)
- `Debug.tsx` - Debug interface
- `UpdatePassword.tsx` - Password update page
- `UsersAdmin.tsx` - User administration page

### Types (`/src/types/`)
- `index.ts` - TypeScript type definitions

### Utils (`/src/utils/`)
- `currency.ts` - Currency formatting utilities
- `date.ts` - Date handling utilities
- `validation.ts` - Form validation utilities

### Common (`/src/common/`)
- `SafeIcon.jsx` - Safe icon component

## Configuration Files
- `package.json` - Node.js dependencies and scripts
- `package-lock.json` - Dependency lock file
- `tsconfig.json` - TypeScript configuration
- `tsconfig.app.json` - App-specific TypeScript config
- `tsconfig.node.json` - Node.js TypeScript config
- `vite.config.js` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `eslint.config.js` - ESLint configuration

## Database (`/database/`)
- `init.sql` - Database schema and sample data

## Supabase (`/supabase/`)
- `config.toml` - Supabase configuration
- `/functions/` - Edge Functions
  - `admin-reset-password/` - Admin password reset function
  - `ensure-profile/` - Profile creation function
  - `send-email/` - Email sending function

## Deployment (`/`)
- `Dockerfile` - Production Docker configuration
- `Dockerfile.dev` - Development Docker configuration
- `docker-compose.yml` - Docker Compose configuration
- `docker-compose.dev.yml` - Development Docker Compose
- `docker-compose.prod.yml` - Production Docker Compose
- `docker-manager.sh` - Docker management script
- `deploy-vps.sh` - VPS deployment script
- `coolify.yaml` - Coolify deployment configuration

## Web Server (`/nginx/`)
- `nginx.conf` - Nginx configuration

## Monitoring (`/monitoring/`)
- `prometheus.yml` - Prometheus monitoring configuration

## Documentation (`/context/`)
- `PRD.md` - Project Requirements Document
- `ImplementationPlan.md` - Implementation roadmap
- `ProjectStructure.md` - This file
- `UI_UX.md` - User interface and experience guidelines
- `BugTracking.md` - Bug tracking and resolution
- `WorkflowRule.md` - Workflow and process rules
- `GenerateRule.md` - Code generation rules

## Build Output
- `dist/` - Production build output (generated)
- `node_modules/` - Dependencies (generated)

## Key Technical Notes
- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + RLS + Edge Functions)
- **Authentication**: JWT-based with role-based access control
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Deployment**: Coolify with Vite base path `/`
- **Real-time**: Supabase subscriptions for live updates
- **State Management**: React Context API
- **Build System**: Vite with TypeScript compilation