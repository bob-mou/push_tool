import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getDevices: () => Promise<any[]>;
  pushFile: (params: { deviceId: string; filePath: string; deviceType: string }) => Promise<{ success: boolean; error?: string }>;
  selectFile: () => Promise<string | null>;
  checkADB: () => Promise<boolean>;
  checkIOSTools: () => Promise<boolean>;
}

// 真实的API，通过IPC与主进程通信
const electronAPI: ElectronAPI = {
  getDevices: () => {
    return ipcRenderer.invoke('get-devices');
  },
  
  pushFile: (params) => {
    return ipcRenderer.invoke('push-file', params);
  },
  
  selectFile: () => {
    return ipcRenderer.invoke('select-file');
  },
  
  checkADB: () => {
    return ipcRenderer.invoke('check-adb');
  },
  
  checkIOSTools: () => {
    return ipcRenderer.invoke('check-ios-tools');
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);