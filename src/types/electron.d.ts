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
  pushFile: (params: { deviceId: string; filePath: string; deviceType: string }) => Promise<{ success: boolean; error?: string; targetPath?: string; duration?: number }>;
  selectFile: () => Promise<string | null>;
  checkADB: () => Promise<boolean>;
  checkIOSTools: () => Promise<boolean>;
  getSettings: () => Promise<any>;
  updateSettings: (payload: any) => Promise<any>;
  resetSettings: () => Promise<any>;
  selectDirectory: () => Promise<string | null>;
  selectExecutable: () => Promise<string | null>;
  validatePath: (input: string, kind?: 'file' | 'directory') => Promise<{ valid: boolean; exists: boolean; error?: string }>;
  getTransferPaths: () => Promise<TransferPathConfig>;
  updateTransferPaths: (paths: TransferPathConfig) => Promise<{ success: boolean; error?: string; paths?: TransferPathConfig }>;
  validateTransferPath: (params: { path: string; deviceType: 'android' | 'ios' }) => Promise<{ valid: boolean; error?: string }>;
  getTransferLog: (limit?: number) => Promise<TransferLogEntry[]>;
  clearTransferLog: () => Promise<{ success: boolean; error?: string }>;
  getTransferStats: () => Promise<TransferStats>;
}

interface Window {
  electronAPI: ElectronAPI;
}
