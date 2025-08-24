import { supabase } from './supabase';
import JSZip from 'jszip';

export const exportTablesAsCsv = async (tables: string[]): Promise<Record<string, string>> => {
  const results: Record<string, string> = {};
  
  for (const table of tables) {
    try {
      console.log(`[Backup] Exporting ${table} as CSV...`);
      const { data, error } = await supabase.from(table).select().csv();
      if (error) throw error;
      
      results[`${table}.csv`] = data;
      console.log(`[Backup] Successfully exported ${table}: ${data.length} characters`);
    } catch (error) {
      console.error(`[Backup] Failed to export ${table}:`, error);
      throw new Error(`Failed to export ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return results;
};

export const zipCsvMap = async (files: Record<string, string>): Promise<Blob> => {
  console.log('[Backup] Creating ZIP archive...');
  const zip = new JSZip();
  
  Object.entries(files).forEach(([filename, content]) => {
    zip.file(filename, content);
    console.log(`[Backup] Added ${filename} to ZIP`);
  });
  
  const blob = await zip.generateAsync({ type: 'blob' });
  console.log(`[Backup] ZIP created: ${blob.size} bytes`);
  return blob;
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  console.log(`[Backup] Downloaded: ${filename}`);
};

export const generateBackupFilename = (): string => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '-');
  return `backup-${timestamp}.zip`;
};

export const getAvailableTables = (): string[] => [
  'users',
  'divisions', 
  'units',
  'projects',
  'budget_entries',
  'budget_codes',
  'notifications',
  'app_settings'
];
