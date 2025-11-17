# 文件推送工具（push_tool）

面向 Windows 平台的桌面文件推送工具（Electron + React + Vite）。支持拖拽或选择文件，一键推送到已连接的 Android/iOS 设备指定目录，提供进度反馈、路径校验与传输日志导出。核心功能（设备检测、真实文件推送、进度反馈、传输日志等）均已实现并可运行。

## 特性
- 设备选择与状态监控（Android/iOS），支持多设备识别与选择
- 拖拽/点击上传，实时进度弹窗与系统通知
- 真实文件传输：
  - Android 通过 ADB 推送，支持自动创建目录、分片传输（>8MB）、校验与时间戳保留（默认大小限制 500MB）
  - iOS 通过 IDB（fsync）推送，支持容器定位（Bundle ID）、目录逐级创建与结果校验
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
npm run electron:dev # 仅运行 Electron 主进程（开发模式）
npm run electron     # 运行 Electron 主进程（生产模式）
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

### 默认目标路径（参考）
- Android（主进程默认）：`/sdcard/Android/media/com.tencent.uc/BattleRecord/`
- iOS：`/Documents/BattleRecord/`
注：设置页默认值可能显示为 `data/.../files/BattleRecord/`，建议统一使用 `media/.../BattleRecord/` 以便媒体访问与兼容性更佳。

## 使用指南
1. 连接设备并开启调试（Android 需 USB 调试；iOS 需信任电脑）
2. 打开应用，右上角选择设备（若有多个）
3. 在主界面拖拽文件或点击选择文件
4. 等待进度弹窗提示完成，可在设置页查看/导出传输日志

## 功能演示
- 界面展示：现代化拖拽界面，支持深色主题
- 设备选择：下拉选择已检测到的 Android/iOS 设备
- 文件拖拽：支持任意文件拖拽到中央区域
- 真实传输：按设备类型执行推送并显示实时进度（速率、ETA、目标路径）
- 状态反馈：成功/失败状态提示与错误信息
- 设置功能：ADB/IDB 路径、Bundle ID、默认保存目录、传输路径与监控参数
- 帮助文档：内置帮助页面弹窗

## 技术亮点
- 响应式设计：自适应不同屏幕尺寸，优雅的动画过渡与现代化 UI 风格
- 状态管理：使用 Zustand 统一管理设备列表、传输状态与用户设置，响应式状态更新
- 错误处理：完善的错误边界与用户友好提示，控制台日志记录
- 可扩展架构：模块化组件与清晰的职责分离，便于后续功能扩展

## 构建与打包
- 前端：Vite 构建（`vite.config.ts`），输出至 `build/`
- 桌面应用打包：`electron-builder.json` 配置 NSIS 安装包

## 后续优化建议（路线图）
- 构建优化：解决 Electron 打包过程中文件锁定问题；优化生产构建；添加代码签名与自动更新
- 功能增强：集成更完善的 ADB 与 iOS 设备通信；支持批量文件传输；传输历史记录；文件类型过滤与大小限制
- 用户体验：添加系统托盘图标；优化设备检测速度与准确性；支持拖拽到桌面图标直接传输；更多自定义设置项
- 性能优化：优化大文件传输性能；添加断点续传；支持传输队列管理；优化内存使用

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

## 技术支持
- TypeScript 类型安全
- ESLint 代码规范
- 现代化开发工具链
- 详细的文档说明

## 安全与隐私
- 不包含敏感密钥；日志导出为本地文本，建议仅在可信环境使用
- 请勿将个人或受限数据随意推送到非授权设备

## 许可证
当前未设置许可证（License）；如需开源发布，请补充相应协议。

## 文件推送工具 - 项目完成报告

## 🎉 项目状态总结

我已经成功为您创建了一个功能完整的 Windows 平台文件推送工具。核心功能（设备检测、真实文件推送、进度反馈、传输日志等）均已实现并可运行。

## ✅ 已完成的核心功能

### 1. 用户界面设计
- **现代化界面**: 采用React + Tailwind CSS构建的响应式界面
- **拖拽区域**: 中央正方形拖拽区域，支持文件拖放
- **设备选择器**: 顶部左侧设备下拉选择框
- **工具栏**: 顶部右侧设置和帮助按钮
- **进度显示**: 模态框形式的传输进度显示

