# 文件推送工具

Windows 桌面端文件拖拽传输工具，支持 Android / iOS。

## 快速开始

```bash
npm i
npm run dev   # 开发运行
npm run dist  # 打包安装程序
```

## 使用

- 连接设备（Android 开启 USB 调试；iOS 信任电脑）
- 打开应用，选择目标设备
- 将文件拖拽到界面开始传输

## 目标路径

- Android: `/sdcard/Android/data/com.tencent.uc/files/BattleRecord/`
- iOS: `/Documents/BattleRecord/`

## 环境要求

- Windows 10/11，Node.js 18+
- Android 需安装 ADB；iOS 推荐安装 iTunes 或 idb
