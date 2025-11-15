import { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Bell, Play, FolderOpen, FileCog, RefreshCcw, CheckCircle2, XCircle, Route, History, HelpCircle } from 'lucide-react';
import { useStore } from '@/store/appStore';
import { TransferPathSettings } from './TransferPathSettings';
import { TransferLogViewer } from './TransferLogViewer';
import { HelpModal } from './HelpModal';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [adbValidity, setAdbValidity] = useState<{ valid: boolean; exists: boolean; error?: string } | null>(null);
  const [iosValidity, setIosValidity] = useState<{ valid: boolean; exists: boolean; error?: string } | null>(null);
  const [dirValidity, setDirValidity] = useState<{ valid: boolean; exists: boolean; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'paths' | 'logs'>('general');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await window.electronAPI.getSettings();
      if (!s.iosToolsPath) {
        try {
          const p = await window.electronAPI.getIdbPath();
          if (p) s.iosToolsPath = p;
        } catch {}
      }
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

  const validateAdb = async (val: string) => {
    const r = await window.electronAPI.validatePath(val, 'file');
    setAdbValidity(r);
  };

  const validateIos = async (val: string) => {
    const r = await window.electronAPI.validatePath(val, 'file');
    setIosValidity(r);
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
            onClick={() => setActiveTab('paths')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'paths'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Route className="w-4 h-4 inline mr-1" />
            传输路径
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
                <div className="flex items-center space-x-1.5">
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
                  <span className="text-sm font-medium text-gray-700">ADB路径</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    value={localSettings.adbPath || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLocalSettings(prev => ({ ...prev, adbPath: v }));
                      validateAdb(v);
                    }}
                    placeholder="选择adb可执行文件"
                    className={`flex-1 px-3 py-2 rounded border ${adbValidity ? (adbValidity.valid ? 'border-green-500' : 'border-red-500') : 'border-gray-300'} focus:outline-none`}
                  />
                  <button
                    onClick={async () => {
                      const p = await window.electronAPI.selectExecutable();
                      if (p) {
                        setLocalSettings(prev => ({ ...prev, adbPath: p }));
                        validateAdb(p);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    浏览
                  </button>
                  {adbValidity && (
                    adbValidity.valid ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                {adbValidity && !adbValidity.valid && (
                  <div className="text-xs text-red-600">{adbValidity.error}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5">
                  <FileCog className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">iOS工具路径</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    value={localSettings.iosToolsPath || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLocalSettings(prev => ({ ...prev, iosToolsPath: v }));
                      validateIos(v);
                    }}
                    placeholder="选择idb可执行文件"
                    className={`flex-1 px-3 py-2 rounded border ${iosValidity ? (iosValidity.valid ? 'border-green-500' : 'border-red-500') : 'border-gray-300'} focus:outline-none`}
                  />
                  <button
                    onClick={async () => {
                      const p = await window.electronAPI.selectExecutable();
                      if (p) {
                        setLocalSettings(prev => ({ ...prev, iosToolsPath: p }));
                        validateIos(p);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    浏览
                  </button>
                  {iosValidity && (
                    iosValidity.valid ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                {iosValidity && !iosValidity.valid && (
                  <div className="text-xs text-red-600">{iosValidity.error}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5">
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
                    className={`flex-1 px-3 py-2 rounded border ${dirValidity ? (dirValidity.valid ? 'border-green-500' : 'border-red-500') : 'border-gray-300'} focus:outline-none`}
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

          {activeTab === 'paths' && (
            <TransferPathSettings 
              onPathsChange={(newPaths) => {
                console.log('传输路径已更新:', newPaths);
              }}
            />
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
