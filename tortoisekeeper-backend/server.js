require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const basicAuth = require('basic-auth');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ─── Chemins configurables via env (pour Electron packagé) ────────────────────
const DATA_DIR     = process.env.DATA_PATH    || __dirname;
const DATA_FILE    = path.join(DATA_DIR, 'data.json');
const UPLOADS_DIR  = process.env.UPLOADS_PATH || path.join(DATA_DIR, 'uploads');
const BACKUPS_DIR  = path.join(DATA_DIR, 'backups');

const PORT      = process.env.PORT      || 4000;
const AUTH_USER = process.env.AUTH_USER || 'admin';
const AUTH_PASS = process.env.AUTH_PASS || 'tortue2025';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin === 'null') return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true
}));
app.options('*', cors());

app.use(bodyParser.json({ limit: '200mb' }));

// ─── Fichiers statiques (photos sur disque) ───────────────────────────────────
fs.ensureDirSync(UPLOADS_DIR);
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function auth(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== AUTH_USER || user.pass !== AUTH_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="OneClickTortoise"');
    return res.status(401).send('Authentication required.');
  }
  next();
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateTortoise(data) {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0)
    throw new Error('Le nom de la tortue est requis');
  if (!data.birthDate || !Date.parse(data.birthDate))
    throw new Error('Une date de naissance valide est requise');
  if (!data.species || typeof data.species !== 'string')
    throw new Error('L\'espèce est requise');
  if (!['MALE', 'FEMALE', 'UNKNOWN'].includes(data.sex))
    throw new Error('Le sexe doit être MALE, FEMALE ou UNKNOWN');
  return true;
}

function validateWeight(data) {
  if (!data.tortoiseId || typeof data.tortoiseId !== 'string')
    throw new Error('L\'ID de la tortue est requis');
  if (!data.date || !Date.parse(data.date))
    throw new Error('Une date valide est requise');
  if (typeof data.weight !== 'number' || data.weight <= 0)
    throw new Error('Le poids doit être un nombre positif');
  return true;
}

function validateMeasurement(data) {
  if (!data.tortoiseId || typeof data.tortoiseId !== 'string')
    throw new Error('L\'ID de la tortue est requis');
  if (!data.date || !Date.parse(data.date))
    throw new Error('Une date valide est requise');
  if (typeof data.length !== 'number' || data.length <= 0)
    throw new Error('La longueur doit être un nombre positif');
  if (typeof data.width !== 'number' || data.width <= 0)
    throw new Error('La largeur doit être un nombre positif');
  return true;
}

function validatePhoto(data) {
  if (!data.tortoiseId || typeof data.tortoiseId !== 'string')
    throw new Error('L\'ID de la tortue est requis');
  if (!data.url || typeof data.url !== 'string')
    throw new Error('L\'URL de la photo est requise');
  if (!data.date || !Date.parse(data.date))
    throw new Error('Une date valide est requise');
  return true;
}

// ─── Lecture / Écriture avec backup automatique ───────────────────────────────
async function readData() {
  try {
    await fs.ensureDir(DATA_DIR);
    if (!(await fs.pathExists(DATA_FILE))) {
      await fs.writeJson(DATA_FILE, { tortoises: [], photos: [], weights: [], measurements: [], reminders: [], vetrecords: [], clutches: [] }, { spaces: 2 });
    }
    const data = await fs.readJson(DATA_FILE);
    if (!Array.isArray(data.measurements)) { data.measurements = []; await writeData(data); }
    if (!Array.isArray(data.reminders))    { data.reminders = [];    await writeData(data); }
    if (!Array.isArray(data.vetrecords))   { data.vetrecords = [];   await writeData(data); }
    if (!Array.isArray(data.clutches))     { data.clutches = [];     await writeData(data); }
    if (!Array.isArray(data.tortoises))    data.tortoises = [];
    if (!Array.isArray(data.photos))       data.photos = [];
    if (!Array.isArray(data.weights))      data.weights = [];
    return data;
  } catch (error) {
    console.error('Erreur lecture données:', error);
    throw new Error('Impossible de charger les données');
  }
}

