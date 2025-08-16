import { supabase, isSupabaseConfigured, testSupabaseConnection } from './supabase';
import { User, Project, BudgetEntry, BudgetCode, Notification } from '../types';

// Centralized feature flag for server vs local mode
export const useServerDb = import.meta.env.VITE_USE_SERVER_DB === 'true';

// Helper function to handle database errors gracefully
const handleDatabaseError = (error: any, operation: string) => {
  console.error(`Database operation failed (${operation}):`, error);
  
  // Check if it's a connection error
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    throw new Error(`Network error during ${operation}. Please check your internet connection.`);
  }
  
  // Check if it's an authentication error
  if (error.message?.includes('JWT') || error.message?.includes('unauthorized')) {
    throw new Error(`Authentication error during ${operation}. Please check your Supabase credentials.`);
  }
  
  // Check if it's a table/schema error
  if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
    throw new Error(`Database schema error during ${operation}. Please run the database migration.`);
  }
  
  throw error;
};

// Transform functions to convert database rows to app types
const transformUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name,
  email: dbUser.email,
  role: dbUser.role,
  initials: dbUser.initials,
  createdAt: dbUser.created_at
});

const transformProject = (dbProject: any): Project => ({
  id: dbProject.id,
  name: dbProject.name,
  description: dbProject.description,
  status: dbProject.status,
  priority: dbProject.priority,
  startDate: dbProject.start_date,
  endDate: dbProject.end_date,
  budget: dbProject.budget,
  spent: dbProject.spent,
  unitId: dbProject.unit_id || '',
  assignedUsers: dbProject.assigned_users || [],
  budgetCodes: dbProject.budget_codes || [],
  createdBy: dbProject.created_by,
  createdAt: dbProject.created_at,
  updatedAt: dbProject.updated_at
});

const transformBudgetCode = (dbCode: any): BudgetCode => ({
  id: dbCode.id,
  code: dbCode.code,
  name: dbCode.name,
  description: dbCode.description,
  budget: dbCode.budget,
  spent: dbCode.spent,
  isActive: dbCode.is_active,
  createdBy: dbCode.created_by,
  createdAt: dbCode.created_at,
  updatedAt: dbCode.updated_at
});

const transformBudgetEntry = (dbEntry: any): BudgetEntry => ({
  id: dbEntry.id,
  projectId: dbEntry.project_id,
  budgetCodeId: dbEntry.budget_code_id,
  description: dbEntry.description,
  amount: dbEntry.amount,
  type: dbEntry.type,
  category: dbEntry.category,
  date: dbEntry.date,
  createdBy: dbEntry.created_by,
  createdAt: dbEntry.created_at,
  unitId: dbEntry.unit_id,
  divisionId: dbEntry.division_id
});

const transformNotification = (dbNotification: any): Notification => ({
  id: dbNotification.id,
  userId: dbNotification.user_id,
  type: dbNotification.type,
  title: dbNotification.title,
  message: dbNotification.message,
  data: dbNotification.data,
  read: dbNotification.read,
  createdAt: dbNotification.created_at,
  actionUrl: dbNotification.action_url
});

