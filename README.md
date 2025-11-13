# 文件推送工具

一个基于Electron的Windows桌面应用，支持通过拖拽文件到桌面图标自动推送到连接的Android/iOS设备。

## 功能特性

- 🎯 **拖拽即传**: 文件拖拽到应用界面即可开始传输
- 📱 **多设备支持**: 自动检测Android和iOS设备
- 📂 **智能路径**: 自动创建目标目录，支持指定应用路径
- 📊 **实时进度**: 传输进度实时显示
- ⚙️ **设置管理**: 支持开机自启和通知设置
- ❓ **使用帮助**: 详细的使用说明和故障排除

## 目标路径

- **Android**: `/sdcard/Android/data/com.tencent.uc/files/BattleRecord/`
- **iOS**: `/Documents/BattleRecord/`

## 系统要求

- Windows 10/11
- Node.js 18+ 
- ADB工具（Android设备）
- iTunes（iOS设备）

## 开发环境搭建

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建应用
npm run build

# 打包安装程序
npm run dist
```

## 使用说明

1. **连接设备**: 通过USB连接手机，开启USB调试模式
2. **选择设备**: 在应用界面选择目标设备
3. **拖拽文件**: 将文件拖拽到中央拖拽区域
4. **等待完成**: 查看传输进度，等待传输完成

## 技术架构

- **前端**: React + TypeScript + Tailwind CSS
- **桌面**: Electron + Node.js
- **状态管理**: Zustand
- **设备通信**: ADB/iOS命令行工具
- **文件传输**: 分块传输，支持大文件

## 注意事项

- 确保已安装ADB并配置环境变量
- Android设备需要开启USB调试
- iOS设备需要信任电脑连接
- 传输过程中请勿断开设备