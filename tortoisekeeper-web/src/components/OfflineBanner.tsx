import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Snackbar, Button } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';
import { getOfflineQueue, replayOfflineQueue } from '../storage';

const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true);  setQueueSize(getOfflineQueue().length); };
    const handleOffline = () => { setIsOnline(false); };
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Vérifier la queue régulièrement
  useEffect(() => {
    const id = setInterval(() => setQueueSize(getOfflineQueue().length), 5000);
    return () => clearInterval(id);
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const count = await replayOfflineQueue();
      setSyncMsg(`${count} opération${count > 1 ? 's' : ''} synchronisée${count > 1 ? 's' : ''} ✓`);
      setQueueSize(0);
    } catch {
      setSyncMsg('Erreur de synchronisation');
    } finally {
      setSyncing(false);
    }
  }, []);

  // Auto-sync quand on revient en ligne
  useEffect(() => {
    if (isOnline && queueSize > 0) handleSync();
  }, [isOnline, queueSize, handleSync]);

  return (
    <>
      {!isOnline && (
        <Alert
          severity="warning"
          icon={<WifiOffIcon />}
          sx={{ borderRadius: 0, py: 0.5 }}
        >
          Mode hors-ligne — les données affichées proviennent du cache local.
          Les modifications seront synchronisées à la reconnexion.
        </Alert>
      )}

      {isOnline && queueSize > 0 && (
        <Alert
          severity="info"
          sx={{ borderRadius: 0, py: 0.5 }}
          action={
            <Button size="small" startIcon={<SyncIcon />} onClick={handleSync} disabled={syncing}>
              {syncing ? 'Sync...' : `Synchroniser (${queueSize})`}
            </Button>
          }
        >
          {queueSize} modification{queueSize > 1 ? 's' : ''} en attente de synchronisation.
        </Alert>
      )}

      <Snackbar
        open={!!syncMsg}
        autoHideDuration={3000}
        onClose={() => setSyncMsg('')}
        message={syncMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default OfflineBanner;
