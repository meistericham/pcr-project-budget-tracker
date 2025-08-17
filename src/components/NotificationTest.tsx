import React from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const NotificationTest: React.FC = () => {
  const { createTestNotification, notifications, deleteNotification } = useApp();
  const { user, profile } = useAuth();

  const clearAllNotifications = () => {
    notifications.forEach(notification => {
      if (notification.userId === user?.id) {
        deleteNotification(notification.id);
      }
    });
  };

  const userNotifications = notifications.filter(n => n.userId === user?.id);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Notification Test Panel
        </h2>
        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium px-2 py-1 rounded-full">
          {userNotifications.length} total
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => createTestNotification('project_created')}
          className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
        >
          Test Project Created
        </button>
        <button
          onClick={() => createTestNotification('budget_alert')}
          className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
        >
          Test Budget Alert
        </button>
        <button
          onClick={() => createTestNotification('budget_entry_added')}
          className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors"
        >
          Test Budget Entry
        </button>
        <button
          onClick={() => createTestNotification('user_assigned')}
          className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors"
        >
          Test User Assigned
        </button>
        <button
          onClick={() => createTestNotification('project_completed')}
          className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
        >
          Test Project Completed
        </button>
        <button
          onClick={() => createTestNotification('budget_code_alert')}
          className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors"
        >
          Test Budget Code Alert
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={clearAllNotifications}
          className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors flex items-center space-x-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear All</span>
        </button>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div>Current user: {profile?.name || 'Not logged in'}</div>
          <div>User ID: {user?.id || 'N/A'}</div>
          <div>Total notifications: {notifications.length}</div>
          <div>User notifications: {userNotifications.length}</div>
        </div>
      </div>
    </div>
  );
};

export default NotificationTest;
