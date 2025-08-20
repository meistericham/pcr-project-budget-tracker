import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Calendar, Tag, Hash } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BudgetEntry } from '../types';
import { formatMYR } from '../utils/currency';

interface BudgetModalProps {
  entry?: BudgetEntry | null;
  onClose: () => void;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ entry, onClose }) => {
  const { addBudgetEntry, updateBudgetEntry, projects, budgetCodes, currentUser, divisions, units, settings } = useApp();
  const [formData, setFormData] = useState({
    divisionId: '',
    unitId: '',
    projectId: '',
    budgetCodeId: '',
    description: '',
    amount: '',
    type: 'expense' as BudgetEntry['type'],
    category: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Build categories from settings reactively
  const categories = useMemo(() => {
    const raw = settings?.budgetCategories ?? [];
    // normalize: trim, drop empties, dedupe (case-insensitive), sort
    const cleaned = Array.from(
      new Map(
        raw
          .map(s => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean)
          .map(s => [s.toLowerCase(), s]) // key = lowercase, value = original
      ).values()
    );
    // Ensure "Other" always present at end
    if (!cleaned.some(c => c.toLowerCase() === 'other')) cleaned.push('Other');
    return cleaned.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [settings?.budgetCategories]);

  console.debug('[BudgetModal] categories from settings:', categories);

  // Get available budget codes for selected project
  const selectedProject = projects.find(p => p.id === formData.projectId);
  const filteredUnits = units.filter(u => !formData.divisionId || u.divisionId === formData.divisionId);
  const filteredProjects = projects.filter(p => !formData.unitId || p.unitId === formData.unitId);
  const availableBudgetCodes = budgetCodes.filter(code => 
    code.isActive && selectedProject?.budgetCodes.includes(code.id)
  );

  useEffect(() => {
    if (entry) {
      setFormData({
        divisionId: units.find(u => u.id === (projects.find(p => p.id === entry.projectId)?.unitId || ''))?.divisionId || '',
        unitId: projects.find(p => p.id === entry.projectId)?.unitId || '',
        projectId: entry.projectId,
        budgetCodeId: entry.budgetCodeId || '',
        description: entry.description,
        amount: entry.amount.toString(),
        type: entry.type,
        category: entry.category,
        date: entry.date
      });
    } else if (projects.length > 0) {
      const firstUnit = units[0]?.id || '';
      const firstProject = projects.find(p => p.unitId === firstUnit)?.id || projects[0].id;
      setFormData(prev => ({ ...prev, divisionId: units.find(u => u.id === firstUnit)?.divisionId || '', unitId: firstUnit, projectId: firstProject }));
    }
  }, [entry, projects, units]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const entryData = {
      projectId: formData.projectId,
      budgetCodeId: formData.budgetCodeId || undefined,
      description: formData.description,
      amount: parseFloat(formData.amount),
      type: formData.type,
      category: formData.category,
      date: formData.date,
      createdBy: currentUser?.id || '1'
    };

    if (entry) {
      updateBudgetEntry(entry.id, entryData);
    } else {
      addBudgetEntry(entryData);
    }
    
    onClose();
  };

  const getBudgetCodeDisplay = (codeId: string) => {
    const code = budgetCodes.find(c => c.id === codeId);
    return code ? `${code.code} - ${code.name}` : 'Unknown Code';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {entry ? 'Edit Budget Entry' : 'Add Budget Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Division / Unit / Project Selection */}
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Division</label>
                <select
                  required
                  value={formData.divisionId}
                  onChange={(e) => setFormData(prev => ({ ...prev, divisionId: e.target.value, unitId: '', projectId: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select division</option>
                  {divisions.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit</label>
                <select
                  required
                  value={formData.unitId}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitId: e.target.value, projectId: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select unit</option>
                  {filteredUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project
            </label>
            <select
              required
              value={formData.projectId}
              onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value, budgetCodeId: '' }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select a project</option>
              {filteredProjects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          {/* Budget Code Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Hash className="inline h-4 w-4 mr-1" />
              Budget Code (Optional)
            </label>
            <select
              value={formData.budgetCodeId}
              onChange={(e) => setFormData(prev => ({ ...prev, budgetCodeId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">No budget code</option>
              {availableBudgetCodes.map(code => (
                <option key={code.id} value={code.id}>
                  {code.code} - {code.name}
                </option>
              ))}
            </select>
            {formData.projectId && availableBudgetCodes.length === 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                No budget codes assigned to this project
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter description"
            />
          </div>

          {/* Type and Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as BudgetEntry['type'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount (MYR)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Category and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="inline h-4 w-4 mr-1" />
                Category
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Preview */}
          {formData.amount && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Preview:</strong> {formData.type === 'expense' ? 'Expense' : 'Income'} of{' '}
                <span className="font-semibold">{formatMYR(parseFloat(formData.amount) || 0)}</span>
                {formData.budgetCodeId && (
                  <span className="block mt-1">
                    Budget Code: {getBudgetCodeDisplay(formData.budgetCodeId)}
                  </span>
                )}
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
              {entry ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetModal;