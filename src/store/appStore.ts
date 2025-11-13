import { create } from 'zustand';

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
}

interface AppState {
  devices: Device[];
  selectedDevice: Device | null;
  isTransferring: boolean;
  transferProgress: TransferProgress | null;
  settings: {
    autoStart: boolean;
    notifications: boolean;
  };
  
  // Actions
  setDevices: (devices: Device[]) => void;
  setSelectedDevice: (device: Device | null) => void;
  setTransferring: (transferring: boolean) => void;
  setTransferProgress: (progress: TransferProgress | null) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
}

export const useStore = create<AppState>((set) => ({
  devices: [],
  selectedDevice: null,
  isTransferring: false,
  transferProgress: null,
  settings: {
    autoStart: true,
    notifications: true,
  },
  
  setDevices: (devices) => set({ devices }),
  setSelectedDevice: (selectedDevice) => set({ selectedDevice }),
  setTransferring: (isTransferring) => set({ isTransferring }),
  setTransferProgress: (transferProgress) => set({ transferProgress }),
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
}));