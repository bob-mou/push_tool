# 文件推送工具（爱思 idb 版）

Windows 桌面端文件拖拽传输工具，支持 Android / iOS。iOS 侧全面采用爱思 idb 命令风格（`fs ls` / `fs push`，参数 `-u` 指定设备、`-b` 指定应用容器）。

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
  - 容器：`-b com.tencent.uc`
  - 设备：`-u <设备UDID>`

## 环境要求

- Windows 10/11，Node.js 18+
- Android 需安装 ADB；iOS 使用爱思 idb（建议将 `idb.exe` 放置于 `src/idb/idb.exe`，程序运行时自动解析与使用）
