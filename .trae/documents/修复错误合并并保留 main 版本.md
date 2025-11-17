## 目标
- 修复本地 `main` 与远端 `origin/main` 错误合并导致的代码问题
- 彻底检查错误来源，并在所有冲突位置保留 `main` 版本实现
- 全程不使用 Git 操作，纯手动代码修复与验证

## 初步诊断
- 代码库未检测到标准合并冲突标记（`<<<<<<<`, `=======`, `>>>>>>>`），说明已被人工/工具合并，但可能产生逻辑/依赖错误
- 当前 UI 主流程依赖 `FileDropZone` 与 `DeviceManager`，实现较完整且一致：
  - `src/components/FileDropZone.tsx:16` 主入口组件
  - 设备管理使用 `src/utils/deviceManager.ts` 的健壮 ADB/IDB 路径解析与推送逻辑（如 `ensureUsableAdbPath` 在 `src/utils/deviceManager.ts:466`）
- 存在一组“增强/记录/重试”模块：`enhancedDeviceManager.ts`, `transferRecorder.ts`, `transferRetryManager.ts`, `errorHandler.ts`
  - 这些文件导入 Node/Electron 侧对象（如 `electron.app`），若被渲染端打包，会产生构建错误（例如 `src/utils/transferRecorder.ts:3`、`src/utils/errorHandler.ts:3`）
  - `EnhancedDeviceManager` 未被任何文件引用（全局检索无匹配），目前不会影响构建，但若错误合并引入其引用，将导致问题

## 保留 main 版本的策略
- 保留并统一使用 `DeviceManager` 与现有 UI 流程（`FileDropZone`、`SettingsModal` 等），这是 `main` 版本的稳定实现
- 移除或断开渲染端对 Node/Electron-only 模块的引用（`transferRecorder.ts`, `errorHandler.ts` 等），避免构建与运行时错误
- 若存在文件中混入了两套实现（典型症状：重复函数/混合 `require` 与 `import`、使用裸 `adb` 命令而非 `ensureUsableAdbPath`），则在该文件内保留 `main` 侧实现，删除/还原 `origin/main` 侧片段

## 实施步骤
1. 全库扫描错误症状并定位来源
   - 搜索“错误合并症状”：重复导出、重复函数、混合模块系统（`require` 与 `import` 同文件）、裸命令调用（`adb`/`idb`），以及 `electron` 直接导入被渲染端使用的情况
   - 重点检查：
     - `src/components/**.tsx` 是否引入 `EnhancedDeviceManager`（目前未检测到，若存在则移除）
     - `src/utils/**.ts` 是否在渲染端引入 `electron`（如 `src/utils/transferRecorder.ts:3`，`src/utils/errorHandler.ts:3`）
     - `src/utils/enhancedDeviceManager.ts` 中 `getRemoteFileChecksum` 使用裸 `adb`（`src/utils/enhancedDeviceManager.ts:228`），与 `main` 的路径检测风格不一致
2. 文件级修复，保留 `main` 实现
   - 若发现 UI/逻辑文件混合两套实现：
     - 统一回退到 `DeviceManager` 风格（`src/utils/deviceManager.ts`），删除裸命令与 `require` 风格代码
     - 保留 `FileDropZone` 里的本地保存与进度上报逻辑（如 `saveLocalFile` 调用在 `src/components/FileDropZone.tsx:117-132`）
   - 若渲染端文件直接 `import { app } from 'electron'`：
     - 删除该渲染端引用或将相关能力改为通过 `window.electronAPI` IPC 的形式获取（与 `FileDropZone` 一致）
     - 若这些模块仅用于主进程或未使用，直接移除其渲染端引用路径
3. 构建与运行验证（不使用 Git）
   - 本地执行构建与运行，收集编译错误信息并逐一修复：
     - 修复 TS/模块错误（例如 `electron` 类型导入）
     - 修复运行时路径/权限问题（通过 `DeviceManager` 的健壮路径解析）
4. 回归测试
   - 在 `Android/iOS` 设备上验证：设备列表、推送文件、进度更新、本地保存
   - 验证 UI：拖拽上传、设置弹窗、目标路径选择

## 变更范围（保留 main 版本）
- 采用并保留：`src/components/FileDropZone.tsx`、`src/utils/deviceManager.ts`、`src/utils/fileTransferManager.ts`
- 清理/断开渲染端使用：`src/utils/enhancedDeviceManager.ts`、`src/utils/transferRecorder.ts`、`src/utils/transferRetryManager.ts`、`src/utils/errorHandler.ts`（如被错误引入）

## 验证标准
- 项目可正常构建、启动，无 `electron` 渲染端导入错误
- 拖拽上传与目标路径选择可用；Android/iOS 文件推送成功并有进度
- 无重复定义/混合实现导致的 TypeScript/运行时错误

## 交付
- 提交一组代码修复，确保所有冲突处只保留 `main` 版本实现
- 附带修复说明，列出每个文件中保留/移除的片段与原因

请确认上述方案，确认后我将逐文件执行修复、构建并完成验证。