async function writeData(data) {
  try {
    await fs.ensureDir(DATA_DIR);
    await fs.writeJson(DATA_FILE, data, { spaces: 2 });

    // ── Backup automatique horodaté (non bloquant) ────────────────────────
    try {
      await fs.ensureDir(BACKUPS_DIR);
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupFile = path.join(BACKUPS_DIR, `data.backup.${ts}.json`);
      await fs.copyFile(DATA_FILE, backupFile);
      const backups = (await fs.readdir(BACKUPS_DIR))
        .filter(f => f.startsWith('data.backup.'))
        .sort();
      for (const old of backups.slice(0, Math.max(0, backups.length - 7))) {
        await fs.remove(path.join(BACKUPS_DIR, old));
      }
    } catch (backupErr) {
      console.warn('[Backup] Sauvegarde ignorée :', backupErr.code || backupErr.message);
    }
  } catch (error) {
    console.error('Erreur écriture données:', error);
    throw new Error('Impossible de sauvegarder les données');
  }
}

// ─── Supprime un fichier upload si l'URL pointe vers /uploads/ ────────────────
async function deleteUploadFile(url) {
  if (url && url.includes('/uploads/')) {
    const filename = path.basename(url.split('/uploads/')[1] || '');
    if (filename) {
      await fs.remove(path.join(UPLOADS_DIR, filename)).catch(() => {});
    }
  }
}

// ─── Endpoint upload photo ────────────────────────────────────────────────────
app.post('/api/upload', auth, asyncHandler(async (req, res) => {
  const { data, filename } = req.body;
  if (!data) return res.status(400).json({ error: 'Données image manquantes' });

  const ext = filename ? path.extname(filename).toLowerCase() : '.jpg';
  const safeName = uuidv4() + ext;
  const base64Data = data.replace(/^data:[^;]+;base64,/, '');

  await fs.ensureDir(UPLOADS_DIR);
  await fs.writeFile(path.join(UPLOADS_DIR, safeName), base64Data, 'base64');

  // URL absolue avec le host de la requête pour compatibilité réseau local
  const host = `${req.protocol}://${req.hostname}:${PORT}`;
  res.json({ url: `${host}/uploads/${safeName}` });
}));

// ─── Endpoints publics (GET) ──────────────────────────────────────────────────
app.get('/api/tortoises', asyncHandler(async (req, res) => {
  const data = await readData();
  res.json(data.tortoises);
}));

app.get('/api/photos', asyncHandler(async (req, res) => {
  const data = await readData();
  res.json(data.photos);
}));

app.get('/api/weights', asyncHandler(async (req, res) => {
  const data = await readData();
  res.json(data.weights);
}));

app.get('/api/measurements', asyncHandler(async (req, res) => {
  const data = await readData();
  res.json(data.measurements || []);
}));

// ─── Tortues ──────────────────────────────────────────────────────────────────
app.post('/api/tortoises', auth, asyncHandler(async (req, res) => {
  validateTortoise(req.body);
  const data = await readData();
  const tortoise = { ...req.body, id: uuidv4() };
  data.tortoises.push(tortoise);
  await writeData(data);
  res.status(201).json(tortoise);
}));

app.put('/api/tortoises/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  const idx = data.tortoises.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tortue non trouvée' });
  validateTortoise({ ...data.tortoises[idx], ...req.body });
  data.tortoises[idx] = { ...data.tortoises[idx], ...req.body };
  await writeData(data);
  res.json(data.tortoises[idx]);
}));

app.delete('/api/tortoises/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  if (!data.tortoises.some(t => t.id === req.params.id))
    return res.status(404).json({ error: 'Tortue non trouvée' });

  // Supprimer les fichiers photos du disque
  for (const photo of data.photos.filter(p => p.tortoiseId === req.params.id)) {
    await deleteUploadFile(photo.url);
  }

  data.tortoises    = data.tortoises.filter(t => t.id !== req.params.id);
  data.photos       = data.photos.filter(p => p.tortoiseId !== req.params.id);
  data.weights      = data.weights.filter(w => w.tortoiseId !== req.params.id);
  data.measurements = data.measurements.filter(m => m.tortoiseId !== req.params.id);
  data.vetrecords   = (data.vetrecords || []).filter(v => v.tortoiseId !== req.params.id);
  data.clutches     = (data.clutches   || []).filter(c => c.tortoiseId !== req.params.id);
  await writeData(data);
  res.sendStatus(204);
}));

