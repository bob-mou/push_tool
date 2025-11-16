import { useState, useEffect } from 'react';
import { Clock, Smartphone, FileText, CheckCircle, XCircle, RefreshCw, Trash2, Download } from 'lucide-react';

interface TransferLogViewerProps {
  onClose: () => void;
}

export function TransferLogViewer({ onClose }: TransferLogViewerProps) {
  const [logs, setLogs] = useState<TransferLogEntry[]>([]);
  const [stats, setStats] = useState<TransferStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransferData();
  }, []);

  const loadTransferData = async () => {
    try {
      const [logData, statsData] = await Promise.all([
        window.electronAPI.getTransferLog(100), // 获取最近100条日志
        window.electronAPI.getTransferStats()
      ]);
      
      setLogs(logData);
      setStats(statsData);
      setLoading(false);
    } catch (error) {
      console.error('加载传输数据失败:', error);
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (confirm('确定要清除所有传输日志吗？此操作不可恢复。')) {
      try {
        await window.electronAPI.clearTransferLog();
        setLogs([]);
        setStats(prev => prev ? { ...prev, total: 0, successful: 0, failed: 0, byDeviceType: { android: 0, ios: 0 }, recent: [] } : null);
      } catch (error) {
        alert('清除日志失败: ' + error);
      }
    }
  };

  const exportLogs = () => {
    const logText = logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
      const status = log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '进行中';
      const fileSize = log.fileSize ? formatFileSize(log.fileSize) : '';
      const duration = log.duration ? formatDuration(log.duration) : '';
      
      return [
        `时间: ${timestamp}`,
        `设备: ${log.deviceName} (${log.deviceId})`,
        `类型: ${log.deviceType === 'android' ? 'Android' : 'iOS'}`,
        `状态: ${status}`,
        `源文件: ${log.sourcePath}`,
        `目标路径: ${log.targetPath}`,
        fileSize ? `文件大小: ${fileSize}` : '',
        duration ? `传输时间: ${duration}` : '',
        log.error ? `错误信息: ${log.error}` : '',
        '-'.repeat(50)
      ].filter(Boolean).join('\n');
    }).join('\n\n');
    
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `传输日志_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-500">正在加载传输日志...</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1 leading-tight">
      {/* 统计信息 */}
      {stats && (
        <div className="bg-gray-50 rounded-lg pt-1 pb-2">
          <h3 className="text-lg font-semibold text-gray-600 mb-1 flex items-center space-x-1">
            <Smartphone className="w-6 h-4" />
            <span>传输统计</span>
          </h3>
          
          <div className="flex flex-row flex-nowrap gap-x-2">
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-m text-gray-600">总传输</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
              <div className="text-m text-gray-600">成功</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-m text-gray-600">失败</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.byDeviceType.android + stats.byDeviceType.ios}
              </div>
              <div className="text-m text-gray-600">设备数</div>
            </div>
          </div>
          
          <div className="mt-1 flex justify-center space-x-2 text-lg gap-x-10">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Android: {stats.byDeviceType.android}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>iOS: {stats.byDeviceType.ios}</span>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <h2 className="text-l font-semibold text-gray-800 flex items-center space-x-2">
          <Clock className="w-6 h-4" />
          <span>传输日志 ({logs.length}条)</span>
        </h2>
        
        <div className="flex space-x-2 ml-auto">
          <button
            onClick={loadTransferData}
            className="px-3 py-1 text-sm bg-gray-150 text-gray-700 rounded hover:bg-gray-600 flex items-center space-x-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={exportLogs}
            className="px-3 py-1 text-sm bg-blue-150 text-blue-700 rounded hover:bg-blue-600 flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-sm bg-red-150 text-red-700 rounded hover:bg-red-600 flex items-center space-x-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无传输记录</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="bg-white border rounded-lg p-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center space-x-1.5">
                    {log.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : log.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <span className="text-sm font-medium">
                      {log.deviceName} ({log.deviceType === 'android' ? 'Android' : 'iOS'})
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1 break-all">
                    <div className="flex items-center space-x-1.5">
                      <FileText className="w-3 h-3" />
                      <span>源: {log.sourcePath}</span>
                    </div>
                    <div className="flex itemscenter space-x-1.5">
                      <Smartphone className="w-3 h-3" />
                      <span>目标: {log.targetPath}</span>
                    </div>
                    {log.fileSize && (
                      <div className="text-xs text-gray-500 break-all">
                        大小: {formatFileSize(log.fileSize)}
                        {log.duration && (
                          <span className="ml-2">用时: {formatDuration(log.duration)}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {log.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded break-all">
                      <strong>错误:</strong> {log.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}