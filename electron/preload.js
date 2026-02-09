/**
 * MONTEX ERP - Electron Preload Script
 * Bridge seguro entre o processo principal e o renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o frontend
contextBridge.exposeInMainWorld('electronAPI', {
    // Informações do app
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    platform: process.platform,
    isElectron: true,

    // Notificações
    showNotification: (title, body) => {
        ipcRenderer.invoke('show-notification', { title, body });
    },

    // Navegação externa
    openExternal: (url) => {
        ipcRenderer.invoke('open-external', url);
    },

    // Sistema de arquivos
    selectDirectory: () => ipcRenderer.invoke('select-directory'),

    // Eventos do app
    onOpenSettings: (callback) => {
        ipcRenderer.on('open-settings', callback);
    },

    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),

    // Theme
    setTheme: (theme) => ipcRenderer.send('set-theme', theme),
    getTheme: () => ipcRenderer.invoke('get-theme'),

    // Auto-update
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
});

// Log para confirmar que preload foi carregado
console.log('MONTEX ERP: Electron preload script loaded');