// ─── Photos ───────────────────────────────────────────────────────────────────
app.post('/api/photos', auth, asyncHandler(async (req, res) => {
  validatePhoto(req.body);
  const data = await readData();
  if (!data.tortoises.find(t => t.id === req.body.tortoiseId))
    return res.status(400).json({ error: 'Tortue non trouvée' });
  const photo = { ...req.body, id: uuidv4() };
  data.photos.push(photo);
  await writeData(data);
  res.status(201).json(photo);
}));

app.put('/api/photos/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  const idx = data.photos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Photo non trouvée' });
  validatePhoto({ ...data.photos[idx], ...req.body });
  data.photos[idx] = { ...data.photos[idx], ...req.body };
  await writeData(data);
  res.json(data.photos[idx]);
}));

app.delete('/api/photos/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  const photo = data.photos.find(p => p.id === req.params.id);
  if (!photo) return res.status(404).json({ error: 'Photo non trouvée' });

  // Supprimer le fichier sur disque
  await deleteUploadFile(photo.url);

  data.photos = data.photos.filter(p => p.id !== req.params.id);
  await writeData(data);
  res.sendStatus(204);
}));

// ─── Poids ────────────────────────────────────────────────────────────────────
app.post('/api/weights', auth, asyncHandler(async (req, res) => {
  validateWeight(req.body);
  const data = await readData();
  if (!data.tortoises.find(t => t.id === req.body.tortoiseId))
    return res.status(400).json({ error: 'Tortue non trouvée' });
  const weight = { ...req.body, id: uuidv4() };
  data.weights.push(weight);
  await writeData(data);
  res.status(201).json(weight);
}));

app.put('/api/weights/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  const idx = data.weights.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Poids non trouvé' });
  validateWeight({ ...data.weights[idx], ...req.body });
  data.weights[idx] = { ...data.weights[idx], ...req.body };
  await writeData(data);
  res.json(data.weights[idx]);
}));

app.delete('/api/weights/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  if (!data.weights.some(w => w.id === req.params.id))
    return res.status(404).json({ error: 'Poids non trouvé' });
  data.weights = data.weights.filter(w => w.id !== req.params.id);
  await writeData(data);
  res.sendStatus(204);
}));

// ─── Mesures ──────────────────────────────────────────────────────────────────
app.post('/api/measurements', auth, asyncHandler(async (req, res) => {
  validateMeasurement(req.body);
  const data = await readData();
  if (!data.tortoises.find(t => t.id === req.body.tortoiseId))
    return res.status(400).json({ error: 'Tortue non trouvée' });
  const measurement = { ...req.body, id: uuidv4() };
  data.measurements.push(measurement);
  await writeData(data);
  res.status(201).json(measurement);
}));

app.put('/api/measurements/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  const idx = data.measurements.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Mesure non trouvée' });
  validateMeasurement({ ...data.measurements[idx], ...req.body });
  data.measurements[idx] = { ...data.measurements[idx], ...req.body };
  await writeData(data);
  res.json(data.measurements[idx]);
}));

app.delete('/api/measurements/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  if (!data.measurements.some(m => m.id === req.params.id))
    return res.status(404).json({ error: 'Mesure non trouvée' });
  data.measurements = data.measurements.filter(m => m.id !== req.params.id);
  await writeData(data);
  res.sendStatus(204);
}));

// ─── Rappels ──────────────────────────────────────────────────────────────────
app.get('/api/reminders', asyncHandler(async (req, res) => {
  const data = await readData();
  res.json(data.reminders || []);
}));

app.post('/api/reminders', auth, asyncHandler(async (req, res) => {
  const { tortoiseId, type, label, dueDate, done, recurringDays } = req.body;
  if (!label || !dueDate) return res.status(400).json({ error: 'label et dueDate requis' });
  const data = await readData();
  const reminder = { id: uuidv4(), tortoiseId: tortoiseId || '', type: type || 'custom', label, dueDate, done: done || false, recurringDays };
  data.reminders.push(reminder);
  await writeData(data);
  res.status(201).json(reminder);
}));

app.put('/api/reminders/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  const idx = data.reminders.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Rappel non trouvé' });
  data.reminders[idx] = { ...data.reminders[idx], ...req.body };
  await writeData(data);
  res.json(data.reminders[idx]);
}));

