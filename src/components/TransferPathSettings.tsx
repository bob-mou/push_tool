import { useState, useEffect } from 'react';
import { Folder, Smartphone, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface TransferPathSettingsProps {
  onPathsChange: (paths: { android: string; ios: string }) => void;
}

export function TransferPathSettings({ onPathsChange }: TransferPathSettingsProps) {
  const [paths, setPaths] = useState({ android: '', ios: '' });
  const [validation, setValidation] = useState({
    android: { valid: true, error: '' },
    ios: { valid: true, error: '' }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentPaths();
  }, []);

  const loadCurrentPaths = async () => {
    try {
      const currentPaths = await window.electronAPI.getTransferPaths();
      setPaths(currentPaths);
      setLoading(false);
    } catch (error) {
      console.error('加载传输路径失败:', error);
      setLoading(false);
    }
  };

  const validatePath = async (deviceType: 'android' | 'ios', path: string) => {
    try {
      const result = await window.electronAPI.validateTransferPath({ path, deviceType });
      setValidation(prev => ({
        ...prev,
        [deviceType]: result
      }));
      return result.valid;
    } catch (error) {
      setValidation(prev => ({
        ...prev,
        [deviceType]: { valid: false, error: '验证失败' }
      }));
      return false;
    }
  };

  const handlePathChange = async (deviceType: 'android' | 'ios', newPath: string) => {
    setPaths(prev => ({ ...prev, [deviceType]: newPath }));
    
    // 实时验证
    if (newPath.trim()) {
      await validatePath(deviceType, newPath);
    } else {
      setValidation(prev => ({
        ...prev,
        [deviceType]: { valid: true, error: '' }
      }));
    }
  };

  const handleSave = async () => {
    // 验证所有路径
    const androidValid = await validatePath('android', paths.android);
    const iosValid = await validatePath('ios', paths.ios);
    
    if (androidValid && iosValid) {
      try {
        const result = await window.electronAPI.updateTransferPaths(paths);
        if (result.success) {
          onPathsChange(result.paths);
        } else {
          alert(`保存失败: ${result.error}`);
        }
      } catch (error) {
        alert(`保存失败: ${error}`);
      }
    } else {
      alert('请修正路径错误后再保存');
    }
  };

  const resetToDefault = async () => {
    try {
      const defaults = await (window as any).electronAPI.getTransferPaths();
      setPaths(defaults);
      await validatePath('android', (defaults as any).android);
      await validatePath('ios', (defaults as any).ios);
    } catch {}
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border蓝-500 mx-auto mb-2"></div>
        正在加载路径配置...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg蓝-50 border border蓝-200 rounded-lg p-3">
        <div className="flex items-start space-x-1.5">
          <Info className="w-5 h-5 text蓝-600 mt-0.5" />
          <div className="text-sm text蓝-800">
            <p className="font-medium mb-1">传输路径配置</p>
            <p>设置文件传输到移动设备的默认目标路径。系统会自动创建不存在的目录。</p>
          </div>
        </div>
      </div>

      {/* Android路径配置 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5">
          <Smartphone className="w-5 h-5 text绿-600" />
          <h3 className="text-l font-medium text灰-900">Android设备路径</h3>
        </div>
        
        <div className="space-y-1.5">
          <div className="relative">
            <input
              type="text"
              value={paths.android}
              onChange={(e) => handlePathChange('android', e.target.value)}
              placeholder="/sdcard/Android/data/com.tencent.uc/files/BattleRecord/"
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring蓝-500 focus:border蓝-500 ${
                validation.android.valid ? 'border灰-300' : 'border红-300'
              }`}
            />
            <Folder className="absolute left-3 top-2.5 w-4 h-4 text灰-400" />
            
            {validation.android.valid ? (
              <CheckCircle className="absolute right-3 top-2.5 w-4 h-4 text绿-500" />
            ) : (
              <AlertCircle className="absolute right-3 top-2.5 w-4 h-4 text红-500" />
            )}
          </div>
          
          {validation.android.error && (
            <p className="text-sm text红-600 flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>{validation.android.error}</span>
            </p>
          )}
          
          <div className="text-xs text灰-500 space-y-1">
            <p>• 路径必须以 <code className="bg灰-100 px-1 rounded">/sdcard/</code> 或 <code className="bg灰-100 px-1 rounded">/storage/</code> 开头</p>
            <p>• 确保应用包名正确: <code className="bg灰-100 px-1 rounded">com.tencent.uc</code></p>
            <p>• 需要外部存储写入权限</p>
          </div>
        </div>
      </div>

      {/* iOS路径配置 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5">
          <Smartphone className="w-5 h-5 text蓝-600" />
          <h3 className="text-l font-medium text灰-900">iOS设备路径</h3>
        </div>
        
        <div className="space-y-1.5">
          <div className="relative">
            <input
              type="text"
              value={paths.ios}
              onChange={(e) => handlePathChange('ios', e.target.value)}
              placeholder="/Documents/BattleRecord/"
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring蓝-500 focus:border蓝-500 ${
                validation.ios.valid ? 'border灰-300' : 'border红-300'
              }`}
            />
            <Folder className="absolute left-3 top-2.5 w-4 h-4 text灰-400" />
            
            {validation.ios.valid ? (
              <CheckCircle className="absolute right-3 top-2.5 w-4 h-4 text绿-500" />
            ) : (
              <AlertCircle className="absolute right-3 top-2.5 w-4 h-4 text红-500" />
            )}
          </div>
          
          {validation.ios.error && (
            <p className="text-sm text红-600 flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>{validation.ios.error}</span>
            </p>
          )}
          
          <div className="text-xs text灰-500 space-y-1">
            <p>• 路径必须以 <code className="bg灰-100 px-1 rounded">/Documents/</code> 或 <code className="bg灰-100 px-1 rounded">/Library/</code> 开头</p>
            <p>• 确保应用具有适当的文件访问权限</p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between  pt-3 border-t">
        <button
          onClick={resetToDefault}
          className="px-3 py-1.5 text-sm font-medium text灰-700 bg灰-100 rounded-md hover:bg灰-200 transition-colors"
        >
          恢复默认
        </button>
        
        <button
          onClick={handleSave}
          disabled={!validation.android.valid || !validation.ios.valid}
          className="px-3 py-1.5 text-sm font-medium text白 bg蓝-600 rounded-md hover:bg蓝-700 disabled:bg灰-400 disabled:cursor-not-allowed transition-colors"
        >
          保存配置
        </button>
      </div>
    </div>
  );
}
