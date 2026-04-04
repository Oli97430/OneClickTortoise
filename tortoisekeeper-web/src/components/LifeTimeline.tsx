import React, { useMemo } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { WeightEntry, MeasurementEntry, TortoisePhoto, VetRecord } from '../types';

interface Props {
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  photos: TortoisePhoto[];
  vetRecords: VetRecord[];
}

type EventKind = 'weight' | 'measurement' | 'photo' | 'vet';

interface TimelineEvent {
  id: string;
  kind: EventKind;
  date: string;
  label: string;
  sublabel?: string;
  color: string;
  icon: string;
  photoUrl?: string;
}

const KIND_CONFIG: Record<EventKind, { color: string; icon: string }> = {
  weight:      { color: '#2e7d32', icon: '⚖️' },
  measurement: { color: '#1565c0', icon: '📏' },
  photo:       { color: '#7b1fa2', icon: '📷' },
  vet:         { color: '#c62828', icon: '🩺' },
};

const LifeTimeline: React.FC<Props> = ({ weights, measurements, photos, vetRecords }) => {
  const events: TimelineEvent[] = useMemo(() => {
    const all: TimelineEvent[] = [];

    for (const w of weights) {
      all.push({
        id: `w-${w.id}`,
        kind: 'weight',
        date: w.date,
        label: `Pesée : ${w.weight} g`,
        sublabel: w.note || undefined,
        ...KIND_CONFIG.weight,
      });
    }

    for (const m of measurements) {
      all.push({
        id: `m-${m.id}`,
        kind: 'measurement',
        date: m.date,
        label: `Mesure : ${m.length} × ${m.width} mm`,
        ...KIND_CONFIG.measurement,
      });
    }

    for (const p of photos) {
      all.push({
        id: `p-${p.id}`,
        kind: 'photo',
        date: p.date,
        label: 'Photo ajoutée',
        photoUrl: p.url,
        ...KIND_CONFIG.photo,
      });
    }

    for (const v of vetRecords) {
      all.push({
        id: `v-${v.id}`,
        kind: 'vet',
        date: v.date,
        label: v.title,
        sublabel: v.vetName ? `Dr. ${v.vetName}` : undefined,
        ...KIND_CONFIG.vet,
      });
    }

    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [weights, measurements, photos, vetRecords]);

  // Group by year-month
  const grouped = useMemo(() => {
    const map: { key: string; label: string; events: TimelineEvent[] }[] = [];
    for (const ev of events) {
      const d = new Date(ev.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const last = map[map.length - 1];
      if (last && last.key === key) {
        last.events.push(ev);
      } else {
        map.push({ key, label, events: [ev] });
      }
    }
    return map;
  }, [events]);

  if (events.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, color: '#90a4ae' }}>
        <Typography fontSize="3rem">📅</Typography>
        <Typography variant="body2" mt={1}>Aucun événement enregistré</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📅 Chronologie de vie</Typography>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {(Object.entries(KIND_CONFIG) as [EventKind, { color: string; icon: string }][]).map(([kind, cfg]) => (
          <Chip key={kind} label={`${cfg.icon} ${{ weight: 'Pesées', measurement: 'Mesures', photo: 'Photos', vet: 'Vétérinaire' }[kind]}`}
            size="small" sx={{ bgcolor: cfg.color + '18', color: cfg.color, fontWeight: 600, fontSize: '0.75rem' }} />
        ))}
      </Box>

      {grouped.map(group => (
        <Box key={group.key} sx={{ mb: 3 }}>
          {/* Month header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'capitalize', minWidth: 140 }}>
              {group.label}
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: '#e0e0e0' }} />
            <Chip label={group.events.length} size="small" sx={{ bgcolor: '#f5f5f5', color: '#757575', fontWeight: 700, fontSize: '0.7rem' }} />
          </Box>

          {/* Events in month */}
          <Box sx={{ pl: 2, borderLeft: '2px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {group.events.map((ev, idx) => (
              <Box key={ev.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, position: 'relative' }}>
                {/* Dot on timeline */}
                <Box sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  bgcolor: ev.color + '22', border: `2px solid ${ev.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', flexShrink: 0, mt: 0.3,
                  ml: '-15px', // overlap the left border
                }}>
                  {ev.icon}
                </Box>

                <Paper sx={{
                  p: 1.5, flex: 1, borderRadius: 2,
                  border: `1px solid ${ev.color}22`,
                  bgcolor: ev.color + '06',
                  '&:hover': { bgcolor: ev.color + '10', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
                  transition: 'all 0.15s',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{ev.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {new Date(ev.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </Typography>
                  </Box>
                  {ev.sublabel && (
                    <Typography variant="caption" color="text.secondary">{ev.sublabel}</Typography>
                  )}
                  {ev.kind === 'photo' && ev.photoUrl && (
                    <Box component="img" src={ev.photoUrl} alt=""
                      sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1.5, mt: 0.5 }} />
                  )}
                </Paper>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default LifeTimeline;
