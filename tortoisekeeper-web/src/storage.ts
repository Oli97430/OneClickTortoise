import { Tortoise, TortoisePhoto, WeightEntry, MeasurementEntry, Reminder, VetRecord, Clutch } from './types';

// ─── Cache offline ─────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheSet(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data as T;
  } catch { return null; }
}

// ─── Queue hors-ligne ─────────────────────────────────────────────────────────
interface QueuedOp { id: string; endpoint: string; method: string; body?: unknown; }

function queueAdd(op: Omit<QueuedOp, 'id'>) {
  try {
    const q: QueuedOp[] = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    q.push({ ...op, id: Date.now().toString() });
    localStorage.setItem('offline_queue', JSON.stringify(q));
  } catch {}
}

export function getOfflineQueue(): QueuedOp[] {
  try { return JSON.parse(localStorage.getItem('offline_queue') || '[]'); } catch { return []; }
}

export function clearOfflineQueue() {
  try { localStorage.removeItem('offline_queue'); } catch {}
}

// URL absolue — fonctionne en navigateur, Electron dev et Electron packagé
const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000') + '/api';

// Authentification HTTP Basic (à partir de variables d'environnement si disponible)
const AUTH_USER = process.env.REACT_APP_AUTH_USER || 'admin';
const AUTH_PASS = process.env.REACT_APP_AUTH_PASS || 'tortue2025';
const AUTH_HEADER = 'Basic ' + btoa(`${AUTH_USER}:${AUTH_PASS}`);

