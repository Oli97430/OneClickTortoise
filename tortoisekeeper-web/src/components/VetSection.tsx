import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, Chip, IconButton,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip
} from '@mui/material';
import { VetRecord, VetRecordType } from '../types';
import { addVetRecord, updateVetRecord, deleteVetRecord } from '../storage';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

const VET_TYPES: { value: VetRecordType; label: string; icon: string; color: string }[] = [
  { value: 'visit',     label: 'Visite vétérinaire', icon: '🩺', color: '#2e7d32' },
  { value: 'vaccine',   label: 'Vaccin',             icon: '💉', color: '#1565c0' },
  { value: 'deworming', label: 'Vermifuge',           icon: '🔬', color: '#6a1b9a' },
  { value: 'parasite',  label: 'Parasite',            icon: '🐛', color: '#e65100' },
  { value: 'disease',   label: 'Maladie',             icon: '🤒', color: '#c62828' },
  { value: 'surgery',   label: 'Intervention',        icon: '⚕️', color: '#4527a0' },
  { value: 'custom',    label: 'Autre',               icon: '📝', color: '#546e7a' },
];

const typeConfig = (type: VetRecordType) =>
  VET_TYPES.find(t => t.value === type) || VET_TYPES[VET_TYPES.length - 1];

interface Props {
  tortoiseId: string;
  vetRecords: VetRecord[];
  onVetRecordsChange: (records: VetRecord[]) => void;
}

const emptyForm = (): Omit<VetRecord, 'id'> => ({
  tortoiseId: '',
  type: 'visit',
  date: new Date().toISOString().slice(0, 10),
  title: '',
  description: '',
  vetName: '',
  nextDate: '',
});

const VetSection: React.FC<Props> = ({ tortoiseId, vetRecords, onVetRecordsChange }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VetRecord | null>(null);
  const [form, setForm] = useState<Omit<VetRecord, 'id'>>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const myRecords = [...vetRecords]
    .filter(v => v.tortoiseId === tortoiseId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm(), tortoiseId });
    setDialogOpen(true);
  };

  const openEdit = (r: VetRecord) => {
    setEditing(r);
    setForm({
      tortoiseId: r.tortoiseId,
      type: r.type,
      date: r.date.slice(0, 10),
      title: r.title,
      description: r.description || '',
      vetName: r.vetName || '',
      nextDate: r.nextDate ? r.nextDate.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        date: new Date(form.date).toISOString(),
        nextDate: form.nextDate ? new Date(form.nextDate).toISOString() : undefined,
        description: form.description || undefined,
        vetName: form.vetName || undefined,
      };
      if (editing) {
        const updated = await updateVetRecord(editing.id, payload);
        onVetRecordsChange(vetRecords.map(v => v.id === editing.id ? updated : v));
      } else {
        const created = await addVetRecord(payload);
        onVetRecordsChange([...vetRecords, created]);
      }
      setDialogOpen(false);
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteVetRecord(deleteId);
      onVetRecordsChange(vetRecords.filter(v => v.id !== deleteId));
      setDeleteId(null);
    } catch (err: unknown) {
      alert('Erreur suppression : ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>🩺 Fiche vétérinaire</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={openAdd}
          sx={{ borderRadius: 3, textTransform: 'none', background: 'linear-gradient(135deg,#1b5e20,#388e3c)' }}>
          Ajouter
        </Button>
      </Box>

      {myRecords.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5, color: '#90a4ae' }}>
          <Typography fontSize="3rem">🩺</Typography>
          <Typography variant="body2" mt={1}>Aucun enregistrement vétérinaire</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {myRecords.map(r => {
            const cfg = typeConfig(r.type);
            return (
              <Paper key={r.id} sx={{
                p: 2, borderRadius: 3,
                borderLeft: `4px solid ${cfg.color}`,
                display: 'flex', alignItems: 'flex-start', gap: 2,
                '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
                transition: 'box-shadow 0.2s'
              }}>
                <Box sx={{ fontSize: '1.8rem', lineHeight: 1, mt: 0.3 }}>{cfg.icon}</Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                    <Chip label={cfg.label} size="small"
                      sx={{ bgcolor: cfg.color + '22', color: cfg.color, fontWeight: 700, fontSize: '0.72rem' }} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </Typography>
                    {r.nextDate && (
                      <Chip label={`RDV : ${new Date(r.nextDate).toLocaleDateString('fr-FR')}`}
                        size="small" color="info" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight={600}>{r.title}</Typography>
                  {r.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>{r.description}</Typography>
                  )}
                  {r.vetName && (
                    <Typography variant="caption" color="text.secondary">Dr. {r.vetName}</Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  <Tooltip title="Modifier">
                    <IconButton size="small" onClick={() => openEdit(r)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton size="small" color="error" onClick={() => setDeleteId(r.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Dialog ajout/édition */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}
        fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle fontWeight={700}>{editing ? 'Modifier' : 'Ajouter'} un enregistrement vétérinaire</DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select value={form.type} label="Type"
              onChange={e => setForm(f => ({ ...f, type: e.target.value as VetRecordType }))}>
              {VET_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>{t.icon} {t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Date" type="date" size="small" value={form.date} fullWidth
            InputLabelProps={{ shrink: true }}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <TextField label="Titre *" size="small" value={form.title} fullWidth
            placeholder="Ex: Vermifuge Panacur, Contrôle annuel…"
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <TextField label="Description" size="small" value={form.description} fullWidth multiline rows={2}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <TextField label="Nom du vétérinaire" size="small" value={form.vetName} fullWidth
            onChange={e => setForm(f => ({ ...f, vetName: e.target.value }))} />
          <TextField label="Prochain rendez-vous" type="date" size="small" value={form.nextDate} fullWidth
            InputLabelProps={{ shrink: true }}
            onChange={e => setForm(f => ({ ...f, nextDate: e.target.value }))} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle>Supprimer cet enregistrement ?</DialogTitle>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Supprimer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VetSection;
