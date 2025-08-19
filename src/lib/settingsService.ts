import { supabase, isSupabaseConfigured } from './supabase';
import { AppSettings } from '../types';

// Settings service for Supabase persistence
export class SettingsService {
  private static readonly TABLE_NAME = 'app_settings';
  private static readonly SINGLETON_ID = 'singleton';

  /**
   * Fetch settings from Supabase
   * @returns Promise<AppSettings | null> - settings if found, null if not found or error
   */
  static async getSettings(): Promise<AppSettings | null> {
    try {
      if (!isSupabaseConfigured) {
        console.log('[SettingsService] Supabase not configured, returning null');
        return null;
      }

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('data')
        .eq('id', this.SINGLETON_ID)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - table exists but no settings
          console.log('[SettingsService] No settings found in database');
          return null;
        }
        
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          // Table doesn't exist
          console.warn('[SettingsService] app_settings table missing; using localStorage fallback');
          return null;
        }
        
        console.error('[SettingsService] Database error during get:', error);
        return null;
      }

      if (data?.data) {
        console.log('[SettingsService] Successfully fetched settings from Supabase');
        return data.data as AppSettings;
      }

      return null;
    } catch (error) {
      console.error('[SettingsService] Unexpected error during get:', error);
      return null;
    }
  }

  /**
   * Upsert settings to Supabase
   * @param data - AppSettings to save
   * @param actorUserId - ID of user making the change
   * @throws Error if upsert fails
   */
  static async upsert(data: AppSettings, actorUserId?: string): Promise<void> {
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase
        .from(this.TABLE_NAME)
        .upsert({
          id: this.SINGLETON_ID,
          data: data,
          updated_by: actorUserId || 'system',
          updated_at: new Date().toISOString()
        });

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          throw new Error('app_settings table does not exist');
        }
        throw error;
      }

      console.log('[SettingsService] Successfully upserted settings to Supabase');
    } catch (error) {
      console.error('[SettingsService] Upsert failed:', error);
      throw error;
    }
  }

  /**
   * Check if the app_settings table exists
   * @returns Promise<boolean>
   */
  static async tableExists(): Promise<boolean> {
    try {
      if (!isSupabaseConfigured) {
        return false;
      }

      const { error } = await supabase
        .from(this.TABLE_NAME)
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}

// Plain module functions for direct import
export async function getSettings(): Promise<AppSettings | null> {
  return SettingsService.getSettings();
}

export async function upsertSettings(data: any, actorUserId?: string): Promise<void> {
  const payload = { id: 'singleton', data, updated_by: actorUserId ?? null };
  const { error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('[SettingsService] upsertSettings failed:', error);
    throw error;
  }
}
