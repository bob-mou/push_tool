import { X, HelpCircle, Smartphone, Upload, Info } from 'lucide-react';

export function HelpPage() {
  return (
    <div className="h-full min-h-0 bg-white p-0 flex flex-col">
      <div className="w-full h-full p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-1 electron-drag">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-800">使用帮助</h3>
          </div>
        </div>

        <div className="space-y-1.5 text-[11px] text-gray-700">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-3 h-3 text-blue-600" />
              <span className="font-medium text-gray-800">设备连接</span>
            </div>
            <p>确保您的手机已通过USB连接到电脑，并且已开启USB调试模式。</p>
          </div>

          <div className="space-y-1">
            <div className="flex itemscenter space-x-2">
            <div className="flex itemscenter space-x-2">
              <Upload className="w-3 h-3 text-green-600" />
              <span className="font-medium text-gray-800">文件传输</span>
            </div>
            <p>拖拽文件到主界面的拖拽区域，或点击区域选择文件。文件将自动推送到手机的指定目录。</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Info className="w-3 h-3 text-purple-600" />
              <span className="font-medium text-gray-800">目标路径</span>
            </div>
            <div className="bg-gray-50 p-1.5 rounded-md space-y-0.5">
              <p><strong>Android:</strong> /sdcard/Android/data/com.tencent.uc/files/BattleRecord/</p>
              <p><strong>iOS:</strong> /Documents/BattleRecord/</p>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-medium text-gray-800">注意事项</span>
            <ul className="list-disc list-inside space-y-0.5">
              <li>确保已安装ADB工具并配置环境变量</li>
              <li>Android设备需要开启USB调试</li>
              <li>iOS设备需要安装iTunes并信任电脑</li>
              <li>传输过程中请勿断开设备连接</li>
            </ul>
          </div>
        </div>

        
      </div>
    </div>
  );
}
