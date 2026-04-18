const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Trimite cerere sincronă către main process care citește PNG-urile
  // din directorul executabilului (app.getPath('exe')) — mai fiabil decât process.execPath
  getNormativImages: () => ipcRenderer.sendSync('get-normativ-images'),
});
