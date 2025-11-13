import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Smartphone, Settings, HelpCircle } from 'lucide-react';
import { useStore } from '@/store/appStore';
import { DeviceSelector } from './DeviceSelector';
import { TransferProgress } from './TransferProgress';
import { SettingsModal } from './SettingsModal';
import { HelpModal } from './HelpModal';

interface DroppedFile extends File {
  path?: string;
}

export function FileDropZone() {
  const { 
    selectedDevice, 
    isTransferring, 
    setTransferring, 
    setTransferProgress 
  } = useStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: DroppedFile[]) => {
    if (!selectedDevice) {
      alert('请先选择设备');
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // 获取文件路径 - 对于拖拽文件，使用真实路径
    let filePath = file.path || file.name;
    
    // 如果是模拟数据或没有路径，使用文件选择对话框
    if (!filePath || filePath === file.name) {
      const selectedPath = await window.electronAPI.selectFile();
      if (!selectedPath) {
        alert('请选择文件');
        return;
      }
      filePath = selectedPath;
    }

    setTransferring(true);
    setTransferProgress({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    });

    try {
      // 实际文件推送逻辑
      const result = await window.electronAPI.pushFile({
        deviceId: selectedDevice.id,
        filePath: filePath,
        deviceType: selectedDevice.type
      });

      if (result.success) {
        setTransferProgress({
          fileName: file.name,
          progress: 100,
          status: 'completed'
        });
        
        setTimeout(() => {
          setTransferProgress(null);
          setTransferring(false);
        }, 2000);
      } else {
        setTransferProgress({
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: result.error
        });
        
        setTimeout(() => {
          setTransferProgress(null);
          setTransferring(false);
        }, 3000);
      }
    } catch (error) {
      setTransferProgress({
        fileName: file.name,
        progress: 0,
        status: 'error',
        error: error.message
      });
      
      setTimeout(() => {
        setTransferProgress(null);
        setTransferring(false);
      }, 3000);
    }
  }, [selectedDevice, setTransferring, setTransferProgress]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isTransferring || !selectedDevice,
    multiple: false
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 顶部工具栏 */}
        <div className="flex justify-end items-center mb-8">
          <div className="flex items-center space-x-4">
            <DeviceSelector />
            
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow"
              title="设置"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow"
              title="帮助"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 文件拖拽区域 */}
        <div
          {...getRootProps()}
          className={`
            relative border-4 border-dashed rounded-2xl p-12 text-center transition-all duration-300
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50 scale-105' 
              : 'border-gray-300 bg-white hover:border-gray-400'
            }
            ${(!selectedDevice || isTransferring) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-4">
            <Upload className={`w-16 h-16 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            
            <div className="space-y-2">
              <p className="text-xl font-semibold text-gray-700">
                {isDragActive ? '释放文件以上传' : '拖拽文件到此处'}
              </p>
              
              <p className="text-gray-500">
                {!selectedDevice 
                  ? '请先选择连接的设备' 
                  : isTransferring 
                  ? '正在传输文件...' 
                  : '或点击选择文件'
                }
              </p>
            </div>
          </div>
          
          {isDragActive && (
            <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-2xl" />
          )}
        </div>

        {/* 传输进度显示 */}
        {isTransferring && <TransferProgress />}
      </div>

      {/* 模态框 */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}