# 文件传输记录系统文档

## 概述

文件传输记录系统是一个完整的解决方案，用于记录和管理文件传输任务的完整生命周期。该系统满足以下要求：

- ✅ 只保留最终传输结果记录
- ✅ 包含所有关键信息（源文件、目标路径、文件大小、时间戳、状态、错误信息）
- ✅ 支持CSV格式导出
- ✅ 完整的异常处理和错误记录
- ✅ 自动重试机制
- ✅ 原子性操作保证

## 系统架构

### 核心组件

1. **TransferRecorder** - 传输记录管理器
2. **TransferRetryManager** - 自动重试管理器
3. **EnhancedDeviceManager** - 增强版设备管理器（集成记录功能）
4. **ErrorHandler** - 异常处理和错误记录

### 数据模型

#### TransferRecord
```typescript
interface TransferRecord {
  id: string;                    // 唯一标识符
  sourcePath: string;           // 源文件完整路径
  sourceFileName: string;       // 源文件名
  targetPath: string;           // 目标路径
  fileSize: number;             // 文件大小（字节）
  startTime: string;            // 开始时间（ISO格式）
  endTime: string;              // 结束时间（ISO格式）
  duration: number;             // 传输时长（毫秒）
  status: 'success' | 'failed' | 'cancelled';  // 最终状态
  error?: string;               // 错误信息（失败时）
  retryCount: number;           // 重试次数
  deviceId?: string;            // 设备ID
  deviceName?: string;          // 设备名称
  deviceType?: 'android' | 'ios';  // 设备类型
  checksum?: string;            // 文件校验和
  transferMethod?: 'adb' | 'ios' | 'local';  // 传输方式
}
```

## 快速开始

### 1. 基本文件传输

```typescript
import { EnhancedDeviceManager } from './utils/enhancedDeviceManager';

const enhancedManager = EnhancedDeviceManager.getInstance();

// 获取连接的设备
const devices = await enhancedManager.getConnectedDevices();
if (devices.length > 0) {
  const device = devices[0];
  
  // 传输文件
  const result = await enhancedManager.pushFileWithRecording(
    device,
    'C:\path\to\your\file.txt',
    device.type === 'android' 
      ? '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/'
      : '/Documents/BattleRecord/',
    {
      calculateChecksum: true,
      verifyTransfer: true,
      retryConfig: { maxRetries: 3, retryDelay: 1000 }
    }
  );
  
  console.log('传输结果:', result);
}
```

### 2. 批量文件传输

```typescript
const files = [
  {
    localPath: 'C:\path\to\file1.txt',
    remotePath: '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/'
  },
  {
    localPath: 'C:\path\to\file2.json',
    remotePath: '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/'
  }
];

const results = await enhancedManager.batchPushFilesWithRecording(device, files);
console.log('批量传输结果:', results);
```

### 3. 导出传输记录

```typescript
// 导出为CSV
await enhancedManager.exportTransferRecords('./transfer-history.csv');

// 获取传输统计
const stats = enhancedManager.getTransferStats();
console.log(`成功率: ${stats.successRate}%`);

// 搜索记录
const records = enhancedManager.searchTransferRecords('test');
```

## 高级功能

### 自定义重试配置

```typescript
const result = await enhancedManager.pushFileWithRecording(
  device,
  localPath,
  remotePath,
  {
    retryConfig: {
      maxRetries: 5,
      retryDelay: 2000,
      backoffMultiplier: 2,
      maxDelay: 15000
    }
  }
);
```

### 错误处理和日志记录

```typescript
import { errorHandler } from './utils/errorHandler';

// 记录错误
errorHandler.logError('传输失败', new Error('设备连接中断'), {
  transferId: 'transfer_123',
  deviceId: 'device_456'
});

// 获取错误统计
const errorStats = errorHandler.getErrorStats();
console.log('错误统计:', errorStats);

// 导出错误报告
const reportPath = await errorHandler.createErrorReport();
console.log('错误报告已创建:', reportPath);
```

### 数据查询和分析

```typescript
// 获取所有成功记录
const successfulRecords = recorder.getSuccessfulRecords(10);

// 获取失败记录
const failedRecords = recorder.getFailedRecords(10);

// 获取传输统计
const stats = recorder.getTransferStats();
console.log(`总传输: ${stats.totalTransfers}`);
console.log(`成功: ${stats.successfulTransfers}`);
console.log(`失败: ${stats.failedTransfers}`);
console.log(`成功率: ${stats.successRate}%`);
console.log(`平均速度: ${(stats.averageSpeed * 1000).toFixed(2)} KB/s`);
```

