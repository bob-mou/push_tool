import { contextBridge, ipcRenderer } from 'electron';
const electronAPI = {
    getDevices: () => ipcRenderer.invoke('get-devices'),
    pushFile: (params) => ipcRenderer.invoke('push-file', params),
    selectFile: () => ipcRenderer.invoke('select-file'),
    openHelp: () => ipcRenderer.invoke('open-help'),
    // 设备监控相关API
    startDeviceMonitoring: () => ipcRenderer.invoke('start-device-monitoring'),
    stopDeviceMonitoring: () => ipcRenderer.invoke('stop-device-monitoring'),
    getDeviceMonitorConfig: () => ipcRenderer.invoke('get-device-monitor-config'),
    updateDeviceMonitorConfig: (config) => ipcRenderer.invoke('update-device-monitor-config', config),
    forceRefreshDevices: () => ipcRenderer.invoke('force-refresh-devices'),
    // 事件监听相关
    onDeviceStatusChanged: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('device-status-changed', handler);
        return () => ipcRenderer.removeListener('device-status-changed', handler);
    },
    onDeviceMonitorError: (callback) => {
        const handler = (_event, error) => callback(error);
        ipcRenderer.on('device-monitor-error', handler);
        return () => ipcRenderer.removeListener('device-monitor-error', handler);
    },
    removeDeviceListeners: () => {
        ipcRenderer.removeAllListeners('device-status-changed');
        ipcRenderer.removeAllListeners('device-monitor-error');
    }
};
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
