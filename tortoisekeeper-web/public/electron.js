const { app, BrowserWindow, shell } = require('electron');
const { fork } = require('child_process');
const http = require('http');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
let backendProcess = null;

// ─── Démarrage du backend embarqué ───────────────────────────────────────────
function startBackend() {
  const backendScript = isDev
    ? path.join(__dirname, '../../tortoisekeeper-backend/server.js')
    : path.join(process.resourcesPath, 'backend/server.js');

  const backendCwd = isDev
    ? path.join(__dirname, '../../tortoisekeeper-backend')
    : path.join(process.resourcesPath, 'backend');

  const dataPath = app.getPath('userData');

  backendProcess = fork(backendScript, [], {
    cwd: backendCwd,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '4000',
      DATA_PATH: dataPath,
      UPLOADS_PATH: path.join(dataPath, 'uploads'),
    },
    silent: false,
  });

  backendProcess.on('error', (err) => console.error('[Backend] Erreur:', err));
  backendProcess.on('exit', (code) => console.log('[Backend] Arrêté (code', code + ')'));
}

// ─── Attendre que le backend réponde ─────────────────────────────────────────
function waitForBackend(retries = 30) {
  return new Promise((resolve) => {
    const check = (n) => {
      const req = http.get('http://localhost:4000/health', (res) => {
        if (res.statusCode === 200) {
          console.log('[Backend] Prêt.');
          resolve();
        } else {
          retry(n);
        }
      });
      req.on('error', () => retry(n));
      req.setTimeout(500, () => { req.destroy(); retry(n); });
    };
    const retry = (n) => {
      if (n > 0) setTimeout(() => check(n - 1), 500);
      else { console.warn('[Backend] Timeout, démarrage sans attendre.'); resolve(); }
    };
    check(retries);
  });
}

// ─── Fenêtre principale ───────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'OneClickTortoise',
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../build/index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─── Cycle de vie ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  startBackend();
  await waitForBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});
