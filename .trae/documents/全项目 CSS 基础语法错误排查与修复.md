## 排查结论
- 已全面检索 `src/**`，定位以下基础语法错误（Tailwind/类名拼写）：
  - `src/components/TransferLogViewer.tsx:149` 使用了中文混入类名：`justify之间`，应为 `justify-between`
  - `src/components/TransferLogViewer.tsx:150` 使用了无效字号类：`text-l`，应为 `text-lg`
  - `src/components/TransferLogViewer.tsx:117、121、125、131` 使用了无效字号类：`text-m`，建议改为 `text-sm`
  - `src/components/TransferLogViewer.tsx:217` 使用了无效字号类：`text-x`，应为 `text-xs`
  - `src/components/TransferLogViewer.tsx:209` 使用了错误的尺寸类：`h4`（缺连字符），应为 `h-4`
  - `src/components/TransferLogViewer.tsx:158、165、172` 使用了非标准色阶：`bg-*-150`，建议改为 `bg-*-100`
  - `src/components/TransferPathSettings.tsx:119、164` 使用了无效字号类：`text-l`，应为 `text-lg`
  - `src/components/SettingsModal.tsx:45` 使用了无效阴影类：`shadow-l`，应为 `shadow-lg`
- 同时复查了 `.tsx/.jsx` 中 `class="` 误用，未发现问题；复查了中文颜色词，源码中已全部修复。

## 修改方案
- 类名修正（仅替换无效/错误类名）：
  - `justify之间` → `justify-between`（语义保持：两端对齐）
  - `text-l` → `text-lg`（与项目现有字号体系一致）
  - `text-m` → `text-sm`（用于统计标签的次级文本）
  - `text-x` → `text-xs`（用于更小的说明文字）
  - `h4` → `h-4`（尺寸类统一）
  - `bg-gray-150` → `bg-gray-100`、`bg-blue-150` → `bg-blue-100`、`bg-red-150` → `bg-red-100`（贴近设计意图的浅色底色，保持 hover 行为不变）
  - `shadow-l` → `shadow-lg`（与 Tailwind 标准匹配）

## 逐文件修复清单
- `src/components/TransferLogViewer.tsx`
  - 149: `justify之间` → `justify-between`
  - 150: `text-l` → `text-lg`
  - 117/121/125/131: `text-m` → `text-sm`
  - 217: `text-x` → `text-xs`
  - 209: `h4` → `h-4`
  - 158: `bg-gray-150` → `bg-gray-100`
  - 165: `bg-blue-150` → `bg-blue-100`
  - 172: `bg-red-150` → `bg-red-100`
- `src/components/TransferPathSettings.tsx`
  - 119/164: `text-l` → `text-lg`
- `src/components/SettingsModal.tsx`
  - 45: `shadow-l` → `shadow-lg`

## 验证步骤
- 运行 `npm run build` 或本地启动 `npm run dev`，确认无编译错误。
- 视觉验证：
  - TransferLogViewer 顶部工具栏左右对齐正常（`justify-between`）。
  - 统计区标签字号与视觉层级合理（`text-sm`/`text-xs`）。
  - 三个操作按钮的底色为浅色（`*-100`）且 hover 深色对比明显。
  - 其他位置字号与阴影效果正常（`text-lg`、`shadow-lg`）。

## 说明
- 本次变更仅修复语法与拼写错误，不调整设计意图与交互逻辑。
- 若后续需要自定义色阶（如 `150`）或新增设计令牌，可通过 Tailwind 配置扩展；当前以默认配置为准。请确认后我将立即执行上述修改并完成验证。