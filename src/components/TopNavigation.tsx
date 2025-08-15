import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Bell, 
  Moon,
  Sun,
  Settings,
  Download,
  LogOut,
  Mail,
  Edit,
  Menu,
  
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useMyProfile } from '../lib/profile';
import { useApp } from '../contexts/AppContext';
import NotificationPanel from './NotificationPanel';
import ReportExportModal from './ReportExportModal';
import EmailModal from './EmailModal';
import UserProfileModal from './UserProfileModal';

const TopNavigation = () => {
  const { setTheme, isDark } = useTheme();
  const { logout, role, loading: isLoading } = useAuth();
  const { profile } = useMyProfile();
  const { currentView, setCurrentView, getUnreadNotificationCount, budgetEntries, setSidebarCollapsed } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const unreadCount = getUnreadNotificationCount();

  const getViewTitle = () => {
    switch (currentView) {
      case 'projects':
        return 'Projects';
      case 'budget':
        return 'Budget Management';
      case 'budget-codes':
        return 'Budget Codes';
      case 'users':
        return 'User Management';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const getViewDescription = () => {
    switch (currentView) {
      case 'projects':
        return 'Manage and track your projects';
      case 'budget':
        return 'Monitor expenses and budget allocation';
      case 'budget-codes':
        return 'Manage budget activity codes';
      case 'users':
        return 'Manage team members and permissions';
      case 'settings':
        return 'Configure system preferences and options';
      default:
        return 'Overview of your workspace';
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-3 lg:space-x-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
            <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white">
              {getViewTitle()}
            </h1>
              <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
                {getViewDescription()}
              </p>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* Search Bar - Hidden on mobile */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-48 lg:w-64 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Mobile Actions Menu */}
            <div className="relative lg:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>

              {/* Mobile Dropdown Menu */}
              {showMobileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowEmailModal(true);
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Send Email</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowReportModal(true);
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Report</span>
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Actions - Hidden on mobile */}
            <div className="hidden lg:flex items-center space-x-2">
              {/* Send Email */}
              <button 
                onClick={() => setShowEmailModal(true)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Send Email Report"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden xl:inline">Email</span>
              </button>

              {/* Export Reports */}
              <button 
                onClick={() => setShowReportModal(true)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Export Reports"
              >
                <Download className="h-4 w-4" />
                <span className="hidden xl:inline">Export</span>
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isDark ? <Sun className="h-4 lg:h-5 w-4 lg:w-5" /> : <Moon className="h-4 lg:h-5 w-4 lg:w-5" />}
            </button>

            {/* Notifications */}
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Bell className="h-4 lg:h-5 w-4 lg:w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 lg:h-5 w-4 lg:w-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 lg:space-x-3 p-1 lg:p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <div className="w-6 lg:w-8 h-6 lg:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs lg:text-sm font-medium">{profile?.initials ?? ''}</span>
                </div>
                <div className="hidden sm:block lg:block text-left">
                  <p className="text-xs lg:text-sm font-medium text-gray-900 dark:text-white">{profile?.name ?? ''}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {isLoading ? '' : (role ?? '').replace('_', ' ')}
                  </p>
                </div>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowProfileModal(true);
                      setShowUserMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setShowUserMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <hr className="border-gray-200 dark:border-gray-600 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close menus */}
      {(showUserMenu || showMobileMenu) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowUserMenu(false);
            setShowMobileMenu(false);
          }}
        />
      )}

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />

      {/* Report Export Modal */}
      {showReportModal && (
        <ReportExportModal 
          onClose={() => setShowReportModal(false)} 
        />
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <EmailModal 
          budgetEntries={budgetEntries}
          onClose={() => setShowEmailModal(false)} 
        />
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal 
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </>
  );
};

export default TopNavigation;