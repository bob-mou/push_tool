# 文件推送工具 - 安装说明

## 系统要求

- Windows 10/11 (64位)
- Node.js 18.0 或更高版本
- 管理员权限（首次安装）

## 依赖工具安装

### 1. ADB 工具安装（Android 设备）

1. 下载 Android SDK Platform Tools：
   - 访问 [Android 开发者官网](https://developer.android.com/studio/releases/platform-tools)
   - 下载 Windows 版本的 Platform Tools

2. 解压并配置环境变量：
   ```bash
   # 解压到 C:\platform-tools
   # 添加到系统环境变量 PATH
   setx PATH "%PATH%;C:\platform-tools"
   ```

3. 验证安装：
   ```bash
   adb version
   ```

### 2. iOS 工具安装（爱思 idb）

1. 推荐将 `idb.exe` 放置在本应用目录 `src/idb/idb.exe`；程序会在运行时自动解析该路径，并临时加入环境变量。
2. 设备需完成“信任此电脑”，并保持解锁状态。
3. 验证：
   - `idb --help` 中应包含 `devices`、`fs ls`、`fs push`
   - `idb list` 或 `idb list --json` 应输出设备列表

## 应用安装

### 开发模式

```bash
# 克隆项目
git clone <repository-url>
cd files_push

# 安装依赖
npm install

# 开发模式运行
npm run dev
```

### 生产模式

```bash
# 构建应用
npm run build

# 打包安装程序
npm run dist

# 安装生成的安装程序
dist/文件推送工具 Setup.exe
```

## 设备连接配置

### Android 设备

1. 开启开发者选项：
   - 设置 > 关于手机 > 版本号（连续点击7次）

2. 开启 USB 调试：
   - 设置 > 开发者选项 > USB 调试（开启）

3. 连接电脑并授权：
   - 首次连接会弹出授权提示，点击"允许"

### iOS 设备

1. 连接电脑：使用原装数据线连接；保持设备解锁
2. 信任电脑：设备端“信任此电脑”并输入密码确认
3. 验证连接：
   ```bash
   idb list
   idb list --json
   ```

## 故障排除

### ADB 设备未检测到

```bash
# 重启 ADB 服务
adb kill-server
adb start-server
adb devices
```

### iOS 设备未检测到

```bash
# 检查命令可用性
idb --help
idb list --json

# 如仍无设备，检查数据线、USB端口，并确保设备已“信任此电脑”
```

### 文件推送失败

1. 检查设备连接状态
2. 确认目标路径权限
3. 检查文件大小限制
4. 查看应用日志获取详细信息

## 使用帮助

详细的使用说明请查看应用内的帮助文档，或访问项目 Wiki 页面。