// User operations
export const userService = {
  async getAll(): Promise<User[]> {
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase not configured');
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleDatabaseError(error, 'fetch users');
      }
      
      return data?.map(transformUser) || [];
    } catch (error) {
      handleDatabaseError(error, 'fetch users');
      return [];
    }
  },

  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: user.name,
        email: user.email,
        role: user.role,
        initials: user.initials
      })
      .select()
      .single();
    
    if (error) throw error;
    return transformUser(data);
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        email: updates.email,
        role: updates.role,
        initials: updates.initials
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return transformUser(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Budget Code operations
export const budgetCodeService = {
  async getAll(): Promise<BudgetCode[]> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] budget_codes.list → supabase');
      const { data, error } = await supabase
        .from('budget_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(transformBudgetCode);
    }
    
    if (import.meta.env.DEV) console.log('[SRV] budget_codes.list → local');
    const { data, error } = await supabase
      .from('budget_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(transformBudgetCode);
  },

  async create(code: Omit<BudgetCode, 'id' | 'createdAt' | 'updatedAt'>): Promise<BudgetCode> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] budget_codes.create → supabase', code);
      const { data, error } = await supabase
        .from('budget_codes')
        .insert({
          code: code.code,
          name: code.name,
          description: code.description,
          budget: code.budget,
          spent: code.spent,
          is_active: code.isActive,
          created_by: code.createdBy
        })
        .select()
        .single();
      
      if (error) throw error;
      return transformBudgetCode(data);
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] budget_codes.create → local', code);
    const { data, error } = await supabase
      .from('budget_codes')
      .insert({
        code: code.code,
        name: code.name,
        description: code.description,
        budget: code.budget,
        spent: code.spent,
        is_active: code.isActive,
        created_by: code.createdBy
      })
      .select()
      .single();
    
    if (error) throw error;
    return transformBudgetCode(data);
  },

  async update(id: string, updates: Partial<BudgetCode>): Promise<BudgetCode> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] budget_codes.update → supabase', id, updates);
      const { data, error } = await supabase
        .from('budget_codes')
        .update({
          code: updates.code,
          name: updates.name,
          description: updates.description,
          budget: updates.budget,
          spent: updates.spent,
          is_active: updates.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformBudgetCode(data);
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] budget_codes.update → local', id, updates);
    const { data, error } = await supabase
      .from('budget_codes')
      .update({
        code: updates.code,
        name: updates.name,
        description: updates.description,
        budget: updates.budget,
        spent: updates.spent,
        is_active: updates.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return transformBudgetCode(data);
  },

  async delete(id: string): Promise<void> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] budget_codes.remove → supabase', id);
      const { error } = await supabase.from('budget_codes').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] budget_codes.remove → local', id);
    const { error } = await supabase.from('budget_codes').delete().eq('id', id);
    if (error) throw error;
  }
};

// Project operations
export const projectService = {
  async getAll(): Promise<Project[]> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] projects.list → supabase');
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleDatabaseError(error, 'fetch projects');
      }
      
      return data?.map(transformProject) || [];
    }
    
    // fallback (non-server mode): existing localStorage implementation
    if (import.meta.env.DEV) console.log('[SRV] projects.list → local');
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase not configured');
      }
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleDatabaseError(error, 'fetch projects');
      }
      
      return data?.map(transformProject) || [];
    } catch (error) {
      handleDatabaseError(error, 'fetch projects');
      return [];
    }
  },

  async create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] projects.create → supabase', project);
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          start_date: project.startDate,
          end_date: project.endDate,
          budget: project.budget,
          spent: project.spent,
          assigned_users: project.assignedUsers,
          budget_codes: project.budgetCodes,
          created_by: project.createdBy
        })
        .select()
        .single();
      
      if (error) throw error;
      return transformProject(data);
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] projects.create → local', project);
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        start_date: project.startDate,
        end_date: project.endDate,
        budget: project.budget,
        spent: project.spent,
        assigned_users: project.assignedUsers,
        budget_codes: project.budgetCodes,
        created_by: project.createdBy
      })
      .select()
      .single();
    
    if (error) throw error;
    return transformProject(data);
  },

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] projects.update → supabase', id, updates);
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: updates.name,
          description: updates.description,
          status: updates.status,
          priority: updates.priority,
          end_date: updates.endDate,
          budget: updates.budget,
          spent: updates.spent,
          assigned_users: updates.assignedUsers,
          budget_codes: updates.budgetCodes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformProject(data);
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] projects.update → local', id, updates);
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: updates.name,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
        end_date: updates.endDate,
        budget: updates.budget,
        spent: updates.spent,
        assigned_users: updates.assignedUsers,
        budget_codes: updates.budgetCodes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return transformProject(data);
  },

  async delete(id: string): Promise<void> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] projects.remove → supabase', id);
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] projects.remove → local', id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  }
};

