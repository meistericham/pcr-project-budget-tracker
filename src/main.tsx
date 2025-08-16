// src/main.tsx

// TEMP DIAGNOSTIC — remove later
const mask = (s?: string) =>
  s ? `${s.slice(0, 6)}…${s.slice(-4)} (len ${s.length})` : s;
console.log('ENV_CHECK', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: mask(import.meta.env.VITE_SUPABASE_ANON_KEY),
  VITE_USE_SERVER_DB: import.meta.env.VITE_USE_SERVER_DB,
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);