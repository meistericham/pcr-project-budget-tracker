import React from 'react';
import { Mail, AlertTriangle, RefreshCw, Edit, UserPlus } from 'lucide-react';
import type { User, Division, Unit } from '../types';

interface UserTableProps {
  users: User[];
  divisions: Division[];
  units: Unit[];
  isLoading: Record<string, boolean>;
  
  // Action visibility props
  showEdit?: boolean;
  showAssign?: boolean;
  showResetEmail?: boolean;
  showForceReset?: boolean;
  
  // Action handlers (optional based on visibility)
  onEdit?: (user: User) => void;
  onAssign?: (user: User) => void;
  onResetEmail?: (user: User) => void;
  onForceReset?: (user: User) => void;
  
  // Additional props
  className?: string;
}

export default function UserTable({
  users,
  divisions,
  units,
  isLoading,
  showEdit = false,
  showAssign = false,
  showResetEmail = false,
  showForceReset = false,
  onEdit,
  onAssign,
  onResetEmail,
  onForceReset,
  className = ''
}: UserTableProps) {
  return (
    <div className={`relative z-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
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
                    {showAssign && onAssign && (
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onAssign(u); 
                        }}
                        disabled={isLoading[u.id]}
                        className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Assign division and unit"
                      >
                        <UserPlus className="h-3 w-3" />
                        <span>Assign Now</span>
                      </button>
                    )}

                    {/* Edit User Button */}
                    {showEdit && onEdit && (
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onEdit(u); 
                        }}
                        disabled={isLoading[u.id]}
                        className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-blue-100 dark:bg-blue-700 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Edit user details"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Edit User</span>
                      </button>
                    )}

                    {/* Send Reset Email Button */}
                    {showResetEmail && onResetEmail && (
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onResetEmail(u); 
                        }}
                        disabled={isLoading[u.id]}
                        className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Send password reset email"
                      >
                        {isLoading[u.id] ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                        <span>Send Reset Email</span>
                      </button>
                    )}

                    {/* Force Reset Button */}
                    {showForceReset && onForceReset && (
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onForceReset(u); 
                        }}
                        disabled={isLoading[u.id]}
                        className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Fallback (admin): set temp password & email user manually"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        <span>Force Reset (fallback)</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
