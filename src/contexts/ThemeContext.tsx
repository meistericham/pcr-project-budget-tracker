import React, { createContext, useContext, useEffect, useState } from 'react';
import { useApp } from './AppContext';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useApp();
  const [theme, setTheme] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from settings or localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('pcr_theme') as Theme;
    const settingsTheme = settings?.theme;
    
    if (settingsTheme && settingsTheme !== 'system') {
      setTheme(settingsTheme);
    } else if (savedTheme && savedTheme !== 'system') {
      setTheme(savedTheme);
    } else {
      setTheme('system');
    }
  }, [settings?.theme]);

  // Apply theme to html element and update localStorage
  useEffect(() => {
    const updateTheme = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(systemPrefersDark);
        document.documentElement.classList.toggle('dark', systemPrefersDark);
      } else {
        const shouldBeDark = theme === 'dark';
        setIsDark(shouldBeDark);
        document.documentElement.classList.toggle('dark', shouldBeDark);
      }
    };

    updateTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    console.log('[ThemeContext] Setting theme:', newTheme);
    setTheme(newTheme);
    
    // Persist to localStorage
    localStorage.setItem('pcr_theme', newTheme);
    
    // Update settings if available
    if (updateSettings) {
      updateSettings({ theme: newTheme });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};