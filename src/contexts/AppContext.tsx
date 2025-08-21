import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  userService,
  projectService,
  budgetEntryService,
  budgetCodeService,
  notificationService,
  dbCreateDivision,
  dbListDivisions,
  dbCreateUnit,
  dbListUnits,
  dbDeleteDivision,
  dbDeleteUnit,
  dbUpdateUnit,
  dbUpdateDivision,
} from '../lib/database';
import { getSettings, upsertSettings } from '../lib/settingsService';
import { useAuth } from './AuthContext';
import { useIsSuperAdmin } from '../lib/authz';
import { supabase } from '../lib/supabase';
import {
  User,
  Project,
  BudgetEntry,
  BudgetCode,
  ViewMode,
  AppSettings,
  Notification,
  Division,
  Unit,
} from '../types';

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

  // Divisions
  addDivision: (division: Omit<Division, 'id' | 'createdAt'>) => Promise<Division> | void;
  updateDivision: (id: string, updates: Partial<Division>) => void;
  deleteDivision: (id: string) => Promise<void>;
  renameDivision: (id: string, newName: string) => Promise<any> | void;

  // Units
  addUnit: (unit: Omit<Unit, 'id' | 'createdAt'>) => Promise<Unit> | void;
  updateUnit: (id: string, updates: Partial<Unit>) => void;
  deleteUnit: (id: string) => Promise<void>;
  renameUnit: (id: string, newName: string) => Promise<any> | void;

  // Projects
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Budget entries
  addBudgetEntry: (entry: Omit<BudgetEntry, 'id' | 'createdAt'>) => Promise<void>;
  updateBudgetEntry: (id: string, updates: Partial<BudgetEntry>) => Promise<void>;
  deleteBudgetEntry: (id: string) => Promise<void>;

  // Users
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;

  // Budget codes
  addBudgetCode: (code: Omit<BudgetCode, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBudgetCode: (id: string, updates: Partial<BudgetCode>) => Promise<void>;
  deleteBudgetCode: (id: string) => Promise<void>;
  toggleBudgetCodeStatus: (id: string) => Promise<void>;

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;

  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  getUnreadNotificationCount: () => number;
  createTestNotification: (type: Notification['type']) => void;
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
  SETTINGS: 'pcr_settings',
};

