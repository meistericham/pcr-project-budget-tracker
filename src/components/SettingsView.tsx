import { useState } from 'react';
import { 
  Save, 
  Building2, 
  DollarSign, 
  Bell, 
  Shield, 
  Database,
  FileText,
  Settings as SettingsIcon,
  Globe,
  Palette,
  Users,
  Hash,
  ExternalLink,
  FileSpreadsheet,
  Key
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useIsSuperAdmin } from '../lib/authz';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseSetup from './DatabaseSetup';
import DatabaseStatus from './DatabaseStatus';
import GoogleSheetsIntegration from './GoogleSheetsIntegration'; 
import PasswordChangeModal from './PasswordChangeModal';


const SettingsView = () => {
  const {
    settings, updateSettings,
    divisions, units,
    addDivision, deleteDivision,
    addUnit, deleteUnit,
    renameDivision, renameUnit
  } = useApp();
  const { allowed: isSA } = useIsSuperAdmin();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<
    'general' | 'budget' | 'notifications' | 'security' | 'backup' | 'database' | 'integrations' | 'categories'
  >('general');

  const [newDivisionName, setNewDivisionName] = useState('');
  const [newUnit, setNewUnit] = useState({ name: '', divisionId: '' });
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Inline rename state
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null);
  const [divisionNameDraft, setDivisionNameDraft] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitNameDraft, setUnitNameDraft] = useState('');

  const [formData, setFormData] = useState({
    companyName: settings.companyName,
    currency: settings.currency,
    dateFormat: settings.dateFormat,
    fiscalYearStart: settings.fiscalYearStart,
    budgetAlertThreshold: settings.budgetAlertThreshold,
    autoBackup: settings.autoBackup,
    emailNotifications: settings.emailNotifications,
    defaultProjectStatus: settings.defaultProjectStatus,
    defaultProjectPriority: settings.defaultProjectPriority,
    maxProjectDuration: settings.maxProjectDuration,
    requireBudgetApproval: settings.requireBudgetApproval,
    allowNegativeBudget: settings.allowNegativeBudget,
    budgetCategories: settings.budgetCategories.join(', '),
    theme: settings.theme
  });

  const handleInputChange = (field: string, value: any) => {
    // Note: Role-based restrictions are now handled in AppContext.updateSettings
    // This function allows all input changes for UI responsiveness
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const updatedSettings = {
      ...formData,
      budgetCategories: formData.budgetCategories.split(',').map(cat => cat.trim()).filter(Boolean)
    };
    
    console.log('[SettingsView] Saving settings:', updatedSettings);
    updateSettings(updatedSettings);
    setHasChanges(false);
  };

  const isSuperAdmin = !!isSA;

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon, adminOnly: false },
    { id: 'security', label: 'Security', icon: Shield, adminOnly: false },
    { id: 'budget', label: 'Budget', icon: DollarSign, adminOnly: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, adminOnly: true },
    { id: 'backup', label: 'Backup', icon: Database, adminOnly: true },
    { id: 'database', label: 'Database Setup', icon: Database, adminOnly: true },
    { id: 'integrations', label: 'Integrations', icon: FileSpreadsheet, adminOnly: true },
    { id: 'categories', label: 'Categories', icon: Building2, adminOnly: true }
  ];

  const availableTabs = tabs.filter(tab => !tab.adminOnly || isSuperAdmin);

  const currencies = [
    { value: 'MYR', label: 'Malaysian Ringgit (MYR)' },
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' }
  ];

  const dateFormats = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' }
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const themes = [
    { value: 'light', label: 'Light Mode' },
    { value: 'dark', label: 'Dark Mode' },
    { value: 'system', label: 'System Default' }
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      {/* Company Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Company Information</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter company name"
              disabled={!isSuperAdmin}
            />
            {!isSuperAdmin && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Only Super Admins can modify this.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Regional Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Regional Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={!isSuperAdmin}
            >
              {currencies.map(currency => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Format
            </label>
            <select
              value={formData.dateFormat}
              onChange={(e) => handleInputChange('dateFormat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={!isSuperAdmin}
            >
              {dateFormats.map(format => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!isSuperAdmin && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Only Super Admins can modify this.
          </p>
        )}
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Theme
          </label>
          <select
            value={theme}
            onChange={(e) => {
              const newTheme = e.target.value as any;
              setTheme(newTheme);
              setFormData(prev => ({ ...prev, theme: newTheme }));
              setHasChanges(true);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {themes.map(themeOption => (
              <option key={themeOption.value} value={themeOption.value}>
                {themeOption.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h3>
        </div>
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Current User: (session) | Admin rights: {isSuperAdmin ? 'SUPER ADMIN' : 'NO'}
              </span>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Password</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Change your account password for better security
                </p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Key className="h-4 w-4" />
                <span>Change Password</span>
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Additional security settings can only be modified by system administrators. Contact your system administrator for advanced security policy updates.
          </p>
        </div>
      </div>
    </div>
  );

  const renderBudgetSettings = () => (
    <div className="space-y-6">
      {/* Budget Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Configuration</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fiscal Year Start Month
            </label>
            <select
              value={formData.fiscalYearStart}
              onChange={(e) => handleInputChange('fiscalYearStart', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {months.map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Budget Alert Threshold ({formData.budgetAlertThreshold}%)
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={formData.budgetAlertThreshold}
              onChange={(e) => handleInputChange('budgetAlertThreshold', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Defaults */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Defaults</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Project Status
            </label>
            <select
              value={formData.defaultProjectStatus}
              onChange={(e) => handleInputChange('defaultProjectStatus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Project Priority
            </label>
            <select
              value={formData.defaultProjectPriority}
              onChange={(e) => handleInputChange('defaultProjectPriority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Maximum Project Duration (Days)
          </label>
            <input
              type="number"
              min="1"
              max="3650"
              value={formData.maxProjectDuration}
              onChange={(e) => handleInputChange('maxProjectDuration', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
        </div>
      </div>

      {/* Budget Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Hash className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Categories</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Available Categories (comma-separated)
          </label>
          <textarea
            rows={3}
            value={formData.budgetCategories}
            onChange={(e) => handleInputChange('budgetCategories', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Design, Development, Marketing, Software, Research, Advertising, Equipment, Travel, Training, Other"
          />
        </div>
      </div>

      {/* Budget Policies */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Policies</h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.requireBudgetApproval}
              onChange={(e) => handleInputChange('requireBudgetApproval', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Require Budget Approval
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Budget entries above threshold require approval
              </p>
            </div>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.allowNegativeBudget}
              onChange={(e) => handleInputChange('allowNegativeBudget', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Allow Negative Budget
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allow projects to exceed their allocated budget
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.emailNotifications}
              onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Email Notifications
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive email notifications for important updates
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Types</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">Project Notifications</h5>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Project created/updated</li>
                <li>• Project completed</li>
                <li>• User assignments</li>
                <li>• Status changes</li>
              </ul>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">Budget Notifications</h5>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Budget alerts</li>
                <li>• Budget code alerts</li>
                <li>• New budget entries</li>
                <li>• Threshold warnings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackupSettings = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Settings</h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.autoBackup}
              onChange={(e) => handleInputChange('autoBackup', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Automatic Backup
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatically backup data daily at 2:00 AM
              </p>
            </div>
          </label>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300">
              Last backup: Today at 2:00 AM
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDatabaseSettings = () => (
    <div className="space-y-6">
      <DatabaseStatus />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Database Integration</h3>
          </div>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>Visit Supabase</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Available Database Options:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Supabase (Recommended)</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• PostgreSQL database</li>
                  <li>• Real-time synchronization</li>
                  <li>• Built-in authentication</li>
                  <li>• Automatic backups</li>
                  <li>• Row-level security</li>
                </ul>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Google Sheets (Available)</h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Simple spreadsheet storage</li>
                  <li>• Easy data export</li>
                  <li>• Collaborative editing</li>
                  <li>• Basic reporting</li>
                  <li>• <a href="#" onClick={() => setActiveTab('integrations')} className="text-blue-600 dark:text-blue-400 hover:underline">Go to Integrations tab</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DatabaseSetup />
    </div>
  );

  // ---- NEW: Categories (Divisions & Units) with inline rename ----
  const renderCategorySettings = () => (
    <div className="space-y-6">
      {/* Divisions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Divisions</h3>
          </div>
          {!isSuperAdmin && <span className="text-xs text-gray-500">Super Admin only</span>}
        </div>

        {isSuperAdmin && (
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="text"
              value={newDivisionName}
              onChange={(e) => setNewDivisionName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="New division name"
            />
            <button
              onClick={() => {
                if (newDivisionName.trim()) {
                  addDivision({ name: newDivisionName.trim(), createdBy: '1' });
                  setNewDivisionName('');
                }
              }}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        )}

        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {divisions.map(d => (
            <li key={d.id} className="flex items-center justify-between py-2">
              {editingDivisionId === d.id ? (
                <div className="flex items-center w-full">
                  <input
                    value={divisionNameDraft}
                    onChange={(e) => setDivisionNameDraft(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={async () => {
                      const name = divisionNameDraft.trim();
                      if (name) await renameDivision(d.id, name);
                      setEditingDivisionId(null);
                    }}
                    className="ml-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingDivisionId(null)}
                    className="ml-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-gray-900 dark:text-white">{d.name}</span>
                  {isSuperAdmin && (
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          setEditingDivisionId(d.id);
                          setDivisionNameDraft(d.name);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => deleteDivision(d.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Units */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Units</h3>
        </div>

        {isSuperAdmin && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <input
              type="text"
              value={newUnit.name}
              onChange={(e) => setNewUnit(prev => ({ ...prev, name: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="Unit name"
            />
            <select
              value={newUnit.divisionId}
              onChange={(e) => setNewUnit(prev => ({ ...prev, divisionId: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">Select division</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="col-span-2">
              <button
                onClick={() => {
                  if (newUnit.name.trim() && newUnit.divisionId) {
                    addUnit({ name: newUnit.name.trim(), divisionId: newUnit.divisionId, createdBy: '1' });
                    setNewUnit({ name: '', divisionId: '' });
                  }
                }}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Unit
              </button>
            </div>
          </div>
        )}

        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {units.map(u => (
            <li key={u.id} className="flex items-center justify-between py-2">
              {editingUnitId === u.id ? (
                <div className="flex items-center w-full">
                  <input
                    value={unitNameDraft}
                    onChange={(e) => setUnitNameDraft(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={async () => {
                      const name = unitNameDraft.trim();
                      if (name) await renameUnit(u.id, name);
                      setEditingUnitId(null);
                    }}
                    className="ml-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingUnitId(null)}
                    className="ml-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {u.name}{' '}
                    <span className="text-xs text-gray-500">
                      ({divisions.find(d => d.id === u.divisionId)?.name || '—'})
                    </span>
                  </span>
                  {isSuperAdmin && (
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          setEditingUnitId(u.id);
                          setUnitNameDraft(u.name);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => deleteUnit(u.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your PCR Tracker preferences and system options
            </p>
          </div>
          {hasChanges && !['database', 'integrations', 'security'].includes(activeTab) && (
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tabs */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'general' && renderGeneralSettings()}
            {activeTab === 'security' && renderSecuritySettings()}
            {activeTab === 'budget' && renderBudgetSettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'backup' && renderBackupSettings()}
            {activeTab === 'database' && renderDatabaseSettings()}
            {activeTab === 'integrations' && <GoogleSheetsIntegration />}
            {activeTab === 'categories' && renderCategorySettings()}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
};

export default SettingsView;