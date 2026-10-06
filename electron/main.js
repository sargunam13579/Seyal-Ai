const { app, BrowserWindow, Tray, Menu, globalShortcut, session, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const http = require('http');

// Pro-Level Single Instance Lock (prevents duplicate windows & port 8000 conflicts)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[ELECTRON] Another instance of Seyal AI is already running. Quitting secondary instance.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

// Direct desktop application launcher for instant reviewer actions
ipcMain.handle('open-app', async (_event, appName) => {
  try {
    const clean = String(appName || '').toLowerCase();
    if (clean.includes('notepad')) {
      exec('start notepad.exe');
      return true;
    }
    if (clean.includes('calc')) {
      exec('start calc.exe');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to launch application via electron:', err);
    return false;
  }
});

let mainWindow = null;
let tray = null;
let backendProcess = null;
let isQuitting = false;

// Check if an instance of the backend is already running on port 8000
function checkBackendRunning(callback) {
  const req = http.request({ host: '127.0.0.1', port: 8000, path: '/api/health', method: 'GET', timeout: 1000 }, (res) => {
    callback(res.statusCode === 200);
  });
  req.on('error', () => {
    callback(false);
  });
  req.end();
}

// Spawns the Python FastAPI backend
function spawnBackend() {
  checkBackendRunning((running) => {
    if (running) {
      console.log('Backend is already running on port 8000.');
      return;
    }

    console.log('Starting backend server...');
    const isPackaged = app.isPackaged;
    let backendPath;
    let args = [];
    let cwd;

    if (!isPackaged) {
      // In development, spawn the virtual env python entrypoint
      backendPath = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
      args = ['-m', 'seyal_ai.main', '--mode', 'api'];
      cwd = path.join(__dirname, '..');
    } else {
      // In production, run the bundled executable from resources/backend/
      backendPath = path.join(process.resourcesPath, 'backend', 'seyal_ai_backend.exe');
      args = ['--mode', 'api'];
      // Use userData dir as cwd so backend can write db/logs to a writable location
      cwd = app.getPath('userData');
    }

    try {
      backendProcess = spawn(backendPath, args, {
        cwd: cwd,
        stdio: 'ignore',
        windowsHide: true,
        detached: false,
      });

      backendProcess.on('error', (err) => {
        console.error('Failed to start backend process:', err);
      });
    } catch (err) {
      console.error('Error spawning backend:', err);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Seyal AI',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    // DevTools can be opened manually with Ctrl+Shift+I if needed
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  // Intercept the close event to hide to system tray instead of exiting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Seyal AI',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Seyal AI');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Register global keyboard shortcut controls
function registerShortcuts() {
  // Global Push-to-Talk shortcut to summon window and start listening (Ctrl+Space)
  globalShortcut.register('CommandOrControl+Space', () => {
    console.log('[ELECTRON] Global Push-to-Talk shortcut triggered (Ctrl+Space)');
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
      mainWindow.webContents.send('trigger-voice-listen');
    }
  });

  // Global shortcut to summon / toggle window visibility (Ctrl+Shift+N)
  globalShortcut.register('Ctrl+Shift+N', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Global emergency kill switch shortcut (Ctrl+Shift+K)
  globalShortcut.register('Ctrl+Shift+K', () => {
    console.log('Emergency kill shortcut triggered');
    // Call the cancel / kill backend endpoint
    const req = http.request({ host: '127.0.0.1', port: 8000, path: '/api/identity/cancel', method: 'POST' });
    req.on('error', (err) => console.error('Kill request error:', err));
    req.end();
  });
}

app.whenReady().then(() => {
  // Allow microphone and media access for renderer without blocking
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media') {
        return callback(true);
      }
      callback(true);
    });
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
      if (permission === 'media') {
        return true;
      }
      return true;
    });
  }

  spawnBackend();
  createWindow();
  createTray();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();

  // Terminate Python backend on shutdown
  if (backendProcess) {
    console.log('Terminating Python backend server process...');
    try {
      process.kill(-backendProcess.pid); // Kill process group if supported
    } catch {
      backendProcess.kill();
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
} // End single instance lock block
