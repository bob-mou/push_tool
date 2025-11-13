import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getDevices: () => Promise<any[]>;
  pushFile: (params: { deviceId: string; filePath: string; deviceType: string }) => Promise<{ success: boolean; error?: string }>;
  selectFile: () => Promise<string | null>;
}

const electronAPI: ElectronAPI = {
  getDevices: () => ipcRenderer.invoke('get-devices'),
  pushFile: (params) => ipcRenderer.invoke('push-file', params),
  selectFile: () => ipcRenderer.invoke('select-file')
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);