import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Smartphone, Settings, HelpCircle, X } from 'lucide-react';
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
    setTransferProgress,
    enqueueTransfers,
    dequeueTransfer
  } = useStore();
  
  const [showSettings, setShowSettings] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: DroppedFile[]) => {
    if (!selectedDevice) {
      alert('请先选择设备');
      return;
    }

    if (acceptedFiles.length === 0) return;

    
    for (const f of acceptedFiles) {
      const max = 500 * 1024 * 1024;
      if (typeof f.size === 'number' && f.size > max) {
        alert(`文件过大: ${f.name} 超过500MB限制`);
        return;
      }
    }

    
    enqueueTransfers(acceptedFiles.map(f => ({ fileName: f.name, filePath: (f as DroppedFile).path || f.name })));

    const processOne = async (file: DroppedFile) => {
    
    let filePath = file.path || file.name;
    
    const looksRelative = (p: string) => {
      if (!p) return true;
      const s = p.replace(/\\/g, '/');
      if (s.startsWith('./') || s.startsWith('../')) return true;
      if (/^[a-zA-Z]:\//.test(s)) return false;
      if (s.startsWith('//')) return false;
      if (s.startsWith('/')) return false;
      return !p.includes(':') && !p.includes('\\');
    };

    if (!filePath || filePath === file.name || looksRelative(filePath)) {
      const selectedPath = await window.electronAPI.selectFile();
      if (!selectedPath) {
        alert('请选择文件');
        return;
      }
      filePath = selectedPath;
    }

    
    if (!filePath || typeof filePath !== 'string') {
      alert('无效的文件路径');
      return;
    }

    
    try {
      
      filePath = decodeURIComponent(filePath);
    } catch (e) {
      
      console.log('Path decoding failed, using original path:', e);
    }

    
    if (filePath.includes('�') || filePath.includes('?') || /[\uFFFD-\uFFFF]/.test(filePath)) {
      console.error('检测到文件路径编码错误:', filePath);
      alert('文件路径编码错误，请使用文件选择对话框选择文件');
      return;
    }

    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const pathExtension = filePath.split('.').pop()?.toLowerCase();
    if (fileExtension && pathExtension && fileExtension !== pathExtension) {
      console.error('文件扩展名不匹配，可能路径损坏:', { fileName: file.name, filePath });
      alert('文件路径可能损坏，请使用文件选择对话框选择文件');
      return;
    }

    setTransferring(true);
    setTransferProgress({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    });

    try {
      
      let targetDir: string | undefined = undefined;
      try {
        const useCustom = confirm('是否使用自定义保存路径？\n选择“确定”将输入远程目录，否则使用默认');
        if (useCustom) {
          const input = prompt('输入Android保存目录（以/sdcard/或/storage/开头）');
          if (input) {
            const v = await window.electronAPI.validateTransferPath({ path: input, deviceType: selectedDevice.type });
            if (v.valid) targetDir = input;
            else alert(`路径无效: ${v.error}`);
          }
        }
      } catch {}

      const result = await window.electronAPI.pushFile({
        deviceId: selectedDevice.id,
        filePath: filePath,
        deviceType: selectedDevice.type,
        targetDir
      });

      if (result.success) {
        setTransferProgress({
          fileName: file.name,
          progress: 100,
          status: 'completed',
          targetPath: result.targetPath
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
    } finally {
      dequeueTransfer();
      const next = acceptedFiles.shift();
      if (next) await processOne(next as DroppedFile);
      else setTransferring(false);
    }
  };

  
  const startProcess = useCallback(async (files: DroppedFile[]) => {
    const list = [...files];
    if (list.length > 0) await processOne(list.shift() as DroppedFile);
  }, [selectedDevice]);

  const onDropHandler = useCallback(async (files: DroppedFile[]) => {
    await startProcess(files);
  }, [startProcess]);

  const onDrop = onDropHandler;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isTransferring || !selectedDevice,
    multiple: true
  });

  useEffect(() => {
    if ((window as any).electronAPI?.onTransferProgress) {
      (window as any).electronAPI.onTransferProgress((payload: any) => {
        setTransferProgress(prev => prev ? {
          ...prev,
          progress: typeof payload.progress === 'number' ? payload.progress : prev.progress,
          speedMbps: typeof payload.speedMbps === 'number' ? payload.speedMbps : prev.speedMbps,
          etaSeconds: typeof payload.etaSeconds === 'number' ? payload.etaSeconds : prev.etaSeconds,
          targetPath: payload.targetPath || prev.targetPath,
          error: payload.error || prev.error
        } : prev);
      });
    }
  }, [setTransferProgress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 顶部工具栏 */}
        <div className="flex justify-end items-center mb-8 electron-drag">
          <div className="flex items-center space-x-4">
            <div className="electron-no-drag">
              <DeviceSelector />
            </div>
            
            {import.meta.env.DEV && (
              <button
                onClick={() => {
                  setTransferring(true);
                  setTransferProgress({ fileName: 'demo.txt', progress: 100, status: 'completed' });
                  setTimeout(() => {
                    setTransferProgress(null);
                    setTransferring(false);
                  }, 2000);
                }}
                className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 shadow-md hover:shadow-lg transition-shadow"
                title="模拟完成"
              >
                模拟完成
              </button>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow electron-no-drag"
              title="设置"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={() => {
                const api = (window as any).electronAPI;
                if (api && api.openHelp) api.openHelp();
                else window.location.hash = '#/help';
              }}
              className="p-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow electron-no-drag"
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
            relative border-0 rounded-2xl p-12 text-center transition-all duration-300
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
    </div>
  );
}
