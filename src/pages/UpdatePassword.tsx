import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function UpdatePassword() {
  const [status, setStatus] = useState<'checking'|'ready'|'saving'|'done'|'error'>('checking')
  const [msg, setMsg] = useState('')
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the email reset link → send to update-password
        window.location.assign('/update-password');
      } else if (event === 'SIGNED_IN') {
        // Normal login
        setStatus('ready');
      }
    });
  
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus('ready');
      } else {
        setStatus('checking');
      }
    });
  
    return () => {
      sub.data.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pw1.length < 8) { setMsg('Password must be at least 8 characters.'); return }
    if (pw1 !== pw2) { setMsg('Passwords do not match.'); return }
    setStatus('saving')
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    if (error) { setStatus('error'); setMsg(error.message) }
    else { setStatus('done'); setMsg('Password updated. You can sign in now.') }
  }

  return (
    <div style={{maxWidth: 420, margin: '48px auto', fontFamily: 'system-ui'}}>
      <h2>Update your password</h2>
      {status === 'checking' && <p>Preparing reset session…</p>}
      {(status === 'ready' || status === 'saving') && (
        <form onSubmit={onSubmit}>
          <label>New password</label>
          <input type="password" value={pw1} onChange={e=>setPw1(e.target.value)} required style={{width:'100%',marginBottom:8}} />
          <label>Confirm password</label>
          <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} required style={{width:'100%',marginBottom:12}} />
          <button type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Updating…' : 'Update password'}
          </button>
          {msg && <p style={{marginTop:8}}>{msg}</p>}
        </form>
      )}
      {status === 'done' && (<p>{msg} <a href="/login">Go to login</a></p>)}
      {status === 'error' && <p style={{color:'crimson'}}>{msg}</p>}
    </div>
  )
}