import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!);

export async function getSettings(): Promise<any> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('data')
    .eq('id', 'singleton')
    .single();
  if (error) throw error;
  return data?.data ?? {};
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