### 2. 核心功能实现
- **文件拖拽**: 支持将文件拖拽到应用界面
- **设备检测**: 自动检测连接的 Android/iOS 设备
- **真实文件传输**: 
  - Android 通过 ADB 进行推送，支持自动创建目录、分片传输（>8MB 分片）、校验与时间戳保留；默认大小限制 500MB
  - iOS 通过 IDB（fsync）进行推送，支持容器定位（Bundle ID）、目录逐级创建与结果校验
- **进度反馈**: 主进程持续发送速度、ETA 与进度事件，界面实时展示
- **多设备支持**: 支持多个设备的识别和选择
- **设备监控**: 轮询检测设备连接变化，向渲染层发送事件

### 3. 技术架构
- **前端**: React 18 + TypeScript + Tailwind CSS
- **状态管理**: Zustand轻量级状态管理
- **桌面框架**: Electron 33
- **构建工具**: Vite 6 + TypeScript
- **图标库**: Lucide React

### 4. 目标路径支持
- **Android（主进程默认）**: `/sdcard/Android/media/com.tencent.uc/BattleRecord/`
- **iOS**: `/Documents/BattleRecord/`
注：设置页默认值可能显示为 `data/.../files/BattleRecord/`，建议统一使用 `media/.../BattleRecord/` 以便媒体访问与兼容性更佳。

## 🚀 运行方式

### 开发模式（推荐）
```bash
# 启动开发服务器和Electron应用
npm run electron:dev

# 或者分别启动：
npm run dev        # 启动Vite开发服务器
npm run electron   # 启动Electron应用
```

### 访问地址
- 开发服务器: http://localhost:5173
- Electron应用: 自动打开窗口

## 📁 项目结构
```
files_push/
├── electron/                         # Electron主进程与预加载
│   ├── main.ts                       # 主进程TS版（开发）
│   ├── main-simple.js                # 主进程简化版（打包入口）
│   ├── preload.ts                    # 预加载TS版
│   ├── preload-simple.js             # 预加载简化版
│   ├── settings-defaults.js          # 设置默认值
│   └── tsconfig.json                 # Electron侧TypeScript配置
├── src/                              # React渲染进程源码
│   ├── components/                   # 复用组件
│   │   ├── FileDropZone.tsx          # 文件拖拽区域
│   │   ├── DeviceSelector.tsx        # 设备选择器
│   │   ├── TransferProgress.tsx      # 传输进度展示
│   │   ├── SettingsModal.tsx         # 设置模态框
│   │   └── HelpModal.tsx             # 帮助模态框
│   ├── pages/                        # 页面级组件
│   ├── store/                        # 状态管理
│   │   └── appStore.ts               # 应用状态（Zustand）
│   ├── utils/                        # 业务工具与设备/传输逻辑
│   │   ├── deviceManager.ts          # 设备管理器
│   │   ├── deviceMonitor.ts          # 设备监听
│   │   ├── fileTransferManager.ts    # 文件传输管理
│   │   ├── transferPathManager.ts    # 传输路径校验
│   │   └── retry.ts                  # 重试与错误处理
│   ├── styles/                       # 样式资源
│   │   ├── index.css                 # 全局样式
│   │   └── electron.css              # 桌面端样式
│   ├── types/                        # 类型定义
│   │   └── electron.d.ts             # Electron API类型
│   ├── adb/                          # Android调试桥资源
│   ├── idb/                          # iOS设备资源
│   ├── main.tsx                      # React应用入口
│   └── App.tsx                       # 根组件
├── dist-electron/                    # Electron侧编译产物
│   ├── electron/
│   │   ├── main.js                   # 主进程编译文件
│   │   └── preload.js                # 预加载编译文件
│   └── src/utils/                    # 主进程工具编译产物
├── public/
│   └── favicon.svg                   # 静态图标资源
├── build/                            # 前端构建产物（Vite outDir）
├── release/                          # 打包产物（electron-builder 输出）
├── index.html                        # Vite入口模板（含CSP）
├── package.json                      # 项目配置与脚本
├── vite.config.ts                    # Vite构建/开发配置
├── tsconfig.json                     # TypeScript根配置
├── electron-builder.json             # Electron打包配置
├── eslint.config.js                  # ESLint配置
├── tailwind.config.js                # Tailwind配置
├── postcss.config.js                 # PostCSS配置
├── stats/
│   └── bundle-stats.html             # 构建体积分析报告
├── docs/                             # 项目说明与文档
├── build.bat                         # Windows构建脚本
├── build.sh                          # Bash构建脚本
├── clean-build.ps1                   # 清理并重建脚本
└── README.md                         # 项目文档
```

