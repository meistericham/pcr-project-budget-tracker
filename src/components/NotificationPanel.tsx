import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  FolderOpen, 
  DollarSign, 
  Users, 
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { Notification } from '../types';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    deleteNotification,
    setCurrentView,
    projects
  } = useApp();
  const { user } = useAuth();
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Debug logging
  console.log('[NotificationPanel] Render:', {
    isOpen,
    totalNotifications: notifications.length,
    currentUser: user?.id,
    filter
  });

  const userNotifications = notifications.filter(n => n.userId === user?.id);
  const filteredNotifications = filter === 'unread' 
    ? userNotifications.filter(n => !n.read)
    : userNotifications;

  const unreadCount = userNotifications.filter(n => !n.read).length;

  console.log('[NotificationPanel] Filtered:', {
    userNotifications: userNotifications.length,
    filteredNotifications: filteredNotifications.length,
    unreadCount
  });

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'project_updated':
      case 'project_created':
        return <FolderOpen className="h-4 w-4 text-blue-500" />;
      case 'budget_alert':
      case 'budget_entry_added':
      case 'budget_code_alert':
        return <DollarSign className="h-4 w-4 text-red-500" />;
      case 'user_assigned':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'project_completed':
        return <CheckCheck className="h-4 w-4 text-green-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'project_updated':
      case 'project_created':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'budget_alert':
      case 'budget_code_alert':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'budget_entry_added':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'user_assigned':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      case 'project_completed':
        return 'border-l-green-600 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-800';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }

    // Handle navigation based on notification type
    if (notification.data?.projectId) {
      const project = projects.find(p => p.id === notification.data.projectId);
      if (project) {
        setCurrentView('projects');
        onClose();
      }
    }

    if (notification.type === 'budget_alert' || notification.type === 'budget_entry_added' || notification.type === 'budget_code_alert') {
      setCurrentView('budget');
      onClose();
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-end z-50 pt-16 pr-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All ({userNotifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                title="Mark all as read"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-sm text-center">
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border-l-4 ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                  } ${getNotificationColor(notification.type)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${
                            !notification.read 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            !notification.read 
                              ? 'text-gray-700 dark:text-gray-300' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationAsRead(notification.id);
                              }}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete notification"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Additional notification data */}
                      {(notification.type === 'budget_alert' || notification.type === 'budget_code_alert') && notification.data?.percentage && (
                        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                            <span className="text-red-800 dark:text-red-300">
                              Budget usage: {notification.data.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {notification.type === 'budget_entry_added' && notification.data?.amount && (
                        <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-xs">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                            <span className="text-orange-800 dark:text-orange-300">
                              Amount: {notification.data.amount.toLocaleString()} {notification.data.type}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;