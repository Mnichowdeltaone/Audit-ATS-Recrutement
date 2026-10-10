const { app, BrowserWindow } = require('electron');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startServer() {
  const serverPath = path.join(app.getAppPath(), 'dist', 'server.js');

  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: '3000',
      CV_MOVE_DATA_DIR: path.join(app.getPath('userData'), 'data'),
    },
    stdio: 'inherit',
  });

  serverProcess.on('error', (error) => {
    console.error('Erreur au démarrage du serveur local :', error);
  });

  serverProcess.on('exit', (code) => {
    console.log('Serveur local arrêté avec le code :', code);
  });
}

function waitForServer(timeoutMs = 5000) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const tryConnect = () => {
      const req = http.get('http://localhost:3000/api/key-status', (res) => {
        res.resume();
        resolve(true);
      });

      req.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
        } else {
          setTimeout(tryConnect, 250);
        }
      });

      req.setTimeout(1000, () => {
        req.destroy();
      });
    };

    tryConnect();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: app.isPackaged ? path.join(process.resourcesPath, 'cv-improvement.ico') : path.join(app.getAppPath(), 'build', 'cv-improvement.ico'),
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
  mainWindow.loadURL('http://localhost:3000');
}

app.whenReady().then(async () => {
  startServer();
  await waitForServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
