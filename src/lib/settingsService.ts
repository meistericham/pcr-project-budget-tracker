import { supabase } from './supabase';

export async function getSettings(): Promise<any> {
  const { data, error, status } = await supabase
    .from('app_settings')
    .select('data')
    .eq('id', 'singleton')
    .single();

  if (error && status !== 406) {
    // Unexpected error: perhaps connection or runtime issue
    throw error;
  }

  if (status === 406 || !data) {
    // “406 Not Found” for single row = no record exists
    console.log('[settings] No server settings found — initializing defaults');
    // Don't create it here; let the upsertSettings (called elsewhere) take care of insert
    return {};
  }

  return data.data ?? {};
}

export async function upsertSettings(payload: any): Promise<any> {
  // payload is the JSON we want to store in the "data" column
  const { data, error } = await supabase
    .from('app_settings')
    .upsert([{ id: 'singleton', data: payload }], { onConflict: 'id' })
    .select('data')
    .single();
  if (error) throw error;
  return data?.data ?? {};
}