// Type pour les erreurs API
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper pour GET avec cache offline
async function fetchApi<T>(endpoint: string): Promise<T> {
  const cacheKey = `cache${endpoint.replace(/\//g, '_')}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${API_URL}${endpoint}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      let errorMessage = text;
      try { const j = JSON.parse(text); errorMessage = j.error || text; } catch {}
      throw new ApiError(errorMessage, res.status, text);
    }
    try {
      const data = await res.json() as T;
      cacheSet(cacheKey, data); // met à jour le cache
      return data;
    } catch {
      return [] as unknown as T;
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Requête timeout - le serveur ne répond pas', 408);
    }
    // Réseau indisponible → retour du cache
    const cached = cacheGet<T>(cacheKey);
    if (cached !== null) {
      console.warn(`[Offline] Données en cache pour ${endpoint}`);
      return cached;
    }
    throw new ApiError(err instanceof Error ? err.message : 'Erreur de connexion', 0);
  }
}

// Helper pour requêtes protégées avec queue offline
async function fetchApiAuth<T>(endpoint: string, method: string, body?: unknown): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_HEADER },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      let errorMessage = text;
      try { const j = JSON.parse(text); errorMessage = j.error || text; } catch {}
      if (res.status === 401) throw new ApiError('Authentification requise', 401, text);
      throw new ApiError(errorMessage, res.status, text);
    }
    if (res.status === 204) return null;
    return await res.json() as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError')
      throw new ApiError('Requête timeout', 408);
    // Réseau indisponible → mettre en queue
    if (body !== undefined) {
      queueAdd({ endpoint, method, body });
      console.warn(`[Offline] Opération mise en queue : ${method} ${endpoint}`);
    }
    throw new ApiError(err instanceof Error ? err.message : 'Erreur de connexion', 0);
  }
}

// Tortues
export const getTortoises = async (): Promise<Tortoise[]> => fetchApi('/tortoises');
export const saveTortoises = async (tortoises: Tortoise[]) => {
  // Remplace toutes les tortues (optionnel, non exposé côté backend)
  throw new Error('Non supporté. Utilise add/update/delete via API.');
};
export const addTortoise = async (t: Omit<Tortoise, 'id'>): Promise<Tortoise> => {
  const result = await fetchApiAuth<Tortoise>('/tortoises', 'POST', t);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const updateTortoise = async (id: string, t: Partial<Tortoise>): Promise<Tortoise> => {
  const result = await fetchApiAuth<Tortoise>(`/tortoises/${id}`, 'PUT', t);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const deleteTortoise = async (id: string): Promise<void> => {
  await fetchApiAuth(`/tortoises/${id}`, 'DELETE');
};

// Photos
export const getPhotos = async (): Promise<TortoisePhoto[]> => fetchApi('/photos');
export const addPhoto = async (p: Omit<TortoisePhoto, 'id'>): Promise<TortoisePhoto> => {
  const result = await fetchApiAuth<TortoisePhoto>('/photos', 'POST', p);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const updatePhoto = async (id: string, p: Partial<TortoisePhoto>): Promise<TortoisePhoto> => {
  const result = await fetchApiAuth<TortoisePhoto>(`/photos/${id}`, 'PUT', p);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const deletePhoto = async (id: string): Promise<void> => {
  await fetchApiAuth(`/photos/${id}`, 'DELETE');
};

// Poids
export const getWeights = async (): Promise<WeightEntry[]> => fetchApi('/weights');
export const addWeight = async (w: Omit<WeightEntry, 'id'>): Promise<WeightEntry> => {
  const result = await fetchApiAuth<WeightEntry>('/weights', 'POST', w);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const updateWeight = async (id: string, w: Partial<WeightEntry>): Promise<WeightEntry> => {
  const result = await fetchApiAuth<WeightEntry>(`/weights/${id}`, 'PUT', w);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const deleteWeight = async (id: string): Promise<void> => {
  await fetchApiAuth(`/weights/${id}`, 'DELETE');
};

// Rappels
export const getReminders = async (): Promise<Reminder[]> => fetchApi('/reminders');
export const addReminder = async (r: Omit<Reminder, 'id'>): Promise<Reminder> => {
  const result = await fetchApiAuth<Reminder>('/reminders', 'POST', r);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const updateReminder = async (id: string, r: Partial<Reminder>): Promise<Reminder> => {
  const result = await fetchApiAuth<Reminder>(`/reminders/${id}`, 'PUT', r);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const deleteReminder = async (id: string): Promise<void> => {
  await fetchApiAuth(`/reminders/${id}`, 'DELETE');
};

// Replay des opérations en queue (appeler au démarrage quand online)
export const replayOfflineQueue = async (): Promise<number> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;
  let replayed = 0;
  for (const op of queue) {
    try {
      await fetch(`${API_URL}${op.endpoint}`, {
        method: op.method,
        headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_HEADER },
        body: op.body ? JSON.stringify(op.body) : undefined,
      });
      replayed++;
    } catch {}
  }
  clearOfflineQueue();
  return replayed;
};

// Pontes
export const getClutches = async (): Promise<Clutch[]> => fetchApi('/clutches');
export const addClutch = async (c: Omit<Clutch, 'id'>): Promise<Clutch> => {
  const result = await fetchApiAuth<Clutch>('/clutches', 'POST', c);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const updateClutch = async (id: string, c: Partial<Clutch>): Promise<Clutch> => {
  const result = await fetchApiAuth<Clutch>(`/clutches/${id}`, 'PUT', c);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const deleteClutch = async (id: string): Promise<void> => {
  await fetchApiAuth(`/clutches/${id}`, 'DELETE');
};

// Export / Import élevage complet (photos embarquées)
export const exportElevage = async (): Promise<void> => {
  const res = await fetch(`${API_URL}/export`, {
    headers: { 'Authorization': AUTH_HEADER },
  });
  if (!res.ok) throw new ApiError('Export échoué', res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `oneclick-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importElevage = async (data: unknown): Promise<{ imported: number }> => {
  // Timeout étendu à 5 min pour les gros fichiers avec photos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);
  try {
    const res = await fetch(`${API_URL}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_HEADER },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try { msg = JSON.parse(text).error || text; } catch {}
      throw new ApiError(msg, res.status);
    }
    return await res.json() as { imported: number };
  } finally {
    clearTimeout(timeoutId);
  }
};

// Fiches vétérinaires
export const getVetRecords = async (): Promise<VetRecord[]> => fetchApi('/vetrecords');
export const addVetRecord = async (v: Omit<VetRecord, 'id'>): Promise<VetRecord> => {
  const result = await fetchApiAuth<VetRecord>('/vetrecords', 'POST', v);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const updateVetRecord = async (id: string, v: Partial<VetRecord>): Promise<VetRecord> => {
  const result = await fetchApiAuth<VetRecord>(`/vetrecords/${id}`, 'PUT', v);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const deleteVetRecord = async (id: string): Promise<void> => {
  await fetchApiAuth(`/vetrecords/${id}`, 'DELETE');
};

// Upload photo sur disque (retourne l'URL servie par le backend)
export const uploadPhotoFile = async (base64Data: string, filename: string): Promise<string> => {
  const result = await fetchApiAuth<{ url: string }>('/upload', 'POST', { data: base64Data, filename });
  if (!result?.url) throw new ApiError('Upload photo échoué', 500);
  return result.url;
};

// Mesures
export const getMeasurements = async (): Promise<MeasurementEntry[]> => fetchApi('/measurements');
export const addMeasurement = async (m: Omit<MeasurementEntry, 'id'>): Promise<MeasurementEntry> => {
  const result = await fetchApiAuth<MeasurementEntry>('/measurements', 'POST', m);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const updateMeasurement = async (id: string, m: Partial<MeasurementEntry>): Promise<MeasurementEntry> => {
  const result = await fetchApiAuth<MeasurementEntry>(`/measurements/${id}`, 'PUT', m);
  if (!result) throw new ApiError('Aucune réponse du serveur', 500);
  return result;
};
export const deleteMeasurement = async (id: string): Promise<void> => {
  await fetchApiAuth(`/measurements/${id}`, 'DELETE');
};
