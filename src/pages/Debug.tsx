import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Debug: React.FC = () => {
  const { user, profile, role } = useAuth();

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui', padding: 16 }}>
      <h1>Debug</h1>
      <p><strong>UID:</strong> {user?.id ?? '(none)'}</p>
      <p><strong>Email:</strong> {user?.email ?? '(none)'}</p>
      <p><strong>Role:</strong> {role ?? '(null)'} </p>
      <pre style={{ background: '#f7f7f7', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
        {JSON.stringify(profile, null, 2)}
      </pre>
    </div>
  );
};

export default Debug;


