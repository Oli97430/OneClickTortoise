import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SettingsProvider } from './context/SettingsContext';
import CssBaseline from '@mui/material/CssBaseline';
import { HashRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <CssBaseline />
    <SettingsProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </SettingsProvider>
  </React.StrictMode>
);
