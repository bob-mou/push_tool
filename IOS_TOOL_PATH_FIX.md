# iOS工具路径配置修复说明

## 问题描述

之前iOS设备文件传输时，当系统找不到默认的iOS工具（如idevicefs、idevice_id等）时，会直接报错"未找到可用的iOS文件传输工具"。

## 解决方案

我们实现了以下改进：

### 1. 动态工具路径配置
- **iOS工具路径**：现在可以从设置中读取用户配置的iOS工具路径
- **ADB路径**：同样支持从设置中读取自定义ADB路径
- **降级处理**：当设置中没有配置路径时，使用系统默认路径

### 2. 支持的工具
- `idevicefs` - iOS文件系统操作
- `idevice_id` - 设备ID获取
- `ideviceinfo` - 设备信息获取
- `adb` - Android调试桥

### 3. 配置方式

#### 通过设置界面配置
1. 打开设置窗口
2. 在"常规设置"中找到"iOS工具路径"
3. 点击"浏览"选择包含iOS工具的目录
4. 保存设置

#### 手动配置路径
iOS工具通常位于：
- **Windows**: `C:\Program Files\libimobiledevice\`
- **macOS**: `/usr/local/bin/`
- **Linux**: `/usr/bin/` 或 `/usr/local/bin/`

### 4. 错误处理改进
- 当工具不可用时，会提示用户检查设置中的路径配置
- 提供更清晰的错误信息，指导用户如何修复
- 支持跨平台路径处理（Windows、macOS、Linux）

## 使用示例

### 设置iOS工具路径
```javascript
// 在设置中配置路径
await window.electronAPI.updateSettings({
  iosToolsPath: 'C:\\Program Files\\libimobiledevice',
  adbPath: 'C:\\Android\\platform-tools\\adb.exe'
});
```

### 设备管理器使用
```javascript
const deviceManager = DeviceManager.getInstance();
const devices = await deviceManager.getConnectedDevices();
await deviceManager.pushFileToIOS(deviceId, localPath, remotePath);
```

## 验证方法

运行测试脚本验证配置：
```bash
node test-tool-paths.js
```

## 注意事项

1. **权限问题**：确保iOS工具具有执行权限
2. **路径格式**：使用绝对路径，支持空格和特殊字符
3. **环境变量**：如果工具已添加到系统PATH，可以留空使用默认值
4. **工具安装**：需要先安装libimobiledevice工具包

## 故障排除

### 常见问题
1. **"iOS文件传输工具不可用"**
   - 检查设置中的iOS工具路径是否正确
   - 确认工具是否已安装
   - 验证工具是否有执行权限

2. **"ADB不可用"**
   - 检查Android SDK是否正确安装
   - 确认ADB路径配置正确
   - 验证设备是否已连接并授权

### 调试命令
```bash
# 检查iOS工具
which idevice_id
which idevicefs
which ideviceinfo

# 检查ADB
which adb
adb devices

# 检查设备连接
idevice_id -l
adb devices
```