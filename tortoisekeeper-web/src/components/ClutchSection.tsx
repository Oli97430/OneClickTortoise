import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, Chip, IconButton,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, LinearProgress
} from '@mui/material';
import { Clutch, ClutchStatus } from '../types';
import { addClutch, updateClutch, deleteClutch } from '../storage';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

const STATUS_CONFIG: Record<ClutchStatus, { label: string; color: string; icon: string; chipColor: 'info' | 'success' | 'error' | 'default' }> = {
  incubating: { label: 'En incubation', color: '#1565c0', icon: '🌡️', chipColor: 'info' },
  hatched:    { label: 'Éclos',         color: '#2e7d32', icon: '🐣', chipColor: 'success' },
  failed:     { label: 'Échec',         color: '#c62828', icon: '❌', chipColor: 'error' },
  unknown:    { label: 'Inconnu',       color: '#757575', icon: '❓', chipColor: 'default' },
};

interface Props {
  tortoiseId: string;
  clutches: Clutch[];
  onClutchesChange: (clutches: Clutch[]) => void;
}

type FormState = Omit<Clutch, 'id'>;

const emptyForm = (tortoiseId: string): FormState => ({
  tortoiseId,
  date: new Date().toISOString().slice(0, 10),
  eggsCount: 1,
  incubationTemp: undefined,
  incubationHumidity: undefined,
  expectedHatchDate: '',
  actualHatchDate: '',
  hatchedCount: undefined,
  status: 'incubating',
  notes: '',
});

function daysRemaining(expected?: string): number | null {
  if (!expected) return null;
  const diff = new Date(expected).getTime() - Date.now();
  return Math.ceil(diff / 86400_000);
}

