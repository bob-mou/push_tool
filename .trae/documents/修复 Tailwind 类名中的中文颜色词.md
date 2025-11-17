## 问题与范围
- 在多个组件中使用了中文颜色词作为 Tailwind 类名（如 `text蓝-600`、`bg灰-100`、`bg黑`、`text白`），导致样式无法被 Tailwind 解析。
- 需要统一替换为 Tailwind 默认英文颜色名：`blue`、`gray`、`white`、`black`、`green`、`purple`。
- 发现位置（源码，按文件归类）：
  - d:\workplace\files_push\src\components\TransferPathSettings.tsx:95、133、152、153、154、178、195、196、206
  - d:\workplace\files_push\src\components\SettingsModal.tsx:75、110、125、181、197、244、273、282、288
  - d:\workplace\files_push\src\components\HelpModal.tsx:8、17、26、27、35、36、44、45、48、68
  - d:\workplace\files_push\src\components\TransferProgress.tsx:57、82、93、107
- 构建产物中的同类片段位于 `d:\workplace\files_push\build\assets\*.js`（不直接修改，修复源码后重建即可消除）。

## 修改规则
- 颜色映射：
  - 蓝 → `blue`
  - 灰 → `gray`
  - 白 → `white`
  - 黑 → `black`
  - 绿 → `green`
  - 紫 → `purple`
- 仅替换类名前缀中的中文颜色词，保留其他语义（如 `hover:`、`peer-focus:`、`after:`、`bg-opacity-*`、`*-700` 强度等）。

## 逐文件改动
- d:\workplace\files_push\src\components\TransferPathSettings.tsx
  - 95: `border蓝-500` → `border-blue-500`
  - 133: `text灰-400` → `text-gray-400`
  - 152: `text灰-500` → `text-gray-500`
  - 153、154: `bg灰-100` → `bg-gray-100`
  - 178: `text灰-400` → `text-gray-400`
  - 195: `text灰-500` → `text-gray-500`
  - 196: `bg灰-100` → `bg-gray-100`
  - 206: `text灰-700 bg灰-100 hover:bg灰-200` → `text-gray-700 bg-gray-100 hover:bg-gray-200`
- d:\workplace\files_push\src\components\SettingsModal.tsx
  - 75: `text蓝-600` → `text-blue-600`（保留 `border-blue-500`）
  - 110: `after:bg白 after:border灰-300 peer-checked:bg蓝-600` → `after:bg-white after:border-gray-300 peer-checked:bg-blue-600`
  - 125: `peer-focus:ring蓝-300 after:bg白 peer-checked:bg蓝-600` → `peer-focus:ring-blue-300 after:bg-white peer-checked:bg-blue-600`
  - 181: `after:bg白 peer-checked:bg蓝-600` → `after:bg-white peer-checked:bg-blue-600`
  - 197: 同 125 行样式修正
  - 244: `bg灰-100 hover:bg灰-200` → `bg-gray-100 hover:bg-gray-200`
  - 273: `bg灰-100 hover:bg灰-200` → `bg-gray-100 hover:bg-gray-200`
  - 282: `bg白 hover:bg灰-50` → `bg-white hover:bg-gray-50`
  - 288: `text白 bg蓝-600 hover:bg蓝-700` → `text-white bg-blue-600 hover:bg-blue-700`
- d:\workplace\files_push\src\components\HelpModal.tsx
  - 8: `bg黑` → `bg-black`
  - 17: `hover:bg灰-100` → `hover:bg-gray-100`
  - 26、27: `text蓝-600` → `text-blue-600`
  - 35、36: `text绿-600` → `text-green-600`
  - 44、45: `text紫-600` → `text-purple-600`
  - 48: `bg灰-50` → `bg-gray-50`
  - 68: `bg蓝-600 hover:bg蓝-700` → `bg-blue-600 hover:bg-blue-700`（`text-white` 已正确）
- d:\workplace\files_push\src\components\TransferProgress.tsx
  - 57: `bg黑` → `bg-black`
  - 82: `bg灰-200` → `bg-gray-200`
  - 93、107: `text白` → `text-white`

## 不改动内容
- 不修改 `build/assets/*.js` 构建产物，修复源码后重新构建自然消失。

## 验证步骤
- 重新编译：`npm run build` 或本地启动：`npm run dev`，确保无编译错误。
- 手动检查 UI：
  - 设置弹窗开关与按钮的颜色（蓝/灰/白/黑等）是否正确。
  - 传输进度条与模态背景色是否符合预期（`bg-gray-*`、`bg-black`）。
  - 文件夹图标、信息/上传/手机图标的 `text-*` 颜色是否正确。
- 代码检查：全局搜索 `text[一-龥]|bg[一-龥]|border[一-龥]|ring[一-龥]`，确认无中文颜色残留。

## 交付结果
- 提交修复后的 4 个组件文件，移除所有中文颜色词，Tailwind 颜色类全部使用英文标准名，以确保样式稳定生效。