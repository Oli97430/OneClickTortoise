import React, { useState, useEffect, ChangeEvent, useMemo } from 'react';
import {
  Box, Typography, Button, IconButton, Tooltip, Chip,
  TextField, Dialog, DialogTitle, DialogActions,
  ImageList, ImageListItem, Paper, Grid, Tab, Tabs
} from '@mui/material';
import { Tortoise, TortoisePhoto, WeightEntry, MeasurementEntry, Reminder, VetRecord, Clutch } from '../types';
import {
  getPhotos, addPhoto, deletePhoto,
  getWeights, addWeight, updateWeight, deleteWeight,
  updateTortoise, getMeasurements, addMeasurement, deleteMeasurement,
  getReminders, uploadPhotoFile, getVetRecords, getClutches
} from '../storage';

import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import StraightenIcon from '@mui/icons-material/Straighten';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import EditTortoiseDialog from './EditTortoiseDialog';
import GrowthCharts from './GrowthCharts';
import AlertsBanner from './AlertsBanner';
import VetSection from './VetSection';
import LifeTimeline from './LifeTimeline';
import ClutchSection from './ClutchSection';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  tortoise: Tortoise;
  onBack: () => void;
}

function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y} an${y > 1 ? 's' : ''} ${m} mois` : `${y} an${y > 1 ? 's' : ''}`;
}

const TortoiseDetail: React.FC<Props> = ({ tortoise, onBack }) => {
  if (!tortoise?.id) {
    return <Box sx={{ p: 4, bgcolor: '#ffcdd2', color: '#b71c1c', fontWeight: 'bold' }}>ERREUR : fiche tortue non transmise</Box>;
  }

  const age = calcAge(tortoise.birthDate);

  const [photos, setPhotos]               = useState<TortoisePhoto[]>([]);
  const [weights, setWeights]             = useState<WeightEntry[]>([]);
  const [measurements, setMeasurements]   = useState<MeasurementEntry[]>([]);
  const [speciesWeights, setSpeciesWeights] = useState<WeightEntry[]>([]);
  const [reminders, setReminders]         = useState<Reminder[]>([]);
  const [vetRecords, setVetRecords]       = useState<VetRecord[]>([]);
  const [clutches, setClutches]           = useState<Clutch[]>([]);
  const [period, setPeriod]               = useState<number | null>(null);
  const [activeTab, setActiveTab]         = useState(0);

  const [newWeight, setNewWeight]   = useState('');
  const [newNote, setNewNote]       = useState('');
  const [newLength, setNewLength]   = useState('');
  const [newWidth, setNewWidth]     = useState('');
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);

  const [editOpen, setEditOpen]                   = useState(false);
  const [weightToDelete, setWeightToDelete]       = useState<string | null>(null);
  const [measureToDelete, setMeasureToDelete]     = useState<string | null>(null);
  const [editingWeight, setEditingWeight]         = useState<WeightEntry | null>(null);
  const [editValue, setEditValue]                 = useState('');
  const [editNote2, setEditNote2]                 = useState('');

  useEffect(() => {
    const load = async () => {
      const [allPhotos, allWeights, allMeasures, allReminders, allVetRecords, allClutches] = await Promise.all([
        getPhotos(), getWeights(), getMeasurements(), getReminders(), getVetRecords(), getClutches()
      ]);
      setPhotos(allPhotos.filter(p => p.tortoiseId === tortoise.id));
      const myWeights = allWeights.filter(w => w.tortoiseId === tortoise.id);
      setWeights(myWeights);
      setSpeciesWeights(allWeights);
      setMeasurements(allMeasures.filter(m => m.tortoiseId === tortoise.id));
      setReminders(allReminders);
      setVetRecords(allVetRecords.filter(v => v.tortoiseId === tortoise.id));
      setClutches(allClutches.filter(c => c.tortoiseId === tortoise.id));
    };
    load();
  }, [tortoise.id]);

  // ── Upload photos (commun file input + drag & drop) ───────────────────────
  const uploadFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    setUploading(true);
    try {
      const newPhotos: TortoisePhoto[] = await Promise.all(imageFiles.map(async file => {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const url = await uploadPhotoFile(base64, file.name);
        return { tortoiseId: tortoise.id, url, date: new Date().toISOString() } as TortoisePhoto;
      }));
      for (const p of newPhotos) await addPhoto(p);
      const all = await getPhotos();
      setPhotos(all.filter(p => p.tortoiseId === tortoise.id));
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    uploadFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const handleDeletePhoto = async (id: string) => {
    await deletePhoto(id);
    const all = await getPhotos();
    setPhotos(all.filter(p => p.tortoiseId === tortoise.id));
  };

  // ── Poids ────────────────────────────────────────────────────────────────
  const handleAddWeight = async () => {
    const w = parseFloat(newWeight);
    if (isNaN(w)) return;
    try {
      await addWeight({ tortoiseId: tortoise.id, date: new Date().toISOString(), weight: w, note: newNote });
      const all = await getWeights();
      setWeights(all.filter(w => w.tortoiseId === tortoise.id));
      setNewWeight(''); setNewNote('');
    } catch (err: any) { alert('Erreur poids : ' + err.message); }
  };

  const handleDeleteWeight = async () => {
    if (!weightToDelete) return;
    await deleteWeight(weightToDelete);
    const all = await getWeights();
    setWeights(all.filter(w => w.tortoiseId === tortoise.id));
    setWeightToDelete(null);
  };

  const handleUpdateWeight = async () => {
    if (!editingWeight) return;
    const num = parseFloat(editValue);
    if (isNaN(num)) return;
    await updateWeight(editingWeight.id, { weight: num, note: editNote2 });
    const all = await getWeights();
    setWeights(all.filter(w => w.tortoiseId === tortoise.id));
    setEditingWeight(null);
  };

  // ── Mesures ──────────────────────────────────────────────────────────────
  const handleAddMeasurement = async () => {
    const len = parseFloat(newLength), wid = parseFloat(newWidth);
    if (isNaN(len) || isNaN(wid)) return;
    try {
      await addMeasurement({ tortoiseId: tortoise.id, date: new Date().toISOString(), length: len, width: wid });
      const all = await getMeasurements();
      setMeasurements(all.filter(m => m.tortoiseId === tortoise.id));
      setNewLength(''); setNewWidth('');
    } catch (err: any) { alert('Erreur mesure : ' + err.message); }
  };

  const handleDeleteMeasure = async () => {
    if (!measureToDelete) return;
    await deleteMeasurement(measureToDelete);
    const all = await getMeasurements();
    setMeasurements(all.filter(m => m.tortoiseId === tortoise.id));
    setMeasureToDelete(null);
  };

  const mainPhoto = useMemo(() => {
    if (!photos.length) return null;
    return (photos.find(p => p.isMain) || photos[0]).url;
  }, [photos]);

  const lastWeight = weights.length > 0
    ? [...weights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  const lastMeasure = measurements.length > 0
    ? [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  // ── Export PDF ───────────────────────────────────────────────────────────
  const exportPdf = async () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = 595, M = 40;

    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, W, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text('OneClickTortoise — Fiche d\'identite', W / 2, 44, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Nom :', M, 100); doc.setFont('helvetica', 'normal'); doc.text(tortoise.name, M + 45, 100);
    doc.setFont('helvetica', 'bold'); doc.text('Espece :', 320, 100); doc.setFont('helvetica', 'normal'); doc.text(tortoise.species, 390, 100);
    doc.setFont('helvetica', 'bold'); doc.text('Sexe :', M, 120); doc.setFont('helvetica', 'normal'); doc.text(tortoise.sex, M + 40, 120);
    doc.setFont('helvetica', 'bold'); doc.text('Naissance :', 320, 120); doc.setFont('helvetica', 'normal');
    doc.text(tortoise.birthDate ? new Date(tortoise.birthDate).toLocaleDateString('fr-FR') : '-', 400, 120);
    doc.setFont('helvetica', 'bold'); doc.text('Age :', M, 140); doc.setFont('helvetica', 'normal'); doc.text(age || '-', M + 40, 140);
    if (lastWeight) {
      doc.setFont('helvetica', 'bold'); doc.text('Dernier poids :', M, 160); doc.setFont('helvetica', 'normal');
      doc.text(`${lastWeight.weight} g`, M + 90, 160);
    }
    if (lastMeasure) {
      doc.setFont('helvetica', 'bold'); doc.text('Derniere mesure :', 320, 160); doc.setFont('helvetica', 'normal');
      doc.text(`L: ${lastMeasure.length}mm  l: ${lastMeasure.width}mm`, 430, 160);
    }
    if (tortoise.notes) {
      doc.setFont('helvetica', 'bold'); doc.text('Notes :', M, 180); doc.setFont('helvetica', 'normal');
      doc.text(tortoise.notes, M + 45, 180, { maxWidth: 480 });
    }

    let y = 210;
    if (weights.length > 0) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.text('Historique des pesees', M, y); y += 10;
      autoTable(doc, {
        head: [['Date', 'Poids (g)', 'Note']],
        body: [...weights]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 20)
          .map(w => [new Date(w.date).toLocaleDateString('fr-FR'), w.weight.toString(), w.note || '']),
        startY: y, margin: { left: M, right: M },
        headStyles: { fillColor: [27, 94, 32] }, styles: { fontSize: 10, cellPadding: 4 },
      });
      y = (doc as any).lastAutoTable.finalY + 20;
    }

    if (measurements.length > 0) {
      if (y > 650) { doc.addPage(); y = 40; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.text('Historique des mesures', M, y); y += 10;
      autoTable(doc, {
        head: [['Date', 'Longueur (mm)', 'Largeur (mm)']],
        body: [...measurements]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 20)
          .map(m => [new Date(m.date).toLocaleDateString('fr-FR'), m.length.toString(), m.width.toString()]),
        startY: y, margin: { left: M, right: M },
        headStyles: { fillColor: [21, 101, 192] }, styles: { fontSize: 10, cellPadding: 4 },
      });
      y = (doc as any).lastAutoTable.finalY + 20;
    }

    if (vetRecords.length > 0) {
      if (y > 600) { doc.addPage(); y = 40; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.text('Fiche veterinaire', M, y); y += 10;
      autoTable(doc, {
        head: [['Date', 'Type', 'Titre', 'Veterinaire']],
        body: [...vetRecords]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map(v => [new Date(v.date).toLocaleDateString('fr-FR'), v.type, v.title, v.vetName || '']),
        startY: y, margin: { left: M, right: M },
        headStyles: { fillColor: [198, 40, 40] }, styles: { fontSize: 10, cellPadding: 4 },
      });
    }

    const myReminders = reminders.filter(r => r.tortoiseId === tortoise.id && !r.done);
    if (myReminders.length > 0) {
      doc.addPage(); let ry = 40;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.text('Rappels actifs', M, ry); ry += 10;
      autoTable(doc, {
        head: [['Type', 'Description', 'Echeance']],
        body: myReminders.map(r => [r.type, r.label, new Date(r.dueDate).toLocaleDateString('fr-FR')]),
        startY: ry, margin: { left: M, right: M },
        headStyles: { fillColor: [100, 60, 0] }, styles: { fontSize: 10, cellPadding: 4 },
      });
    }

    doc.save(`fiche_${tortoise.name.replace(/\s+/g, '_')}.pdf`);
  };

  // ── Rendu ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', pb: 6 }}>

      {/* Alertes */}
      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2 }}>
        <AlertsBanner
          tortoiseId={tortoise.id}
          tortoiseName={tortoise.name}
          weights={weights}
          measurements={measurements}
          reminders={reminders}
          onRemindersChange={setReminders}
        />
      </Box>

      {/* En-tête fiche */}
      <Paper elevation={0} sx={{
        background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 60%, #388e3c 100%)',
        color: '#fff', borderRadius: 4, mx: { xs: 1, md: 0 }, mb: 3, p: 3,
        display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap'
      }}>
        {mainPhoto ? (
          <Box component="img" src={mainPhoto} alt={tortoise.name}
            sx={{ width: 120, height: 120, borderRadius: 3, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
        ) : (
          <Box sx={{ width: 120, height: 120, borderRadius: 3, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', flexShrink: 0 }}>
            🐢
          </Box>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={800} sx={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            {tortoise.name}
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.85, fontStyle: 'italic', mb: 1 }}>
            {tortoise.species}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {age && <Chip label={`🎂 ${age}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 }} />}
            <Chip label={tortoise.sex} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }} />
            {lastWeight && <Chip label={`⚖️ ${lastWeight.weight}g`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }} />}
            {lastMeasure && <Chip label={`📏 ${lastMeasure.length}×${lastMeasure.width}mm`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }} />}
          </Box>
          {tortoise.notes && (
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>{tortoise.notes}</Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Tooltip title="Modifier">
            <IconButton sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' } }}
              onClick={() => setEditOpen(true)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exporter PDF">
            <IconButton sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' } }}
              onClick={exportPdf}>
              <PictureAsPdfIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Tabs de navigation */}
      <Box sx={{ px: { xs: 1, md: 0 }, mb: 2 }}>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              bgcolor: '#f9fbe7',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minWidth: 100 },
              '& .Mui-selected': { color: '#2e7d32' },
              '& .MuiTabs-indicator': { bgcolor: '#2e7d32', height: 3 },
            }}
          >
            <Tab label="📊 Suivi" />
            <Tab label={`📷 Photos ${photos.length > 0 ? `(${photos.length})` : ''}`} />
            <Tab label={`🩺 Vétérinaire ${vetRecords.length > 0 ? `(${vetRecords.length})` : ''}`} />
            <Tab label={`🥚 Pontes ${clutches.length > 0 ? `(${clutches.length})` : ''}`} />
            <Tab label="📅 Chronologie" />
          </Tabs>
        </Paper>
      </Box>

      <Box sx={{ px: { xs: 1, md: 0 } }}>

        {/* ─── Tab 0 : Suivi ─────────────────────────────────────────────── */}
        {activeTab === 0 && (
          <Box>
            {/* Saisie poids + mesure */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, border: '1.5px solid #c8e6c9', borderRadius: 3 }}>
                  <Typography variant="subtitle2" color="success.dark" fontWeight={700} sx={{ mb: 1 }}>
                    ⚖️ Ajouter un poids
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <TextField label="Poids (g)" type="number" size="small" value={newWeight}
                      onChange={e => setNewWeight(e.target.value)} sx={{ width: 100 }} inputProps={{ min: 0 }} />
                    <TextField label="Note" size="small" value={newNote}
                      onChange={e => setNewNote(e.target.value)} sx={{ flex: 1, minWidth: 100 }} />
                    <Button variant="contained" color="success" size="small" startIcon={<FitnessCenterIcon />}
                      onClick={handleAddWeight} sx={{ borderRadius: 2, textTransform: 'none' }}>
                      Ajouter
                    </Button>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, border: '1.5px solid #bbdefb', borderRadius: 3 }}>
                  <Typography variant="subtitle2" color="primary.dark" fontWeight={700} sx={{ mb: 1 }}>
                    📏 Ajouter une mesure
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <TextField label="Longueur (mm)" type="number" size="small" value={newLength}
                      onChange={e => setNewLength(e.target.value)} sx={{ width: 120 }} />
                    <TextField label="Largeur (mm)" type="number" size="small" value={newWidth}
                      onChange={e => setNewWidth(e.target.value)} sx={{ width: 110 }} />
                    <Button variant="contained" size="small" startIcon={<StraightenIcon />}
                      onClick={handleAddMeasurement} sx={{ borderRadius: 2, textTransform: 'none' }}>
                      Ajouter
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Graphiques de croissance */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e8f5e9' }}>
              <GrowthCharts
                weights={weights}
                measurements={measurements}
                speciesWeights={speciesWeights}
                period={period}
                onPeriodChange={setPeriod}
                tortoiseId={tortoise.id}
              />
            </Paper>

            {/* Historique poids */}
            {weights.length > 0 && (
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid #e8f5e9', overflowX: 'auto' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>⚖️ Historique des pesées</Typography>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#e8f5e9' }}>
                      <th style={{ border: '1px solid #c8e6c9', padding: '6px 10px', textAlign: 'left' }}>Date</th>
                      <th style={{ border: '1px solid #c8e6c9', padding: '6px 10px', textAlign: 'right' }}>Poids (g)</th>
                      <th style={{ border: '1px solid #c8e6c9', padding: '6px 10px' }}>Note</th>
                      <th style={{ border: '1px solid #c8e6c9', padding: '6px 10px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...weights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(w => (
                      <tr key={w.id}>
                        <td style={{ border: '1px solid #e8f5e9', padding: '5px 10px' }}>{new Date(w.date).toLocaleDateString('fr-FR')}</td>
                        <td style={{ border: '1px solid #e8f5e9', padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>{w.weight}</td>
                        <td style={{ border: '1px solid #e8f5e9', padding: '5px 10px', color: '#666', fontStyle: 'italic' }}>{w.note || ''}</td>
                        <td style={{ border: '1px solid #e8f5e9', padding: '5px 10px', textAlign: 'center' }}>
                          <IconButton size="small" onClick={() => { setEditingWeight(w); setEditValue(String(w.weight)); setEditNote2(w.note || ''); }} sx={{ mr: 0.5 }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setWeightToDelete(w.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Paper>
            )}

            {/* Historique mesures */}
            {measurements.length > 0 && (
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid #e3f2fd', overflowX: 'auto' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📏 Historique des mesures</Typography>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#e3f2fd' }}>
                      <th style={{ border: '1px solid #bbdefb', padding: '6px 10px', textAlign: 'left' }}>Date</th>
                      <th style={{ border: '1px solid #bbdefb', padding: '6px 10px', textAlign: 'right' }}>Long. (mm)</th>
                      <th style={{ border: '1px solid #bbdefb', padding: '6px 10px', textAlign: 'right' }}>Larg. (mm)</th>
                      <th style={{ border: '1px solid #bbdefb', padding: '6px 10px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                      <tr key={m.id}>
                        <td style={{ border: '1px solid #e3f2fd', padding: '5px 10px' }}>{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                        <td style={{ border: '1px solid #e3f2fd', padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>{m.length}</td>
                        <td style={{ border: '1px solid #e3f2fd', padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>{m.width}</td>
                        <td style={{ border: '1px solid #e3f2fd', padding: '5px 10px', textAlign: 'center' }}>
                          <IconButton size="small" color="error" onClick={() => setMeasureToDelete(m.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Paper>
            )}
          </Box>
        )}

        {/* ─── Tab 1 : Photos ────────────────────────────────────────────── */}
        {activeTab === 1 && (
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid #f3e5f5' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>📷 Photos</Typography>
              <Button component="label" variant="outlined" size="small" startIcon={<AddPhotoAlternateIcon />}
                disabled={uploading} sx={{ borderRadius: 3, textTransform: 'none' }}>
                {uploading ? 'Upload...' : 'Ajouter'}
                <input type="file" hidden accept="image/*" multiple onChange={handlePhotoChange} />
              </Button>
            </Box>

            {/* Zone drag & drop */}
            <Box
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              sx={{
                border: `2px dashed ${dragOver ? '#2e7d32' : '#c8e6c9'}`,
                borderRadius: 3,
                p: 3,
                mb: 2,
                textAlign: 'center',
                bgcolor: dragOver ? 'rgba(46,125,50,0.06)' : '#fafafa',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('photo-drop-input')?.click()}
            >
              <input id="photo-drop-input" type="file" hidden accept="image/*" multiple onChange={handlePhotoChange} />
              <CloudUploadIcon sx={{ fontSize: 36, color: dragOver ? '#2e7d32' : '#bdbdbd', mb: 1 }} />
              <Typography variant="body2" color={dragOver ? 'success.main' : 'text.secondary'}>
                {uploading ? 'Envoi en cours…' : 'Glissez-déposez des photos ici, ou cliquez pour sélectionner'}
              </Typography>
            </Box>

            {/* Photos identitaires */}
            {(tortoise.facePhoto || tortoise.carapacePhoto || tortoise.plastronPhoto) && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                  Photos d'identité
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {[
                    { src: tortoise.facePhoto, label: 'Face' },
                    { src: tortoise.carapacePhoto, label: 'Carapace' },
                    { src: tortoise.plastronPhoto, label: 'Plastron' },
                  ].filter(p => p.src).map(p => (
                    <Box key={p.label} sx={{ textAlign: 'center' }}>
                      <Box component="img" src={p.src} alt={p.label}
                        sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 2, border: '2px solid #388e3c' }} />
                      <Typography variant="caption" display="block" color="text.secondary">{p.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Galerie */}
            {photos.length > 0 ? (
              <ImageList cols={3} gap={8} rowHeight={140}>
                {photos.map(p => (
                  <ImageListItem key={p.id} sx={{ borderRadius: 2, overflow: 'hidden', position: 'relative', '&:hover .del-btn': { opacity: 1 } }}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <IconButton className="del-btn" size="small" onClick={() => handleDeletePhoto(p.id)}
                      sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', opacity: 0, transition: 'opacity 0.2s', '&:hover': { bgcolor: 'rgba(200,0,0,0.7)' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ImageListItem>
                ))}
              </ImageList>
            ) : (
              <Typography color="text.secondary" textAlign="center" py={2}>Aucune photo dans la galerie</Typography>
            )}
          </Paper>
        )}

        {/* ─── Tab 2 : Vétérinaire ───────────────────────────────────────── */}
        {activeTab === 2 && (
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid #ffcdd2' }}>
            <VetSection
              tortoiseId={tortoise.id}
              vetRecords={vetRecords}
              onVetRecordsChange={setVetRecords}
            />
          </Paper>
        )}

        {/* ─── Tab 3 : Pontes ────────────────────────────────────────────── */}
        {activeTab === 3 && (
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid #ffe0b2' }}>
            <ClutchSection
              tortoiseId={tortoise.id}
              clutches={clutches}
              onClutchesChange={setClutches}
            />
          </Paper>
        )}

        {/* ─── Tab 4 : Chronologie ───────────────────────────────────────── */}
        {activeTab === 4 && (
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid #e8eaf6' }}>
            <LifeTimeline
              weights={weights}
              measurements={measurements}
              photos={photos}
              vetRecords={vetRecords}
            />
          </Paper>
        )}

        <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined"
          sx={{ borderRadius: 3, textTransform: 'none' }}>
          Retour à la liste
        </Button>
      </Box>

      {/* Dialogs */}
      <Dialog open={!!weightToDelete} onClose={() => setWeightToDelete(null)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle>Supprimer cette pesée ?</DialogTitle>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setWeightToDelete(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDeleteWeight}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!measureToDelete} onClose={() => setMeasureToDelete(null)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle>Supprimer cette mesure ?</DialogTitle>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMeasureToDelete(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDeleteMeasure}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editingWeight} onClose={() => setEditingWeight(null)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle>Modifier le poids</DialogTitle>
        <Box sx={{ px: 3, pb: 2, display: 'flex', gap: 2 }}>
          <TextField label="Poids (g)" type="number" size="small" value={editValue} onChange={e => setEditValue(e.target.value)} />
          <TextField label="Note" size="small" value={editNote2} onChange={e => setEditNote2(e.target.value)} />
        </Box>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditingWeight(null)}>Annuler</Button>
          <Button variant="contained" color="success" onClick={handleUpdateWeight}>Enregistrer</Button>
        </DialogActions>
      </Dialog>

      <EditTortoiseDialog
        open={editOpen}
        tortoise={tortoise}
        onClose={() => setEditOpen(false)}
        onSave={async (updated) => {
          try {
            await updateTortoise(updated.id, updated);
            setEditOpen(false);
            window.location.reload();
          } catch (err) {
            alert('Erreur mise à jour');
          }
        }}
      />
    </Box>
  );
};

export default TortoiseDetail;
