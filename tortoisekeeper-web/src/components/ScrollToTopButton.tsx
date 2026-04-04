import React, { useState, useEffect } from 'react';
import { Fab, Zoom, Tooltip } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const ScrollToTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Zoom in={visible}>
      <Tooltip title="Retour en haut" placement="left">
        <Fab color="primary" size="medium" onClick={scrollToTop} sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1300 }}>
          <KeyboardArrowUpIcon />
        </Fab>
      </Tooltip>
    </Zoom>
  );
};

export default ScrollToTopButton;
