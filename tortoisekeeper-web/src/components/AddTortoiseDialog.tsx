import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, FormControlLabel, Checkbox } from '@mui/material';
import { Tortoise, Sex } from '../types';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { Avatar, IconButton, Tooltip, Box } from '@mui/material';

// Correction : fallback uuid compatible avec le hot reload et React strict mode
const getUuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now();
};

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (tortoise: Tortoise, photos: string[]) => void;
}

const AddTortoiseDialog: React.FC<Props> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isApprox, setIsApprox] = useState(false);
  const [species, setSpecies] = useState('');
  const [sex, setSex] = useState<Sex>('UNKNOWN');
  const [notes, setNotes] = useState('');
  // Gestion photos
  const [photos, setPhotos] = useState<string[]>([]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const newPhotos: string[] = await Promise.all(files.map(async file => {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleDeletePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!name || !birthDate) return;
    // On ne met PAS photos dans Tortoise (pas dans le type), mais on transmet l'info à l'appelant
    onAdd({
      id: getUuid(),
      name,
      birthDate,
      isBirthDateApproximate: isApprox,
      species,
      sex,
      notes
    } as Tortoise, photos);
    setName(''); setBirthDate(''); setIsApprox(false); setSpecies(''); setSex('UNKNOWN'); setNotes(''); setPhotos([]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter une tortue</DialogTitle>
      <DialogContent>
        <TextField label="Nom" value={name} onChange={e => setName(e.target.value)} fullWidth margin="normal" />
        <TextField label="Date de naissance" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} fullWidth margin="normal" InputLabelProps={{ shrink: true }} />
        <FormControlLabel control={<Checkbox checked={isApprox} onChange={e => setIsApprox(e.target.checked)} />} label="Date approximative" />
        <TextField label="Espèce" value={species} onChange={e => setSpecies(e.target.value)} fullWidth margin="normal" />
        <TextField select label="Sexe" value={sex} onChange={e => setSex(e.target.value as Sex)} fullWidth margin="normal">
          <MenuItem value="MALE">Mâle</MenuItem>
          <MenuItem value="FEMALE">Femelle</MenuItem>
          <MenuItem value="UNKNOWN">Inconnu</MenuItem>
        </TextField>
        <TextField label="Notes" value={notes} onChange={e => setNotes(e.target.value)} fullWidth margin="normal" multiline rows={2} />
        <Box sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
          <PhotoLibraryIcon sx={{ mr: 1 }} color="action" />
          <Button
            variant="contained"
            component="label"
            startIcon={<AddPhotoAlternateIcon />}
            sx={{ mb: 1 }}
          >
            Ajouter photo(s)
            <input type="file" hidden accept="image/*" multiple onChange={handlePhotoChange} />
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {photos.map((photo, idx) => (
            <Box key={idx} sx={{ position: 'relative' }}>
              <Avatar src={photo} variant="rounded" sx={{ width: 60, height: 60, border: '2px solid #388e3c' }} />
              <Tooltip title="Supprimer">
                <IconButton size="small" color="error" sx={{ position: 'absolute', top: -8, right: -8, background: 'white' }} onClick={() => handleDeletePhoto(idx)}>
                  ×
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">Ajouter</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTortoiseDialog;
