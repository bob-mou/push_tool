import { useState, useEffect } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useStore } from '@/store/appStore';

export function DeviceSelector() {
  const { devices, selectedDevice, setDevices, setSelectedDevice } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatDeviceName = (device?: any) => {
    if (!device) return '';
    const raw = (device.name ?? '').trim();
    const type = String(device.type ?? '').toLowerCase();
    if (type === 'ios') {
      const max = 16;
      return raw.length > max ? raw.slice(0, max) : raw;
    }
    const max = 16;
    return raw.length > max ? raw.slice(0, max) : raw;
  };

  useEffect(() => {
    refreshDevices();
    
    // 设置设备状态变化监听
    if (typeof window !== 'undefined' && window.electronAPI) {
      const api = window.electronAPI;
      
      try {
        // 监听设备连接状态变化
        const removeDeviceListener = api.onDeviceStatusChanged((event: any) => {
          console.log('设备状态变化:', event);
          refreshDevices();
        });
        
        // 监听设备监控错误
        const removeErrorListener = api.onDeviceMonitorError((error: string) => {
          console.error('设备监控错误:', error);
        });
        
        // 清理函数
        return () => {
          if (typeof removeDeviceListener === 'function') {
            removeDeviceListener();
          }
          if (typeof removeErrorListener === 'function') {
            removeErrorListener();
          }
        };
      } catch (error) {
        console.error('设置设备监听器失败:', error);
      }
    }
  }, []);

  const refreshDevices = async () => {
    setIsRefreshing(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const api = window.electronAPI;
        const devices = await api.getDevices();
        setDevices(devices);
        
        // 如果没有选中设备且有可用设备，自动选择第一个
        if (!selectedDevice && devices && devices.length > 0) {
          setSelectedDevice(devices[0]);
        }
      } else {
        // 非Electron环境，使用空数组
        setDevices([]);
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
    <div className="relative flex items-center electron-no-drag">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        disabled={devices.length === 0}
      >
        <div className={`w-3 h-3 rounded-full ${
          selectedDevice?.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
        }`} />
        
        <span className="text-gray-700">
          {selectedDevice ? formatDeviceName(selectedDevice) : '选择设备'}
        </span>
        
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* 刷新按钮 */}
      <button
        onClick={refreshDevices}
        className="ml-2 p-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        disabled={isRefreshing}
      >
        <RefreshCw className={`w-4 h-4 text-gray-600 ${
          isRefreshing ? 'animate-spin' : ''
        }`} />
      </button>

      {/* 设备下拉列表 */}
      {isOpen && (
        <div className="absolute space-x-0 top-full mt-2 w-58 bg-white rounded-lg shadow-lg border z-10">
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
                  className="w-full flex items-center space-x-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
                >
                  <div className={`w-3 h-3 rounded-full ${
                    device.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDeviceName(device)}
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
