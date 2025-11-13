/// <reference types="vite/client" />

interface ElectronAPI {
  getDevices: () => Promise<any[]>;
  pushFile: (params: { deviceId: string; filePath: string; deviceType: string }) => Promise<{ success: boolean; error?: string }>;
  selectFile: () => Promise<string | null>;
  checkADB: () => Promise<boolean>;
  checkIOSTools: () => Promise<boolean>;
}

interface Window {
  electronAPI: ElectronAPI;
}