// Budget Entry operations
export const budgetEntryService = {
  async getAll(): Promise<BudgetEntry[]> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] budget_entries.list → supabase');
      const { data, error } = await supabase
        .from('budget_entries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(transformBudgetEntry);
    }
    
    if (import.meta.env.DEV) console.log('[SRV] budget_entries.list → local');
    const { data, error } = await supabase
      .from('budget_entries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(transformBudgetEntry);
  },

  async create(entry: Omit<BudgetEntry, 'id' | 'createdAt'>): Promise<BudgetEntry> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] budget_entries.create → supabase', entry);
      const { data, error } = await supabase
        .from('budget_entries')
        .insert({
          project_id: entry.projectId,
          budget_code_id: entry.budgetCodeId,
          description: entry.description,
          amount: entry.amount,
          type: entry.type,
          category: entry.category,
          date: entry.date,
          created_by: entry.createdBy
        })
        .select()
        .single();
      
      if (error) throw error;
      return transformBudgetEntry(data);
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] budget_entries.create → local', entry);
    const { data, error } = await supabase
      .from('budget_entries')
      .insert({
        project_id: entry.projectId,
        budget_code_id: entry.budgetCodeId,
        description: entry.description,
        amount: entry.amount,
        type: entry.type,
        category: entry.category,
        date: entry.date,
        created_by: entry.createdBy
      })
      .select()
      .single();
    
    if (error) throw error;
    return transformBudgetEntry(data);
  },

  async update(id: string, updates: Partial<BudgetEntry>): Promise<BudgetEntry> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] budget_entries.update → supabase', id, updates);
      const { data, error } = await supabase
        .from('budget_entries')
        .update({
          project_id: updates.projectId,
          budget_code_id: updates.budgetCodeId,
          description: updates.description,
          amount: updates.amount,
          type: updates.type,
          category: updates.category,
          date: updates.date
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformBudgetEntry(data);
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] budget_entries.update → local', id, updates);
    const { data, error } = await supabase
      .from('budget_entries')
      .update({
        project_id: updates.projectId,
        budget_code_id: updates.budgetCodeId,
        description: updates.description,
        amount: updates.amount,
        type: updates.type,
        category: updates.category,
        date: updates.date
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return transformBudgetEntry(data);
  },

  async delete(id: string): Promise<void> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] budget_entries.remove → supabase', id);
      const { error } = await supabase.from('budget_entries').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] budget_entries.remove → local', id);
    const { error } = await supabase.from('budget_entries').delete().eq('id', id);
    if (error) throw error;
  }
};

// Notification operations
export const notificationService = {
  async getAll(): Promise<Notification[]> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] notifications.list → supabase');
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(transformNotification);
    }
    
    if (import.meta.env.DEV) console.log('[SRV] notifications.list → local');
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(transformNotification);
  },

  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] notifications.create → supabase', notification);
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read: notification.read,
          action_url: notification.actionUrl
        })
        .select()
        .single();
      
      if (error) throw error;
      return transformNotification(data);
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] notifications.create → local', notification);
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        action_url: notification.actionUrl
      })
      .select()
      .single();
    
    if (error) throw error;
    return transformNotification(data);
  },

  async markAsRead(id: string): Promise<void> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] notifications.markAsRead → supabase', id);
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      
      if (error) throw error;
      return;
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] notifications.markAsRead → local', id);
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    if (error) throw error;
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] notifications.markAllAsRead → supabase', userId);
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);
      
      if (error) throw error;
      return;
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] notifications.markAllAsRead → local', userId);
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
    
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    if (useServerDb) {
      if (import.meta.env.DEV) console.log('[SRV] notifications.remove → supabase', id);
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    
    // fallback local
    if (import.meta.env.DEV) console.log('[SRV] notifications.remove → local', id);
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
  }
};
// --- Divisions & Units (server mode) ---
export async function dbCreateDivision(input: { code: string; name: string }) {
  if (!useServerDb) throw new Error('Not in server DB mode');
  const { data, error } = await supabase
    .from('divisions')
    .insert({ code: input.code, name: input.name })
    .select('*')
    .single();
  if (error) {
    console.error('dbCreateDivision error:', error);
    throw error;
  }
  return data;
}

export async function dbListDivisions() {
  if (!useServerDb) throw new Error('Not in server DB mode');
  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('dbListDivisions error:', error);
    throw error;
  }
  return data;
}

export async function dbCreateUnit(input: { division_id: string; code: string; name: string }) {
  if (!useServerDb) throw new Error('Not in server DB mode');
  const { data, error } = await supabase
    .from('units')
    .insert({
      division_id: input.division_id,
      code: input.code,
      name: input.name,
    })
    .select('*')
    .single();
  if (error) {
    console.error('dbCreateUnit error:', error);
    throw error;
  }
  return data;
}

export async function dbListUnits() {
  if (!useServerDb) throw new Error('Not in server DB mode');
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('dbListUnits error:', error);
    throw error;
  }
  return data;
}
