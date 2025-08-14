import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
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

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

function App() {
  // Simple routing for special pages
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    
    if (pathname === '/update-password') {
      return (
        <ErrorBoundary>
          <ThemeProvider>
            <UpdatePassword />
          </ThemeProvider>
        </ErrorBoundary>
      );
    }
    
    if (pathname === '/admin/users') {
      return (
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <UsersAdmin />
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      );
    }
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;