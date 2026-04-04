import React, { useEffect, useCallback } from 'react';
import { Dialog, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface LightboxProps {
  open: boolean;
  images: { url: string; label?: string }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ open, images, index, onClose, onPrev, onNext }) => {
  const current = images[index];

  // Navigation clavier
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') onPrev();
    if (e.key === 'ArrowRight') onNext();
    if (e.key === 'Escape') onClose();
  }, [onPrev, onNext, onClose]);

  useEffect(() => {
    if (open) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!current) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" PaperProps={{ style: { background: 'rgba(30,30,30,0.98)' } }}>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 360, p: 2 }}>
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, color: 'white', zIndex: 2 }}><CloseIcon fontSize="large" /></IconButton>
        <IconButton onClick={onPrev} sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'white', zIndex: 2 }}><ArrowBackIosNewIcon fontSize="large" /></IconButton>
        <img
          src={current.url}
          alt={current.label || ''}
          style={{ maxHeight: '70vh', maxWidth: '80vw', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,0.32)' }}
        />
        <IconButton onClick={onNext} sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'white', zIndex: 2 }}><ArrowForwardIosIcon fontSize="large" /></IconButton>
      </Box>
      {current.label && <Box sx={{ color: 'white', textAlign: 'center', fontWeight: 600, fontSize: 18, pb: 2 }}>{current.label}</Box>}
    </Dialog>
  );
};

export default Lightbox;
