import React, { useMemo } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Chip } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js';
import { WeightEntry, MeasurementEntry } from '../types';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Props {
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  speciesWeights: WeightEntry[];   // poids de TOUTES les tortues de la même espèce
  period: number | null;
  onPeriodChange: (p: number | null) => void;
  tortoiseId: string;
}

const PERIODS = [
  { label: '30j', value: 30 },
  { label: '90j', value: 90 },
  { label: '1an', value: 365 },
  { label: 'Tout', value: null },
];

function linearTrend(points: number[]): number[] {
  if (points.length < 2) return [];
  const n = points.length;
  const x = points.map((_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = points.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * points[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return [];
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return x.map(xi => slope * xi + intercept);
}

const GrowthCharts: React.FC<Props> = ({
  weights, measurements, speciesWeights, period, onPeriodChange, tortoiseId
}) => {
  const cutoff = period ? Date.now() - period * 86400_000 : 0;

  // ── Poids filtrés + triés ────────────────────────────────────────────────
  const filteredW = useMemo(() =>
    weights
      .filter(w => !period || new Date(w.date).getTime() >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [weights, period, cutoff]
  );

  // ── Moyenne espèce par date (exclus la tortue courante) ─────────────────
  const speciesAvgByDate = useMemo(() => {
    if (!filteredW.length) return [];
    const others = speciesWeights.filter(w => w.tortoiseId !== tortoiseId);
    if (!others.length) return filteredW.map(() => null);
    const avgOthers = others.reduce((s, w) => s + w.weight, 0) / others.length;
    return filteredW.map(() => Math.round(avgOthers));
  }, [filteredW, speciesWeights, tortoiseId]);

  const hasSpeciesAvg = speciesAvgByDate.some(v => v !== null);
  const trend = linearTrend(filteredW.map(w => w.weight));
  const labels = filteredW.map(w => new Date(w.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));

  const weightChart = {
    labels,
    datasets: [
      {
        label: 'Poids (g)',
        data: filteredW.map(w => w.weight),
        fill: true,
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46,125,50,0.08)',
        pointBackgroundColor: '#2e7d32',
        pointRadius: 4,
        tension: 0.3,
      },
      ...(trend.length ? [{
        label: 'Tendance',
        data: trend,
        fill: false,
        borderColor: '#ff8f00',
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0,
      }] : []),
      ...(hasSpeciesAvg ? [{
        label: 'Moy. espèce',
        data: speciesAvgByDate,
        fill: false,
        borderColor: '#9c27b0',
        borderDash: [3, 3],
        pointRadius: 0,
        tension: 0,
        borderWidth: 1.5,
      }] : []),
    ],
  };

  // ── Mesures ───────────────────────────────────────────────────────────────
  const filteredM = useMemo(() =>
    measurements
      .filter(m => !period || new Date(m.date).getTime() >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [measurements, period, cutoff]
  );

  const measureChart = {
    labels: filteredM.map(m => new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })),
    datasets: [
      {
        label: 'Longueur (mm)',
        data: filteredM.map(m => m.length),
        fill: false,
        borderColor: '#1565c0',
        backgroundColor: 'rgba(21,101,192,0.08)',
        pointRadius: 4,
        tension: 0.3,
      },
      {
        label: 'Largeur (mm)',
        data: filteredM.map(m => m.width),
        fill: false,
        borderColor: '#00838f',
        pointRadius: 4,
        tension: 0.3,
      },
    ],
  };

  const chartOpts = (unit: string) => ({
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { boxWidth: 14, font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y} ${unit}` } },
    },
    scales: { y: { beginAtZero: false } },
  });

  // ── Dernière évolution ────────────────────────────────────────────────────
  const lastWeightDelta = filteredW.length >= 2
    ? filteredW[filteredW.length - 1].weight - filteredW[filteredW.length - 2].weight
    : null;

  return (
    <Box>
      {/* Sélecteur période */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#1b5e20' }}>
          📈 Courbes de croissance
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {lastWeightDelta !== null && (
            <Chip
              label={`${lastWeightDelta >= 0 ? '+' : ''}${lastWeightDelta} g`}
              color={lastWeightDelta >= 0 ? 'success' : 'warning'}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          )}
          <ToggleButtonGroup
            value={period ?? 'all'}
            exclusive
            size="small"
          >
            {PERIODS.map(p => (
              <ToggleButton key={String(p.value)} value={p.value ?? 'all'} sx={{ fontSize: '0.75rem', px: 1.5 }}
                onClick={() => onPeriodChange(p.value)}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Graphique poids */}
      <Box id="pdf-chart" sx={{ bgcolor: '#fff', border: '1px solid #e8f5e9', borderRadius: 3, p: 2, mb: 3, boxShadow: '0 2px 8px rgba(46,125,50,0.07)' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Poids (g){hasSpeciesAvg ? ' — ligne violette = moyenne de l\'espèce' : ''}
        </Typography>
        {filteredW.length > 0
          ? <Line data={weightChart} options={chartOpts('g')} height={110} />
          : <Typography color="text.secondary" textAlign="center" py={3}>Aucune donnée sur cette période</Typography>
        }
      </Box>

      {/* Graphique taille */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e3f2fd', borderRadius: 3, p: 2, boxShadow: '0 2px 8px rgba(21,101,192,0.07)' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Taille (mm) — longueur &amp; largeur
        </Typography>
        {filteredM.length > 0
          ? <Line data={measureChart} options={chartOpts('mm')} height={90} />
          : <Typography color="text.secondary" textAlign="center" py={3}>Aucune mesure sur cette période</Typography>
        }
      </Box>
    </Box>
  );
};

export default GrowthCharts;