app.delete('/api/reminders/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  if (!data.reminders.some(r => r.id === req.params.id))
    return res.status(404).json({ error: 'Rappel non trouvé' });
  data.reminders = data.reminders.filter(r => r.id !== req.params.id);
  await writeData(data);
  res.sendStatus(204);
}));

// ─── Fiches vétérinaires ──────────────────────────────────────────────────────
app.get('/api/vetrecords', asyncHandler(async (req, res) => {
  const data = await readData();
  res.json(data.vetrecords || []);
}));

app.post('/api/vetrecords', auth, asyncHandler(async (req, res) => {
  const { tortoiseId, type, date, title, description, vetName, nextDate } = req.body;
  if (!tortoiseId) return res.status(400).json({ error: 'tortoiseId requis' });
  if (!title)      return res.status(400).json({ error: 'title requis' });
  if (!date || !Date.parse(date)) return res.status(400).json({ error: 'date valide requise' });
  const data = await readData();
  if (!data.tortoises.find(t => t.id === tortoiseId))
    return res.status(400).json({ error: 'Tortue non trouvée' });
  const record = { id: uuidv4(), tortoiseId, type: type || 'custom', date, title, description, vetName, nextDate };
  data.vetrecords = data.vetrecords || [];
  data.vetrecords.push(record);
  await writeData(data);
  res.status(201).json(record);
}));

app.put('/api/vetrecords/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  data.vetrecords = data.vetrecords || [];
  const idx = data.vetrecords.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Fiche vétérinaire non trouvée' });
  data.vetrecords[idx] = { ...data.vetrecords[idx], ...req.body };
  await writeData(data);
  res.json(data.vetrecords[idx]);
}));

app.delete('/api/vetrecords/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  data.vetrecords = data.vetrecords || [];
  if (!data.vetrecords.some(v => v.id === req.params.id))
    return res.status(404).json({ error: 'Fiche vétérinaire non trouvée' });
  data.vetrecords = data.vetrecords.filter(v => v.id !== req.params.id);
  await writeData(data);
  res.sendStatus(204);
}));

// ─── Pontes ───────────────────────────────────────────────────────────────────
app.get('/api/clutches', asyncHandler(async (req, res) => {
  const data = await readData();
  res.json(data.clutches || []);
}));

app.post('/api/clutches', auth, asyncHandler(async (req, res) => {
  const { tortoiseId, date, eggsCount, incubationTemp, incubationHumidity,
          expectedHatchDate, actualHatchDate, hatchedCount, status, notes } = req.body;
  if (!tortoiseId) return res.status(400).json({ error: 'tortoiseId requis' });
  if (!date || !Date.parse(date)) return res.status(400).json({ error: 'date valide requise' });
  if (typeof eggsCount !== 'number' || eggsCount < 1)
    return res.status(400).json({ error: 'eggsCount doit être un entier positif' });
  const data = await readData();
  if (!data.tortoises.find(t => t.id === tortoiseId))
    return res.status(400).json({ error: 'Tortue non trouvée' });
  const clutch = {
    id: uuidv4(), tortoiseId, date,
    eggsCount, incubationTemp, incubationHumidity,
    expectedHatchDate, actualHatchDate, hatchedCount,
    status: status || 'unknown', notes
  };
  data.clutches = data.clutches || [];
  data.clutches.push(clutch);
  await writeData(data);
  res.status(201).json(clutch);
}));

app.put('/api/clutches/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  data.clutches = data.clutches || [];
  const idx = data.clutches.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ponte non trouvée' });
  data.clutches[idx] = { ...data.clutches[idx], ...req.body };
  await writeData(data);
  res.json(data.clutches[idx]);
}));

app.delete('/api/clutches/:id', auth, asyncHandler(async (req, res) => {
  const data = await readData();
  data.clutches = data.clutches || [];
  if (!data.clutches.some(c => c.id === req.params.id))
    return res.status(404).json({ error: 'Ponte non trouvée' });
  data.clutches = data.clutches.filter(c => c.id !== req.params.id);
  await writeData(data);
  res.sendStatus(204);
}));

// ─── Export / Import élevage complet (photos embarquées en base64) ────────────

