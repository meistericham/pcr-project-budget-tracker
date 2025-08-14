import { 
  FolderOpen, 
  DollarSign, 
  Users, 
  Settings,
  BarChart3,
  Shield,
  Hash,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { ViewMode } from '../types';
import { formatMYR } from '../utils/currency';

const Sidebar = () => {
  const { 
    currentView, 
    setCurrentView, 
    projects, 
    budgetCodes, 
    sidebarCollapsed, 
    setSidebarCollapsed 
  } = useApp();
  const { currentUser } = useAuth();

  const navigationItems = [
    { 
      icon: FolderOpen, 
      label: 'Projects', 
      view: 'projects' as ViewMode,
      count: projects.length
    },
    { 
      icon: DollarSign, 
      label: 'Budget', 
      view: 'budget' as ViewMode
    },
    { 
      icon: Hash, 
      label: 'Budget Codes', 
      view: 'budget-codes' as ViewMode,
      count: budgetCodes.filter(code => code.isActive).length,
      adminOnly: true
    },
    { 
      icon: Users, 
      label: 'Users', 
      view: 'users' as ViewMode,
      adminOnly: true
    },
    { 
      icon: Settings, 
      label: 'Settings', 
      view: 'settings' as ViewMode
    }
  ];

  const canAccessAdminFeatures = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const totalProjectBudget = projects.reduce((sum, project) => sum + project.budget, 0);
  const totalProjectSpent = projects.reduce((sum, project) => sum + project.spent, 0);
  const totalBudgetCodeBudget = budgetCodes.reduce((sum, code) => sum + code.budget, 0);
  const totalBudgetCodeSpent = budgetCodes.reduce((sum, code) => sum + code.spent, 0);

  return (
    <>
      {/* Mobile Overlay */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div className={`${
        sidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-64'
      } fixed lg:relative inset-y-0 left-0 bg-white dark:bg-gray-900 h-screen flex flex-col border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out z-50 lg:z-auto`}>
        
        {/* Mobile Close Button */}
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Collapse Toggle Button - Desktop Only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10 hidden lg:flex"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        {/* Header */}
        <div className={`p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 ${sidebarCollapsed ? 'lg:px-3' : ''}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'lg:justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">PCR Tracker</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Project & Budget Management</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">v0.9.03</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 lg:py-6 overflow-y-auto">
          <nav className={`space-y-1 lg:space-y-2 ${sidebarCollapsed ? 'lg:px-2' : 'px-4'}`}>
            {navigationItems.map((item) => {
              if (item.adminOnly && !canAccessAdminFeatures) return null;
              
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    setCurrentView(item.view);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 1024) {
                      setSidebarCollapsed(true);
                    }
                  }}
                  className={`w-full group flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-4'} py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    currentView === item.view
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center">
                    <item.icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                    {!sidebarCollapsed && item.label}
                  </div>
                  {!sidebarCollapsed && item.count !== undefined && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      currentView === item.view
                        ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Budget Overview - Hidden on mobile when collapsed */}
          {!sidebarCollapsed && (
            <div className="mt-6 lg:mt-8 mx-4 space-y-4">
              {/* Project Budget Overview */}
              <div className="p-3 lg:p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-100 dark:border-green-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Project Budget</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs lg:text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Budget</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatMYR(totalProjectBudget)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs lg:text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Spent</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {formatMYR(totalProjectSpent)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-green-200 dark:border-green-700">
                    <div className="flex justify-between text-xs lg:text-sm font-semibold">
                      <span className="text-gray-900 dark:text-white">Remaining</span>
                      <span className={`${totalProjectBudget - totalProjectSpent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatMYR(totalProjectBudget - totalProjectSpent)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Code Overview */}
              {canAccessAdminFeatures && (
                <div className="p-3 lg:p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Budget Codes</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs lg:text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Allocated</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatMYR(totalBudgetCodeBudget)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs lg:text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Spent</span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {formatMYR(totalBudgetCodeSpent)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                      <div className="flex justify-between text-xs lg:text-sm font-semibold">
                        <span className="text-gray-900 dark:text-white">Available</span>
                        <span className={`${totalBudgetCodeBudget - totalBudgetCodeSpent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatMYR(totalBudgetCodeBudget - totalBudgetCodeSpent)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}
              
            {/* User Info */}
             <div className={`mt-4 lg:mt-6 mx-4 p-3 lg:p-4 bg-gray-50 dark:bg-gray-800 rounded-xl ${sidebarCollapsed ? 'lg:mx-2' : ''}`}>
               <div className={`flex items-center ${sidebarCollapsed ? 'lg:justify-center' : 'space-x-3'}`}>
                 <div className="w-8 lg:w-10 h-8 lg:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                   <span className="text-white text-xs lg:text-sm font-medium">{currentUser?.initials}</span>
                 </div>
                 {!sidebarCollapsed && (
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                       {currentUser?.name}
                     </p>
                     <div className="flex items-center space-x-1">
                       {currentUser?.role === 'super_admin' && (
                         <Shield className="h-3 w-3 text-red-500" />
                       )}
                       <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                         {currentUser?.role.replace('_', ' ')}
                       </p>
                     </div>
                   </div>
                 )}
               </div>
             </div>
           </div>
          
           {!sidebarCollapsed && (
             <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
               <p className="text-xs text-gray-500 dark:text-gray-400">
               Crafted by Mohd Hisyamudin · Powered by AI
               </p>
             </div>
           )}
         </div>
       </>
  );
};

export default Sidebar;