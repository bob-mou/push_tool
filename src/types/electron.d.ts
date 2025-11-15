/// <reference types="vite/client" />

interface TransferPathConfig {
  android: string;
  ios: string;
}

interface TransferLogEntry {
  timestamp: string;
  deviceId: string;
  deviceType: 'android' | 'ios';
  deviceName: string;
  sourcePath: string;
  targetPath: string;
  status: 'success' | 'failed' | 'in_progress';
  error?: string;
  duration?: number;
  fileSize?: number;
}

interface TransferStats {
  total: number;
  successful: number;
  failed: number;
  byDeviceType: { android: number; ios: number };
  recent: TransferLogEntry[];
}

interface ElectronAPI {
  getDevices: () => Promise<any[]>;
  pushFile: (params: { deviceId: string; filePath: string; deviceType: string; targetDir?: string }) => Promise<{ success: boolean; error?: string; targetPath?: string; duration?: number }>;
  selectFile: () => Promise<string | null>;
  checkADB: () => Promise<boolean>;
  checkIOSTools: () => Promise<boolean>;
  getSettings: () => Promise<any>;
  updateSettings: (payload: any) => Promise<any>;
  resetSettings: () => Promise<any>;
  selectDirectory: () => Promise<string | null>;
  selectExecutable: () => Promise<string | null>;
  validatePath: (input: string, kind?: 'file' | 'directory') => Promise<{ valid: boolean; exists: boolean; error?: string }>;
  getAppRoot: () => Promise<string>;
  getTransferPaths: () => Promise<TransferPathConfig>;
  updateTransferPaths: (paths: TransferPathConfig) => Promise<{ success: boolean; error?: string; paths?: TransferPathConfig }>;
  validateTransferPath: (params: { path: string; deviceType: 'android' | 'ios' }) => Promise<{ valid: boolean; error?: string }>;
  getTransferLog: (limit?: number) => Promise<TransferLogEntry[]>;
  clearTransferLog: () => Promise<{ success: boolean; error?: string }>;
  getTransferStats: () => Promise<TransferStats>;
  materializeFile: (payload: { fileName: string; data: ArrayBuffer | Uint8Array | Buffer | { type?: string; data?: number[] } }) => Promise<string | null>;
  onTransferProgress: (cb: (payload: { fileName?: string; progress: number; speedMbps?: number; etaSeconds?: number; targetPath?: string; error?: string }) => void) => void;
  
  // 设备监控相关API
  startDeviceMonitoring: () => Promise<{ success: boolean }>;
  stopDeviceMonitoring: () => Promise<{ success: boolean }>;
  getDeviceMonitorConfig: () => Promise<any>;
  updateDeviceMonitorConfig: (config: any) => Promise<{ success: boolean }>;
  forceRefreshDevices: () => Promise<{ success: boolean; devices?: any[]; error?: string }>;
  
  // 事件监听相关
  onDeviceStatusChanged: (callback: (event: any) => void) => () => void;
  onDeviceMonitorError: (callback: (error: string) => void) => () => void;
  removeDeviceListeners: () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
