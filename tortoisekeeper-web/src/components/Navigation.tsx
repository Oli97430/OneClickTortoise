import React, { useContext } from 'react';
import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';
import { SettingsContext } from '../context/SettingsContext';
import { Link as RouterLink, useLocation } from 'react-router-dom';

const menu = [
  { label: 'Fiches tortues', to: '/' },
];

export default function Navigation() {
  const location = useLocation();
  const current = location.pathname;
  const { mode, toggleTheme } = useContext(SettingsContext);
  return (
    <AppBar position="static" color="primary" sx={{ mb: 3, boxShadow: 3 }}>
      <Toolbar>
        <img src={`${process.env.PUBLIC_URL}/logo.svg`} alt="OneClickTortoise" style={{ height: 40, marginRight: 10 }} />
        <Typography variant="h6" fontWeight={800} sx={{ mr: 3, letterSpacing: 0.5, color: '#fff' }}>
          OneClickTortoise
        </Typography>
        {menu.map(item => (
          <Button
            key={item.to}
            color="inherit"
            component={RouterLink}
            to={item.to}
            sx={{
              fontWeight: current === item.to ? 'bold' : 'normal',
              textDecoration: current === item.to ? 'underline' : 'none',
              mx: 1
            }}
          >
            {item.label}
          </Button>
        ))}
        <Box flexGrow={1} />
        <Button color="inherit" onClick={toggleTheme} sx={{ ml: 1 }}>
          {mode === 'light' ? '🌞' : '🌜'}
        </Button>
        {/* language selector removed */}
      </Toolbar>
    </AppBar>
  );
}
