import React, { useEffect, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import { Timeline as VisTimeline, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { Tortoise, WeightEntry, MeasurementEntry, TortoisePhoto } from '../types';
import { getWeights, getMeasurements, getPhotos } from '../storage';

interface Props {
  tortoise: Tortoise;
  onBack: () => void;
}

const TimelinePage: React.FC<Props> = ({ tortoise, onBack }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeline, setTimeline] = useState<any>();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([]);
  const [photos, setPhotos] = useState<TortoisePhoto[]>([]);
  const [filters, setFilters] = useState({ birth: true, weight: true, measurement: true, photo: true });

  // Charger données
  useEffect(() => {
    getWeights().then(list => setWeights(list.filter(w => w.tortoiseId === tortoise.id)));
    getMeasurements().then(list => setMeasurements(list.filter(m => m.tortoiseId === tortoise.id)));
    getPhotos().then(list => setPhotos(list.filter(p => p.tortoiseId === tortoise.id)));
  }, [tortoise.id]);

  // Initialiser timeline
  useEffect(() => {
    if (!containerRef.current) return;
    timeline?.destroy();
    const items = new DataSet<any>();
    const groups = new DataSet([
      { id: 'birth', content: 'Naissance' },
      { id: 'weight', content: 'Poids' },
      { id: 'measurement', content: 'Mesures' },
      { id: 'photo', content: 'Photos' }
    ]);
    if (filters.birth && tortoise.birthDate) {
      items.add({ id: 'birth', group: 'birth', content: 'Naissance', start: tortoise.birthDate });
    }
    if (filters.weight) weights.forEach(w => items.add({ id: `w-${w.id}`, group: 'weight', content: `${w.weight}g`, start: w.date }));
    if (filters.measurement) measurements.forEach(m => items.add({ id: `m-${m.id}`, group: 'measurement', content: `${m.length}x${m.width}mm`, start: m.date }));
    if (filters.photo) photos.forEach(p => items.add({ id: `p-${p.id}`, group: 'photo', content: 'Photo', start: p.date }));
    const options = {
      stack: false,
      zoomable: true,
      zoomKey: 'ctrlKey' as any,
      horizontalScroll: true,
      orientation: 'top',
      margin: { item: 20, axis: 40 }
    };
    const tl = new VisTimeline(containerRef.current, items, groups, options);
    setTimeline(tl);
    return () => tl.destroy();
  }, [containerRef, weights, measurements, photos, filters]);

  return (
    <Box sx={{ p: 2 }}>
      <Button variant="outlined" onClick={onBack}>Retour</Button>
      <Box sx={{ mt: 2, mb: 2 }}>
        {Object.keys(filters).map((key) => (
          <Button
            key={key}
            variant={filters[key as keyof typeof filters] ? 'contained' : 'outlined'}
            onClick={() => setFilters(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
            sx={{ mr: 1 }}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </Button>
        ))}
      </Box>
      <div ref={containerRef} style={{ height: '400px', border: '1px solid #ccc' }} />
    </Box>
  );
};

export default TimelinePage;
