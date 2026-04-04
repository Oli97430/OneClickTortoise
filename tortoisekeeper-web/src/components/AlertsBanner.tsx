import React, { useState } from 'react';
import {
  Box, Typography, Alert, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, IconButton,
  List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import AddAlarmIcon from '@mui/icons-material/AddAlarm';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Reminder, ReminderType, WeightEntry, MeasurementEntry } from '../types';
import { addReminder, updateReminder, deleteReminder } from '../storage';

interface Props {
  tortoiseId: string;
  tortoiseName: string;
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  reminders: Reminder[];
  onRemindersChange: (reminders: Reminder[]) => void;
}

const REMINDER_TYPES: { value: ReminderType; label: string; icon: string }[] = [
  { value: 'weighing',     label: 'Pesée',          icon: '⚖️' },
  { value: 'measurement',  label: 'Mesure',          icon: '📏' },
  { value: 'deworming',    label: 'Vermifugation',   icon: '💊' },
  { value: 'vet',          label: 'Vétérinaire',     icon: '🏥' },
  { value: 'hibernation',  label: 'Hibernation',     icon: '❄️' },
  { value: 'custom',       label: 'Personnalisé',    icon: '📌' },
];

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400_000);
}

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400_000);
}

const AlertsBanner: React.FC<Props> = ({
  tortoiseId, tortoiseName, weights, measurements, reminders, onRemindersChange
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState<ReminderType>('weighing');
  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newRecurring, setNewRecurring] = useState('');

  // ── Alertes automatiques ─────────────────────────────────────────────────
  const autoAlerts: { severity: 'warning' | 'error'; message: string }[] = [];

  const lastWeight = weights.length > 0
    ? weights.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b)
    : null;
  const lastMeasure = measurements.length > 0
    ? measurements.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b)
    : null;

  if (!lastWeight) {
    autoAlerts.push({ severity: 'warning', message: '⚖️ Aucune pesée enregistrée pour cette tortue.' });
  } else {
    const d = daysSince(lastWeight.date);
    if (d > 60) autoAlerts.push({ severity: 'error', message: `⚖️ Dernière pesée il y a ${d} jours — vérification recommandée !` });
    else if (d > 30) autoAlerts.push({ severity: 'warning', message: `⚖️ Dernière pesée il y a ${d} jours.` });
  }

  if (!lastMeasure) {
    autoAlerts.push({ severity: 'warning', message: '📏 Aucune mesure enregistrée pour cette tortue.' });
  } else {
    const d = daysSince(lastMeasure.date);
    if (d > 90) autoAlerts.push({ severity: 'warning', message: `📏 Dernière mesure il y a ${d} jours.` });
  }

  // ── Rappels à venir / en retard ──────────────────────────────────────────
  const myReminders = reminders.filter(r => r.tortoiseId === tortoiseId && !r.done);
  const overdueReminders = myReminders.filter(r => daysUntil(r.dueDate) < 0);
  const upcomingReminders = myReminders.filter(r => daysUntil(r.dueDate) >= 0 && daysUntil(r.dueDate) <= 14);

  const handleAddReminder = async () => {
    if (!newLabel || !newDate) return;
    try {
      const r = await addReminder({
        tortoiseId,
        type: newType,
        label: newLabel,
        dueDate: new Date(newDate).toISOString(),
        done: false,
        recurringDays: newRecurring ? parseInt(newRecurring) : undefined,
      });
      onRemindersChange([...reminders, r]);
      setNewLabel(''); setNewDate(''); setNewRecurring('');
      setDialogOpen(false);
    } catch (err) {
      alert('Erreur lors de la création du rappel');
    }
  };

  const handleDone = async (reminder: Reminder) => {
    try {
      const updated = await updateReminder(reminder.id, { done: true });
      onRemindersChange(reminders.map(r => r.id === reminder.id ? updated : r));
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReminder(id);
      onRemindersChange(reminders.filter(r => r.id !== id));
    } catch {}
  };

  if (autoAlerts.length === 0 && myReminders.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Alertes automatiques */}
      {autoAlerts.map((a, i) => (
        <Alert key={i} severity={a.severity} sx={{ mb: 1, borderRadius: 2 }}>
          {a.message}
        </Alert>
      ))}

      {/* Rappels en retard */}
      {overdueReminders.map(r => {
        const type = REMINDER_TYPES.find(t => t.value === r.type);
        return (
          <Alert key={r.id} severity="error" sx={{ mb: 1, borderRadius: 2 }}
            action={
              <IconButton size="small" color="inherit" onClick={() => handleDone(r)}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            }
          >
            {type?.icon} <strong>{r.label}</strong> — en retard de {Math.abs(daysUntil(r.dueDate))} jours
          </Alert>
        );
      })}

      {/* Rappels à venir (≤14j) */}
      {upcomingReminders.map(r => {
        const type = REMINDER_TYPES.find(t => t.value === r.type);
        const d = daysUntil(r.dueDate);
        return (
          <Alert key={r.id} severity="info" sx={{ mb: 1, borderRadius: 2 }}
            action={
              <IconButton size="small" color="inherit" onClick={() => handleDone(r)}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            }
          >
            {type?.icon} <strong>{r.label}</strong> — dans {d === 0 ? "aujourd'hui" : `${d} jour${d > 1 ? 's' : ''}`}
          </Alert>
        );
      })}

      {/* Bouton + liste rappels */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {myReminders.length} rappel{myReminders.length > 1 ? 's' : ''} actif{myReminders.length > 1 ? 's' : ''}
        </Typography>
        <Button size="small" startIcon={<AddAlarmIcon />} onClick={() => setDialogOpen(true)} variant="outlined"
          sx={{ borderRadius: 3, textTransform: 'none' }}>
          Ajouter un rappel
        </Button>
      </Box>

      {/* Dialog ajout rappel */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4 } }} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>🔔 Nouveau rappel — {tortoiseName}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Type</InputLabel>
            <Select value={newType} label="Type" onChange={e => setNewType(e.target.value as ReminderType)}>
              {REMINDER_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>{t.icon} {t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Description" size="small" value={newLabel}
            onChange={e => setNewLabel(e.target.value)} fullWidth />
          <TextField label="Date prévue" type="date" size="small" value={newDate}
            onChange={e => setNewDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Répétition (jours, optionnel)" type="number" size="small"
            value={newRecurring} onChange={e => setNewRecurring(e.target.value)}
            placeholder="ex: 30" fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: 3 }}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handleAddReminder} sx={{ borderRadius: 3 }}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertsBanner;