## 数据持久化

### 存储位置
- **传输记录**: `用户数据目录/transfer-records.json`
- **错误日志**: `用户数据目录/error-logs.json`
- **错误报告**: `用户数据目录/error-report-{timestamp}.json`

### 数据清理

```typescript
// 清理旧记录（默认保留30天）
recorder.cleanupOldRecords();

// 清理特定日期前的记录
const cutoffDate = new Date('2024-01-01');
recorder.cleanupOldRecords(cutoffDate);

// 清除所有记录
recorder.clearAllRecords();
errorHandler.clearErrorLogs();
```

## 集成指南

### 1. 替换现有代码

在现有代码中，将 `DeviceManager` 替换为 `EnhancedDeviceManager`：

```typescript
// 旧代码
import { DeviceManager } from './utils/deviceManager';
const deviceManager = DeviceManager.getInstance();
await deviceManager.pushFileToAndroid(deviceId, localPath, remotePath);

// 新代码
import { EnhancedDeviceManager } from './utils/enhancedDeviceManager';
const enhancedManager = EnhancedDeviceManager.getInstance();
const result = await enhancedManager.pushFileWithRecording(device, localPath, remotePath);
```

### 2. 事件处理

```typescript
// 监听传输事件
enhancedManager.on('transferStart', (transferId) => {
  console.log('传输开始:', transferId);
});

enhancedManager.on('transferComplete', (result) => {
  console.log('传输完成:', result);
});

enhancedManager.on('transferError', (error) => {
  console.error('传输错误:', error);
});
```

## 性能优化

### 1. 批量操作

使用批量传输减少I/O开销：

```typescript
const results = await enhancedManager.batchPushFilesWithRecording(device, files);
```

### 2. 配置优化

```typescript
// 减少最大记录数以节省内存
recorder.maxRecords = 5000;

// 调整重试策略
retryManager.updateRetryConfig({
  maxRetries: 2,
  maxDelay: 5000
});
```

## 故障排除

### 常见问题

1. **记录文件过大**
   ```typescript
   // 定期清理旧记录
   recorder.cleanupOldRecords(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
   ```

2. **权限错误**
   ```typescript
   // 检查文件权限
   try {
     await fs.access(localPath, fs.constants.R_OK);
   } catch (error) {
     errorHandler.logError('文件权限错误', error, { filePath: localPath });
   }
   ```

3. **设备连接问题**
   ```typescript
   // 验证设备连接
   const devices = await enhancedManager.getConnectedDevices();
   if (devices.length === 0) {
     errorHandler.logWarning('未找到连接的设备');
   }
   ```

### 调试模式

```typescript
// 启用详细日志
process.env.DEBUG = 'transfer:*';

// 查看详细传输日志
const debugLogs = errorHandler.searchErrorLogs('transfer');
console.log('传输相关日志:', debugLogs);
```

## API参考

### EnhancedDeviceManager

- `pushFileWithRecording(device, localPath, remotePath, options)` - 传输单个文件
- `batchPushFilesWithRecording(device, files, options)` - 批量传输文件
- `getTransferRecords(limit?)` - 获取传输记录
- `getTransferStats()` - 获取传输统计
- `exportTransferRecords(filePath)` - 导出CSV
- `searchTransferRecords(query)` - 搜索记录

### TransferRecorder

- `startTransfer(...)` - 开始传输记录
- `completeTransfer(transferId, duration, checksum?)` - 标记成功
- `failTransfer(transferId, error, duration?)` - 标记失败
- `getAllRecords(limit?)` - 获取所有记录
- `exportToCSV(filePath)` - 导出CSV

### ErrorHandler

- `logError(message, error?, context?)` - 记录错误
- `logWarning(message, context?)` - 记录警告
- `logInfo(message, context?)` - 记录信息
- `getErrorLogs(level?, limit?)` - 获取错误日志
- `createErrorReport()` - 创建错误报告

## 测试

运行测试用例：

```bash
# 运行测试
npx ts-node src/utils/transferSystem.test.ts

# 运行集成测试
npm run test:transfer
```

## 许可证

MIT License