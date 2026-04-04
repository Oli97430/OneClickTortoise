import React, { useContext, useMemo, useState, useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import Navigation from './components/Navigation';
import OfflineBanner from './components/OfflineBanner';
import TortoiseListPage from './pages/TortoiseListPage';
import TortoiseDetail from './components/TortoiseDetail';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SettingsContext } from './context/SettingsContext';

const App: React.FC = () => {
  const { mode } = useContext(SettingsContext);
  const themeMemo = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  return (
    <ThemeProvider theme={themeMemo}>
      <CssBaseline />
      <ErrorBoundary>
        <Navigation />
        <OfflineBanner />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<TortoiseListPage />} />
            <Route path="/tortoises" element={<TortoiseListPage />} />
            <Route path="/tortoises/:id" element={<TortoiseDetailWrapper />} />
            <Route path="*" element={<TortoiseListPage />} />
          </Routes>
        </ErrorBoundary>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

// Wrapper pour charger la fiche tortue selon l'ID de l'URL
const TortoiseDetailWrapper: React.FC = () => {
  const { id } = useParams();
  const [tortoise, setTortoise] = useState<import('./types').Tortoise | null>(null);
  useEffect(() => {
    import('./storage').then(({ getTortoises }) => {
      getTortoises().then(list => {
        const found = list.find(t => t.id === id);
        setTortoise(found || null);
      });
    });
  }, [id]);
  if (!tortoise) return <div style={{padding: 40}}>Chargement de la fiche tortue...</div>;
  return <TortoiseDetail tortoise={tortoise} onBack={() => window.history.back()} />;
};

export default App;
