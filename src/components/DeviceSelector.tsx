import { useState, useEffect } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useStore } from '@/store/appStore';

export function DeviceSelector() {
  const { devices, selectedDevice, setDevices, setSelectedDevice } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshDevices();
  }, []);

  const refreshDevices = async () => {
    setIsRefreshing(true);
    try {
      const hasElectron = typeof window !== 'undefined' && (window as any).electronAPI;
      if (hasElectron) {
        const api = (window as any).electronAPI;
        await Promise.all([
          api.checkADB?.(),
          api.checkIOSTools?.()
        ]);
      }
      const deviceList = hasElectron ? await (window as any).electronAPI.getDevices() : [];
      setDevices(deviceList);
      
      // 如果没有选中设备且有可用设备，自动选择第一个
      if (!selectedDevice && deviceList.length > 0) {
        setSelectedDevice(deviceList[0]);
      }
    } catch (error) {
      console.error('获取设备列表失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeviceSelect = (device: any) => {
    setSelectedDevice(device);
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-center space-x-2 electron-no-drag">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        disabled={devices.length === 0}
      >
        <div className={`w-3 h-3 rounded-full ${
          selectedDevice?.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
        }`} />
        
        <span className="text-gray-700">
          {selectedDevice ? selectedDevice.name : '选择设备'}
        </span>
        
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* 刷新按钮 */}
      <button
        onClick={refreshDevices}
        className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        disabled={isRefreshing}
      >
        <RefreshCw className={`w-4 h-4 text-gray-600 ${
          isRefreshing ? 'animate-spin' : ''
        }`} />
      </button>

      {/* 设备下拉列表 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-10">
          <div className="p-2">
            {devices.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-sm">
                未检测到连接的设备
              </div>
            ) : (
              devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => handleDeviceSelect(device)}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
                >
                  <div className={`w-3 h-3 rounded-full ${
                    device.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {device.name}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {device.type} • {device.status}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
