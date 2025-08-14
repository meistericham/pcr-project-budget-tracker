import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function UsersAdmin() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    // Check if current user is super admin
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAuthorized(false);
          return;
        }

        // Query the profiles table to get user role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[ADMIN] Failed to fetch user profile:', error);
          setIsAuthorized(false);
          return;
        }

        setIsAuthorized(profile?.role === 'super_admin');
      } catch (error) {
        console.error('[ADMIN] Error checking authorization:', error);
        setIsAuthorized(false);
      }
    };

    checkUserRole();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    // Form validation
    if (!email.trim()) {
      setMessage('Email is required');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters');
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('[ADMIN] reset', { email: email.trim().toLowerCase() });

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { 
          email: email.trim().toLowerCase(), 
          newPassword: newPassword 
        }
      });

      if (error) {
        setMessage(error.message || 'Failed to reset password');
        setMessageType('error');
      } else {
        setMessage('Password reset successful.');
        setMessageType('success');
        // Clear form on success
        setEmail('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('[ADMIN] Reset password error:', error);
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isAuthorized === null) {
    return (
      <div style={{ 
        maxWidth: 500, 
        margin: '48px auto', 
        padding: '24px',
        fontFamily: 'system-ui',
        textAlign: 'center'
      }}>
        <p>Checking authorization...</p>
      </div>
    );
  }

  // Not authorized
  if (!isAuthorized) {
    return (
      <div style={{ 
        maxWidth: 500, 
        margin: '48px auto', 
        padding: '24px',
        fontFamily: 'system-ui',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Not Authorized</h2>
        <p>You must be a Super Admin to access this page.</p>
      </div>
    );
  }

  // Authorized - show admin form
  return (
    <div style={{ 
      maxWidth: 500, 
      margin: '48px auto', 
      padding: '24px',
      fontFamily: 'system-ui'
    }}>
      <h2 style={{ marginBottom: '24px', color: '#1f2937' }}>Admin: Reset User Password</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
            New Password * (min 8 characters)
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="Enter new password"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
            Confirm Password *
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="Confirm new password"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '12px 24px',
            backgroundColor: isSubmitting ? '#9ca3af' : '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            marginTop: '8px'
          }}
        >
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      {/* Message display */}
      {message && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: messageType === 'success' ? '#dcfce7' : '#fef2f2',
          border: `1px solid ${messageType === 'success' ? '#16a34a' : '#dc2626'}`,
          color: messageType === 'success' ? '#166534' : '#dc2626',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
