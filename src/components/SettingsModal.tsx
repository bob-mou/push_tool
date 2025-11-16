import { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Bell, Play, FolderOpen, FileCog, RefreshCcw, CheckCircle2, XCircle, Route, History, HelpCircle } from 'lucide-react';
import { useStore } from '@/store/appStore';
import { TransferLogViewer } from './TransferLogViewer';
import { HelpModal } from './HelpModal';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [dirValidity, setDirValidity] = useState<{ valid: boolean; exists: boolean; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'logs'>('general');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await window.electronAPI.getSettings();
      setLocalSettings(s);
    })();
  }, []);

  const handleSave = () => {
    window.electronAPI.updateSettings(localSettings).then((updated) => {
      updateSettings(updated);
      onClose();
    });
  };

  const handleReset = async () => {
    const defaults = await window.electronAPI.resetSettings();
    setLocalSettings(defaults);
    updateSettings(defaults);
  };

  const validateDir = async (val: string) => {
    const r = await window.electronAPI.validatePath(val, 'directory');
    setDirValidity(r);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-10">
      <div className="bg-white rounded-lg w-full max-w-[90vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[85vh] shadow-l flex flex-col">
        <div className="flex items-center justify-between p-1 electron-drag">
          <div className="flex items-center space-x-1">
            <SettingsIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">设置</h2>
          </div>
          <div className="flex items-center space-x-1 electron-no-drag">
            <button
              onClick={() => setShowHelp(true)}
              className="p-1 hover:bg-gray-100 rounded"
              title="使用帮助"
            >
              <HelpCircle className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
              title="关闭"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="flex border-b px-3">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            常规设置
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4 inline mr-1" />
            传输日志
          </button>
        </div>

        {/* 标签页内容 */}
        <div className="flex-1 overflow-y-auto p-3 leading-tight min-h-[320px]">
          {activeTab === 'general' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Play className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">开机自动启动</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.autoStart}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, autoStart: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Bell className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">传输完成通知</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.notifications}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, notifications: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              

              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5">
                  <FileCog className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">iOS 应用 Bundle ID</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    value={localSettings.iosBundleId || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLocalSettings(prev => ({ ...prev, iosBundleId: v }));
                    }}
                    placeholder="例: com.example.app"
                    className={`flex-1 min-w-0 px-3 py-2 rounded border border-gray-300 focus:outline-none`}
                  />
                </div>
                <div className="text-xs text-gray-500">用于定位应用容器，例如 com.tencent.uc</div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5">
                  <FileCog className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">设备轮询间隔 (毫秒)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    value={Number(localSettings.pollingInterval || 0) || 5000}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || '0', 10);
                      setLocalSettings(prev => ({ ...prev, pollingInterval: isNaN(v) ? 5000 : v }));
                    }}
                    placeholder="例如 5000"
                    className={`flex-1 min-w-0 px-3 py-2 rounded border border-gray-300 focus:outline-none`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Bell className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">监控 Android 设备</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.enableADB !== false}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, enableADB: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Bell className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">监控 iOS 设备</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.enableIOS !== false}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, enableIOS: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5">
                  <FileCog className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">轮询失败最大重试次数</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    value={Number(localSettings.maxRetries || 0) || 3}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || '0', 10);
                      setLocalSettings(prev => ({ ...prev, maxRetries: isNaN(v) ? 3 : v }));
                    }}
                    placeholder="例如 3"
                    className={`flex-1 min-w-0 px-3 py-2 rounded border border-gray-300 focus:outline-none`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">文件保存目录</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    value={localSettings.saveDir || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLocalSettings(prev => ({ ...prev, saveDir: v }));
                      validateDir(v);
                    }}
                    placeholder="选择文件保存目录"
                    className={`flex-1 min-w-0 px-3 py-2 rounded border ${dirValidity ? (dirValidity.valid ? 'border-green-500' : 'border-red-500') : 'border-gray-300'} focus:outline-none truncate`}
                  />
                  <button
                    onClick={async () => {
                      const p = await window.electronAPI.selectDirectory();
                      if (p) {
                        setLocalSettings(prev => ({ ...prev, saveDir: p }));
                        validateDir(p);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    浏览
                  </button>
                  {dirValidity && (
                    dirValidity.valid ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                {dirValidity && !dirValidity.valid && (
                  <div className="text-xs text-red-600">{dirValidity.error}</div>
                )}
              </div>
            </div>
          )}

          

          {activeTab === 'logs' && (
            <TransferLogViewer onClose={onClose} />
          )}
        </div>

        {/* 底部按钮 */}
        {activeTab === 'general' && (
          <div className="flex justify-between p-3 border-t bg-gray-50">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center space-x-1.5"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>恢复默认</span>
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        )}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </div>
    </div>
  );
}
