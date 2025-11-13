import { contextBridge, ipcRenderer } from 'electron';
const electronAPI = {
    getDevices: () => ipcRenderer.invoke('get-devices'),
    pushFile: (params) => ipcRenderer.invoke('push-file', params),
    selectFile: () => ipcRenderer.invoke('select-file')
};
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
