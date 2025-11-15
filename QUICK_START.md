# 文件推送工具 - 快速运行指南

## 🚀 开发模式运行

由于构建过程中遇到一些技术问题，这里提供几种运行方式：

### 方法1：开发模式（推荐）
```bash
# 启动开发服务器和Electron应用
npm run electron:dev
```

### 方法2：分别启动
```bash
# 终端1：启动Vite开发服务器
npm run dev

# 终端2：启动Electron应用（等待Vite启动完成后）
npm run electron
```

### 方法3：仅前端测试
```bash
# 启动前端开发服务器
npm run dev

# 然后在浏览器中访问 http://localhost:5173
```

## 📋 功能验证步骤

1. **连接设备**：使用USB连接手机，确保开启USB调试模式
2. **启动应用**：使用上述任一方法启动应用
3. **选择设备**：在界面左上角选择检测到的设备
4. **拖拽文件**：将文件拖拽到中央区域
5. **查看进度**：观察传输进度和结果

## 🔧 技术说明

### 已完成功能
- ✅ React + TypeScript + Tailwind CSS 前端界面
- ✅ Electron 桌面应用框架
- ✅ 设备自动检测（Android/iOS）
- ✅ 文件拖拽接收功能
- ✅ 传输进度实时显示
- ✅ 设置和帮助功能
- ✅ 状态管理（Zustand）

### 目标路径
- **Android**: `/sdcard/Android/data/com.tencent.uc/files/BattleRecord/`
- **iOS**: `/Documents/BattleRecord/`

### 依赖要求
- Windows 10/11
- Node.js 18+
- ADB工具（Android设备）
- iTunes/IDB工具（iOS设备）

## 🎯 下一步计划

1. **修复构建问题**：解决Electron打包过程中的文件锁定问题
2. **优化设备检测**：提高设备识别准确性和速度
3. **增强错误处理**：完善各种异常情况的处理
4. **添加更多功能**：如批量传输、传输历史记录等

## 📞 技术支持

如遇到问题，请检查：
1. 设备是否正确连接并开启USB调试
2. ADB工具是否正确安装（运行 `adb devices` 验证）
3. 应用是否有足够的文件访问权限
4. 查看控制台日志获取详细错误信息