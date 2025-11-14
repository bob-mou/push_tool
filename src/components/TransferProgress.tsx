import { useStore } from '@/store/appStore';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export function TransferProgress() {
  const { transferProgress, settings } = useStore();

  if (!transferProgress) return null;

  const { fileName, progress, status, error, speedMbps, etaSeconds, targetPath } = transferProgress;

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return `正在上传: ${fileName}`;
      case 'completed':
        return `上传完成: ${fileName}`;
      case 'error':
        return `上传失败: ${error || '未知错误'}`;
      default:
        return '';
    }
  };

  useEffect(() => {
    if (status === 'completed' && settings.notifications) {
      const title = '传输完成';
      const body = `上传完成: ${fileName}`;
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((p) => {
            if (p === 'granted') {
              new Notification(title, { body });
            }
          });
        }
      }
    }
  }, [status, settings.notifications, fileName]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <div className="flex items-center justify-between mb-4 electron-drag">
          <h3 className="text-lg font-semibold text-gray-800">文件传输</h3>
          {status !== 'uploading' && (
            <button
              onClick={() => {
                const { setTransferProgress, setTransferring } = useStore.getState();
                setTransferProgress(null);
                setTransferring(false);
              }}
              className="p-1 hover:bg-gray-100 rounded electron-no-drag"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">{getStatusText()}</p>
          {status === 'uploading' && (
            <div className="text-xs text-gray-500">速度: {speedMbps ? `${speedMbps.toFixed(2)} MB/s` : '-'} · 剩余: {etaSeconds ? `${Math.ceil(etaSeconds)}s` : '-'}</div>
          )}
          
          {status === 'uploading' && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          {status === 'completed' && (
            <div className="flex items-center space-x-2 text-green-600">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium">传输成功</span>
              {targetPath && (
                <span className="text-xs text-gray-600">保存: {targetPath}</span>
              )}
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium">传输失败</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
