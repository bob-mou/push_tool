# 帮助说明页面样式规范

- 全局重置：`html, body, #root { height: 100%; margin: 0; }`，确保无默认外边距与满高。
- 页面背景：使用 `bg-white`，避免渐变背景带来的额外视觉空白。
- 容器边距：窗口内容容器使用 `p-1` 或 `p-2`；标题区使用 `mb-1`；各分组使用 `space-y-1.5`。
- 标题区拖拽：为标题容器添加 `electron-drag`，交互控件添加 `electron-no-drag`，避免拖拽冲突。
- 信息面板：浅灰底 `bg-gray-50`，内边距 `p-2`，圆角 `rounded-md`，文本 `text-sm` 保持可读性。
- 响应式：`sm:max-w-full md:max-w-full lg:max-w-full` 建议窗口内使用 `w-full h-full`，让对话框根据内容适配，高度控制为 `max-h-[80vh]` 或滚动。
- 风格一致性：图标与配色沿用主界面（蓝、绿、紫），避免使用额外主题色。
- 避免内联样式：尽量使用类 `electron-drag`/`electron-no-drag`；仅在必要时使用内联样式。
- 访问规范：帮助窗口通过 `ipcMain.handle('open-help')` 打开，URL 指向 `#/help`，保持单页内路由渲染。