function incubationProgress(layDate: string, expectedDate?: string): number | null {
  if (!expectedDate) return null;
  const total = new Date(expectedDate).getTime() - new Date(layDate).getTime();
  const elapsed = Date.now() - new Date(layDate).getTime();
  if (total <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

const ClutchSection: React.FC<Props> = ({ tortoiseId, clutches, onClutchesChange }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Clutch | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(tortoiseId));
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const myClutches = [...clutches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm(tortoiseId));
    setDialogOpen(true);
  };

  const openEdit = (c: Clutch) => {
    setEditing(c);
    setForm({
      tortoiseId: c.tortoiseId,
      date: c.date.slice(0, 10),
      eggsCount: c.eggsCount,
      incubationTemp: c.incubationTemp,
      incubationHumidity: c.incubationHumidity,
      expectedHatchDate: c.expectedHatchDate ? c.expectedHatchDate.slice(0, 10) : '',
      actualHatchDate: c.actualHatchDate ? c.actualHatchDate.slice(0, 10) : '',
      hatchedCount: c.hatchedCount,
      status: c.status,
      notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.date || form.eggsCount < 1) return;
    setSaving(true);
    try {
      const payload: Omit<Clutch, 'id'> = {
        ...form,
        date: new Date(form.date).toISOString(),
        expectedHatchDate: form.expectedHatchDate ? new Date(form.expectedHatchDate).toISOString() : undefined,
        actualHatchDate: form.actualHatchDate ? new Date(form.actualHatchDate).toISOString() : undefined,
        notes: form.notes || undefined,
      };
      if (editing) {
        const updated = await updateClutch(editing.id, payload);
        onClutchesChange(clutches.map(c => c.id === editing.id ? updated : c));
      } else {
        const created = await addClutch(payload);
        onClutchesChange([...clutches, created]);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteClutch(deleteId);
      onClutchesChange(clutches.filter(c => c.id !== deleteId));
      setDeleteId(null);
    } catch (err: unknown) {
      alert('Erreur suppression : ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  // Stats globales
  const totalEggs = myClutches.reduce((s, c) => s + c.eggsCount, 0);
  const totalHatched = myClutches.reduce((s, c) => s + (c.hatchedCount || 0), 0);
  const successRate = totalEggs > 0 ? Math.round((totalHatched / totalEggs) * 100) : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>🥚 Suivi des pontes</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openAdd}
          sx={{ borderRadius: 3, textTransform: 'none', background: 'linear-gradient(135deg,#e65100,#ff8f00)' }}>
          Ajouter une ponte
        </Button>
      </Box>

      {/* Stats globales */}
      {myClutches.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 1.5, borderRadius: 3, border: '1px solid #ffe0b2', textAlign: 'center', minWidth: 90 }}>
            <Typography variant="h5" fontWeight={800} color="#e65100">{myClutches.length}</Typography>
            <Typography variant="caption" color="text.secondary">ponte{myClutches.length > 1 ? 's' : ''}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, borderRadius: 3, border: '1px solid #fff9c4', textAlign: 'center', minWidth: 90 }}>
            <Typography variant="h5" fontWeight={800} color="#f9a825">{totalEggs}</Typography>
            <Typography variant="caption" color="text.secondary">œufs total</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, borderRadius: 3, border: '1px solid #c8e6c9', textAlign: 'center', minWidth: 90 }}>
            <Typography variant="h5" fontWeight={800} color="#2e7d32">{totalHatched}</Typography>
            <Typography variant="caption" color="text.secondary">éclos</Typography>
          </Paper>
          {successRate !== null && (
            <Paper sx={{ p: 1.5, borderRadius: 3, border: '1px solid #e1bee7', textAlign: 'center', minWidth: 90 }}>
              <Typography variant="h5" fontWeight={800} color="#6a1b9a">{successRate}%</Typography>
              <Typography variant="caption" color="text.secondary">taux d'éclosion</Typography>
            </Paper>
          )}
        </Box>
      )}

      {myClutches.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5, color: '#90a4ae' }}>
          <Typography fontSize="3rem">🥚</Typography>
          <Typography variant="body2" mt={1}>Aucune ponte enregistrée</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {myClutches.map(c => {
            const cfg = STATUS_CONFIG[c.status];
            const remaining = daysRemaining(c.expectedHatchDate);
            const progress = incubationProgress(c.date, c.expectedHatchDate);

            return (
              <Paper key={c.id} sx={{
                p: 2.5, borderRadius: 3,
                borderLeft: `4px solid ${cfg.color}`,
                '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
                transition: 'box-shadow 0.2s',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ fontSize: '2rem', lineHeight: 1 }}>{cfg.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    {/* En-tête */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Ponte du {new Date(c.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </Typography>
                      <Chip label={cfg.label} size="small" color={cfg.chipColor}
                        sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                    </Box>

                    {/* Infos principales */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">🥚</Typography>
                        <Typography variant="body2" fontWeight={600}>{c.eggsCount} œuf{c.eggsCount > 1 ? 's' : ''}</Typography>
                      </Box>
                      {c.incubationTemp && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">🌡️</Typography>
                          <Typography variant="body2">{c.incubationTemp}°C</Typography>
                        </Box>
                      )}
                      {c.incubationHumidity && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">💧</Typography>
                          <Typography variant="body2">{c.incubationHumidity}%</Typography>
                        </Box>
                      )}
                      {c.hatchedCount !== undefined && c.hatchedCount !== null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">🐣</Typography>
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            {c.hatchedCount}/{c.eggsCount} éclos
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Dates d'éclosion */}
                    {c.expectedHatchDate && (
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Éclosion prévue : {new Date(c.expectedHatchDate).toLocaleDateString('fr-FR')}
                          </Typography>
                          {c.status === 'incubating' && remaining !== null && (
                            <Typography variant="caption" fontWeight={700}
                              color={remaining <= 0 ? 'error.main' : remaining <= 7 ? 'warning.main' : 'text.secondary'}>
                              {remaining <= 0 ? `J+${Math.abs(remaining)} (dépassé)` : `J-${remaining}`}
                            </Typography>
                          )}
                        </Box>
                        {c.status === 'incubating' && progress !== null && (
                          <LinearProgress variant="determinate" value={progress}
                            sx={{ height: 6, borderRadius: 3,
                              bgcolor: '#e3f2fd',
                              '& .MuiLinearProgress-bar': { bgcolor: progress >= 100 ? '#c62828' : '#1565c0' }
                            }} />
                        )}
                      </Box>
                    )}
                    {c.actualHatchDate && (
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        🐣 Éclosion réelle : {new Date(c.actualHatchDate).toLocaleDateString('fr-FR')}
                      </Typography>
                    )}
                    {c.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                        {c.notes}
                      </Typography>
                    )}
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => openEdit(c)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" color="error" onClick={() => setDeleteId(c.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Dialog ajout/édition */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}
        fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle fontWeight={700}>{editing ? 'Modifier la ponte' : '🥚 Ajouter une ponte'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Date de la ponte *" type="date" size="small" fullWidth
              value={form.date} InputLabelProps={{ shrink: true }}
              onChange={e => set('date', e.target.value)} />
            <TextField label="Nombre d'œufs *" type="number" size="small" fullWidth
              value={form.eggsCount} inputProps={{ min: 1 }}
              onChange={e => set('eggsCount', parseInt(e.target.value) || 1)} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Température (°C)" type="number" size="small" fullWidth
              value={form.incubationTemp ?? ''} inputProps={{ min: 20, max: 40, step: 0.1 }}
              onChange={e => set('incubationTemp', e.target.value ? parseFloat(e.target.value) : undefined)} />
            <TextField label="Humidité (%)" type="number" size="small" fullWidth
              value={form.incubationHumidity ?? ''} inputProps={{ min: 0, max: 100 }}
              onChange={e => set('incubationHumidity', e.target.value ? parseFloat(e.target.value) : undefined)} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Éclosion prévue" type="date" size="small" fullWidth
              value={form.expectedHatchDate} InputLabelProps={{ shrink: true }}
              onChange={e => set('expectedHatchDate', e.target.value)} />
            <TextField label="Éclosion réelle" type="date" size="small" fullWidth
              value={form.actualHatchDate} InputLabelProps={{ shrink: true }}
              onChange={e => set('actualHatchDate', e.target.value)} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Œufs éclos" type="number" size="small" fullWidth
              value={form.hatchedCount ?? ''} inputProps={{ min: 0, max: form.eggsCount }}
              onChange={e => set('hatchedCount', e.target.value ? parseInt(e.target.value) : undefined)} />
            <FormControl fullWidth size="small">
              <InputLabel>Statut</InputLabel>
              <Select value={form.status} label="Statut"
                onChange={e => set('status', e.target.value as ClutchStatus)}>
                {(Object.entries(STATUS_CONFIG) as [ClutchStatus, typeof STATUS_CONFIG[ClutchStatus]][]).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.icon} {v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField label="Notes" size="small" fullWidth multiline rows={2}
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.date || form.eggsCount < 1}
            sx={{ background: 'linear-gradient(135deg,#e65100,#ff8f00)', borderRadius: 2 }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle>Supprimer cette ponte ?</DialogTitle>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Supprimer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClutchSection;
