const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, selected Electron APIs to the React application renderer
contextBridge.exposeInMainWorld('electronAPI', {
  sendEmergencyKill: () => ipcRenderer.send('emergency-kill'),
  onBackendStatus: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('backend-status', handler);
    return () => ipcRenderer.removeListener('backend-status', handler);
  },
  openApp: (appName) => ipcRenderer.invoke('open-app', appName),
  onVoiceListenTrigger: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-voice-listen', handler);
    return () => ipcRenderer.removeListener('trigger-voice-listen', handler);
  },
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
  setAutoLaunch: (flag) => ipcRenderer.invoke('set-auto-launch', flag),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url)
});
