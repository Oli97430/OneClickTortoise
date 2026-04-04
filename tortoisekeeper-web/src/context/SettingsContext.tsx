import React, { createContext, useState, useEffect, useMemo } from 'react';

// SettingsContext for theme mode and unit
export type Unit = 'g' | 'kg';
export interface SettingsContextType {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
  unit: Unit;
  setUnit: (unit: Unit) => void;
}

// Default context values
export const SettingsContext = createContext<SettingsContextType>({
  mode: 'light',
  toggleTheme: () => {},
  unit: 'g',
  setUnit: () => {},
});

// Provider component
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => (localStorage.getItem('themeMode') as 'light' | 'dark') || 'light');
  useEffect(() => { localStorage.setItem('themeMode', mode); }, [mode]);
  const toggleTheme = () => setMode(prev => prev === 'light' ? 'dark' : 'light');

  const [unit, setUnit] = useState<Unit>(() => (localStorage.getItem('unit') as Unit) || 'g');
  useEffect(() => { localStorage.setItem('unit', unit); }, [unit]);

  const value = useMemo(() => ({ mode, toggleTheme, unit, setUnit }), [mode, unit]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