// localStorage helpers
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
    if (!stored) return defaultValue;
    
    const parsed = JSON.parse(stored);
    
    // For settings, merge with defaults to ensure new fields are applied
    if (key === STORAGE_KEYS.SETTINGS && defaultValue) {
      return { ...defaultValue, ...parsed };
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

// Debounced save
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

  // Feature flag: server mode
  const useServerDb = import.meta.env.VITE_USE_SERVER_DB === 'true';
  console.log('[DEBUG] useServerDb =', useServerDb);
  
  // Debounced savers
  const debouncedSaveUsers = React.useMemo(() => createDebouncedSave(STORAGE_KEYS.USERS), []);
  const debouncedSaveProjects = React.useMemo(() => createDebouncedSave(STORAGE_KEYS.PROJECTS), []);
  const debouncedSaveBudgetEntries = React.useMemo(
    () => createDebouncedSave(STORAGE_KEYS.BUDGET_ENTRIES),
    [],
  );
  const debouncedSaveBudgetCodes = React.useMemo(
    () => createDebouncedSave(STORAGE_KEYS.BUDGET_CODES),
    [],
  );
  const debouncedSaveNotifications = React.useMemo(
    () => createDebouncedSave(STORAGE_KEYS.NOTIFICATIONS),
    [],
  );
  const debouncedSaveSettings = React.useMemo(
    () => createDebouncedSave(STORAGE_KEYS.SETTINGS),
    [],
  );

  // Default settings
  const defaultSettings: AppSettings = {
    currency: 'MYR',
    dateFormat: 'DD/MM/YYYY',
    fiscalYearStart: 1,
    budgetAlertThreshold: 80,
    autoBackup: true,
    emailNotifications: true,
    companyName: 'PCR Company',
    defaultProjectStatus: 'planning',
    defaultProjectPriority: 'medium',
    budgetCategories: [
      'Design',
      'Development',
      'Marketing',
      'Software',
      'Research',
      'Advertising',
      'Equipment',
      'Travel',
      'Training',
      'Other',
    ],
    maxProjectDuration: 365,
    requireBudgetApproval: false,
    allowNegativeBudget: false,
    theme: 'system',
  };

  // Default seed data
  const defaultUsers: User[] = [
    { id: '1', name: 'Hisyamudin', email: 'hisyamudin@sarawaktourism.com', role: 'super_admin', initials: 'HS', createdAt: '2024-01-01T00:00:00Z' },
    { id: '2', name: 'John Doe', email: 'john@company.com', role: 'super_admin', initials: 'JD', createdAt: '2024-01-01T00:00:00Z' },
    { id: '3', name: 'Sarah Chen', email: 'sarah@company.com', role: 'admin', initials: 'SC', createdAt: '2024-01-02T00:00:00Z' },
    { id: '4', name: 'Mike Johnson', email: 'mike@company.com', role: 'user', initials: 'MJ', createdAt: '2024-01-03T00:00:00Z' },
  ];

  const defaultNotifications: Notification[] = [
    {
      id: '1',
      userId: '1',
      type: 'project_created',
      title: 'Welcome to PCR Project Tracker!',
      message: 'Your first project has been created. Start managing your projects and budgets efficiently.',
      data: { projectId: '1' },
      read: false,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      userId: '1',
      type: 'budget_alert',
      title: 'Budget Alert: Website Redesign',
      message: 'Project "Website Redesign" has used 37% of its allocated budget.',
      data: { projectId: '1', percentage: 37, budget: 200000, spent: 74000 },
      read: false,
      createdAt: '2024-01-20T00:00:00Z',
    },
    {
      id: '3',
      userId: '1',
      type: 'user_assigned',
      title: 'Project Assignment',
      message: 'You have been assigned to the project: Mobile App Development',
      data: { projectId: '2' },
      read: true,
      createdAt: '2024-01-25T00:00:00Z',
    },
  ];

  const defaultBudgetCodes: BudgetCode[] = [
    {
      id: '1',
      code: '1-2345',
      name: 'Software Development',
      description:
        'Budget allocation for software development activities including coding, testing, and deployment',
      budget: 500000,
      spent: 74000,
      isActive: true,
      createdBy: '1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      code: '2-1001',
      name: 'Marketing & Advertising',
      description:
        'Budget for marketing campaigns, advertising, and promotional activities',
      budget: 300000,
      spent: 99200,
      isActive: true,
      createdBy: '1',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '3',
      code: '3-5678',
      name: 'Equipment & Hardware',
      description:
        'Purchase and maintenance of equipment, hardware, and infrastructure',
      budget: 150000,
      spent: 0,
      isActive: true,
      createdBy: '2',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    },
    {
      id: '4',
      code: '4-9999',
      name: 'Training & Development',
      description:
        'Employee training, workshops, and professional development programs',
      budget: 75000,
      spent: 0,
      isActive: false,
      createdBy: '1',
      createdAt: '2024-01-04T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    },
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
      updatedAt: '2024-01-10T00:00:00Z',
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
      updatedAt: '2024-01-20T00:00:00Z',
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
      updatedAt: '2024-01-01T00:00:00Z',
    },
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
      createdAt: '2024-01-20T00:00:00Z',
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
      createdAt: '2024-01-25T00:00:00Z',
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
      createdAt: '2024-01-30T00:00:00Z',
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
      createdAt: '2024-02-01T00:00:00Z',
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
      createdAt: '2024-02-15T00:00:00Z',
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
      createdAt: '2024-03-01T00:00:00Z',
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
      createdAt: '2024-03-15T00:00:00Z',
    },
  ];

  const defaultDivisions: Division[] = [
    { id: 'd1', name: 'Corporate Services', createdBy: '1', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'd2', name: 'Marketing', createdBy: '1', createdAt: '2024-01-01T00:00:00Z' },
  ];

  const defaultUnits: Unit[] = [
    { id: 'u1', name: 'IT Unit', divisionId: 'd1', createdBy: '1', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'u2', name: 'Product Unit', divisionId: 'd1', createdBy: '1', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'u3', name: 'Digital Marketing Unit', divisionId: 'd2', createdBy: '1', createdAt: '2024-01-01T00:00:00Z' },
  ];

  // State (server mode starts empty)
  const [settings, setSettings] = useState<AppSettings>(() => {
    const s = loadFromStorage(STORAGE_KEYS.SETTINGS, defaultSettings);
    console.log('[AppContext] Initial settings loaded from storage:', s);
    console.log('[AppContext] useServerDb:', useServerDb);
    return s;
  });
  const [users, setUsers] = useState<User[]>(() =>
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.USERS, defaultUsers),
  );
  const [budgetCodes, setBudgetCodes] = useState<BudgetCode[]>(() =>
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.BUDGET_CODES, defaultBudgetCodes),
  );
  const [divisions, setDivisions] = useState<Division[]>(() =>
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.DIVISIONS, defaultDivisions),
  );
  const [units, setUnits] = useState<Unit[]>(() =>
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.UNITS, defaultUnits),
  );
  const [projects, setProjects] = useState<Project[]>(() =>
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.PROJECTS, defaultProjects),
  );
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>(() =>
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.BUDGET_ENTRIES, defaultBudgetEntries),
  );
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    useServerDb ? [] : loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, defaultNotifications),
  );

 // Initialize default settings only if none exist
  useEffect(() => {
    const existing = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    console.log('[AppContext] init-defaults effect: existing pcr_settings =', existing);
    if (!existing) {
      console.log('[AppContext] init-defaults effect: writing defaultSettings → pcr_settings');
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
      console.log('[AppContext] Default settings initialized successfully');
    } else {
      console.log('[AppContext] Settings already exist, skipping default initialization');
    }
  }, []);

  // Load settings from server mode if enabled
  useEffect(() => {
    if (!useServerDb) return;
    
    (async () => {
      try {
        console.log('[AppContext] (server) attempting to fetch settings from Supabase');
        const remoteSettings = await getSettings();
        
        if (remoteSettings) {
          // Merge remote settings with defaults (remote takes precedence)
          const mergedSettings = { ...defaultSettings, ...remoteSettings };
          setSettings(mergedSettings);
          console.log('[AppContext] (server) fetched settings from Supabase: true');
          console.log('[AppContext] (server) applying merged settings keys:', Object.keys(mergedSettings));
        } else {
          // No remote settings found, check localStorage fallback
          const localSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
          if (localSettings) {
            try {
              const parsed = JSON.parse(localSettings);
              const mergedSettings = { ...defaultSettings, ...parsed };
              setSettings(mergedSettings);
              console.log('[AppContext] (server) falling back to localStorage: true');
              console.log('[AppContext] (server) merged local settings with defaults');
            } catch (e) {
              console.warn('[AppContext] (server) localStorage parse failed, using defaults');
              setSettings(defaultSettings);
            }
          } else {
            console.log('[AppContext] (server) no settings found, using defaults');
            setSettings(defaultSettings);
          }
        }
      } catch (error) {
        console.error('[AppContext] (server) settings fetch failed:', error);
        // Fallback to localStorage
        const localSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (localSettings) {
          try {
            const parsed = JSON.parse(localSettings);
            const mergedSettings = { ...defaultSettings, ...parsed };
            setSettings(mergedSettings);
            console.log('[AppContext] (server) falling back to localStorage: true (after error)');
          } catch (e) {
            console.warn('[AppContext] (server) localStorage parse failed after error, using defaults');
            setSettings(defaultSettings);
          }
        } else {
          console.log('[AppContext] (server) using defaults after error');
          setSettings(defaultSettings);
        }
      }
    })();
  }, [useServerDb]);

  // Load divisions (server)
  useEffect(() => {
    if (!useServerDb) return;
    (async () => {
      try {
        const rows = await dbListDivisions();
        const mapped = rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          ...(r.code ? { code: r.code } : {}),
          createdAt: r.created_at,
          createdBy: r.created_by || '',
        }));
        setDivisions(mapped);
      } catch (e) {
        console.error('Load divisions failed:', e);
      }
    })();
  }, [useServerDb]);

  // Load units (server)
  useEffect(() => {
    if (!useServerDb) return;
    (async () => {
      try {
        const rows = await dbListUnits();
        const mapped = rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          ...(r.code ? { code: r.code } : {}),
          divisionId: r.division_id,
          createdAt: r.created_at,
          createdBy: r.created_by || '',
        }));
        setUnits(mapped);
      } catch (e) {
        console.error('Load units failed:', e);
      }
    })();
  }, [useServerDb]);

  // Hydrate other server data (defensive: don't overwrite with empty/failed results)
