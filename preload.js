const { contextBridge, ipcRenderer } = require('electron');
const { app } = require('@electron/remote') || {};

contextBridge.exposeInMainWorld('electronAPI', {
  getNormativImages: () => ipcRenderer.sendSync('get-normativ-images'),
  getAppVersion:     () => ipcRenderer.sendSync('get-app-version'),
});