// Lit un fichier /uploads/ et retourne son contenu base64, ou null si introuvable
async function embedPhoto(url) {
  if (!url || !url.includes('/uploads/')) return null;
  const filename = path.basename(url.split('/uploads/').pop() || '');
  if (!filename) return null;
  try {
    const buf = await fs.readFile(path.join(UPLOADS_DIR, filename));
    const ext = path.extname(filename).slice(1).toLowerCase() || 'jpeg';
    return { filename, base64: `data:image/${ext};base64,${buf.toString('base64')}` };
  } catch { return null; }
}

// Écrit un base64 sur le disque et retourne l'URL serveur
async function writeEmbeddedPhoto(base64Data, filename, host) {
  await fs.ensureDir(UPLOADS_DIR);
  const safeName = uuidv4() + path.extname(filename || '.jpg');
  const raw = base64Data.replace(/^data:[^;]+;base64,/, '');
  await fs.writeFile(path.join(UPLOADS_DIR, safeName), raw, 'base64');
  return `${host}/uploads/${safeName}`;
}

app.get('/api/export', asyncHandler(async (req, res) => {
  const data = await readData();
  const host = `${req.protocol}://${req.hostname}:${PORT}`;

  // Embarquer les photos de la galerie
  const photos = await Promise.all((data.photos || []).map(async (p) => {
    const embedded = await embedPhoto(p.url);
    return embedded ? { ...p, _base64: embedded.base64, _filename: embedded.filename } : p;
  }));

  // Embarquer les photos identitaires des tortues
  const tortoises = await Promise.all((data.tortoises || []).map(async (t) => {
    const result = { ...t };
    for (const field of ['facePhoto', 'plastronPhoto', 'carapacePhoto']) {
      const embedded = await embedPhoto(t[field]);
      if (embedded) result[`_${field}`] = { base64: embedded.base64, filename: embedded.filename };
    }
    return result;
  }));

  const exportData = {
    _version: 2,
    _exportDate: new Date().toISOString(),
    _includesPhotos: true,
    tortoises, photos,
    weights:      data.weights      || [],
    measurements: data.measurements || [],
    reminders:    data.reminders    || [],
    vetrecords:   data.vetrecords   || [],
    clutches:     data.clutches     || [],
  };

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="oneclick-backup-${date}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(exportData);
}));

app.post('/api/import', auth, asyncHandler(async (req, res) => {
  const { tortoises, photos, weights, measurements, reminders, vetrecords, clutches } = req.body;
  if (!Array.isArray(tortoises)) return res.status(400).json({ error: 'Format invalide : tortoises manquant' });

  const host = `${req.protocol}://${req.hostname}:${PORT}`;
  await fs.ensureDir(UPLOADS_DIR);

  // Restaurer les photos de la galerie
  const restoredPhotos = await Promise.all((photos || []).map(async (p) => {
    if (p._base64 && p._filename) {
      const url = await writeEmbeddedPhoto(p._base64, p._filename, host);
      const { _base64, _filename, ...rest } = p;
      return { ...rest, url };
    }
    return p;
  }));

  // Restaurer les photos identitaires des tortues
  const restoredTortoises = await Promise.all(tortoises.map(async (t) => {
    const result = { ...t };
    for (const field of ['facePhoto', 'plastronPhoto', 'carapacePhoto']) {
      const embedded = t[`_${field}`];
      if (embedded?.base64) {
        result[field] = await writeEmbeddedPhoto(embedded.base64, embedded.filename, host);
      }
      delete result[`_${field}`];
    }
    return result;
  }));

  const data = {
    tortoises:    restoredTortoises,
    photos:       restoredPhotos,
    weights:      Array.isArray(weights)      ? weights      : [],
    measurements: Array.isArray(measurements) ? measurements : [],
    reminders:    Array.isArray(reminders)    ? reminders    : [],
    vetrecords:   Array.isArray(vetrecords)   ? vetrecords   : [],
    clutches:     Array.isArray(clutches)     ? clutches     : [],
  };
  await writeData(data);
  res.json({ imported: data.tortoises.length });
}));

// ─── Santé ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Erreurs globales ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Une erreur est survenue' : err.message;
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
const os = require('os');
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIp();
  console.log(`OneClickTortoise backend running on http://${ip}:${PORT}`);
  console.log(`Data : ${DATA_FILE}`);
  console.log(`Uploads : ${UPLOADS_DIR}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
