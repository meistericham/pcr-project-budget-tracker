import { useState } from 'react';
import { 
  Plus, 
  Shield, 
  Mail, 
  Calendar,
  Edit3,
  Trash2,
  UserCheck,
  Crown,
  User,
  AlertTriangle,
  Search,
  Filter,
  Building2,
  Users
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useIsSuperAdmin } from '../lib/authz';
import { User as UserType } from '../types';
import UserModal from './UserModal';
import EmailModal from './EmailModal';
import UserTable from './UserTable';
import { useToast } from './Toast';

const UsersView = () => {
  const { users, deleteUser, divisions, units } = useApp();
  const { allowed: isSA } = useIsSuperAdmin();
  const { showSuccess, showError } = useToast();
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'user'>('all');
  const [divisionFilter, setDivisionFilter] = useState<string | 'all'>('all');
  const [unitFilter, setUnitFilter] = useState<string | 'all'>('all');
  const [resetTarget, setResetTarget] = useState<UserType | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const isSuperAdmin = !!isSA;

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesDivision = divisionFilter === 'all' || user.divisionId === divisionFilter;
    const matchesUnit = unitFilter === 'all' || user.unitId === unitFilter;
    return matchesSearch && matchesRole && matchesDivision && matchesUnit;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="h-4 w-4 text-red-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'admin':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const handleEdit = (user: UserType) => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can edit user accounts.');
      return;
    }
    if (import.meta.env.DEV) {
      console.debug('[UsersView] Edit clicked', user.id);
    }
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleAssign = (user: UserType) => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can assign divisions and units.');
      return;
    }
    if (import.meta.env.DEV) {
      console.debug('[UsersView] Assign clicked', user.id);
    }
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (user: UserType) => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can delete user accounts.');
      return;
    }

    // extra self-delete guard removed (no current session context here)
    if (false) {
      alert("You cannot delete your own account.");
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      deleteUser(user.id);
    }
  };

  const handleResetPassword = (user: UserType) => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can reset passwords.');
      return;
    }
    setResetTarget(user);
  };



  const canManageUsers = isSuperAdmin;

  const roleStats = {
    super_admin: users.filter(u => u.role === 'super_admin').length,
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => u.role === 'user').length
  };

  if (!canManageUsers) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Only Super Administrators can access user management.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contact your system administrator if you need access to this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative z-10">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                User Management ({filteredUsers.length} of {users.length})
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage team members and their permissions
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (import.meta.env.DEV) {
                console.log('[UsersView] CLICK:AddUser');
              }
              // Reset modal state before opening to prevent race conditions
              setEditingUser(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <User className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Super Admins</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {roleStats.super_admin}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Crown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Admins</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {roleStats.admin}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Regular Users</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {roleStats.user}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Division & Unit Assignment Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned Users</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {users.filter(u => u.divisionId || u.unitId).length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {users.filter(u => u.divisionId || u.unitId).length === 0 
                    ? 'No assignments yet' 
                    : `${((users.filter(u => u.divisionId || u.unitId).length / users.length) * 100).toFixed(0)}% of total`
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admins</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Divisions</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              disabled={!divisionFilter || divisionFilter === 'all'}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Units</option>
              {units
                .filter(unit => !divisionFilter || divisionFilter === 'all' || unit.divisionId === divisionFilter)
                .map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Table
            </button>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="mb-6">
            <UserTable
              users={filteredUsers}
              divisions={divisions}
              units={units}
              isLoading={{}}
              showEdit={true}
              showAssign={true}
              showResetEmail={false}
              showForceReset={false}
              onEdit={handleEdit}
              onAssign={handleAssign}
            />
          </div>
        )}

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-medium">{user.initials}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(user);
                    }}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Edit User"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {true && (
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400"
                      title="Reset Password"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                  )}
                  {true && (
                    <button
                      onClick={() => handleDelete(user)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getRoleIcon(user.role)}
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                    {user.role.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                {false && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    (You)
                  </span>
                )}
              </div>

              {/* Division & Unit Assignment */}
              {(user.divisionId || user.unitId) ? (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Assignment
                  </h4>
                  <div className="space-y-1 text-xs">
                    {user.divisionId && (
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Division: {divisions.find(d => d.id === user.divisionId)?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                    {user.unitId && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Unit: {units.find(u => u.id === user.unitId)?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-xs text-yellow-800 dark:text-yellow-300 font-medium">
                        No Division/Unit Assignment
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssign(user);
                      }}
                      className="text-xs text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 underline"
                    >
                      Assign Now
                    </button>
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Permissions */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Permissions</h4>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  {user.role === 'super_admin' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>Full system access</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>User management</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>System configuration</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>All project & budget operations</span>
                      </div>
                    </>
                  )}
                  {user.role === 'admin' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>Project management</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>Budget management</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>Budget code management</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>Team collaboration</span>
                      </div>
                    </>
                  )}
                  {user.role === 'user' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>View projects</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>View budget</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>Basic collaboration</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        <span>Profile management</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || roleFilter !== 'all' || divisionFilter !== 'all' || unitFilter !== 'all' ? 'No users found' : 'No users yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || roleFilter !== 'all' || divisionFilter !== 'all' || unitFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Add team members to start collaborating'
              }
            </p>
            {(!searchTerm && roleFilter === 'all' && divisionFilter === 'all' && unitFilter === 'all') && (
              <button
                onClick={() => {
                  if (import.meta.env.DEV) {
                    console.log('[UsersView] CLICK:AddUser');
                  }
                  // Reset modal state before opening to prevent race conditions
                  setEditingUser(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add User</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <UserModal
          isOpen={isModalOpen}
          user={editingUser}
          onClose={handleModalClose}
          onSuccess={(message) => showSuccess('Success', message)}
          onError={(message) => showError('Error', message)}
        />
      )}

      {/* Reset Password flow – simple email compose with generated temp password (manual send) */}
      {resetTarget && (
        <EmailModal
          onClose={() => setResetTarget(null)}
          project={undefined}
          budgetEntries={undefined}
        />
      )}
    </div>
  );
};

export default UsersView;