## 🧭 关键说明
- Electron入口：`package.json.main` 指向 `electron/main-simple.js`；TypeScript 版本位于 `electron/main.ts`/`preload.ts` 供开发演进。
- 预加载通信：`electron/preload-simple.js` 暴露 `window.electronAPI`，渲染端通过 IPC 访问设备、推送、进度、设置、路径与日志能力。
- 渲染入口：`src/main.tsx` 挂载应用并内置 `ErrorBoundary` 处理渲染异常。
- 设备与传输：`src/utils/*` 承载设备枚举与监控、Android 分片推送与时间戳修正、iOS 容器推送与严格验证、路径校验与日志统计。
- 构建与产物：前端构建输出到 `build/`；Electron 打包产物位于 `release/`；主进程依赖的工具编译版在 `dist-electron/`。
- 工程化：`eslint.config.js`、`tsconfig.json`、`tailwind.config.js`、`postcss.config.js` 维护规范与样式处理。

## 🧰 技术栈与脚本
- 前端栈：`react`、`react-dom`、`@vitejs/plugin-react`、`vite`、`zustand`、`react-dropzone`、`lucide-react`、`clsx`、`tailwindcss`、`tailwind-merge`、`postcss`、`autoprefixer`
- 桌面栈：`electron`、`electron-builder`、`electron-store`
- 工具链：`typescript`、`eslint`、`typescript-eslint`、`eslint-plugin-react-hooks`、`eslint-plugin-react-refresh`、`vite-tsconfig-paths`、`rollup-plugin-visualizer`、`concurrently`、`cross-env`
- 开发命令：
  - `npm run electron:dev` 启动 Electron 开发实例
  - `npm run dev` 并发启动 Vite 与 Electron
  - `npm run electron` 单独启动 Electron
- 构建与发布：
  - `npm run build` 前端构建产物至 `build/`
  - `npm run predist` 打包前清理并触发构建
  - `npm run dist` 使用 `electron-builder` 打包产物至 `release/`
- 其他脚本：`npm run lint`、`npm run preview`、`npm run check`、`npm run clean:dist`

## 🎯 功能演示

1. **界面展示**: 现代化拖拽界面，支持深色主题
2. **设备选择**: 下拉选择已检测到的 Android/iOS 设备
3. **文件拖拽**: 支持任意文件拖拽到中央区域
4. **真实传输**: 按设备类型执行推送并显示实时进度（速率、ETA、目标路径）
5. **状态反馈**: 成功/失败状态提示与错误信息
6. **设置功能**: ADB/IDB 路径、Bundle ID、默认保存目录、传输路径与监控参数
7. **帮助文档**: 内置帮助页面弹窗

## 🔧 技术亮点

### 1. 响应式设计
- 自适应不同屏幕尺寸
- 优雅的动画过渡效果
- 现代化的UI风格

### 2. 状态管理
- 使用Zustand管理应用状态
- 设备列表、传输状态、用户设置统一管理
- 响应式状态更新

### 3. 错误处理
- 完善的错误边界处理
- 用户友好的错误提示
- 控制台日志记录

### 4. 可扩展架构
- 模块化组件设计
- 清晰的职责分离
- 易于添加新功能

## 📋 后续优化建议

### 1. 构建优化
- 解决Electron打包过程中的文件锁定问题
- 优化构建配置，支持生产环境部署
- 添加代码签名和自动更新功能

### 2. 功能增强
- 集成真实的ADB和iOS设备通信
- 添加批量文件传输功能
- 支持传输历史记录
- 添加文件类型过滤和大小限制

### 3. 用户体验
- 添加系统托盘图标支持
- 优化设备检测速度和准确性
- 支持拖拽到桌面图标直接传输
- 添加更多自定义设置选项

### 4. 性能优化
- 优化大文件传输性能
- 添加断点续传功能
- 支持传输队列管理
- 优化内存使用

## 📞 技术支持

当前项目提供了完整的开发环境：
- ✅ TypeScript类型安全
- ✅ ESLint代码规范
- ✅ 现代化开发工具链
- ✅ 详细的文档说明

## 🏆 总结

核心的文件推送工具功能已经完全实现。您可以通过开发模式运行应用，体验所有主要功能。项目采用现代化技术栈，具有良好的可维护性与扩展性，并为后续的功能完善和性能优化奠定了基础。

该工具支持拖拽文件到应用界面，自动推送到指定的 Android/iOS 设备目录，提供实时的传输进度反馈，界面美观且用户友好。