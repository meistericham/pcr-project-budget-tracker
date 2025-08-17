export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  avatar?: string;
  initials: string;
  divisionId?: string; // Optional: User's assigned division
  unitId?: string; // Optional: User's assigned unit
  createdAt: string;
}

export interface Division {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface Unit {
  id: string;
  name: string;
  divisionId: string;
  createdBy: string;
  createdAt: string;
}

export interface BudgetCode {
  id: string;
  code: string;
  name: string;
  description: string;
  budget: number; // Individual budget allocation for this code
  spent: number; // Amount spent against this budget code
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  unitId: string; // Must belong to a Unit
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  assignedUsers: string[];
  budgetCodes: string[]; // Array of budget code IDs
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetEntry {
  id: string;
  projectId: string;
  unitId?: string; // Optional direct link; defaults from project
  divisionId?: string; // Optional direct link; defaults from unit
  budgetCodeId?: string; // Optional budget code reference
  description: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  date: string;
  createdBy: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'project_updated' | 'project_created' | 'budget_alert' | 'user_assigned' | 'project_completed' | 'budget_entry_added' | 'budget_code_alert';
  title: string;
  message: string;
  data?: any; // Additional data related to the notification
  read: boolean;
  createdAt: string;
  actionUrl?: string; // Optional URL to navigate when notification is clicked
}

export interface AppSettings {
  currency: 'MYR' | 'USD' | 'EUR' | 'GBP';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  fiscalYearStart: number; // Month (1-12)
  budgetAlertThreshold: number; // Percentage (0-100)
  autoBackup: boolean;
  emailNotifications: boolean;
  companyName: string;
  companyLogo?: string;
  defaultProjectStatus: Project['status'];
  defaultProjectPriority: Project['priority'];
  budgetCategories: string[];
  maxProjectDuration: number; // Days
  requireBudgetApproval: boolean;
  allowNegativeBudget: boolean;
}

export type ViewMode = 'projects' | 'budget' | 'users' | 'budget-codes' | 'settings' | 'admin-users';