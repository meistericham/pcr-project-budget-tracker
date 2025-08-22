import React, { useState, useEffect } from 'react';
import { X, User, Mail, Building2, Users, Save, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMyProfile, saveMyNameInline } from '../lib/profile';
import { useApp } from '../contexts/AppContext';

interface UserProfileModalProps {
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const { role, loading: isLoading } = useAuth();
  const { profile, setProfile } = useMyProfile();
  const { divisions, units } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    unit: '',
    division: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // DEV console logging when modal opens
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[UserProfileModal] open', { profile: profile?.id, role });
    }
  }, [profile?.id, role]);

  useEffect(() => {
    if (profile) {
      // Resolve division and unit names from IDs
      const divisionName = profile.division_id ? 
        divisions.find(d => d.id === profile.division_id)?.name || '—' : 
        '—';
      const unitName = profile.unit_id ? 
        units.find(u => u.id === profile.unit_id)?.name || '—' : 
        '—';

      setFormData({
        name: profile.name ?? '',
        email: profile.email ?? '',
        unit: unitName,
        division: divisionName
      });
    }
  }, [profile, divisions, units]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      // DEV console logging for save attempt
      if (import.meta.env.DEV) {
        console.log('[UserProfileModal] save: name=', formData.name);
      }

      // Optimistic update
      const previous = profile;
      if (previous) {
        setProfile({ ...previous, name: formData.name });
      }
      const updated = await saveMyNameInline(formData.name);
      setProfile(updated);
      setSuccess(true);

      // DEV console logging for successful save
      if (import.meta.env.DEV) {
        console.log('[UserProfileModal] saved');
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      if (profile) setProfile(profile); // rollback
      setErrorMsg((error as any)?.message || 'Failed to save profile. Please try again.');

      // DEV console logging for failed save
      if (import.meta.env.DEV) {
        console.log('[UserProfileModal] failed', error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Save className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Profile Updated!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your profile information has been saved successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current User Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
               <span className="text-white text-lg font-medium">{profile?.initials ?? ''}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  {profile?.name ?? ''}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 capitalize">
                  {isLoading ? '' : (role ?? '').replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

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
              placeholder="Enter your full name"
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
              placeholder="Enter your email"
              disabled
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Email cannot be changed. Contact your administrator if needed.
            </p>
          </div>

          {/* Unit */}
          <div>
            {/* Note: Unit/Division updates are restricted by RLS and are intended to be changed by a Super Admin via User Management */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="inline h-4 w-4 mr-1" />
              Unit
              <Lock className="inline h-3 w-3 ml-1 text-gray-400" />
            </label>
            <input
              type="text"
              value={formData.unit}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
              placeholder="Unit assignment"
              disabled
              readOnly
            />
          </div>

          {/* Division */}
          <div>
            {/* Note: Unit/Division updates are restricted by RLS and are intended to be changed by a Super Admin via User Management */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="inline h-4 w-4 mr-1" />
              Division
              <Lock className="inline h-3 w-3 ml-1 text-gray-400" />
            </label>
            <input
              type="text"
              value={formData.division}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
              placeholder="Division assignment"
              disabled
              readOnly
            />
          </div>

          {/* Info Note - Updated to show contact information */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Unit & Division are managed by your organization. For changes, please contact Super Admin (Mohd Hisyamudin).
            </p>
          </div>

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
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
          {errorMsg && (
            <div className="text-sm text-red-600 dark:text-red-400">{errorMsg}</div>
          )}
        </form>
      </div>
    </div>
  );
};

export default UserProfileModal;