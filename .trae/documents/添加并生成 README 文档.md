## 目标与输出
- 在仓库根目录新增 `README.md`（中文），覆盖项目简介、安装使用、构建打包、配置项说明、故障排查与常见问题。 
- 保持内容与当前代码实现一致，提供关键代码位置引用，便于快速定位。
- 可选：新增一个生成脚本，通过读取 `package.json` 与部分源文件，自动更新 README 的版本与指令章节。

## README 目录结构
1. 项目名称与简介（push_tool / 文件推送工具）
2. 特性概览（拖拽上传、设备选择、进度与通知、可配置目标路径、日志导出）
3. 环境要求（Node、ADB、IDB，Windows 优先）
4. 快速开始（`npm install`、`npm run dev`、`npm run build`、`npm run dist`）
5. 配置说明（`settings.json` 关键项与默认路径；ADB/IDB 路径、Bundle ID、保存目录等）
6. 使用指南（设备选择、拖拽/点击上传、进度弹窗、日志查看与导出）
7. 目录结构（主要文件与目录简表）
8. 构建与打包（vite 构建、electron-builder 打包）
9. 故障排查（ADB/IDB 未检测、权限与路径校验、编码问题）
10. 常见问题（FAQ）
11. 安全与隐私（不写入敏感信息，日志导出说明）
12. 许可证（暂未设置/待定）

## 关键代码引用（用于 README 内容中的参考）
- 设备获取与 IPC：`electron/main.ts:129`（`get-devices`）、`electron/preload.ts:23`（渲染层调用）。
- 文件推送：Android `src/utils/deviceManager.ts:186`，iOS `src/utils/deviceManager.ts:279`；目标路径规则校验同文件。
- 前端拖拽与上传：`src/components/FileDropZone.tsx:194`（拖拽逻辑与大小限制）；进度弹窗 `src/components/TransferProgress.tsx:56`。
- 日志查看与导出：`src/components/TransferLogViewer.tsx:19-22`（加载日志与统计）、`src/components/TransferLogViewer.tsx:45-75`（导出日志）。
- 路径配置与校验：`src/components/TransferPathSettings.tsx:31-46`、`src/types/electron.d.ts:42-44`（API 约定）。

## 动态生成机制（可选）
- 新增 `scripts/generate-readme.mjs`：读取 `package.json`（名称/版本/脚本），拼接 README 模板中的“快速开始”和“构建打包”章节。
- 在 `package.json` 增加脚本：`"readme": "node scripts/generate-readme.mjs"`，用于自动更新 README。
- 若不需自动化，直接维护静态 `README.md` 即可。

## 实施步骤
1. 创建 `README.md`，按上述目录撰写内容，确保与当前实现一致并加入代码位置引用。
2. 可选：创建 `scripts/generate-readme.mjs` 与 `npm run readme` 脚本，实现版本/脚本章节的自动更新。
3. 不改动现有功能或配置，仅新增文档与（可选）生成脚本。

## 校验
- 打开仓库主页验证 `README.md` 渲染正常、目录清晰、命令准确。
- 逐条比对脚本与配置：`package.json` 与 `electron-builder.json`、`settings.json` 字段说明一致。
- 随机抽查代码引用跳转是否正确（文件路径与行号）。

## 后续维护
- 每次更新脚本或配置后，同步更新 README；如启用生成脚本，执行 `npm run readme` 自动刷新指定章节。
- 按需在 README 中增加“版本更新记录”节，以记录新增特性或修复。