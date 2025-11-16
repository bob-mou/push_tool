import { X, HelpCircle, Smartphone, Upload, Info } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}
export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 bg黑 bg-opacity-30 flex items-center justify-center z-10">
      <div className="bg白 rounded-lg p-6 w-full max-w-[23rem] shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2 electron-drag">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-800">使用帮助</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg灰-100 rounded electron-no-drag"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-gray-600">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text蓝-600" />
              <span className="font-medium text-gray-800">设备连接</span>
            </div>
            <p>确保您的手机已通过USB连接到电脑，并且已开启USB调试模式。</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text绿-600" />
              <span className="font-medium text-gray-800">文件传输</span>
            </div>
            <p>拖拽文件到主界面的拖拽区域，或点击区域选择文件。文件将自动推送到手机的指定目录。</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text紫-600" />
              <span className="font-medium text-gray-800">目标路径</span>
            </div>
            <div className="bg灰-50 p-3 rounded-md space-y-1">
              <p><strong>Android:</strong> /sdcard/Android/data/com.tencent.uc/files/BattleRecord/</p>
              <p><strong>iOS:</strong> /Documents/BattleRecord/</p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-medium text-gray-800">注意事项</span>
            <ul className="list-disc list-inside space-y-1">
              <li>确保已安装ADB工具并配置环境变量</li>
              <li>Android设备需要开启USB调试</li>
              <li>iOS设备需要安装iTunes并信任电脑</li>
              <li>传输过程中请勿断开设备连接</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text白 bg蓝-600 rounded-md hover:bg蓝-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
