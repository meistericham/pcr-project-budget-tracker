import React, { createContext, useContext, useState, useEffect } from 'react';
import { userService, projectService, budgetEntryService, budgetCodeService, notificationService } from '../lib/database';
import { useAuth } from './AuthContext';
import { User, Project, BudgetEntry, BudgetCode, ViewMode, AppSettings, Notification, Division, Unit } from '../types';

interface AppContextType {
  users: User[];
  divisions: Division[];
  units: Unit[];
  projects: Project[];
  budgetEntries: BudgetEntry[];
  budgetCodes: BudgetCode[];
  notifications: Notification[];
  settings: AppSettings;
  currentView: ViewMode;
  selectedProject: Project | null;
  sidebarCollapsed: boolean;
  setCurrentView: (view: ViewMode) => void;
  setSelectedProject: (project: Project | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addDivision: (division: Omit<Division, 'id' | 'createdAt'>) => void;
  updateDivision: (id: string, updates: Partial<Division>) => void;
  deleteDivision: (id: string) => void;
  addUnit: (unit: Omit<Unit, 'id' | 'createdAt'>) => void;
  updateUnit: (id: string, updates: Partial<Unit>) => void;
  deleteUnit: (id: string) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addBudgetEntry: (entry: Omit<BudgetEntry, 'id' | 'createdAt'>) => void;
  updateBudgetEntry: (id: string, updates: Partial<BudgetEntry>) => void;
  deleteBudgetEntry: (id: string) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addBudgetCode: (code: Omit<BudgetCode, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBudgetCode: (id: string, updates: Partial<BudgetCode>) => void;
  deleteBudgetCode: (id: string) => void;
  toggleBudgetCodeStatus: (id: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  getUnreadNotificationCount: () => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Storage keys
const STORAGE_KEYS = {
  USERS: 'pcr_users',
  DIVISIONS: 'pcr_divisions',
  UNITS: 'pcr_units',
  PROJECTS: 'pcr_projects',
  BUDGET_ENTRIES: 'pcr_budget_entries',
  BUDGET_CODES: 'pcr_budget_codes',
  NOTIFICATIONS: 'pcr_notifications',
  SETTINGS: 'pcr_settings'
};

// Helper functions for localStorage
const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

const loadFromStorage = (key: string, defaultValue: any) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

// Debounced save function
const createDebouncedSave = (key: string) => {
  let timeoutId: NodeJS.Timeout;
  return (data: any) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => saveToStorage(key, data), 300);
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const useServerDb = import.meta.env.VITE_USE_SERVER_DB === 'true';

  // Create debounced save functions
  const debouncedSaveUsers = React.useMemo(() => createDebouncedSave(STORAGE_KEYS.USERS), []);
  const debouncedSaveProjects = React.useMemo(() => createDebouncedSave(STORAGE_KEYS.PROJECTS), []);
  const debouncedSaveBudgetEntries = React.useMemo(() => createDebouncedSave(STORAGE_KEYS.BUDGET_ENTRIES), []);
  const debouncedSaveBudgetCodes = React.useMemo(() => createDebouncedSave(STORAGE_KEYS.BUDGET_CODES), []);
  const debouncedSaveNotifications = React.useMemo(() => createDebouncedSave(STORAGE_KEYS.NOTIFICATIONS), []);
  const debouncedSaveSettings = React.useMemo(() => createDebouncedSave(STORAGE_KEYS.SETTINGS), []);

  // Default settings
  const defaultSettings: AppSettings = {
    currency: 'MYR',
    dateFormat: 'DD/MM/YYYY',
    fiscalYearStart: 1, // January
    budgetAlertThreshold: 80,
    autoBackup: true,
    emailNotifications: true,
    companyName: 'PCR Company',
    defaultProjectStatus: 'planning',
    defaultProjectPriority: 'medium',
    budgetCategories: [
      'Design', 'Development', 'Marketing', 'Software', 'Research',
      'Advertising', 'Equipment', 'Travel', 'Training', 'Other'
    ],
    maxProjectDuration: 365,
    requireBudgetApproval: false,
    allowNegativeBudget: false
  };

  // Default initial data
  const defaultUsers: User[] = [
    {
      id: '1',
      name: 'Hisyamudin',
      email: 'hisyamudin@sarawaktourism.com',
      role: 'super_admin',
      initials: 'HS',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'John Doe',
      email: 'john@company.com',
      role: 'super_admin',
      initials: 'JD',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '3',
      name: 'Sarah Chen',
      email: 'sarah@company.com',
      role: 'admin',
      initials: 'SC',
      createdAt: '2024-01-02T00:00:00Z'
    },
    {
      id: '4',
      name: 'Mike Johnson',
      email: 'mike@company.com',
      role: 'user',
      initials: 'MJ',
      createdAt: '2024-01-03T00:00:00Z'
    }
  ];

  const defaultBudgetCodes: BudgetCode[] = [
    {
      id: '1',
      code: '1-2345',
      name: 'Software Development',
      description: 'Budget allocation for software development activities including coding, testing, and deployment',
      budget: 500000,
      spent: 74000,
      isActive: true,
      createdBy: '1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      code: '2-1001',
      name: 'Marketing & Advertising',
      description: 'Budget for marketing campaigns, advertising, and promotional activities',
      budget: 300000,
      spent: 99200,
      isActive: true,
      createdBy: '1',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    },
    {
      id: '3',
      code: '3-5678',
      name: 'Equipment & Hardware',
      description: 'Purchase and maintenance of equipment, hardware, and infrastructure',
      budget: 150000,
      spent: 0,
      isActive: true,
      createdBy: '2',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z'
    },
    {
      id: '4',
      code: '4-9999',
      name: 'Training & Development',
      description: 'Employee training, workshops, and professional development programs',
      budget: 75000,
      spent: 0,
      isActive: false,
      createdBy: '1',
      createdAt: '2024-01-04T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z'
    }
  ];

  const defaultProjects: Project[] = [
    {
      id: '1',
      name: 'Website Redesign',
      description: 'Complete overhaul of company website with modern design and improved UX',
      status: 'active',
      priority: 'high',
      startDate: '2024-01-15',
      endDate: '2024-03-15',
      budget: 200000,
      spent: 74000,
      unitId: 'u1',
      assignedUsers: ['2', '3'],
      budgetCodes: ['1', '2'],
      createdBy: '1',
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z'
    },
    {
      id: '2',
      name: 'Mobile App Development',
      description: 'Native iOS and Android app for customer engagement',
      status: 'planning',
      priority: 'medium',
      startDate: '2024-02-01',
      endDate: '2024-06-01',
      budget: 480000,
      spent: 20000,
      unitId: 'u2',
      assignedUsers: ['3', '4'],
      budgetCodes: ['1', '3'],
      createdBy: '1',
      createdAt: '2024-01-20T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z'
    },
    {
      id: '3',
      name: 'Marketing Campaign Q1',
      description: 'Digital marketing campaign for Q1 product launch',
      status: 'completed',
      priority: 'high',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      budget: 100000,
      spent: 99200,
      unitId: 'u3',
      assignedUsers: ['2'],
      budgetCodes: ['2'],
      createdBy: '1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];

  const defaultBudgetEntries: BudgetEntry[] = [
    {
      id: '1',
      projectId: '1',
      unitId: 'u1',
      divisionId: 'd1',
      budgetCodeId: '1',
      description: 'UI/UX Design Services',
      amount: 34000,
      type: 'expense',
      category: 'Design',
      date: '2024-01-20',
      createdBy: '1',
      createdAt: '2024-01-20T00:00:00Z'
    },
    {
      id: '2',
      projectId: '1',
      unitId: 'u1',
      divisionId: 'd1',
      budgetCodeId: '1',
      description: 'Development Tools License',
      amount: 8000,
      type: 'expense',
      category: 'Software',
      date: '2024-01-25',
      createdBy: '2',
      createdAt: '2024-01-25T00:00:00Z'
    },
    {
      id: '3',
      projectId: '2',
      unitId: 'u2',
      divisionId: 'd1',
      budgetCodeId: '1',
      description: 'Market Research',
      amount: 20000,
      type: 'expense',
      category: 'Research',
      date: '2024-01-30',
      createdBy: '1',
      createdAt: '2024-01-30T00:00:00Z'
    },
    {
      id: '4',
      projectId: '3',
      unitId: 'u3',
      divisionId: 'd2',
      budgetCodeId: '2',
      description: 'Google Ads Campaign',
      amount: 60000,
      type: 'expense',
      category: 'Advertising',
      date: '2024-02-01',
      createdBy: '2',
      createdAt: '2024-02-01T00:00:00Z'
    },
    {
      id: '5',
      projectId: '1',
      unitId: 'u1',
      divisionId: 'd1',
      budgetCodeId: '1',
      description: 'Frontend Development',
      amount: 32000,
      type: 'expense',
      category: 'Development',
      date: '2024-02-15',
      createdBy: '3',
      createdAt: '2024-02-15T00:00:00Z'
    },
    {
      id: '6',
      projectId: '3',
      unitId: 'u3',
      divisionId: 'd2',
      budgetCodeId: '2',
      description: 'Social Media Marketing',
      amount: 25000,
      type: 'expense',
      category: 'Marketing',
      date: '2024-03-01',
      createdBy: '2',
      createdAt: '2024-03-01T00:00:00Z'
    },
    {
      id: '7',
      projectId: '3',
      unitId: 'u3',
      divisionId: 'd2',
      budgetCodeId: '2',
      description: 'Content Creation',
      amount: 14200,
      type: 'expense',
      category: 'Marketing',
      date: '2024-03-15',
      createdBy: '2',
      createdAt: '2024-03-15T00:00:00Z'
    }
  ];

  const defaultDivisions: Division[] = [
    { id: 'd1', name: 'Corporate Services', createdBy: '1', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'd2', name: 'Marketing', createdBy: '1', createdAt: '2024-01-01T00:00:00Z' }
  ];

  const defaultUnits: Unit[] = [
    { id: 'u1', name: 'IT Unit', divisionId: 'd1', createdBy: '1', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'u2', name: 'Product Unit', divisionId: 'd1', createdBy: '1', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'u3', name: 'Digital Marketing Unit', divisionId: 'd2', createdBy: '1', createdAt: '2024-01-01T00:00:00Z' }
  ];

  // Initialize state with persistent data - skip defaults in server mode
  const [settings, setSettings] = useState<AppSettings>(() => 
    useServerDb ? defaultSettings : loadFromStorage(STORAGE_KEYS.SETTINGS, defaultSettings)
  );

  const [users, setUsers] = useState<User[]>(() => 
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.USERS, defaultUsers)
  );

  const [budgetCodes, setBudgetCodes] = useState<BudgetCode[]>(() => 
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.BUDGET_CODES, defaultBudgetCodes)
  );

  const [divisions, setDivisions] = useState<Division[]>(() =>
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.DIVISIONS, defaultDivisions)
  );

  const [units, setUnits] = useState<Unit[]>(() =>
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.UNITS, defaultUnits)
  );

  const [projects, setProjects] = useState<Project[]>(() => 
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.PROJECTS, defaultProjects)
  );

  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>(() => 
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.BUDGET_ENTRIES, defaultBudgetEntries)
  );

  const [notifications, setNotifications] = useState<Notification[]>(() => 
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, [])
  );

  // Optional server hydration
  useEffect(() => {
    if (!useServerDb) return;
    
    let cancelled = false;
    (async () => {
      try {
        if (import.meta.env.DEV) console.log('[CTX] hydrate from supabase');
        const [remoteUsers, remoteCodes, remoteProjects, remoteEntries, remoteNotifs] = await Promise.all([
          userService.getAll().catch(() => users),
          budgetCodeService.getAll().catch(() => budgetCodes),
          projectService.getAll().catch(() => projects),
          budgetEntryService.getAll().catch(() => budgetEntries),
          notificationService.getAll().catch(() => notifications)
        ]);
        
        if (!cancelled) {
          setUsers(remoteUsers);
          setBudgetCodes(remoteCodes);
          setProjects(remoteProjects);
          setBudgetEntries(remoteEntries);
          setNotifications(remoteNotifs);
        }
      } catch (e) {
        console.error('[CTX] hydrate error', e);
        // Fallback to existing local data on error
      }
    })();
    
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to localStorage whenever state changes (optimized with debouncing) - only when not using server
  useEffect(() => {
    if (!useServerDb) {
      debouncedSaveUsers(users);
    }
  }, [users, debouncedSaveUsers, useServerDb]);

  useEffect(() => {
    if (!useServerDb) {
      debouncedSaveProjects(projects);
    }
  }, [projects, debouncedSaveProjects, useServerDb]);

  useEffect(() => {
    if (!useServerDb) {
      debouncedSaveBudgetEntries(budgetEntries);
    }
  }, [budgetEntries, debouncedSaveBudgetEntries, useServerDb]);

  useEffect(() => {
    if (!useServerDb) {
      debouncedSaveBudgetCodes(budgetCodes);
    }
  }, [budgetCodes, debouncedSaveBudgetCodes, useServerDb]);

  useEffect(() => {
    if (!useServerDb) {
      saveToStorage(STORAGE_KEYS.DIVISIONS, divisions);
    }
  }, [divisions, useServerDb]);

  useEffect(() => {
    if (!useServerDb) {
      saveToStorage(STORAGE_KEYS.UNITS, units);
    }
  }, [units, useServerDb]);
  const addDivision = (divisionData: Omit<Division, 'id' | 'createdAt'>) => {
    const newDivision: Division = { ...divisionData, id: Date.now().toString(), createdAt: new Date().toISOString() };
    setDivisions(prev => [...prev, newDivision]);
  };

  const updateDivision = (id: string, updates: Partial<Division>) => {
    setDivisions(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteDivision = (id: string) => {
    setDivisions(prev => prev.filter(d => d.id !== id));
    // Cascade: remove units under this division and unlink from projects/entries
    const unitIds = units.filter(u => u.divisionId === id).map(u => u.id);
    setUnits(prev => prev.filter(u => u.divisionId !== id));
    setProjects(prev => prev.map(p => (unitIds.includes(p.unitId) ? { ...p, unitId: '' } : p)));
    setBudgetEntries(prev => prev.map(e => (e.divisionId === id ? { ...e, divisionId: undefined } : e)));
  };

  const addUnit = (unitData: Omit<Unit, 'id' | 'createdAt'>) => {
    const newUnit: Unit = { ...unitData, id: Date.now().toString(), createdAt: new Date().toISOString() };
    setUnits(prev => [...prev, newUnit]);
  };

  const updateUnit = (id: string, updates: Partial<Unit>) => {
    setUnits(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
  };

  const deleteUnit = (id: string) => {
    setUnits(prev => prev.filter(u => u.id !== id));
    setProjects(prev => prev.map(p => (p.unitId === id ? { ...p, unitId: '' } : p)));
    setBudgetEntries(prev => prev.map(e => (e.unitId === id ? { ...e, unitId: undefined } : e)));
  };

  useEffect(() => {
    debouncedSaveNotifications(notifications);
  }, [notifications, debouncedSaveNotifications]);

  useEffect(() => {
    debouncedSaveSettings(settings);
  }, [settings, debouncedSaveSettings]);

  // Notification functions
  const addNotification = async (notificationData: Omit<Notification, 'id' | 'createdAt'>) => {
    let newNotification: Notification;
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] addNotification → service');
      newNotification = await notificationService.create(notificationData);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] addNotification → local');
      newNotification = { ...notificationData, id: Date.now().toString(), createdAt: new Date().toISOString() } as Notification;
    }
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only last 100 notifications to prevent storage bloat
      return updated.slice(0, 100);
    });
  };

  const markNotificationAsRead = (id: string) => {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] markNotificationAsRead → service');
      notificationService.markAsRead(id).catch(console.error);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] markNotificationAsRead → local');
    }
    setNotifications(prev => prev.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const markAllNotificationsAsRead = () => {
    if (!user) return;
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] markAllNotificationsAsRead → service');
      notificationService.markAllAsRead(user.id).catch(console.error);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] markAllNotificationsAsRead → local');
    }
    setNotifications(prev => prev.map(notification => 
      notification.userId === user.id ? { ...notification, read: true } : notification
    ));
  };

  const deleteNotification = (id: string) => {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] deleteNotification → service');
      notificationService.delete(id).catch(console.error);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] deleteNotification → local');
    }
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const getUnreadNotificationCount = () => {
    if (!user) return 0;
    return notifications.filter(n => !n.read && n.userId === user.id).length;
  };

  // Helper function to create notifications for all users
  const notifyAllUsers = (
    type: Notification['type'],
    title: string,
    message: string,
    data?: any,
    excludeUserId?: string
  ) => {
    users.forEach(user => {
      if (user.id !== excludeUserId) {
        addNotification({
          userId: user.id,
          type,
          title,
          message,
          data,
          read: false
        });
      }
    });
  };

  // Helper function to notify specific users
  const notifyUsers = (
    userIds: string[],
    type: Notification['type'],
    title: string,
    message: string,
    data?: any
  ) => {
    userIds.forEach(userId => {
      addNotification({
        userId,
        type,
        title,
        message,
        data,
        read: false
      });
    });
  };

  // Helper function to check budget code alerts
  const checkBudgetCodeAlert = (budgetCodeId: string) => {
    const budgetCode = budgetCodes.find(bc => bc.id === budgetCodeId);
    if (!budgetCode) return;

    const usagePercentage = (budgetCode.spent / budgetCode.budget) * 100;
    if (usagePercentage >= settings.budgetAlertThreshold) {
      notifyAllUsers(
        'budget_code_alert',
        'Budget Code Alert',
        `Budget code "${budgetCode.code} - ${budgetCode.name}" has used ${usagePercentage.toFixed(1)}% of its allocated budget`,
        { 
          budgetCodeId: budgetCode.id,
          percentage: usagePercentage,
          budget: budgetCode.budget,
          spent: budgetCode.spent
        }
      );
    }
  };

  const addProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    let newProject: Project;
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] addProject → service');
      newProject = await projectService.create(projectData);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] addProject → local');
      newProject = { ...projectData, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Project;
    }
    setProjects(prev => [...prev, newProject]);

    // Notify all users about new project
    const creatorName = users.find(u => u.id === projectData.createdBy)?.name || 'Someone';
    notifyAllUsers(
      'project_created',
      'New Project Created',
      `${creatorName} created a new project: ${newProject.name}`,
      { projectId: newProject.id, createdBy: projectData.createdBy },
      projectData.createdBy
    );

    // Notify assigned users specifically
    if (projectData.assignedUsers.length > 0) {
      notifyUsers(
        projectData.assignedUsers,
        'user_assigned',
        'Project Assignment',
        `You have been assigned to the project: ${newProject.name}`,
        { projectId: newProject.id }
      );
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const oldProject = projects.find(p => p.id === id);
    if (!oldProject) return;

    let updatedProject: Project;
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] updateProject → service');
      updatedProject = await projectService.update(id, updates);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] updateProject → local');
      updatedProject = { ...oldProject, ...updates, updatedAt: new Date().toISOString() } as Project;
    }
    setProjects(prev => prev.map(project => 
      project.id === id ? updatedProject : project
    ));

    // Notify all users about project update
    const updaterName = profile?.name || 'Someone';
    notifyAllUsers(
      'project_updated',
      'Project Updated',
      `${updaterName} updated the project: ${updatedProject.name}`,
      { 
        projectId: id, 
        updatedBy: user?.id,
        changes: Object.keys(updates)
      },
      user?.id
    );

    // Check for budget alerts
    const budgetUsagePercentage = (updatedProject.spent / updatedProject.budget) * 100;
    if (budgetUsagePercentage >= settings.budgetAlertThreshold) {
      notifyAllUsers(
        'budget_alert',
        'Budget Alert',
        `Project "${updatedProject.name}" has used ${budgetUsagePercentage.toFixed(1)}% of its budget`,
        { 
          projectId: id, 
          percentage: budgetUsagePercentage,
          budget: updatedProject.budget,
          spent: updatedProject.spent
        }
      );
    }

    // Notify if project status changed to completed
    if (updates.status === 'completed' && oldProject.status !== 'completed') {
      notifyAllUsers(
        'project_completed',
        'Project Completed',
        `Project "${updatedProject.name}" has been marked as completed`,
        { projectId: id }
      );
    }

    // Notify newly assigned users
    if (updates.assignedUsers) {
      const newlyAssigned = updates.assignedUsers.filter(userId => 
        !oldProject.assignedUsers.includes(userId)
      );
      if (newlyAssigned.length > 0) {
        notifyUsers(
          newlyAssigned,
          'user_assigned',
          'Project Assignment',
          `You have been assigned to the project: ${updatedProject.name}`,
          { projectId: id }
        );
      }
    }
  };

  const deleteProject = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    // Authorization: only super admins can delete any project; admins can delete projects they created; users cannot delete
    const isSuperAdmin = profile?.role === 'super_admin';
    const isAdmin = profile?.role === 'admin';
    const canDelete = !!user && (isSuperAdmin || (isAdmin && project.createdBy === user.id));
    if (!canDelete) {
      // Silently ignore or log; optional: add a notification later
      return;
    }
    
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] deleteProject → service');
      await projectService.delete(id);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] deleteProject → local');
    }
    setProjects(prev => prev.filter(project => project.id !== id));
    setBudgetEntries(prev => prev.filter(entry => entry.projectId !== id));

    // Notify all users about project deletion
    const deleterName = profile?.name || 'Someone';
    notifyAllUsers(
      'project_updated',
      'Project Deleted',
      `${deleterName} deleted the project: ${project.name}`,
      { projectId: id, deletedBy: user?.id },
      user?.id
    );
  };

  const addBudgetEntry = async (entryData: Omit<BudgetEntry, 'id' | 'createdAt'>) => {
    let newEntry: BudgetEntry;
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] addBudgetEntry → service');
      newEntry = await budgetEntryService.create(entryData);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] addBudgetEntry → local');
      newEntry = { ...entryData, unitId: entryData.unitId ?? projects.find(p => p.id === entryData.projectId)?.unitId, divisionId: entryData.divisionId ?? units.find(u => u.id === (projects.find(p => p.id === entryData.projectId)?.unitId || ''))?.divisionId, id: Date.now().toString(), createdAt: new Date().toISOString() } as BudgetEntry;
    }
    setBudgetEntries(prev => [...prev, newEntry]);
    
    // Update project spent amount
    const project = projects.find(p => p.id === entryData.projectId);
    if (project && entryData.type === 'expense') {
      updateProject(project.id, { spent: project.spent + entryData.amount });
    }

    // Update budget code spent amount
    if (entryData.budgetCodeId && entryData.type === 'expense') {
      setBudgetCodes(prev => prev.map(code => 
        code.id === entryData.budgetCodeId 
          ? { ...code, spent: code.spent + entryData.amount, updatedAt: new Date().toISOString() }
          : code
      ));
      
      // Check for budget code alerts after updating
      setTimeout(() => checkBudgetCodeAlert(entryData.budgetCodeId!), 100);
    }

    // Notify project team about new budget entry
    if (project) {
      const creatorName = users.find(u => u.id === entryData.createdBy)?.name || 'Someone';
      const notificationMessage = `${creatorName} added a new ${entryData.type} of ${settings.currency} ${entryData.amount.toLocaleString()} to ${project.name}`;
      
      // Notify assigned users and project creator
      const usersToNotify = [...new Set([...project.assignedUsers, project.createdBy])];
      notifyUsers(
        usersToNotify.filter(userId => userId !== entryData.createdBy),
        'budget_entry_added',
        'New Budget Entry',
        notificationMessage,
        { 
          projectId: entryData.projectId, 
          entryId: newEntry.id,
          amount: entryData.amount,
          type: entryData.type,
          budgetCodeId: entryData.budgetCodeId
        }
      );
    }
  };

  const updateBudgetEntry = async (id: string, updates: Partial<BudgetEntry>) => {
    const oldEntry = budgetEntries.find(e => e.id === id);
    if (!oldEntry) return;
    
    let updated: BudgetEntry;
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] updateBudgetEntry → service');
      updated = await budgetEntryService.update(id, updates);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] updateBudgetEntry → local');
      updated = { ...oldEntry, ...updates } as BudgetEntry;
    }
    setBudgetEntries(prev => prev.map(entry => (entry.id === id ? updated : entry)));

    // Update budget code spent amounts if amount or budget code changed
    if (updates.amount !== undefined || updates.budgetCodeId !== undefined) {
      // Remove from old budget code
      if (oldEntry.budgetCodeId && oldEntry.type === 'expense') {
        setBudgetCodes(prev => prev.map(code => 
          code.id === oldEntry.budgetCodeId 
            ? { ...code, spent: Math.max(0, code.spent - oldEntry.amount), updatedAt: new Date().toISOString() }
            : code
        ));
      }
      
      // Add to new budget code
      const newBudgetCodeId = updates.budgetCodeId !== undefined ? updates.budgetCodeId : oldEntry.budgetCodeId;
      if (newBudgetCodeId && oldEntry.type === 'expense') {
        setBudgetCodes(prev => prev.map(code => 
          code.id === newBudgetCodeId 
            ? { ...code, spent: code.spent + (updates.amount || oldEntry.amount), updatedAt: new Date().toISOString() }
            : code
        ));
        
        // Check for budget code alerts
        setTimeout(() => checkBudgetCodeAlert(newBudgetCodeId), 100);
      }
    }
  };

  const deleteBudgetEntry = async (id: string) => {
    const entry = budgetEntries.find(e => e.id === id);
    if (!entry) return;
    
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] deleteBudgetEntry → service');
      await budgetEntryService.delete(id);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] deleteBudgetEntry → local');
    }
    // Update project spent amount
    if (entry.type === 'expense') {
      const project = projects.find(p => p.id === entry.projectId);
      if (project) {
        updateProject(project.id, { spent: project.spent - entry.amount });
      }
      
      // Update budget code spent amount
      if (entry.budgetCodeId) {
        setBudgetCodes(prev => prev.map(code => 
          code.id === entry.budgetCodeId 
            ? { ...code, spent: Math.max(0, code.spent - entry.amount), updatedAt: new Date().toISOString() }
            : code
        ));
      }
    }
    
    setBudgetEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const addUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    let newUser: User;
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] addUser → service');
      newUser = await userService.create(userData);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] addUser → local');
      newUser = { ...userData, id: Date.now().toString(), createdAt: new Date().toISOString() } as User;
    }
    setUsers(prev => [...prev, newUser]);

    // Notify all admins about new user
    const adminUsers = users.filter(u => u.role === 'admin' || u.role === 'super_admin');
    const creatorName = profile?.name || 'Someone';
    notifyUsers(
      adminUsers.map(u => u.id).filter(id => id !== user?.id),
      'user_assigned',
      'New User Added',
      `${creatorName} added a new user: ${newUser.name} (${newUser.role.replace('_', ' ')})`,
      { userId: newUser.id }
    );
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    let next: User | undefined;
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] updateUser → service');
      next = await userService.update(id, updates);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] updateUser → local');
      next = undefined;
    }
    setUsers(prev => prev.map(user => (user.id === id ? (next || { ...user, ...updates }) : user)));
  };

  const deleteUser = async (id: string) => {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] deleteUser → service');
      await userService.delete(id);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] deleteUser → local');
    }
    setUsers(prev => prev.filter(user => user.id !== id));
    // Also remove user from project assignments
    setProjects(prev => prev.map(project => ({
      ...project,
      assignedUsers: project.assignedUsers.filter(userId => userId !== id)
    })));
    // Remove user's notifications
    setNotifications(prev => prev.filter(notification => notification.userId !== id));
  };

  const addBudgetCode = async (codeData: Omit<BudgetCode, 'id' | 'createdAt' | 'updatedAt'>) => {
    let newCode: BudgetCode;
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] addBudgetCode → service');
      newCode = await budgetCodeService.create(codeData);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] addBudgetCode → local');
      newCode = { ...codeData, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as BudgetCode;
    }
    setBudgetCodes(prev => [...prev, newCode]);
  };

  const updateBudgetCode = async (id: string, updates: Partial<BudgetCode>) => {
    let next: BudgetCode | undefined;
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] updateBudgetCode → service');
      next = await budgetCodeService.update(id, updates);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] updateBudgetCode → local');
      next = undefined;
    }
    setBudgetCodes(prev => prev.map(code => (code.id === id ? (next || { ...code, ...updates, updatedAt: new Date().toISOString() }) : code)));
    
    // Check for budget alerts if budget was changed
    if (updates.budget !== undefined) {
      setTimeout(() => checkBudgetCodeAlert(id), 100);
    }
  };

  const deleteBudgetCode = async (id: string) => {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[CTX] deleteBudgetCode → service');
      await budgetCodeService.delete(id);
    } else {
      if (import.meta.env.DEV) console.log('[CTX] deleteBudgetCode → local');
    }
    setBudgetCodes(prev => prev.filter(code => code.id !== id));
    // Remove budget code from projects
    setProjects(prev => prev.map(project => ({
      ...project,
      budgetCodes: project.budgetCodes.filter(codeId => codeId !== id)
    })));
    // Remove budget code from entries
    setBudgetEntries(prev => prev.map(entry => ({
      ...entry,
      budgetCodeId: entry.budgetCodeId === id ? undefined : entry.budgetCodeId
    })));
  };

  const toggleBudgetCodeStatus = async (id: string) => {
    const current = budgetCodes.find(c => c.id === id);
    if (!current) return;
    const nextActive = !current.isActive;
    // Optimistic update
    setBudgetCodes(prev => prev.map(code => 
      code.id === id 
        ? { ...code, isActive: nextActive, updatedAt: new Date().toISOString() }
        : code
    ));
    if (useServerDb) {
      try {
        await budgetCodeService.update(id, { isActive: nextActive });
      } catch (e) {
        // rollback on error
        setBudgetCodes(prev => prev.map(code => 
          code.id === id 
            ? { ...code, isActive: !nextActive }
            : code
        ));
        console.error('Failed to toggle budget code status on server', e);
      }
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <AppContext.Provider value={{
      users,
      divisions,
      units,
      projects,
      budgetEntries,
      budgetCodes,
      notifications,
      settings,
      currentView,
      selectedProject,
      sidebarCollapsed,
      setCurrentView,
      setSelectedProject,
      setSidebarCollapsed,
      addDivision,
      updateDivision,
      deleteDivision,
      addUnit,
      updateUnit,
      deleteUnit,
      addProject,
      updateProject,
      deleteProject,
      addBudgetEntry,
      updateBudgetEntry,
      deleteBudgetEntry,
      addUser,
      updateUser,
      deleteUser,
      addBudgetCode,
      updateBudgetCode,
      deleteBudgetCode,
      toggleBudgetCodeStatus,
      updateSettings,
      addNotification,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteNotification,
      getUnreadNotificationCount
    }}>
      {children}
    </AppContext.Provider>
  );
};