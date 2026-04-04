import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardMedia, CardContent, CardActions,
  Typography, Grid, Box, IconButton,
  Dialog, DialogTitle, DialogActions, Button, Chip, Tooltip
} from '@mui/material';
import { Tortoise } from '../types';
import { getPhotos, deleteTortoise } from '../storage';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';

interface Props {
  tortoises: Tortoise[];
  onEdit?: (tortoise: Tortoise) => void;
  onDelete?: (id: string) => void;
}

function calcAge(birthDate: string): string {
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return '';
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 12) return `${totalMonths} mois`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y} an${y > 1 ? 's' : ''} ${m} mois` : `${y} an${y > 1 ? 's' : ''}`;
}

const SEX_CONFIG: Record<string, { label: string; color: 'info' | 'error' | 'default'; icon: JSX.Element }> = {
  MALE:    { label: 'Mâle',    color: 'info',    icon: <MaleIcon fontSize="small" /> },
  FEMALE:  { label: 'Femelle', color: 'error',   icon: <FemaleIcon fontSize="small" /> },
  UNKNOWN: { label: '?',       color: 'default', icon: <QuestionMarkIcon fontSize="small" /> },
};

const TortoiseList: React.FC<Props> = ({ tortoises, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const [photosByTortoise, setPhotosByTortoise] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    getPhotos().then(all => {
      const byTortoise: Record<string, string> = {};
      tortoises.forEach(t => {
        const photos = all.filter(p => p.tortoiseId === t.id);
        const main = photos.find(p => p.isMain) || photos[0];
        byTortoise[t.id] = main?.url || '';
      });
      setPhotosByTortoise(byTortoise);
    });
  }, [tortoises]);

  const handleDelete = async () => {
    if (toDelete) {
      await deleteTortoise(toDelete);
      if (onDelete) onDelete(toDelete);
      setToDelete(null);
      setConfirmOpen(false);
    }
  };

  const openFiche = (id: string) => {
    navigate(`/tortoises/${id}`);
  };

  return (
    <>
      <Grid container spacing={3}>
        {tortoises.map((tortoise) => {
          const sex = SEX_CONFIG[tortoise.sex] || SEX_CONFIG.UNKNOWN;
          const age = calcAge(tortoise.birthDate);
          const photo = photosByTortoise[tortoise.id];

          return (
            <Grid item xs={12} sm={6} md={4} key={tortoise.id}>
              <Card
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(46,125,50,0.10)',
                  border: '1px solid #e8f5e9',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 12px 36px rgba(46,125,50,0.22)',
                  },
                }}
                onClick={() => openFiche(tortoise.id)}
              >
                {/* PHOTO */}
                <Box sx={{ position: 'relative' }}>
                  {photo ? (
                    <CardMedia
                      component="img"
                      height="190"
                      image={photo}
                      alt={tortoise.name}
                      sx={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <Box sx={{
                      height: 190,
                      background: 'linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Typography sx={{ fontSize: '5rem' }}>🐢</Typography>
                    </Box>
                  )}

                  {/* BADGE SEXE */}
                  <Chip
                    icon={sex.icon}
                    label={sex.label}
                    color={sex.color}
                    size="small"
                    sx={{
                      position: 'absolute', top: 10, right: 10,
                      fontWeight: 700, fontSize: '0.75rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  />
                </Box>

                {/* CONTENU */}
                <CardContent sx={{ pb: 0 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#1b5e20', mb: 0.5 }}>
                    {tortoise.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                    {tortoise.species}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {age && (
                      <Chip
                        label={`🎂 ${age}`}
                        size="small"
                        sx={{ background: '#f9fbe7', color: '#558b2f', fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                </CardContent>

                {/* ACTIONS */}
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={e => { e.stopPropagation(); openFiche(tortoise.id); }}
                    sx={{
                      background: 'linear-gradient(90deg, #2e7d32, #66bb6a)',
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { background: 'linear-gradient(90deg, #1b5e20, #43a047)' },
                    }}
                  >
                    Voir la fiche
                  </Button>
                  <Box>
                    {onEdit && (
                      <Tooltip title="Modifier">
                        <IconButton
                          size="small"
                          onClick={e => { e.stopPropagation(); onEdit(tortoise); }}
                          sx={{ color: '#1976d2', '&:hover': { background: '#e3f2fd' } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        onClick={e => { e.stopPropagation(); setToDelete(tortoise.id); setConfirmOpen(true); }}
                        sx={{ color: '#d32f2f', '&:hover': { background: '#ffebee' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>🗑️ Supprimer cette fiche tortue ?</DialogTitle>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined" sx={{ borderRadius: 3 }}>
            Annuler
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} sx={{ borderRadius: 3 }}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TortoiseList;
