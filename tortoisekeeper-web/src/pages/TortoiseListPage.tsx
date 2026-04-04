import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Container, Typography, TextField, InputAdornment, Box, Fab, Chip, Alert,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import TortoiseList from '../components/TortoiseList';
import AddTortoiseDialog from '../components/AddTortoiseDialog';
import EditTortoiseDialog from '../components/EditTortoiseDialog';
import { Tortoise, WeightEntry } from '../types';
import { getTortoises, addTortoise, updateTortoise, getPhotos, getWeights, exportElevage, importElevage } from '../storage';

interface ImportData {
  tortoises?: unknown[];
  weights?: unknown[];
  measurements?: unknown[];
  photos?: unknown[];
  vetrecords?: unknown[];
  clutches?: unknown[];
}

const TortoiseListPage: React.FC = () => {
  const [tortoises, setTortoises] = useState<Tortoise[]>([]);
  const [allWeights, setAllWeights] = useState<WeightEntry[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTortoise, setSelectedTortoise] = useState<Tortoise | null>(null);

  // Export / Import
  const [exporting, setExporting] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getTortoises().then(setTortoises);
    getWeights().then(setAllWeights);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try { await exportElevage(); }
    catch (err: any) { alert('Export échoué : ' + err.message); }
    finally { setExporting(false); }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as ImportData;
        if (!Array.isArray(parsed.tortoises)) throw new Error('Format invalide');
        setImportData(parsed);
        setImportDialog(true);
      } catch {
        setImportError('Fichier invalide — veuillez choisir un backup OneClickTortoise (.json)');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importData) return;
    setImporting(true);
    try {
      const { imported } = await importElevage(importData);
      setImportDialog(false);
      setImportData(null);
      // Recharger les données
      const [torts, weights] = await Promise.all([getTortoises(), getWeights()]);
      setTortoises(torts);
      setAllWeights(weights);
      alert(`✅ Import réussi : ${imported} tortue${imported > 1 ? 's' : ''} importée${imported > 1 ? 's' : ''}.`);
    } catch (err: any) {
      alert('Import échoué : ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Tortues non pesées depuis > 30 jours
  const overdueAlerts = useMemo(() => {
    return tortoises.filter(t => {
      const tWeights = allWeights.filter(w => w.tortoiseId === t.id);
      if (tWeights.length === 0) return true;
      const last = tWeights.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
      const days = Math.floor((Date.now() - new Date(last.date).getTime()) / 86400_000);
      return days > 30;
    });
  }, [tortoises, allWeights]);

  const handleAddTortoise = async (t: Tortoise, photos: string[] = []) => {
    setTortoises(prev => [...prev, t]);
    try {
      const created = await addTortoise({
        name: t.name,
        birthDate: t.birthDate,
        isBirthDateApproximate: t.isBirthDateApproximate,
        species: t.species,
        sex: t.sex,
        notes: t.notes,
        facePhoto: t.facePhoto,
        plastronPhoto: t.plastronPhoto,
        carapacePhoto: t.carapacePhoto
      });
      setTortoises(prev => prev.map(x => x.id === t.id ? created : x));
      if (photos.length > 0) {
        await getPhotos();
      }
      setAddOpen(false);
    } catch (err) {
      console.error('Erreur création tortue', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      alert('Erreur création tortue : ' + errorMessage);
      setTortoises(prev => prev.filter(x => x.id !== t.id));
    }
  };

  const handleEditTortoise = (tortoise: Tortoise) => {
    setSelectedTortoise(tortoise);
    setEditOpen(true);
  };

  const handleSaveTortoise = async (updated: Tortoise) => {
    setTortoises(prev => prev.map(t => t.id === updated.id ? updated : t));
    await updateTortoise(updated.id, updated);
    setEditOpen(false);
    setSelectedTortoise(null);
  };

  const filtered = tortoises.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.species.toLowerCase().includes(search.toLowerCase())
  );

  const speciesCount = useMemo(() => new Set(tortoises.map(t => t.species)).size, [tortoises]);

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e8f5e9 0%, #f9fbe7 100%)' }}>

      {/* HERO */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 40%, #388e3c 70%, #558b2f 100%)',
          color: '#fff',
          py: { xs: 5, md: 7 },
          px: 2,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Motif carapace en fond */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
          <img src={`${process.env.PUBLIC_URL}/logo.svg`} alt="OneClickTortoise logo" style={{ width: 64, height: 64, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} />
          <Typography
            variant="h2"
            fontWeight={800}
            sx={{ letterSpacing: 1, textShadow: '0 2px 12px rgba(0,0,0,0.25)', fontSize: { xs: '2rem', md: '3rem' } }}
          >
            OneClickTortoise
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ opacity: 0.85, fontWeight: 400, mb: 3 }}>
          Le carnet de santé de vos tortues
        </Typography>

        {overdueAlerts.length > 0 && (
          <Box sx={{ mb: 2, maxWidth: 600, mx: 'auto' }}>
            <Alert severity="warning" sx={{ borderRadius: 3, background: 'rgba(255,255,255,0.15)', color: '#fff', '& .MuiAlert-icon': { color: '#fff' } }}>
              ⚖️ {overdueAlerts.length} tortue{overdueAlerts.length > 1 ? 's' : ''} n'ont pas été pesée{overdueAlerts.length > 1 ? 's' : ''} depuis plus de 30 jours : {overdueAlerts.map(t => t.name).join(', ')}
            </Alert>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label={`${tortoises.length} tortue${tortoises.length > 1 ? 's' : ''} enregistrée${tortoises.length > 1 ? 's' : ''}`}
            sx={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', px: 1 }}
          />
          {tortoises.length > 0 && (
            <Chip
              label={`${speciesCount} espèce${speciesCount > 1 ? 's' : ''}`}
              sx={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: '0.9rem', px: 1 }}
            />
          )}
        </Box>
      </Box>

      {/* CONTENU */}
      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* BARRE DE RECHERCHE + EXPORT/IMPORT */}
        <Box sx={{
          background: '#fff',
          borderRadius: 4,
          boxShadow: '0 4px 24px rgba(46,125,50,0.12)',
          p: 2,
          mb: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}>
          <TextField
            fullWidth
            placeholder="🔍  Rechercher par nom ou espèce…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#388e3c' }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 3 }
            }}
            sx={{
              flex: 1, minWidth: 200,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#c8e6c9' },
                '&:hover fieldset': { borderColor: '#66bb6a' },
                '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
              }
            }}
          />
          <Tooltip title="Exporter tout l'élevage en fichier JSON">
            <Button
              variant="outlined"
              size="small"
              startIcon={exporting ? <CircularProgress size={14} /> : <DownloadIcon />}
              onClick={handleExport}
              disabled={exporting}
              sx={{ borderRadius: 3, textTransform: 'none', borderColor: '#c8e6c9', color: '#2e7d32', whiteSpace: 'nowrap',
                '&:hover': { borderColor: '#2e7d32', bgcolor: '#f1f8e9' } }}
            >
              Exporter
            </Button>
          </Tooltip>
          <Tooltip title="Importer un backup JSON (remplace toutes les données)">
            <Button
              variant="outlined"
              size="small"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ borderRadius: 3, textTransform: 'none', borderColor: '#bbdefb', color: '#1565c0', whiteSpace: 'nowrap',
                '&:hover': { borderColor: '#1565c0', bgcolor: '#e3f2fd' } }}
            >
              Importer
            </Button>
          </Tooltip>
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImportFile} />
          {importError && <Typography variant="caption" color="error" sx={{ width: '100%' }}>{importError}</Typography>}
        </Box>

        {/* MESSAGE VIDE */}
        {filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, color: '#757575' }}>
            <Typography variant="h1" sx={{ fontSize: '5rem', mb: 2 }}>🐢</Typography>
            <Typography variant="h6" color="text.secondary">
              {search ? 'Aucune tortue trouvée pour cette recherche.' : 'Aucune tortue enregistrée. Ajoutez-en une !'}
            </Typography>
          </Box>
        )}

        {/* LISTE */}
        <TortoiseList
          tortoises={filtered}
          onEdit={handleEditTortoise}
          onDelete={(id) => setTortoises(tortoises => tortoises.filter(t => t.id !== id))}
        />
      </Container>

      {/* FAB AJOUTER */}
      <Fab
        color="success"
        aria-label="Ajouter une tortue"
        onClick={() => setAddOpen(true)}
        sx={{
          position: 'fixed', bottom: 36, right: 36,
          width: 64, height: 64,
          boxShadow: '0 6px 20px rgba(46,125,50,0.4)',
          background: 'linear-gradient(135deg, #2e7d32, #66bb6a)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1b5e20, #43a047)',
            transform: 'scale(1.08)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        <AddIcon sx={{ fontSize: 32 }} />
      </Fab>

      {/* Dialog confirmation import */}
      <Dialog open={importDialog} onClose={() => !importing && setImportDialog(false)}
        PaperProps={{ sx: { borderRadius: 4, maxWidth: 420 } }}>
        <DialogTitle fontWeight={700}>⚠️ Confirmer l'import</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Cette action va <strong>remplacer toutes les données actuelles</strong> par le contenu du fichier importé :
          </Typography>
          {importData && (
            <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 2, p: 2, mt: 1 }}>
              <Typography variant="body2">🐢 {importData.tortoises?.length ?? 0} tortue{(importData.tortoises?.length ?? 0) > 1 ? 's' : ''}</Typography>
              <Typography variant="body2">⚖️ {importData.weights?.length ?? 0} pesées</Typography>
              <Typography variant="body2">📏 {importData.measurements?.length ?? 0} mesures</Typography>
              <Typography variant="body2">🩺 {importData.vetrecords?.length ?? 0} fiches vétérinaires</Typography>
              <Typography variant="body2">📷 {importData.photos?.length ?? 0} photos</Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            Les données actuelles seront perdues. Cette action est irréversible.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setImportDialog(false)} disabled={importing}>Annuler</Button>
          <Button variant="contained" color="warning" onClick={handleImportConfirm} disabled={importing}
            startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}>
            {importing ? 'Import en cours…' : 'Importer et remplacer'}
          </Button>
        </DialogActions>
      </Dialog>

      <AddTortoiseDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAddTortoise} />
      <EditTortoiseDialog
        open={editOpen}
        tortoise={selectedTortoise || ({} as Tortoise)}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveTortoise}
      />
    </Box>
  );
};

export default TortoiseListPage;
