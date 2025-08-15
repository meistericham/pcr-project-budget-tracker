import { useState } from 'react';
import { 
  Plus, 
  Hash, 
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Search,
  Filter
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useIsSuperAdmin } from '../lib/authz';
import { BudgetCode } from '../types';
import { formatMYR } from '../utils/currency';
import BudgetCodeModal from './BudgetCodeModal';

const BudgetCodesView = () => {
  const { budgetCodes, deleteBudgetCode, toggleBudgetCodeStatus, users, settings } = useApp();
  const { allowed: isSA } = useIsSuperAdmin();
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<BudgetCode | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isSuperAdmin = !!isSA;
  const isAdmin = !!isSA; // tighten: only super_admins can mutate for now

  const filteredCodes = budgetCodes.filter(code => {
    const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         code.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         code.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && code.isActive) ||
                         (filter === 'inactive' && !code.isActive);
    return matchesSearch && matchesFilter;
  });

  const handleEdit = (code: BudgetCode) => {
    if (!isAdmin) {
      alert('Only administrators can edit budget codes.');
      return;
    }
    setEditingCode(code);
    setShowModal(true);
  };

  const handleDelete = (code: BudgetCode) => {
    if (!isSuperAdmin) {
      alert('Only Super Admins can delete budget codes.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete budget code "${code.code}"? This will remove it from all projects and budget entries.`)) {
      deleteBudgetCode(code.id);
    }
  };

  const handleToggleStatus = (code: BudgetCode) => {
    if (!isAdmin) {
      alert('Only administrators can change budget code status.');
      return;
    }
    toggleBudgetCodeStatus(code.id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCode(null);
  };

  const getCreatorName = (userId: string) => {
    return users.find(user => user.id === userId)?.name || 'Unknown User';
  };

  const getBudgetStatus = (budget: number, spent: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 90) return { color: 'text-red-600 dark:text-red-400', status: 'critical' };
    if (percentage >= settings.budgetAlertThreshold) return { color: 'text-yellow-600 dark:text-yellow-400', status: 'warning' };
    return { color: 'text-green-600 dark:text-green-400', status: 'good' };
  };

  const totalAllocatedBudget = budgetCodes.reduce((sum, code) => sum + code.budget, 0);
  const totalSpentBudget = budgetCodes.reduce((sum, code) => sum + code.spent, 0);

  const statusStats = {
    active: budgetCodes.filter(c => c.isActive).length,
    inactive: budgetCodes.filter(c => !c.isActive).length,
    overBudget: budgetCodes.filter(c => c.spent > c.budget).length
  };

  // Allow read-only for all authenticated users; block UI-only actions below
  if (!isAdmin) {
    // Render read-only view below (no early return)
  }

  return (
    <div className="w-full h-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Budget Activity Codes ({filteredCodes.length} of {budgetCodes.length})
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage budget allocations and track spending by activity codes
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Budget Code</span>
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6 mb-8">
          {/* Total Allocated */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-32 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Total Allocated
                </p>
                <p 
                  className="text-base sm:text-lg lg:text-xl font-bold text-blue-600 dark:text-blue-400 leading-tight mt-8"
                  title={formatMYR(totalAllocatedBudget)}
                >
                  {formatMYR(totalAllocatedBudget)}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Spent */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-32 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Total Spent
                </p>
                <p 
                  className="text-base sm:text-lg lg:text-xl font-bold text-red-600 dark:text-red-400 leading-tight mt-8"
                  title={formatMYR(totalSpentBudget)}
                >
                  {formatMYR(totalSpentBudget)}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Remaining */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-32 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Remaining
                </p>
                <p 
                  className={`text-base sm:text-lg lg:text-xl font-bold leading-tight mt-8 ${
                    totalAllocatedBudget - totalSpentBudget >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}
                  title={formatMYR(totalAllocatedBudget - totalSpentBudget)}
                >
                  {formatMYR(totalAllocatedBudget - totalSpentBudget)}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                totalAllocatedBudget - totalSpentBudget >= 0 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <BarChart3 className={`h-5 w-5 ${
                  totalAllocatedBudget - totalSpentBudget >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`} />
              </div>
            </div>
          </div>

          {/* Active Codes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-32 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Active Codes
                </p>
                <p 
                  className="text-base sm:text-lg lg:text-xl font-bold text-green-600 dark:text-green-400 leading-tight mt-8"
                  title={`${statusStats.active} active budget codes`}
                >
                  {statusStats.active}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Over Budget */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-32 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Over Budget
                </p>
                <p 
                  className="text-base sm:text-lg lg:text-xl font-bold text-red-600 dark:text-red-400 leading-tight mt-8"
                  title={`${statusStats.overBudget} budget codes over allocated limit`}
                >
                  {statusStats.overBudget}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
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
              placeholder="Search budget codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Codes</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Budget Codes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCodes.map((code) => {
            const usagePercentage = code.budget > 0 ? (code.spent / code.budget) * 100 : 0;
            const budgetStatus = getBudgetStatus(code.budget, code.spent);
            const remainingBudget = code.budget - code.spent;
            
            return (
              <div
                key={code.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-6 hover:shadow-lg transition-all duration-200 group ${
                  code.isActive 
                    ? 'border-gray-200 dark:border-gray-700' 
                    : 'border-gray-300 dark:border-gray-600 opacity-75'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      code.isActive 
                        ? 'bg-blue-100 dark:bg-blue-900/30' 
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Hash className={`h-5 w-5 ${
                        code.isActive 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {code.code}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {code.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(code)}
                          className={`p-1 rounded ${
                            code.isActive 
                              ? 'text-red-500 hover:text-red-700' 
                              : 'text-green-500 hover:text-green-700'
                          }`}
                          title={code.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {code.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(code)}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Edit Budget Code"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(code)}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete Budget Code"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Budget Information */}
                <div className="mb-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Allocated Budget:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatMYR(code.budget)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Amount Spent:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {formatMYR(code.spent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                    <span className={`font-medium ${budgetStatus.color}`}>
                      {formatMYR(remainingBudget)}
                    </span>
                  </div>

                  {/* Budget Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Budget Usage</span>
                      <span>{usagePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          budgetStatus.status === 'critical' 
                            ? 'bg-red-500' 
                            : budgetStatus.status === 'warning' 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Budget Alert */}
                  {usagePercentage >= settings.budgetAlertThreshold && (
                    <div className="flex items-center space-x-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-xs text-yellow-800 dark:text-yellow-300">
                        Exceeds {settings.budgetAlertThreshold}% threshold
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {code.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      code.isActive 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                      {code.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {code.description}
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Created by {getCreatorName(code.createdBy)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created {new Date(code.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCodes.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hash className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || filter !== 'all' ? 'No budget codes found' : 'No budget codes yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Create budget activity codes to organize your expenses'
              }
            </p>
            {(!searchTerm && filter === 'all') && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Budget Code</span>
              </button>
            )}
          </div>
        )}

        {/* Permissions Info */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            Your Permissions:
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
            <li>• You can create and edit budget codes</li>
            <li>• You can activate/deactivate budget codes</li>
            {isSuperAdmin && <li>• As a Super Admin, you can delete budget codes</li>}
            {!isSuperAdmin && <li>• Only Super Admins can delete budget codes</li>}
            <li>• Budget codes are used to track spending across projects</li>
          </ul>
        </div>
      </div>

      {/* Budget Code Modal */}
      {showModal && (
        <BudgetCodeModal
          code={editingCode}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default BudgetCodesView;