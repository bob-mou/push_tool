import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Settings } from 'lucide-react';
import { useStore } from '@/store/appStore';
import { DeviceSelector } from './DeviceSelector';
import { TargetPathSelector } from './TargetPathSelector';
const TransferProgress = lazy(() => import('./TransferProgress').then(m => ({ default: m.TransferProgress })));
const SettingsModal = lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
 
 

interface DroppedFile extends File {
  path: string;
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
  const [selectedTargetDir, setSelectedTargetDir] = useState<string | undefined>(undefined);

  const processOne = async (file: DroppedFile, queue: DroppedFile[]) => {
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
      try {
        const buf = new Uint8Array(await file.arrayBuffer());
        const tmp = await window.electronAPI.materializeFile({ fileName: file.name, data: buf });
        if (!tmp) {
          const selectedPath = await window.electronAPI.selectFile();
          if (!selectedPath) {
            alert('请选择文件');
            return;
          }
          filePath = selectedPath;
        } else {
          filePath = tmp;
        }
      } catch {
        const selectedPath = await window.electronAPI.selectFile();
        if (!selectedPath) {
          alert('请选择文件');
          return;
        }
        filePath = selectedPath;
      }
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

    setTransferring(true);
    setTransferProgress({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    });

    try {
      let targetDir: string | undefined = undefined;
      try {
        const primary = selectedTargetDir;
        if (typeof primary === 'string' && primary.trim()) {
          const v = await window.electronAPI.validateTransferPath({ path: primary, deviceType: selectedDevice.type });
          if (v.valid) targetDir = primary;
        }
        if (!targetDir) {
          const paths = await window.electronAPI.getTransferPaths();
          const fallback = selectedDevice.type === 'android' ? (paths as any).android : (paths as any).ios;
          if (typeof fallback === 'string' && fallback.trim()) {
            const v2 = await window.electronAPI.validateTransferPath({ path: fallback, deviceType: selectedDevice.type });
            if (v2.valid) targetDir = fallback;
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
        try {
          const saveRes = await (window as any).electronAPI.saveLocalFile({
            sourcePath: filePath,
            options: {
              preserveAttributes: true,
              atomicMove: true,
              conflictStrategy: 'rename'
            }
          });
          if (saveRes?.success) {
            console.log(`文件已保存到本地: ${saveRes.finalPath}`);
          } else {
            console.warn(`本地保存失败: ${saveRes?.error}`);
          }
        } catch (localError) {
          console.warn('本地保存异常:', localError);
        }

        setTransferProgress({
          fileName: file.name,
          progress: 100,
          status: 'completed',
          targetPath: result.targetPath
        });

        setTimeout(() => {
          setTransferProgress(null);
          setTransferring(false);
        }, 5000);
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
        error: (error as any).message
      });

      setTimeout(() => {
        setTransferProgress(null);
        setTransferring(false);
      }, 3000);
    }
    finally {
      dequeueTransfer();
      const next = queue.shift();
      if (next) await processOne(next as DroppedFile, queue);
    }
  };

  const startProcess = useCallback(async (files: DroppedFile[]) => {
    const list = [...files];
    if (list.length > 0) await processOne(list.shift() as DroppedFile, list);
  }, [selectedDevice]);

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
    await startProcess(acceptedFiles);
  }, [selectedDevice, startProcess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isTransferring || !selectedDevice,
    multiple: true
  });

  useEffect(() => {
    if ((window as any).electronAPI?.onTransferProgress) {
      (window as any).electronAPI.onTransferProgress((payload: any) => {
        const prev = (useStore as any).getState().transferProgress;
        if (prev) {
          setTransferProgress({
            ...prev,
            progress: typeof payload.progress === 'number' ? payload.progress : prev.progress,
            speedMbps: typeof payload.speedMbps === 'number' ? payload.speedMbps : prev.speedMbps,
            etaSeconds: typeof payload.etaSeconds === 'number' ? payload.etaSeconds : prev.etaSeconds,
            targetPath: payload.targetPath || prev.targetPath,
            error: payload.error || prev.error
          });
        }
      });
    }
  }, [setTransferProgress]);

  return (
    <div className="min-w-[320px] w-full h-full min-h-0 bg-gradient-to-br from-blue-50 to-indigo-100 p-3 flex flex-col">
      <div className="flex flex-col flex-1">
        {/* 顶部工具栏 */}
        <div className="flex justify-end items-center mb-3 electron-drag">
          <div className="flex items-center space-x-2">
            <div className="electron-no-drag">
              <DeviceSelector />
            </div>
            <div className="electron-no-drag">
              <TargetPathSelector onSelect={(p) => setSelectedTargetDir(p)} />
            </div>
            

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow electron-no-drag"
              title="设置"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>

            {/* 使用帮助入口移至设置弹窗右上角，故移除顶部帮助按钮 */}
          </div>
        </div>

        {/* 文件拖拽区域 */}
        <div
          {...getRootProps()}
          className={`
            electron-no-drag
            relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300
            ${isDragActive 
              ? 'border-blue-600 bg-blue-80 scale-105' 
              : 'border-gray-400 bg-white hover:border-gray-400'
            }
            ${(!selectedDevice || isTransferring) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            min-w-[90px] flex-1 flex items-center justify-center
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
            <div className="absolute inset-0 bg蓝-100 bg-opacity-50 rounded-2xl" />
            <div className="absolute inset-0 bg蓝-100 bg-opacity-50 rounded-2xl" />
          )}
        </div>

        {/* 传输进度显示 */}
        {isTransferring && (
          <Suspense fallback={<div className="p-2 text-gray-500">加载进度...</div>}>
            <TransferProgress />
          </Suspense>
        )}
      </div>

      {/* 模态框 */}
      {showSettings && (
        <Suspense fallback={<div className="p-4 text-gray-600">加载设置...</div>}>
          <SettingsModal onClose={() => setShowSettings(false)} />
        </Suspense>
      )}
    </div>
  );
}