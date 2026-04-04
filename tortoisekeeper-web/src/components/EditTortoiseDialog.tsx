import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, FormControlLabel, Checkbox, Box, Typography } from '@mui/material';
import { Tortoise, Sex, Taxonomy } from '../types';

interface Props {
  open: boolean;
  tortoise: Tortoise;
  onClose: () => void;
  onSave: (tortoise: Tortoise) => void;
}

const EditTortoiseDialog: React.FC<Props> = ({ open, tortoise, onClose, onSave }) => {
  const [name, setName] = useState(tortoise.name || '');
  const [birthDate, setBirthDate] = useState(tortoise.birthDate || '');
  const [isApprox, setIsApprox] = useState(!!tortoise.isBirthDateApproximate);
  const [species, setSpecies] = useState(tortoise.species || '');
  const [sex, setSex] = useState<Sex>(tortoise.sex || 'UNKNOWN');
  const [notes, setNotes] = useState(tortoise.notes || '');
  const [facePhoto, setFacePhoto] = useState<string | undefined>(tortoise.facePhoto);
  const [plastronPhoto, setPlastronPhoto] = useState<string | undefined>(tortoise.plastronPhoto);
  const [carapacePhoto, setCarapacePhoto] = useState<string | undefined>(tortoise.carapacePhoto);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | undefined>(tortoise.taxonomy);

  useEffect(() => {
    setName(tortoise.name || '');
    setBirthDate(tortoise.birthDate || '');
    setIsApprox(!!tortoise.isBirthDateApproximate);
    setSpecies(tortoise.species || '');
    setSex(tortoise.sex || 'UNKNOWN');
    setNotes(tortoise.notes || '');
    setFacePhoto(tortoise.facePhoto);
    setPlastronPhoto(tortoise.plastronPhoto);
    setCarapacePhoto(tortoise.carapacePhoto);
    setTaxonomy(tortoise.taxonomy);
  }, [tortoise]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'face' | 'plastron' | 'carapace') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (type === 'face') setFacePhoto(result);
      if (type === 'plastron') setPlastronPhoto(result);
      if (type === 'carapace') setCarapacePhoto(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name || !birthDate) return;
    onSave({
      ...tortoise,
      name,
      birthDate,
      isBirthDateApproximate: isApprox,
      species,
      sex,
      notes,
      facePhoto,
      plastronPhoto,
      carapacePhoto,
      taxonomy
    });
  };

  const handleFetchTaxonomy = async () => {
    if (!species) return;
    try {
      const res = await fetch('https://api.opentreeoflife.org/v3/tnrs/match_names', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names: [species] })
      });
      const data = await res.json();
      const match = data.results?.[0]?.matches?.[0]?.taxon;
      if (match?.ott_id) {
        const infoRes = await fetch('https://api.opentreeoflife.org/v3/taxonomy/taxon_info', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ott_id: match.ott_id })
        });
        const infoData = await infoRes.json();
        const lineage = infoData.taxonomic_lineage || [];
        const newTax: Taxonomy = {
          kingdom: lineage.find((l: any) => l.rank === 'kingdom')?.name,
          phylum: lineage.find((l: any) => l.rank === 'phylum')?.name,
          class: lineage.find((l: any) => l.rank === 'class')?.name,
          order: lineage.find((l: any) => l.rank === 'order')?.name,
          family: lineage.find((l: any) => l.rank === 'family')?.name,
          genus: lineage.find((l: any) => l.rank === 'genus')?.name,
        };
        setTaxonomy(newTax);
      }
    } catch (err) {
      console.error('Erreur récupération taxonomie', err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Modifier la fiche tortue</DialogTitle>
      <DialogContent>
        <TextField
          label="Nom"
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Date de naissance"
          type="date"
          value={birthDate}
          onChange={e => setBirthDate(e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
        <FormControlLabel
          control={<Checkbox checked={isApprox} onChange={e => setIsApprox(e.target.checked)} />}
          label="Date approximative"
        />
        <TextField
          label="Espèce"
          value={species}
          onChange={e => setSpecies(e.target.value)}
          onBlur={handleFetchTaxonomy}
          fullWidth
          margin="normal"
        />
        {taxonomy && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">Règne: {taxonomy.kingdom || '—'}</Typography>
            <Typography variant="body2">Embranchement: {taxonomy.phylum || '—'}</Typography>
            <Typography variant="body2">Classe: {taxonomy.class || '—'}</Typography>
            <Typography variant="body2">Ordre: {taxonomy.order || '—'}</Typography>
            <Typography variant="body2">Famille: {taxonomy.family || '—'}</Typography>
            <Typography variant="body2">Genre: {taxonomy.genus || '—'}</Typography>
          </Box>
        )}
        <TextField
          select
          label="Sexe"
          value={sex}
          onChange={e => setSex(e.target.value as Sex)}
          fullWidth
          margin="normal"
        >
          <MenuItem value="MALE">Mâle</MenuItem>
          <MenuItem value="FEMALE">Femelle</MenuItem>
          <MenuItem value="UNKNOWN">Inconnu</MenuItem>
        </TextField>
        <TextField
          label="Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          fullWidth
          margin="normal"
          multiline
          minRows={2}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Photos (optionnel)</Typography>
          <Button component="label" variant="outlined" color="primary">
            Photo de face
            <input type="file" accept="image/*" hidden onChange={e => handlePhotoChange(e, 'face')} />
          </Button>
          {facePhoto && <img src={facePhoto} alt="Face" style={{ maxWidth: 120, marginTop: 4, borderRadius: 8 }} />}
          <Button component="label" variant="outlined" color="primary">
            Photo de dessous (plastron)
            <input type="file" accept="image/*" hidden onChange={e => handlePhotoChange(e, 'plastron')} />
          </Button>
          {plastronPhoto && <img src={plastronPhoto} alt="Plastron" style={{ maxWidth: 120, marginTop: 4, borderRadius: 8 }} />}
          <Button component="label" variant="outlined" color="primary">
            Photo de dessus (carapace)
            <input type="file" accept="image/*" hidden onChange={e => handlePhotoChange(e, 'carapace')} />
          </Button>
          {carapacePhoto && <img src={carapacePhoto} alt="Carapace" style={{ maxWidth: 120, marginTop: 4, borderRadius: 8 }} />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">Enregistrer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTortoiseDialog;
