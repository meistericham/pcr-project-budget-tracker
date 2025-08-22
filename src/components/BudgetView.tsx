import { useState } from 'react';
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Edit3,
  Trash2,
  PieChart,
  BarChart3,
  LineChart,
  Hash,
  Settings
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { BudgetEntry } from '../types';
import { formatMYR } from '../utils/currency';
import { formatDate } from '../utils/date';
import BudgetModal from './BudgetModal';
import ProjectSpendingChart from './charts/ProjectSpendingChart';
import MonthlySpendingChart from './charts/MonthlySpendingChart';
import YearlySpendingChart from './charts/YearlySpendingChart';
import CategorySpendingChart from './charts/CategorySpendingChart';

const BudgetView = () => {
  const { projects, budgetEntries, budgetCodes, deleteBudgetEntry, setCurrentView, divisions, units } = useApp();
  const { user, profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BudgetEntry | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [activeChart, setActiveChart] = useState<'project' | 'monthly' | 'yearly' | 'category'>('project');
  const [activeTab, setActiveTab] = useState<'overview' | 'codes'>('overview');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');

  const filteredUnits = selectedDivision === 'all' ? units : units.filter(u => u.divisionId === selectedDivision);
  const filteredProjects = projects.filter(p =>
    (selectedDivision === 'all' || filteredUnits.some(u => u.id === p.unitId)) &&
    (selectedUnit === 'all' || p.unitId === selectedUnit)
  );
  const filteredEntries = budgetEntries.filter(entry =>
    (selectedProject === 'all' || entry.projectId === selectedProject) &&
    (selectedDivision === 'all' || filteredUnits.some(u => u.id === (projects.find(p => p.id === entry.projectId)?.unitId))) &&
    (selectedUnit === 'all' || projects.find(p => p.id === entry.projectId)?.unitId === selectedUnit)
  );

  const totalExpenses = filteredEntries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalIncome = filteredEntries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const getBudgetCodeDisplay = (budgetCodeId?: string) => {
    if (!budgetCodeId) return null;
    const code = budgetCodes.find(c => c.id === budgetCodeId);
    return code ? `${code.code} - ${code.name}` : 'Unknown Code';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Design': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      'Development': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      'Marketing': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      'Software': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      'Research': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      'Advertising': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      'Equipment': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
      'Travel': 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
      'Training': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300',
      'Other': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    };
    return colors[category as keyof typeof colors] || colors.Other;
  };

  const handleEdit = (entry: BudgetEntry) => {
    setEditingEntry(entry);
    setShowModal(true);
  };

  const handleDelete = (entry: BudgetEntry) => {
    if (window.confirm(`Are you sure you want to delete this ${entry.type}?`)) {
      deleteBudgetEntry(entry.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEntry(null);
  };

  const chartTabs = [
    { id: 'project', label: 'By Project', icon: PieChart },
    { id: 'monthly', label: 'Monthly', icon: BarChart3 },
    { id: 'yearly', label: 'Yearly', icon: LineChart },
    { id: 'category', label: 'By Category', icon: PieChart }
  ];

  const renderChart = () => {
    switch (activeChart) {
      case 'project':
        return <ProjectSpendingChart />;
      case 'monthly':
        return <MonthlySpendingChart />;
      case 'yearly':
        return <YearlySpendingChart />;
      case 'category':
        return <CategorySpendingChart />;
      default:
        return <ProjectSpendingChart />;
    }
  };

  const canAccessBudgetCodes = profile?.role === 'super_admin' || profile?.role === 'admin';

  const renderBudgetCodes = () => {
    const totalAllocatedBudget = budgetCodes.reduce((sum, code) => sum + code.budget, 0);
    const totalSpentBudget = budgetCodes.reduce((sum, code) => sum + code.spent, 0);

    return (
      <div className="space-y-6">
        {/* Budget Code Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Allocated</p>
                <p className="text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatMYR(totalAllocatedBudget)}
                </p>
              </div>
              <div className="w-10 lg:w-12 h-10 lg:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 lg:h-6 w-5 lg:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spent</p>
                <p className="text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatMYR(totalSpentBudget)}
                </p>
              </div>
              <div className="w-10 lg:w-12 h-10 lg:h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 lg:h-6 w-5 lg:w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Remaining</p>
                <p className={`text-xl lg:text-2xl font-bold ${
                  totalAllocatedBudget - totalSpentBudget >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatMYR(totalAllocatedBudget - totalSpentBudget)}
                </p>
              </div>
              <div className={`w-10 lg:w-12 h-10 lg:h-12 rounded-lg flex items-center justify-center ${
                totalAllocatedBudget - totalSpentBudget >= 0 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <BarChart3 className={`h-5 lg:h-6 w-5 lg:w-6 ${
                  totalAllocatedBudget - totalSpentBudget >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Budget Codes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {budgetCodes.map((code) => {
            const usagePercentage = code.budget > 0 ? (code.spent / code.budget) * 100 : 0;
            const remainingBudget = code.budget - code.spent;
            
            return (
              <div
                key={code.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-4 lg:p-6 hover:shadow-lg transition-all duration-200 ${
                  code.isActive 
                    ? 'border-gray-200 dark:border-gray-700' 
                    : 'border-gray-300 dark:border-gray-600 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 lg:w-10 h-8 lg:h-10 rounded-lg flex items-center justify-center ${
                      code.isActive 
                        ? 'bg-blue-100 dark:bg-blue-900/30' 
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Hash className={`h-4 lg:h-5 w-4 lg:w-5 ${
                        code.isActive 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {code.code}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {code.name}
                      </p>
                    </div>
                  </div>
                </div>

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
                    <span className={`font-medium ${
                      remainingBudget >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatMYR(remainingBudget)}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Budget Usage</span>
                      <span>{usagePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          usagePercentage >= 90 
                            ? 'bg-red-500' 
                            : usagePercentage >= 75 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <p className="line-clamp-2">{code.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {canAccessBudgetCodes && (
          <div className="text-center">
            <button
              onClick={() => setCurrentView('budget-codes')}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Manage Budget Codes</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
          {/* Left side: Title and filters */}
          <div className="flex flex-col space-y-3 flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Budget Overview
            </h2>
            {/* Filters - wrap on small screens */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Projects</option>
                {filteredProjects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select
                value={selectedDivision}
                onChange={(e) => { setSelectedDivision(e.target.value); setSelectedUnit('all'); }}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Divisions</option>
                {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Units</option>
                {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          
          {/* Right side: Tabs and Add Entry button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              {canAccessBudgetCodes && (
                <button
                  onClick={() => setActiveTab('codes')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'codes'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Budget Codes
                </button>
              )}
            </div>
            {/* Add Entry button - full width on mobile, auto width on larger screens */}
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        {activeTab === 'codes' ? renderBudgetCodes() : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
                    <p className="text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatMYR(totalExpenses)}
                    </p>
                  </div>
                  <div className="w-10 lg:w-12 h-10 lg:h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                    <TrendingDown className="h-5 lg:h-6 w-5 lg:w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</p>
                    <p className="text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatMYR(totalIncome)}
                    </p>
                  </div>
                  <div className="w-10 lg:w-12 h-10 lg:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 lg:h-6 w-5 lg:w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Balance</p>
                    <p className={`text-xl lg:text-2xl font-bold ${
                      totalIncome - totalExpenses >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatMYR(totalIncome - totalExpenses)}
                    </p>
                  </div>
                  <div className={`w-10 lg:w-12 h-10 lg:h-12 rounded-lg flex items-center justify-center ${
                    totalIncome - totalExpenses >= 0 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <DollarSign className={`h-5 lg:h-6 w-5 lg:w-6 ${
                      totalIncome - totalExpenses >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6 mb-6 lg:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Spending Analytics
                </h3>
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 overflow-x-auto">
                  {chartTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveChart(tab.id as any)}
                      className={`flex items-center space-x-2 px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                        activeChart === tab.id
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-48 lg:h-64">
                {renderChart()}
              </div>
            </div>

            {/* Budget Entries Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 lg:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Transactions ({filteredEntries.length})
                </h3>
              </div>
              
              {/* Mobile Card View */}
              <div className="block lg:hidden">
                {filteredEntries.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredEntries.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {entry.description}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {getProjectName(entry.projectId)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {entry.type === 'expense' ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            )}
                            <span className={`text-sm font-semibold ${
                              entry.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {entry.type === 'expense' ? '-' : '+'}{formatMYR(entry.amount)}
                            </span>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(entry.category)}`}>
                            {entry.category}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(entry.date, 'DD/MM/YYYY')}</span>
                          </div>
                          {entry.budgetCodeId && (
                            <div className="flex items-center space-x-1">
                              <Hash className="h-3 w-3 text-purple-500" />
                              <span className="text-purple-600 dark:text-purple-400 font-mono">
                                {getBudgetCodeDisplay(entry.budgetCodeId)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No budget entries</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Start tracking your project expenses and income</p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Entry</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Description
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Project
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Budget Code
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Category
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Type
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Amount (MYR)
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                        Date
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900 dark:text-white w-8">
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry, index) => (
                      <tr 
                        key={entry.id}
                        className={`group hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 transition-colors ${
                          index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {entry.description}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {getProjectName(entry.projectId)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {entry.budgetCodeId ? (
                            <div className="flex items-center space-x-1">
                              <Hash className="h-3 w-3 text-purple-500" />
                              <span className="text-sm text-purple-600 dark:text-purple-400 font-mono">
                                {getBudgetCodeDisplay(entry.budgetCodeId)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                              No code
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(entry.category)}`}>
                            {entry.category}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            {entry.type === 'expense' ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            )}
                            <span className={`text-sm font-medium capitalize ${
                              entry.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {entry.type}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-sm font-semibold ${
                            entry.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                          }`}>
                            {entry.type === 'expense' ? '-' : '+'}{formatMYR(entry.amount)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(entry.date, 'DD/MM/YYYY')}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredEntries.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No budget entries</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Start tracking your project expenses and income</p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Entry</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Budget Modal */}
      {showModal && (
        <BudgetModal
          entry={editingEntry}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default BudgetView;