// NOTE FOR DEPLOY:
// - In Supabase → Auth → URL Configuration: set Site URL = https://pcrtracker.meistericham.com and allow-list https://pcrtracker.meistericham.com/update-password.
// - In Coolify: mark VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as "Build Variable", then Redeploy (not Restart).

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

console.log('[ENV] VITE_SUPABASE_URL =', url)
console.log('[ENV] VITE_SUPABASE_ANON_KEY =', anon ? '[present]' : undefined)

// Create client with fallback values to prevent app crash during development
const supabaseUrl = url || 'https://demo.supabase.co'
const supabaseKey = anon || 'demo-key'

// Export client and environment validation status
export const supabase = createClient(supabaseUrl, supabaseKey)
export const isSupabaseConfigured = !!(url && anon && url !== 'https://demo.supabase.co' && anon !== 'demo-key')

// Log configuration status
if (!isSupabaseConfigured) {
  console.warn('[SUPABASE] Using demo configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.development for real functionality.')
}