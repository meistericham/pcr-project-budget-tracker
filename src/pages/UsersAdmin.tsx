import React, { useEffect, useState } from 'react';
import { ArrowLeft, Home, Users, Shield, Mail, AlertTriangle, RefreshCw } from 'lucide-react';
import { useIsSuperAdmin } from '../lib/authz';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

export default function UsersAdmin() {
  const { allowed, error, role } = useIsSuperAdmin();
  const { users } = useApp();
  const { forgotPassword, adminResetPassword } = useAuth();
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToast();
  
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'force' | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AdminUsers] guard: isSuperAdmin=', allowed, 'role:', role, 'error:', error);
    }
  }, [allowed, role, error]);

  // Guard: show "Checking permission..." while loading, "Not Authorized" only when definitively false
  if (allowed === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking permission...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Not Authorized</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            You must be a Super Admin to access this page.
          </p>
          {error && (
            <p className="text-xs text-red-500 mb-4">({error})</p>
          )}
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Go Home</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSendResetEmail = async (user: any) => {
    try {
      setIsLoading(prev => ({ ...prev, [user.id]: true }));
      
      // Construct redirectTo URL
      const site = import.meta.env.VITE_SITE_URL;
      const redirectTo = site ? `${site}/update-password` : window.location.origin + '/update-password';
      
      if (!site) {
        showInfo('Environment Warning', 'VITE_SITE_URL not set, using fallback redirect URL');
      }
      
      console.log('[AdminUsers] resetPasswordForEmail -> email=', user.email, 'redirectTo=', redirectTo);
      
      await forgotPassword(user.email, redirectTo);
      showSuccess('Reset Email Sent', `Password reset email sent to ${user.email}`);
      
    } catch (err: any) {
      console.error('[AdminUsers] resetPasswordForEmail error:', err);
      showError('Reset Failed', err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const handleForceReset = async (user: any) => {
    try {
      setIsLoading(prev => ({ ...prev, [user.id]: true }));
      
      const newPassword = prompt(`Enter new password for ${user.email} (min 8 chars)`) || '';
      if (newPassword.length < 8) {
        showError('Invalid Password', 'Password must be at least 8 characters long');
        return;
      }

      await adminResetPassword(user.email, newPassword);
      showSuccess('Password Reset', `Password reset for ${user.email} completed`);
      
    } catch (err: any) {
      console.error('[AdminUsers] force reset error:', err);
      showError('Reset Failed', err.message || 'Failed to reset password');
    } finally {
      setIsLoading(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const openConfirmDialog = (user: any, action: 'reset' | 'force') => {
    setSelectedUser(user);
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = () => {
    if (!selectedUser || !confirmAction) return;
    
    if (confirmAction === 'reset') {
      handleSendResetEmail(selectedUser);
    } else if (confirmAction === 'force') {
      handleForceReset(selectedUser);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="transform transition-all duration-300 ease-in-out">
            <div className={`flex items-start space-x-3 p-4 rounded-lg border shadow-lg max-w-sm ${
              toast.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
              toast.type === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
              toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
              'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="sr-only">Close</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Admin</span>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Users</span>
            </div>

            {/* Back Button */}
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Password Management</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage user passwords and send reset emails. Only Super Admins can access this page.
          </p>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Division
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">{user.initials || 'U'}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'super_admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {user.role ? user.role.replace('_', ' ') : 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.division_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.unit_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {/* Send Reset Email - Primary Action */}
                        <button
                          onClick={() => handleSendResetEmail(user)}
                          disabled={isLoading[user.id]}
                          className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoading[user.id] ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                          <span>Send Reset Email</span>
                        </button>

                        {/* Force Reset - Fallback Action */}
                        <button
                          onClick={() => openConfirmDialog(user, 'force')}
                          disabled={isLoading[user.id]}
                          className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Fallback (admin): set temp password & email user manually"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span>Force Reset (fallback)</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Password Reset Process
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                <p>• <strong>Send Reset Email:</strong> User receives an email with a password reset link</p>
                <p>• <strong>Force Reset (fallback):</strong> Use only if email reset fails or SMTP unavailable</p>
                <p>• Users will be redirected to <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/update-password</code> to set their new password</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmAction}
        title="Confirm Password Reset"
        message={`Are you sure you want to force reset the password for ${selectedUser?.email}? This will set a temporary password and you'll need to communicate it to the user manually.`}
        confirmText="Force Reset"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}