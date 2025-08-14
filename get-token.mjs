import { createClient } from '@supabase/supabase-js'

const url = 'https://ddqisrmoleupgqigmbhr.supabase.co'
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcWlzcm1vbGV1cGdxaWdtYmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyOTA4NzIsImV4cCI6MjA2Njg2Njg3Mn0.A9FLr3yppLp5MJJuRdS1X4LNOqCrNX9ARh6HhJ3AJzM'

const email = 'hisyamudin@sarawaktourism.com'
const password = '11223344'

const supabase = createClient(url, anon)

const { data, error } = await supabase.auth.signInWithPassword({ email, password })
if (error) {
  console.error('Login failed:', error.message)
  process.exit(1)
}
console.log(data.session?.access_token || '')