useEffect(() => {
  if (!useServerDb) return;

  let cancelled = false;
  (async () => {
    try {
      const usersP = userService.getAll().catch(e => {
        console.warn('[CTX] users fetch failed, keeping existing:', e);
        return [] as User[];
      });
      const codesP = budgetCodeService.getAll().catch(e => {
        console.warn('[CTX] budget codes fetch failed, keeping existing:', e);
        return [] as BudgetCode[];
      });
      const projectsP = projectService.getAll().catch(e => {
        console.warn('[CTX] projects fetch failed, keeping existing:', e);
        return [] as Project[];
      });
      const entriesP = budgetEntryService.getAll().catch(e => {
        console.warn('[CTX] entries fetch failed, keeping existing:', e);
        return [] as BudgetEntry[];
      });
      const notifsP = notificationService.getAll().catch(e => {
        console.warn('[CTX] notifications fetch failed, keeping existing:', e);
        return [] as Notification[];
      });

      const [remoteUsers, remoteCodes, remoteProjects, remoteEntries, remoteNotifs] =
        await Promise.all([usersP, codesP, projectsP, entriesP, notifsP]);

      if (cancelled) return;

      // Only replace if we actually got some data; otherwise keep current state
      if (remoteUsers.length) setUsers(remoteUsers);
      if (remoteCodes.length) setBudgetCodes(remoteCodes);
      if (remoteProjects.length) setProjects(remoteProjects);
      if (remoteEntries.length) setBudgetEntries(remoteEntries);
      if (remoteNotifs.length) setNotifications(remoteNotifs);
    } catch (e) {
      console.error('[CTX] hydrate error (soft):', e);
      // keep existing local state
    }
  })();

  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // Persist to localStorage in non-server mode
  useEffect(() => {
    if (!useServerDb) debouncedSaveUsers(users);
  }, [users, debouncedSaveUsers, useServerDb]);
  useEffect(() => {
    if (!useServerDb) debouncedSaveProjects(projects);
  }, [projects, debouncedSaveProjects, useServerDb]);
  useEffect(() => {
    if (!useServerDb) debouncedSaveBudgetEntries(budgetEntries);
  }, [budgetEntries, debouncedSaveBudgetEntries, useServerDb]);
  useEffect(() => {
    if (!useServerDb) debouncedSaveBudgetCodes(budgetCodes);
  }, [budgetCodes, debouncedSaveBudgetCodes, useServerDb]);
  useEffect(() => {
    if (!useServerDb) saveToStorage(STORAGE_KEYS.DIVISIONS, divisions);
  }, [divisions, useServerDb]);
  useEffect(() => {
    if (!useServerDb) saveToStorage(STORAGE_KEYS.UNITS, units);
  }, [units, useServerDb]);
  useEffect(() => {
    if (!useServerDb) {
      debouncedSaveNotifications(notifications);
    }
  }, [notifications, debouncedSaveNotifications, useServerDb]);
  useEffect(() => {
    if (!useServerDb) {
      console.log('[DEBUG] autosave effect: saving settings →', settings);
      debouncedSaveSettings(settings);
    } else {
      console.log('[DEBUG] autosave effect: skipped because useServerDb=true');
    }
  }, [settings, debouncedSaveSettings, useServerDb]);

  // ----- Division CRUD -----
  const addDivision = async (
    divisionData: Omit<Division, 'id' | 'createdAt'>,
  ): Promise<Division> => {
    if (useServerDb) {
      const row = await dbCreateDivision({
        code: (divisionData as any).code ?? divisionData.name,
        name: divisionData.name,
      });
      const newDivision: Division = {
        id: row.id,
        name: row.name,
        ...(row.code ? { code: row.code } : {}),
        createdAt: row.created_at,
        createdBy: (divisionData as any).createdBy ?? '',
      };
      setDivisions(prev => [...prev, newDivision]);
      return newDivision;
    }
    const newDivision: Division = {
      ...divisionData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setDivisions(prev => [...prev, newDivision]);
    return newDivision;
  };

  const updateDivision = (id: string, updates: Partial<Division>) => {
    setDivisions(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteDivision = async (divisionId: string) => {
    // collect affected units once
    const unitsInDiv = units.filter(u => u.divisionId === divisionId);
    const unitIdsInDiv = unitsInDiv.map(u => u.id);

    if (useServerDb) {
      try {
        if (unitsInDiv.length) {
          await Promise.all(unitsInDiv.map(u => dbDeleteUnit(u.id)));
        }
        await dbDeleteDivision(divisionId);
      } catch (e) {
        console.error('Delete division (Supabase) failed:', e);
        throw e;
      }
    }

    // UI cascade
    setUnits(prev => prev.filter(u => u.divisionId !== divisionId));
    setProjects(prev => prev.map(p => (unitIdsInDiv.includes(p.unitId) ? { ...p, unitId: '' } : p)));
    setBudgetEntries(prev =>
      prev.map(e => {
        const clearDivision = e.divisionId === divisionId;
        const clearUnit = e.unitId && unitIdsInDiv.includes(e.unitId);
        if (!clearDivision && !clearUnit) return e;
        return {
          ...e,
          ...(clearDivision ? { divisionId: undefined } : {}),
          ...(clearUnit ? { unitId: undefined } : {}),
        };
      }),
    );
    setDivisions(prev => prev.filter(d => d.id !== divisionId));
  };

  // --- Rename a Division ---
const renameDivision = async (id: string, newName: string) => {
  // Trim + no-op guard
  const name = (newName ?? '').trim();
  if (!id || !name) return;

  if (useServerDb) {
    try {
      const row = await dbUpdateDivision(id, { name });
      // keep UI in sync with returned row
      setDivisions(prev => prev.map(d => (d.id === id ? { ...d, name: row.name } : d)));
      return row;
    } catch (err) {
      console.error('Rename division failed:', err);
      throw err;
    }
  } else {
    // local-only mode
    setDivisions(prev => prev.map(d => (d.id === id ? { ...d, name } : d)));
  }
};


  // ----- Unit CRUD -----
  const addUnit = async (unitData: Omit<Unit, 'id' | 'createdAt'>): Promise<Unit> => {
    if (useServerDb) {
      const row = await dbCreateUnit({
        division_id: unitData.divisionId,
        code: (unitData as any).code ?? unitData.name,
        name: unitData.name,
      });
      const newUnit: Unit = {
        id: row.id,
        name: row.name,
        ...(row.code ? { code: row.code } : {}),
        divisionId: row.division_id,
        createdAt: row.created_at,
        createdBy: (unitData as any).createdBy ?? '',
      };
      setUnits(prev => [...prev, newUnit]);
      return newUnit;
    }
    const newUnit: Unit = {
      ...unitData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setUnits(prev => [...prev, newUnit]);
    return newUnit;
  };

  const updateUnit = (id: string, updates: Partial<Unit>) => {
    setUnits(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
  };

  const deleteUnit = async (id: string) => {
    if (useServerDb) {
      try {
        await dbDeleteUnit(id);
      } catch (e) {
        console.error('Delete unit (Supabase) failed:', e);
        throw e;
      }
    }
    // UI cascade
    setUnits(prev => prev.filter(u => u.id !== id));
    setProjects(prev => prev.map(p => (p.unitId === id ? { ...p, unitId: '' } : p)));
    setBudgetEntries(prev => prev.map(e => (e.unitId === id ? { ...e, unitId: undefined } : e)));
  };
  // --- Rename a Unit ---
const renameUnit = async (id: string, newName: string) => {
  const name = (newName ?? '').trim();
  if (!id || !name) return;

  if (useServerDb) {
    try {
      const row = await dbUpdateUnit(id, { name });
      setUnits(prev => prev.map(u => (u.id === id ? { ...u, name: row.name } : u)));
      return row;
    } catch (err) {
      console.error('Rename unit failed:', err);
      throw err;
    }
  } else {
    setUnits(prev => prev.map(u => (u.id === id ? { ...u, name } : u)));
  }
};

  // ----- Notifications helpers -----
  const addNotification = async (notificationData: Omit<Notification, 'id' | 'createdAt'>) => {
    console.log('[CTX] Adding notification:', notificationData);
    let newNotification: Notification;
    if (useServerDb) {
      newNotification = await notificationService.create(notificationData);
    } else {
      newNotification = {
        ...notificationData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      } as Notification;
    }
    console.log('[CTX] Created notification:', newNotification);
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      console.log('[CTX] Updated notifications state:', updated.length, 'notifications');
      return updated.slice(0, 100);
    });
  };

  const markNotificationAsRead = (id: string) => {
    console.log('[CTX] Marking notification as read:', id);
    if (useServerDb) {
      notificationService.markAsRead(id).catch(console.error);
    }
    setNotifications(prev =>
      prev.map(notification => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  };

  const markAllNotificationsAsRead = () => {
    if (!user) return;
    console.log('[CTX] Marking all notifications as read for user:', user.id);
    if (useServerDb) {
      notificationService.markAllAsRead(user.id).catch(console.error);
    }
    setNotifications(prev =>
      prev.map(notification => (notification.userId === user.id ? { ...notification, read: true } : notification)),
    );
  };

  const deleteNotification = (id: string) => {
    console.log('[CTX] Deleting notification:', id);
    if (useServerDb) {
      notificationService.delete(id).catch(console.error);
    }
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const getUnreadNotificationCount = () => {
    if (!user) return 0;
    const count = notifications.filter(n => !n.read && n.userId === user.id).length;
    console.log('[CTX] Unread notification count for user', user.id, ':', count);
    return count;
  };

  const createTestNotification = (type: Notification['type']) => {
    console.log('[CTX] Creating test notification of type:', type);
    addNotification({
      userId: '1', // Test user
      type,
      title: `Test ${type} Notification`,
      message: `This is a test ${type} notification.`,
      data: { test: true },
      read: false,
    });
  };

  // ----- Budget code alert helper -----
  const notifyUsers = (
    userIds: string[],
    type: Notification['type'],
    title: string,
    message: string,
    data?: any,
  ) => {
    console.log('[CTX] notifyUsers called:', { userIds, type, title, message, data });
    userIds.forEach(userId => {
      addNotification({
        userId,
        type,
        title,
        message,
        data,
        read: false,
      });
    });
  };

  const notifyAllUsers = (
    type: Notification['type'],
    title: string,
    message: string,
    data?: any,
    excludeUserId?: string,
  ) => {
    console.log('[CTX] notifyAllUsers called:', { type, title, message, data, excludeUserId });
    users.forEach(u => {
      if (u.id !== excludeUserId) {
        addNotification({
          userId: u.id,
          type,
          title,
          message,
          data,
          read: false,
        });
      }
    });
  };

  const checkBudgetCodeAlert = (budgetCodeId: string) => {
    const budgetCode = budgetCodes.find(bc => bc.id === budgetCodeId);
    if (!budgetCode) return;
    const usagePercentage = (budgetCode.spent / budgetCode.budget) * 100;
    if (usagePercentage >= settings.budgetAlertThreshold) {
      notifyAllUsers(
        'budget_code_alert',
        'Budget Code Alert',
        `Budget code "${budgetCode.code} - ${budgetCode.name}" has used ${usagePercentage.toFixed(
          1,
        )}% of its allocated budget`,
        {
          budgetCodeId: budgetCode.id,
          percentage: usagePercentage,
          budget: budgetCode.budget,
          spent: budgetCode.spent,
        },
      );
    }
  };

  // ----- Projects -----
  const addProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    let newProject: Project;
    if (useServerDb) {
      newProject = await projectService.create(projectData);
    } else {
      newProject = {
        ...projectData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Project;
    }
    setProjects(prev => [...prev, newProject]);

    const creatorName = users.find(u => u.id === projectData.createdBy)?.name || 'Someone';
    notifyAllUsers(
      'project_created',
      'New Project Created',
      `${creatorName} created a new project: ${newProject.name}`,
      { projectId: newProject.id, createdBy: projectData.createdBy },
      projectData.createdBy,
    );

    if (projectData.assignedUsers.length > 0) {
      notifyUsers(
        projectData.assignedUsers,
        'user_assigned',
        'Project Assignment',
        `You have been assigned to the project: ${newProject.name}`,
        { projectId: newProject.id },
      );
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const oldProject = projects.find(p => p.id === id);
    if (!oldProject) return;

    let updatedProject: Project;
    if (useServerDb) {
      updatedProject = await projectService.update(id, updates);
    } else {
      updatedProject = { ...oldProject, ...updates, updatedAt: new Date().toISOString() } as Project;
    }
    setProjects(prev => prev.map(project => (project.id === id ? updatedProject : project)));

    const updaterName = profile?.name || 'Someone';
    notifyAllUsers(
      'project_updated',
      'Project Updated',
      `${updaterName} updated the project: ${updatedProject.name}`,
      {
        projectId: id,
        updatedBy: user?.id,
        changes: Object.keys(updates),
      },
      user?.id,
    );

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
          spent: updatedProject.spent,
        },
      );
    }

    if (updates.status === 'completed' && oldProject.status !== 'completed') {
      notifyAllUsers('project_completed', 'Project Completed', `Project "${updatedProject.name}" has been marked as completed`, {
        projectId: id,
      });
    }

    if (updates.assignedUsers) {
      const newlyAssigned = updates.assignedUsers.filter(userId => !oldProject.assignedUsers.includes(userId));
      if (newlyAssigned.length > 0) {
        notifyUsers(
          newlyAssigned,
          'user_assigned',
          'Project Assignment',
          `You have been assigned to the project: ${updatedProject.name}`,
          { projectId: id },
        );
      }
    }
  };

  const deleteProject = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const isSuperAdmin = profile?.role === 'super_admin';
    const isAdmin = profile?.role === 'admin';
    const canDelete = !!user && (isSuperAdmin || (isAdmin && project.createdBy === user.id));
    if (!canDelete) return;

    if (useServerDb) {
      await projectService.delete(id);
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    setBudgetEntries(prev => prev.filter(entry => entry.projectId !== id));

    const deleterName = profile?.name || 'Someone';
    notifyAllUsers(
      'project_updated',
      'Project Deleted',
      `${deleterName} deleted the project: ${project.name}`,
      { projectId: id, deletedBy: user?.id },
      user?.id,
    );
  };

  // ----- Budget entries -----
  const addBudgetEntry = async (entryData: Omit<BudgetEntry, 'id' | 'createdAt'>) => {
    let newEntry: BudgetEntry;
    if (useServerDb) {
      newEntry = await budgetEntryService.create(entryData);
    } else {
      newEntry = {
        ...entryData,
        unitId: entryData.unitId ?? projects.find(p => p.id === entryData.projectId)?.unitId,
        divisionId:
          entryData.divisionId ??
          units.find(u => u.id === (projects.find(p => p.id === entryData.projectId)?.unitId || ''))?.divisionId,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      } as BudgetEntry;
    }
    setBudgetEntries(prev => [...prev, newEntry]);

    const project = projects.find(p => p.id === entryData.projectId);
    if (project && entryData.type === 'expense') {
      updateProject(project.id, { spent: project.spent + entryData.amount });
    }

    if (entryData.budgetCodeId && entryData.type === 'expense') {
      setBudgetCodes(prev =>
        prev.map(code =>
          code.id === entryData.budgetCodeId
            ? { ...code, spent: code.spent + entryData.amount, updatedAt: new Date().toISOString() }
            : code,
        ),
      );
      setTimeout(() => checkBudgetCodeAlert(entryData.budgetCodeId!), 100);
    }

    if (project) {
      const creatorName = users.find(u => u.id === entryData.createdBy)?.name || 'Someone';
      const notificationMessage = `${creatorName} added a new ${entryData.type} of ${settings.currency} ${entryData.amount.toLocaleString()} to ${project.name}`;
      const usersToNotify = [...new Set([...project.assignedUsers, project.createdBy])];
      notifyUsers(
        usersToNotify.filter(uid => uid !== entryData.createdBy),
        'budget_entry_added',
        'New Budget Entry',
        notificationMessage,
        {
          projectId: entryData.projectId,
          entryId: newEntry.id,
          amount: entryData.amount,
          type: entryData.type,
          budgetCodeId: entryData.budgetCodeId,
        },
      );
    }
  };

  const updateBudgetEntry = async (id: string, updates: Partial<BudgetEntry>) => {
    const oldEntry = budgetEntries.find(e => e.id === id);
    if (!oldEntry) return;

    let updated: BudgetEntry;
    if (useServerDb) {
      updated = await budgetEntryService.update(id, updates);
    } else {
      updated = { ...oldEntry, ...updates } as BudgetEntry;
    }
    setBudgetEntries(prev => prev.map(entry => (entry.id === id ? updated : entry)));

    if (updates.amount !== undefined || updates.budgetCodeId !== undefined) {
      if (oldEntry.budgetCodeId && oldEntry.type === 'expense') {
        setBudgetCodes(prev =>
          prev.map(code =>
            code.id === oldEntry.budgetCodeId
              ? { ...code, spent: Math.max(0, code.spent - oldEntry.amount), updatedAt: new Date().toISOString() }
              : code,
          ),
        );
      }
      const newBudgetCodeId = updates.budgetCodeId !== undefined ? updates.budgetCodeId : oldEntry.budgetCodeId;
      if (newBudgetCodeId && oldEntry.type === 'expense') {
        setBudgetCodes(prev =>
          prev.map(code =>
            code.id === newBudgetCodeId
              ? {
                  ...code,
                  spent: code.spent + (updates.amount || oldEntry.amount),
                  updatedAt: new Date().toISOString(),
                }
              : code,
          ),
        );
        setTimeout(() => checkBudgetCodeAlert(newBudgetCodeId), 100);
      }
    }
  };

  const deleteBudgetEntry = async (id: string) => {
    const entry = budgetEntries.find(e => e.id === id);
    if (!entry) return;

    if (useServerDb) {
      await budgetEntryService.delete(id);
    }

    if (entry.type === 'expense') {
      const project = projects.find(p => p.id === entry.projectId);
      if (project) {
        updateProject(project.id, { spent: project.spent - entry.amount });
      }
      if (entry.budgetCodeId) {
        setBudgetCodes(prev =>
          prev.map(code =>
            code.id === entry.budgetCodeId
              ? { ...code, spent: Math.max(0, code.spent - entry.amount), updatedAt: new Date().toISOString() }
              : code,
          ),
        );
      }
    }
    setBudgetEntries(prev => prev.filter(e => e.id !== id));
  };

  // ----- Users -----
  const addUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    let newUser: User;
    if (useServerDb) {
      // Use Edge Function for user invitation with proper role validation
      try {
        console.log('[AppContext] Inviting user via Edge Function:', userData);
        
        // Get current session for authorization
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No active session found');
        }

        // Call Edge Function with user data and session token
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userData.email,
            name: userData.name,
            role: userData.role,
            divisionId: (userData as any).divisionId ?? null,
            unitId: (userData as any).unitId ?? null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.ok) {
          throw new Error(result.error || 'Invite failed');
        }

        // Create User object from Edge Function response
        newUser = {
          id: result.userId,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          initials: userData.initials,
          divisionId: (userData as any).divisionId,
          unitId: (userData as any).unitId,
          createdAt: new Date().toISOString()
        } as User;
        
        console.log('[AppContext] User invited successfully via Edge Function:', result.message);
        
      } catch (error) {
        console.error('[AppContext] Failed to invite user via Edge Function:', error);
        throw error;
      }
    } else {
      newUser = { ...userData, id: Date.now().toString(), createdAt: new Date().toISOString() } as User;
    }
    setUsers(prev => [...prev, newUser]);

    const adminUsers = users.filter(u => u.role === 'admin' || u.role === 'super_admin');
    const creatorName = profile?.name || 'Someone';
    notifyUsers(
      adminUsers.map(u => u.id).filter(id => id !== user?.id),
      'user_assigned',
      'New User Invited',
      `${creatorName} invited a new user: ${newUser.name} (${newUser.role.replace('_', ' ')})`,
      { userId: newUser.id },
    );
  };

    // inside AppProvider
const updateUser = async (id: string, updates: Partial<User>) => {
  const editingSelf = user?.id === id;                        // `user` from useAuth()
  const isSA = (profile?.role ?? 'user') === 'super_admin';   // `profile` from useAuth()

  // Build a safe payload
  const safe: Partial<User> = { ...updates };

  // Never allow these through from UI
  delete (safe as any).id;
  delete (safe as any).created_at;
  delete (safe as any).createdAt;
  delete (safe as any).email; // email changes must go through Auth

  // Only Super Admin can change division/unit (including their own)
  if (!isSA) {
    delete (safe as any).division_id;
    delete (safe as any).unit_id;
    delete (safe as any).divisionId;
    delete (safe as any).unitId;
  }

  // Only Super Admin can change role — but never their own role
  if (!isSA || editingSelf) {
    delete (safe as any).role;
  }

  try {
    if (useServerDb) {
      const saved = await userService.update(id, safe);
      setUsers(prev => prev.map(u => (u.id === id ? saved : u)));
      return saved;
    } else {
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...safe } : u)));
      const current = users.find(u => u.id === id) as User | undefined;
      return current ? { ...current, ...safe } : (safe as User);
    }
  } catch (err) {
    console.error('[AppContext.updateUser] Failed to update user:', err);
    throw err;
  }
};

  const deleteUser = async (id: string) => {
    if (useServerDb) {
      await userService.delete(id);
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    setProjects(prev =>
      prev.map(project => ({
        ...project,
        assignedUsers: project.assignedUsers.filter(userId => userId !== id),
      })),
    );
    setNotifications(prev => prev.filter(n => n.userId !== id));
  };

  // ----- Budget codes -----
  const addBudgetCode = async (codeData: Omit<BudgetCode, 'id' | 'createdAt' | 'updatedAt'>) => {
    let newCode: BudgetCode;
    if (useServerDb) {
      newCode = await budgetCodeService.create(codeData);
    } else {
      newCode = {
        ...codeData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as BudgetCode;
    }
    setBudgetCodes(prev => [...prev, newCode]);
  };

  const updateBudgetCode = async (id: string, updates: Partial<BudgetCode>) => {
    let next: BudgetCode | undefined;
    if (useServerDb) {
      next = await budgetCodeService.update(id, updates);
    } else {
      next = undefined;
    }
    setBudgetCodes(prev =>
      prev.map(code =>
        code.id === id ? (next || { ...code, ...updates, updatedAt: new Date().toISOString() }) : code,
      ),
    );
    if (updates.budget !== undefined) {
      setTimeout(() => checkBudgetCodeAlert(id), 100);
    }
  };

  const deleteBudgetCode = async (id: string) => {
    if (useServerDb) {
      await budgetCodeService.delete(id);
    }
    setBudgetCodes(prev => prev.filter(code => code.id !== id));
    setProjects(prev => prev.map(project => ({ ...project, budgetCodes: project.budgetCodes.filter(cid => cid !== id) })));
    setBudgetEntries(prev => prev.map(entry => ({ ...entry, budgetCodeId: entry.budgetCodeId === id ? undefined : entry.budgetCodeId })));
  };

  const toggleBudgetCodeStatus = async (id: string) => {
    const current = budgetCodes.find(c => c.id === id);
    if (!current) return;
    const nextActive = !current.isActive;
    setBudgetCodes(prev =>
      prev.map(code => (code.id === id ? { ...code, isActive: nextActive, updatedAt: new Date().toISOString() } : code)),
    );
    if (useServerDb) {
      try {
        await budgetCodeService.update(id, { isActive: nextActive });
      } catch (e) {
        // rollback
        setBudgetCodes(prev =>
          prev.map(code => (code.id === id ? { ...code, isActive: !nextActive } : code)),
        );
        console.error('Failed to toggle budget code status on server', e);
      }
    }
  };

  // ----- Settings -----
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      console.log('[AppContext] updateSettings called with:', newSettings);
      console.log('[AppContext] useServerDb:', useServerDb);

      // Merge in memory first
      const next = { ...settings, ...newSettings };

      // Determine role WITHOUT calling any hook here
      const userRole = profile?.role ?? 'user';
      const isSuperAdmin = userRole === 'super_admin';

      console.debug('[AppContext] settings updated in state; categories:', (newSettings as any)?.budgetCategories);

      // For non-super-admins, block restricted keys (companyName, currency)
      const restrictedKeys: (keyof AppSettings)[] = ['companyName', 'currency'];
      const filtered = isSuperAdmin
        ? next
        : { ...settings, ...Object.fromEntries(
            Object.entries(newSettings).filter(([k]) => !restrictedKeys.includes(k as keyof AppSettings))
          )};

      if (useServerDb) {
        // Server mode: persist to Supabase
        const allowedKeys = Object.keys(filtered);
        console.log('[AppContext] (server) upserting settings with keys:', allowedKeys);

        try {
          const saved = await upsertSettings(filtered); // from src/lib/settingsService.ts
          // Merge once more to be safe in case server returns a partial
          const merged = { ...defaultSettings, ...saved };
          setSettings(merged);
          console.log('[AppContext] (server) settings upserted OK');
        } catch (err) {
          console.error('[AppContext] (server) settings upsert failed, keeping state only:', err);
          setSettings(filtered);
        }
      } else {
        // Local mode: just set state; autosave effect will persist to localStorage
        setSettings(filtered);
      }
    } catch (err) {
      console.error('[AppContext] updateSettings fatal error:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
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
        renameDivision,

        addUnit,
        updateUnit,
        deleteUnit,
        renameUnit,

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
        getUnreadNotificationCount,
        createTestNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};