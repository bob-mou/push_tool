## 目录结构（格式与示例一致）
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
│   └── src/utils/                    # 主进程使用的工具编译产物
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

## 关键说明
- Electron入口：`package.json.main` 指向 `electron/main-simple.js`；TS版在开发阶段可用于演进。
- 预加载通信：`preload-simple.js` 暴露 `electronAPI`，渲染进程通过它访问设备、传输与设置相关IPC。
- 渲染端入口：`src/main.tsx` 挂载应用；`App.tsx` 作为根组件组织页面与组件。
- 设备与传输：`src/utils/*` 承载设备发现、状态监听、文件推送与路径校验等核心逻辑。
- 构建与打包：前端构建到 `build/`；Electron打包产物在 `release/`，配置由 `electron-builder.json` 控制。
- 工程化：`eslint.config.js`、`tsconfig.json`、`tailwind.config.js`、`postcss.config.js` 保证代码规范与样式处理。

## 技术栈与脚本
- 前端：`react`、`vite`、`zustand`、`tailwindcss`、`react-dropzone`、`lucide-react`
- 桌面端：`electron`、`electron-builder`、`electron-store`
- 常用命令：`npm run dev`（同时启动Vite与Electron）、`npm run build`（前端构建）、`npm run dist`（打包发布）

如需我把以上结构直接更新进 README 对应章节或生成更详细的模块说明，请确认执行。