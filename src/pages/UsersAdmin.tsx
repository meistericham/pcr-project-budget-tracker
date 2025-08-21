// src/pages/UsersAdmin.tsx
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Home, Mail, AlertTriangle, RefreshCw, Shield, Edit, UserPlus, Users } from 'lucide-react';

import { useIsSuperAdmin } from '../lib/authz';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import UserModal from '../components/UserModal';
import type { User } from '../types';

export default function UsersAdmin() {
  // 1) Gate the page: only Super Admins
  const { allowed, error, role } = useIsSuperAdmin();

  // 2) Data & actions
  const { users, divisions, units, updateUser, addUser } = useApp();
  const { forgotPassword, adminResetPassword } = useAuth();

  // 3) UI state
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToast();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'force' | null>(null);
  
  // Modal states
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Combined modal state for cleaner management
  const isModalOpen = showUserModal && editUser !== null;

  // tiny debug (only in dev)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AdminUsers] guard -> allowed:', allowed, 'role:', role, 'error:', error);
    }
  }, [allowed, role, error]);

  // 4) Guard screens
  if (allowed === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Checking permission…</p>
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">You must be a Super Admin to access this page.</p>
          {error && <p className="text-xs text-red-500 mb-4">({error})</p>}
          <button
            onClick={() => (window.location.href = '/')}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Go Home</span>
          </button>
        </div>
      </div>
    );
  }

  // 5) Actions
  const handleSendResetEmail = async (user: User) => {
    try {
      setIsLoading((p) => ({ ...p, [user.id]: true }));

      const site = import.meta.env.VITE_SITE_URL;
      const redirectTo = site ? `${site}/update-password` : window.location.origin + '/update-password';
      if (!site) showInfo('Environment Warning', 'VITE_SITE_URL not set, using fallback redirect URL');

      console.log('[AdminUsers] reset for', user.email, '→', redirectTo);
      await forgotPassword(user.email, redirectTo);
      showSuccess('Reset Email Sent', `Password reset email sent to ${user.email}`);
    } catch (err: any) {
      console.error('[AdminUsers] reset error:', err);
      showError('Reset Failed', err.message || 'Failed to send reset email');
    } finally {
      setIsLoading((p) => ({ ...p, [user.id]: false }));
    }
  };

  const handleForceReset = async (user: User) => {
    try {
      setIsLoading((p) => ({ ...p, [user.id]: true }));
      const newPassword = prompt(`Enter new password for ${user.email} (min 8 chars)`) || '';
      if (newPassword.length < 8) {
        showError('Invalid Password', 'Password must be at least 8 characters long');
        return;
      }
      await adminResetPassword(user.email, newPassword);
      showSuccess('Password Reset', `Password for ${user.email} has been updated`);
    } catch (err: any) {
      console.error('[AdminUsers] force reset error:', err);
      showError('Reset Failed', err.message || 'Failed to reset password');
    } finally {
      setIsLoading((p) => ({ ...p, [user.id]: false }));
    }
  };

  const openConfirmDialog = (user: User, action: 'reset' | 'force') => {
    setSelectedUser(user);
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = () => {
    if (!selectedUser || !confirmAction) return;
    confirmAction === 'reset' ? handleSendResetEmail(selectedUser) : handleForceReset(selectedUser);
  };

  const handleEditUser = (user: User) => {
    if (import.meta.env.DEV) {
      console.log('[AdminUsers] Opening edit modal for user:', user.id);
    }
    
    // Close any existing modal first to prevent state conflicts
    if (showUserModal) {
      setShowUserModal(false);
      setEditUser(null);
    }
    
    // Use setTimeout to ensure state is reset before opening new modal
    setTimeout(() => {
      setEditUser(user);
      setShowUserModal(true);
    }, 10);
  };

  const handleAssignNow = (user: User) => {
    if (import.meta.env.DEV) {
      console.log('[AdminUsers] Opening assign modal for user:', user.id);
    }
    
    // Close any existing modal first to prevent state conflicts
    if (showUserModal) {
      setShowUserModal(false);
      setEditUser(null);
    }
    
    // Use setTimeout to ensure state is reset before opening new modal
    setTimeout(() => {
      setEditUser(user);
      setShowUserModal(true);
    }, 10);
  };

  const handleUserModalClose = () => {
    console.log('[AdminUsers] Closing modal, resetting state');
    setShowUserModal(false);
    setEditUser(null);
    console.log('[AdminUsers] Modal state reset');
  };

  const handleUserUpdate = async (updatedUser: User) => {
    try {
      await updateUser(updatedUser.id, updatedUser);
      showSuccess('User Updated', `User ${updatedUser.name} has been updated successfully`);
      handleUserModalClose();
    } catch (err: any) {
      console.error('[AdminUsers] user update error:', err);
      showError('Update Failed', err.message || 'Failed to update user');
    }
  };

  // 6) UI
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Debug sentinel for role check */}
      <span id="__APP_ROLE_CHECK__" className="sr-only">{String(allowed)}:{role || 'unknown'}</span>
      
      {/* Debug sentinel for modal state */}
      <span id="__MODAL_STATE__" className="sr-only">
        showUserModal: {String(showUserModal)}, editUser: {editUser ? editUser.id : 'null'}
      </span>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="transform transition-all duration-300 ease-in-out">
            <div
              className={`flex items-start space-x-3 p-4 rounded-lg border shadow-lg max-w-sm ${
                t.type === 'success'
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : t.type === 'error'
                  ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  : t.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-red-800'
                  : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t.title}</p>
                {t.message && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t.message}</p>}
              </div>
              <button onClick={() => removeToast(t.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => (window.location.href = '/')}
                className="inline-flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Admin</span>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">User Management</span>
            </div>

            <button
              onClick={() => (window.location.href = '/')}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage users, assign divisions/units, and reset passwords.</p>
        </div>

        {/* User table with proper z-index */}
        <div className="relative z-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Division</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((u: User) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">{u.initials || 'U'}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          u.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            : u.role === 'admin'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}
                      >
                        {u.role ? u.role.replace('_', ' ') : 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {divisions.find(d => d.id === u.divisionId)?.name || u.divisionId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {units.find(unit => unit.id === u.unitId)?.name || u.unitId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {/* Assign Now Button */}
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            console.log('[AdminUsers] CLICK:assign-now', u.id);
                            handleAssignNow(u); 
                          }}
                          disabled={isLoading[u.id]}
                          className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Assign division and unit"
                        >
                          <UserPlus className="h-3 w-3" />
                          <span>Assign Now</span>
                        </button>

                        {/* Edit User Button */}
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            console.log('[AdminUsers] CLICK:edit-user', u.id);
                            handleEditUser(u); 
                          }}
                          disabled={isLoading[u.id]}
                          className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-blue-100 dark:bg-blue-700 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Edit user details"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit User</span>
                        </button>

                        {/* Send Reset Email Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); console.log('CLICK:send-reset', u.id); handleSendResetEmail(u); }}
                          disabled={isLoading[u.id]}
                          className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Send password reset email"
                        >
                          {isLoading[u.id] ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                          <span>Send Reset Email</span>
                        </button>

                        {/* Force Reset Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); console.log('CLICK:force-reset', u.id); openConfirmDialog(u, 'force'); }}
                          disabled={isLoading[u.id]}
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
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">User Management Process</h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                <p>• <strong>Assign Now:</strong> assign division and unit to users</p>
                <p>• <strong>Edit User:</strong> modify user details and permissions</p>
                <p>• <strong>Send Reset Email:</strong> user receives an email with a password reset link</p>
                <p>• <strong>Force Reset (fallback):</strong> use only if email reset fails</p>
                <p>• Users land on <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/update-password</code> to set the new password</p>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info Box */}
        {import.meta.env.DEV && (
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Debug Info</h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                  <p><strong>Modal State:</strong> showUserModal: {String(showUserModal)}, editUser: {editUser ? editUser.id : 'null'}</p>
                  <p><strong>Combined State:</strong> isModalOpen: {String(isModalOpen)}</p>
                  <p><strong>Role Check:</strong> allowed: {String(allowed)}, role: {role || 'unknown'}</p>
                  <p><strong>Users Count:</strong> {users.length}</p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      console.log('[AdminUsers] Test button clicked');
                      setEditUser(users[0] || null);
                      setShowUserModal(true);
                      console.log('[AdminUsers] Test modal state set');
                    }}
                    className="px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    Test Modal (Debug)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmAction}
        title="Confirm Password Reset"
        message={`Force reset ${selectedUser?.email}? This sets a temporary password — you must share it with the user manually.`}
        confirmText="Force Reset"
        cancelText="Cancel"
        variant="warning"
      />

      {/* User Modal */}
      {isModalOpen && (
        <UserModal
          isOpen={isModalOpen}
          onClose={handleUserModalClose}
          user={editUser}
        />
      )}
    </div>
  );
}