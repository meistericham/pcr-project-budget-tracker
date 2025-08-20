import React, { useMemo, useState, useEffect } from 'react';
import { X, User, Users, Mail, Shield, Crown, Building2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { User as UserType, Division, Unit } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user?: UserType | null; // when present = edit mode
};

const UserModal: React.FC<Props> = ({ isOpen, onClose, user }) => {
  const { divisions, units, updateUser, addUser } = useApp();
  const { user: currentUser, profile, refreshCurrentUser } = useAuth();

  // form state
  const [formData, setFormData] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: (user?.role ?? 'user') as UserType['role'],
    divisionId: user?.divisionId ?? '',
    unitId: user?.unitId ?? '',
  });

  // keep form in sync when "user" prop changes
  useEffect(() => {
    setFormData({
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: (user?.role ?? 'user') as UserType['role'],
      divisionId: user?.divisionId ?? '',
      unitId: user?.unitId ?? '',
    });
  }, [user]);

  // ✨ ADDED: helper – only super_admin can change role/division/unit
  const isSuperAdmin = profile?.role === 'super_admin'; // ✨ ADDED
  const canEditOrgFields = isSuperAdmin;                 // ✨ ADDED
  const canEditRole = isSuperAdmin;                      // ✨ ADDED

  // ✨ ADDED: compute initials consistently
  const computedInitials = useMemo(() => {
    return (formData.name || '')
      .trim()
      .split(/\s+/)
      .map(n => n[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'U';
  }, [formData.name]);

  if (!isOpen) return null;

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Full system access, can manage all users and settings';
      case 'admin':
        return 'Can manage projects and budgets, limited user management';
      case 'user':
        return 'Basic access to view projects and budgets';
      default:
        return '';
    }
  };

  // ✨ ADDED: front‑end authorization guard before submit
  const guardDisallowedChanges = () => {
    // editing an existing user?
    if (user) {
      // prevent non-super-admin changing role/division/unit
      if (!isSuperAdmin) {
        const tryingRole = formData.role !== user.role;
        const tryingDivision = (formData.divisionId || '') !== (user.divisionId || '');
        const tryingUnit = (formData.unitId || '') !== (user.unitId || '');
        if (tryingRole || tryingDivision || tryingUnit) {
          alert('Permission denied: Only super administrators can change role, division, or unit.');
          return false;
        }
      }
    } else {
      // creating a new user is allowed (invite flow handles privileges)
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✨ ADDED: run UI guard first
    if (!guardDisallowedChanges()) return;

    const userData = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      divisionId: formData.divisionId || undefined,
      unitId: formData.unitId || undefined,
      initials: computedInitials, // ✨ ADDED
    };

    if (user) {
      try {
        console.log('[UserModal] submitting userData (camelCase) →', userData);
        await updateUser(user.id, userData);

        // If the current user updated themselves and org fields changed, refresh profile
        if (
          currentUser?.id === user.id &&
          (userData.divisionId !== user.divisionId || userData.unitId !== user.unitId)
        ) {
          await refreshCurrentUser();
        }

        onClose();
      } catch (error: any) {
        // server will still enforce RLS; show friendly message
        if (error.message?.includes('Only super administrators')) {
          alert('Permission denied: Only super administrators can change division or unit assignments.');
        } else {
          alert(`Error updating user: ${error.message}`);
        }
      }
    } else {
      try {
        // create (invite-by-email flow handled in AppContext.addUser)
        await addUser(userData);
        alert('User invited. They will receive an email to set their password.');
        onClose();
      } catch (error: any) {
        alert(`Error creating user: ${error.message}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form - Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter email address"
              disabled={!!user} // email immutable once created
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Shield className="inline h-4 w-4 mr-1" />
              Role
            </label>
            <div className="space-y-3">
              {(['user', 'admin', 'super_admin'] as const).map((role) => (
                <label
                  key={role}
                  className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer ${
                    canEditRole
                      ? 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      : 'border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={formData.role === role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserType['role'] }))}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                    disabled={!canEditRole} // ✨ ADDED
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {role === 'super_admin' && <Crown className="h-4 w-4 text-red-500" />}
                      {role === 'admin' && <Shield className="h-4 w-4 text-blue-500" />}
                      {role === 'user' && <User className="h-4 w-4 text-gray-500" />}
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {role.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {getRoleDescription(role)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {!canEditRole && user && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only super administrators can change a user&rsquo;s role.
              </p>
            )}
          </div>

          {/* Division */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="inline h-4 w-4 mr-1" />
              Division
            </label>
            <select
              value={formData.divisionId}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  divisionId: e.target.value,
                  unitId: '' // reset unit when division changes
                }))
              }
              disabled={!canEditOrgFields}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Division (Optional)</option>
              {divisions.map((d: Division) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {!canEditOrgFields && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Only super administrators can assign divisions.
              </p>
            )}
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="inline h-4 w-4 mr-1" />
              Unit
            </label>
            <select
              value={formData.unitId}
              onChange={(e) => setFormData(prev => ({ ...prev, unitId: e.target.value }))}
              disabled={!formData.divisionId || !canEditOrgFields}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Unit (Optional)</option>
              {units
                .filter((u: Unit) => !formData.divisionId || u.divisionId === formData.divisionId)
                .map((u: Unit) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
            </select>
            {!formData.divisionId ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select a division first to assign units.
              </p>
            ) : !canEditOrgFields ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Only super administrators can assign units.
              </p>
            ) : null}
          </div>

          {/* Warning blocks */}
          {user && user.role !== formData.role && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Warning:</strong> Changing the user&rsquo;s role will immediately affect their permissions.
              </p>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> Only super administrators can change role, division, or unit.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              {user ? 'Update User' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;