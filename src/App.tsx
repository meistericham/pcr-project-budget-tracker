import { useAuth } from './contexts/AuthContext';
import { useApp } from './contexts/AppContext';
import { useEffect } from 'react';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import TopNavigation from './components/TopNavigation';
import ProjectsView from './components/ProjectsView';
import BudgetView from './components/BudgetView';
import UsersView from './components/UsersView';
import BudgetCodesView from './components/BudgetCodesView';
import SettingsView from './components/SettingsView';
import ErrorBoundary from './components/ErrorBoundary';
import UpdatePassword from './pages/UpdatePassword';
import UsersAdmin from './pages/UsersAdmin';
import Debug from './pages/Debug';
import { supabase } from './lib/supabase';
import React from 'react';

const AppContent = () => {
  const { currentView } = useApp();

  const renderCurrentView = () => {
    switch (currentView) {
      case 'projects':
        return <ProjectsView />;
      case 'budget':
        return <BudgetView />;
      case 'budget-codes':
        return <BudgetCodesView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <ProjectsView />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavigation />
        <div className="flex-1 overflow-auto relative">
          <ErrorBoundary>
            {renderCurrentView()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

// Handle password recovery redirects
const PasswordRecoveryHandler = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.assign('/update-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
};

const AuthenticatedApp = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <>
      {!import.meta.env.PROD && <DevRoleBanner />}
      <AppContent />
    </>
  );
};

function App() {
  // Simple routing for special pages
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    
    if (pathname === '/update-password') {
      return (
        <ErrorBoundary>
          <UpdatePassword />
        </ErrorBoundary>
      );
    }
    
    if (pathname === '/admin/users') {
      return (
        <ErrorBoundary>
          {!import.meta.env.PROD && <DevRoleBanner />}
          <UsersAdmin />
        </ErrorBoundary>
      );
    }

    if (pathname === '/debug') {
      return (
        <ErrorBoundary>
          {!import.meta.env.PROD && <DevRoleBanner />}
          <Debug />
        </ErrorBoundary>
      );
    }
  }

  return (
    <ErrorBoundary>
      <PasswordRecoveryHandler>
        {!import.meta.env.PROD && <DevRoleBanner />}
        <AuthenticatedApp />
      </PasswordRecoveryHandler>
    </ErrorBoundary>
  );
}

export default App;

const DevRoleBanner: React.FC = () => {
  const { role, user } = useAuth() as any;
  const uid = user?.id || '';
  if (import.meta.env.PROD) return null as any;
  return (
    <div className="fixed bottom-2 left-2 z-50 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-900 border border-yellow-300 shadow">
      Role source: profiles | role={role ?? '(none)'} | uid={uid || '(none)'}
    </div>
  );
};