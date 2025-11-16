# 文件推送工具（push_tool）

面向 Windows 平台的桌面文件推送工具（Electron + React + Vite）。支持拖拽或选择文件，一键推送到已连接的 Android/iOS 设备指定目录，提供进度反馈、路径校验与传输日志导出。

## 特性
- 设备选择与状态监控（Android/iOS）
- 拖拽/点击上传，实时进度弹窗与系统通知
- 目标路径可配置与校验（Android `/sdcard`/`/storage`；iOS `/Documents`/`/Library`）
- 自动创建缺失目录、覆盖/验证文件结果
- 传输日志查看、导出为文本
- Electron 主进程与渲染层 IPC 调用封装

## 架构总览
- 顶层目录：`src/`（前端）、`electron/`（主进程与预加载）、`build/`（前端构建产物）、`dist-electron/`（主进程编译产物）、`public/`（静态资源）
- 入口点：主进程 `electron/main-simple.js`，预加载 `electron/preload.ts`，渲染层 `src/main.tsx`
- 构建与打包：`vite.config.ts` 前端构建到 `build/`；`electron-builder.json` 生成 NSIS 安装包
- 关键模块：设备管理 `src/utils/deviceManager.ts`，设备监控 `src/utils/deviceMonitor.ts`，传输路径与日志 `src/utils/transferPathManager.ts`

## 运行流程（逻辑）
- 启动主进程创建 `BrowserWindow`，开发模式下探测 `http://localhost:5173`，否则加载 `build/index.html`
- 通过预加载暴露 `electronAPI`（设备查询、文件推送、设置读取/更新、路径校验、日志与统计）
- 渲染层拖拽/选择文件后调用 `pushFile`，主进程按设备类型执行：
  - Android：ADB 推送，必要时分片（8MB），保留修改时间并逐步上报进度
  - iOS：IDB（fsync）推送，容器定位（Bundle ID）与传输结果校验
- 传输日志与统计由 `TransferPathManager` 维护，设备监控事件由 `DeviceMonitor` 轮询并推送到渲染层

## 环境要求
- 操作系统：Windows（优先适配）
- Node.js：建议 18+（或当前项目环境）
- Android：ADB 可用并已授权调试
- iOS：IDB（Facebook idb 或 i4 模式，依配置），设备已信任电脑

## 快速开始
```bash
npm install
npm run dev         # 前端 + Electron 开发模式
npm run build       # 构建前端（产物位于 build/）
npm run dist        # 使用 electron-builder 生成安装包
```

## 安装文档汇总
- 环境准备：Windows、Node.js 18+，确保 ADB/IDB 工具可用且设备已授权
- 安装依赖：`npm install`
- 开发运行：`npm run electron:dev`；或分别运行 `npm run dev` 与 `npm run electron`
- 访问地址：开发服务器 `http://localhost:5173`；Electron 应用将自动打开窗口
- 构建前端：`npm run build`（产物输出到 `build/`）
- 生成安装包：`npm run dist`（安装包输出到 `release/`，NSIS 安装程序）
- 安装使用：双击 `release/*.exe` 安装；支持自选目录并创建桌面与开始菜单快捷方式
- 首次配置：在应用设置页配置 `adbPath`、`iosToolsPath`、`iosBundleId` 以及目标目录（也可使用默认值）
- 故障与FAQ：遇到问题可参考下方“故障排查”“常见问题（FAQ）”章节

## 配置说明
- 全局配置文件：`settings.json`
  - `adbPath`：ADB 可执行路径
  - `iosToolsPath`：IDB 可执行路径
  - `iosBundleId`：iOS 应用容器 Bundle ID（例如 `com.tencent.uc`）
  - `record.android`：Android 目标目录（默认 `/sdcard/Android/media/com.tencent.uc/BattleRecord/`）
  - `record.ios`：iOS 目标目录（默认 `/Documents/BattleRecord/`）
- 默认值计算：`electron/settings-defaults.js`（Windows 下尝试 where/which，提供兜底）
- 传输路径设置 UI：`src/components/TransferPathSettings.tsx`

提示：设置页初始默认可能显示为 `data/.../files/BattleRecord/`；主进程推送默认为 `media/.../BattleRecord/`，建议统一选择 `media` 路径以提升兼容性。

## 使用指南
1. 连接设备并开启调试（Android 需 USB 调试；iOS 需信任电脑）
2. 打开应用，右上角选择设备（若有多个）
3. 在主界面拖拽文件或点击选择文件
4. 等待进度弹窗提示完成，可在设置页查看/导出传输日志

## 构建与打包
- 前端：Vite 构建（`vite.config.ts`），输出至 `build/`
- 桌面应用打包：`electron-builder.json` 配置 NSIS 安装包

## 目录结构（简要）
- `src/` 前端源代码（组件、页面、状态、工具）
- `electron/` 主进程、预加载与默认设置脚本
- `build/` 前端构建产物
- `dist-electron/` 主进程编译产物
- `public/` 静态资源（如 `favicon.svg`）

## 关键代码位置（参考）
- 设备列表与 IPC：`electron/main.ts:129`（`get-devices`），`electron/preload.ts:23`（渲染层调用）
- 文件推送：Android `src/utils/deviceManager.ts:186`，iOS `src/utils/deviceManager.ts:279`
- 拖拽上传与大小限制：`src/components/FileDropZone.tsx:194`（默认上限 500MB）
- 进度弹窗：`src/components/TransferProgress.tsx:56`
- 日志查看与导出：`src/components/TransferLogViewer.tsx:19-22`（加载），`src/components/TransferLogViewer.tsx:45-75`（导出）
- 路径配置与校验：`src/components/TransferPathSettings.tsx:31-46`、API 约定 `src/types/electron.d.ts:42-44`

## 故障排查
- ADB/IDB 不可用：检查路径与环境变量，使用设置页“浏览”选择可执行文件
- Android 路径错误：仅允许 `/sdcard/` 或 `/storage/` 前缀
- iOS 路径错误：仅允许 `/Documents/` 或 `/Library/` 前缀
- 文件路径编码异常：若检测到非法字符，弹窗提示改用文件选择对话框
- 覆盖/验证：推送后执行 `ls/stat` 验证结果，失败将提示错误信息

## 常见问题（FAQ）
- “未检测到设备”：确认连接与调试授权，点击设备刷新按钮重试
- “文件过大被拒”：默认限制 500MB，可根据需求调整前端逻辑
- “日志为空”：首次运行或尚未传输；可在设置页触发刷新/导出

## 安全与隐私
- 不包含敏感密钥；日志导出为本地文本，建议仅在可信环境使用
- 请勿将个人或受限数据随意推送到非授权设备

## 许可证
当前未设置许可证（License）；如需开源发布，请补充相应协议。