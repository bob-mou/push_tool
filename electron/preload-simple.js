const { contextBridge, ipcRenderer } = require('electron');

// 真实的API，通过IPC与主进程通信
const electronAPI = {
  getDevices: () => {
    return ipcRenderer.invoke('get-devices');
  },
  
  pushFile: (params) => {
    return ipcRenderer.invoke('push-file', params);
  },
  materializeFile: (payload) => {
    return ipcRenderer.invoke('materialize-file', payload);
  },
  onTransferProgress: (cb) => {
    ipcRenderer.on('transfer-progress', (_e, payload) => cb(payload));
  },
  
  selectFile: () => {
    return ipcRenderer.invoke('select-file');
  },
  
  checkADB: () => {
    return ipcRenderer.invoke('check-adb');
  },
  
  checkIOSTools: () => {
    return ipcRenderer.invoke('check-ios-tools');
  },
  getSettings: () => {
    return ipcRenderer.invoke('get-settings');
  },
  updateSettings: (payload) => {
    return ipcRenderer.invoke('update-settings', payload);
  },
  resetSettings: () => {
    return ipcRenderer.invoke('reset-settings');
  },
  selectDirectory: () => {
    return ipcRenderer.invoke('select-directory');
  },
  validatePath: (input, kind) => {
    return ipcRenderer.invoke('validate-path', { input, kind });
  },
  openHelp: () => {
    return ipcRenderer.invoke('open-help');
  },
  getAppRoot: () => {
    return ipcRenderer.invoke('get-app-root');
  },
  // 传输路径管理相关
  getTransferPaths: () => {
    return ipcRenderer.invoke('get-transfer-paths');
  },
  getTransferPathOptions: () => {
    return ipcRenderer.invoke('get-transfer-path-options');
  },
  updateTransferPaths: (paths) => {
    return ipcRenderer.invoke('update-transfer-paths', paths);
  },
  validateTransferPath: (params) => {
    return ipcRenderer.invoke('validate-transfer-path', params);
  },
  getTransferLog: (limit) => {
    return ipcRenderer.invoke('get-transfer-log', limit);
  },
  clearTransferLog: () => {
    return ipcRenderer.invoke('clear-transfer-log');
  },
  getTransferStats: () => {
    return ipcRenderer.invoke('get-transfer-stats');
  }
  ,
  getSaveDir: () => {
    return ipcRenderer.invoke('get-save-dir');
  },
  saveLocalFile: (params) => {
    return ipcRenderer.invoke('save-local-file', params);
  },
  getIdbPath: () => {
    return ipcRenderer.invoke('get-idb-path');
  },
  onDeviceStatusChanged: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('device-status-changed', listener);
    return () => ipcRenderer.removeListener('device-status-changed', listener);
  },
  onDeviceMonitorError: (cb) => {
    const listener = (_e, message) => cb(message);
    ipcRenderer.on('device-monitor-error', listener);
    return () => ipcRenderer.removeListener('device-monitor-error', listener);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
