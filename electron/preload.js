const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  
  // Print
  print: (options) => ipcRenderer.invoke('print', options),
  
  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action) => callback(action));
  },
  onFileOpened: (callback) => {
    ipcRenderer.on('file-opened', (event, filePath) => callback(filePath));
  },
  onExportData: (callback) => {
    ipcRenderer.on('export-data', (event, filePath) => callback(filePath));
  },
  onImportData: (callback) => {
    ipcRenderer.on('import-data', (event, filePath) => callback(filePath));
  },
  
  // Platform
  platform: process.platform,
  isElectron: true
});

// Log that preload is running
console.log('Electron preload script loaded');