import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Device {
  id: string;
  name: string;
  type: 'android' | 'ios';
  status: 'connected' | 'disconnected';
}

export interface TransferProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  speedMbps?: number;
  etaSeconds?: number;
  targetPath?: string;
}

interface AppState {
  devices: Device[];
  selectedDevice: Device | null;
  isTransferring: boolean;
  transferProgress: TransferProgress | null;
  transferQueue?: { fileName: string; filePath: string }[];
  settings: {
    autoStart: boolean;
    notifications: boolean;
    saveDir?: string;
    iosBundleId?: string;
    iosIdbMode?: 'facebook' | 'i4';
    pollingInterval?: number;
    enableADB?: boolean;
    enableIOS?: boolean;
    maxRetries?: number;
  };
  
  // Actions
  setDevices: (devices: Device[]) => void;
  setSelectedDevice: (device: Device | null) => void;
  setTransferring: (transferring: boolean) => void;
  setTransferProgress: (progress: TransferProgress | null) => void;
  enqueueTransfers?: (items: { fileName: string; filePath: string }[]) => void;
  dequeueTransfer?: () => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      devices: [],
      selectedDevice: null,
      isTransferring: false,
      transferProgress: null,
      transferQueue: [],
      settings: {
        autoStart: true,
        notifications: true,
        saveDir: '',
        iosBundleId: '',
        iosIdbMode: 'i4',
        pollingInterval: 5000,
        enableADB: true,
        enableIOS: true,
        maxRetries: 3
      },
      setDevices: (devices) => set({ devices }),
      setSelectedDevice: (selectedDevice) => set({ selectedDevice }),
      setTransferring: (isTransferring) => set({ isTransferring }),
      setTransferProgress: (transferProgress) => set({ transferProgress }),
      enqueueTransfers: (items) => set((state) => ({ transferQueue: [...(state.transferQueue || []), ...items] })),
      dequeueTransfer: () => set((state) => ({ transferQueue: (state.transferQueue || []).slice(1) })),
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    }),
    {
      name: 'file-tool-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
