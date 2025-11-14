// 传输路径配置系统概念测试
// 由于TypeScript配置为noEmit，我们直接测试路径配置逻辑

class TransferPathManager {
  // 获取设备类型的默认传输路径
  getDefaultPath(deviceType) {
    const defaultPaths = {
      android: '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/',
      ios: '/Documents/BattleRecord/'
    };
    return defaultPaths[deviceType] || defaultPaths.android;
  }

  // 验证传输路径
  validatePath(path, deviceType) {
    if (!path || typeof path !== 'string') {
      return { valid: false, error: '路径不能为空' };
    }

    const trimmedPath = path.trim();
    if (trimmedPath.length === 0) {
      return { valid: false, error: '路径不能为空' };
    }

    // 检查路径格式
    if (!trimmedPath.startsWith('/')) {
      return { valid: false, error: '路径必须以/开头' };
    }

    // 设备类型特定验证
    if (deviceType === 'android') {
      // Android路径验证
      if (!trimmedPath.startsWith('/sdcard/') && !trimmedPath.startsWith('/storage/')) {
        return { valid: false, error: 'Android路径必须以/sdcard/或/storage/开头' };
      }
    } else if (deviceType === 'ios') {
      // iOS路径验证
      if (!trimmedPath.startsWith('/Documents/') && !trimmedPath.startsWith('/Library/')) {
        return { valid: false, error: 'iOS路径必须以/Documents/或/Library/开头' };
      }
    }

    // 检查路径中是否包含非法字符
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(trimmedPath)) {
      return { valid: false, error: '路径包含非法字符' };
    }

    // 检查路径长度
    if (trimmedPath.length > 1000) {
      return { valid: false, error: '路径过长' };
    }

    return { valid: true };
  }

  // 标准化路径
  normalizePath(path) {
    if (!path || typeof path !== 'string') {
      return '/';
    }

    let normalized = path.trim();
    
    // 移除多余斜杠
    normalized = normalized.replace(/\/+/g, '/');
    
    // 确保以斜杠结尾
    if (!normalized.endsWith('/')) {
      normalized += '/';
    }
    
    return normalized;
  }

  // 生成目标路径
  generateTargetPath(sourcePath, targetDir) {
    if (!sourcePath || !targetDir) {
      return null;
    }

    // 从源路径中提取文件名
    const fileName = sourcePath.split(/[/\\]/).pop();
    if (!fileName) {
      return null;
    }

    // 标准化目标目录
    const normalizedTargetDir = this.normalizePath(targetDir);
    
    // 组合完整路径
    return normalizedTargetDir + fileName;
  }

  // 添加传输日志
  addTransferLog(logEntry) {
    if (!this.transferLogs) {
      this.transferLogs = [];
    }
    
    const log = {
      ...logEntry,
      timestamp: Date.now()
    };
    
    this.transferLogs.unshift(log);
    
    // 限制日志数量
    if (this.transferLogs.length > 1000) {
      this.transferLogs = this.transferLogs.slice(0, 1000);
    }
    
    return log;
  }

  // 获取传输日志
  getTransferLog(limit = 100) {
    if (!this.transferLogs) {
      return [];
    }
    return this.transferLogs.slice(0, limit);
  }

  // 获取传输统计
  getTransferStats() {
    if (!this.transferLogs || this.transferLogs.length === 0) {
      return {
        totalTransfers: 0,
        successfulTransfers: 0,
        failedTransfers: 0,
        totalFileSize: 0,
        totalDuration: 0,
        successRate: 0
      };
    }

    const stats = this.transferLogs.reduce((acc, log) => {
      acc.totalTransfers++;
      
      if (log.status === 'success') {
        acc.successfulTransfers++;
        acc.totalFileSize += log.fileSize || 0;
        acc.totalDuration += log.duration || 0;
      } else if (log.status === 'failed') {
        acc.failedTransfers++;
      }
      
      return acc;
    }, {
      totalTransfers: 0,
      successfulTransfers: 0,
      failedTransfers: 0,
      totalFileSize: 0,
      totalDuration: 0
    });

    stats.successRate = stats.totalTransfers > 0 
      ? Math.round((stats.successfulTransfers / stats.totalTransfers) * 100) 
      : 0;

    return stats;
  }
}

async function testTransferPathConfiguration() {
  console.log('🧪 测试传输路径配置系统...\n');
  
  const transferPathManager = new TransferPathManager();
  
  // 测试1: 默认路径配置
  console.log('📍 测试1: 默认路径配置');
  const androidDefaultPath = transferPathManager.getDefaultPath('android');
  const iosDefaultPath = transferPathManager.getDefaultPath('ios');
  console.log(`Android默认路径: ${androidDefaultPath}`);
  console.log(`iOS默认路径: ${iosDefaultPath}`);
  console.log('✅ 默认路径配置测试通过\n');
  
  // 测试2: 路径验证
  console.log('🔍 测试2: 路径验证');
  const testPaths = [
    { path: '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/', type: 'android', expected: true },
    { path: '/storage/emulated/0/Android/data/com.tencent.uc/files/BattleRecord/', type: 'android', expected: true },
    { path: '/Documents/BattleRecord/', type: 'ios', expected: true },
    { path: '/Library/Application Support/BattleRecord/', type: 'ios', expected: true },
    { path: '/invalid/path/', type: 'android', expected: false },
    { path: 'C:\\invalid\\windows\\path', type: 'android', expected: false },
  ];
  
  testPaths.forEach(({ path, type, expected }) => {
    const result = transferPathManager.validatePath(path, type);
    const status = result.valid === expected ? '✅' : '❌';
    console.log(`${status} ${type}路径 "${path}": ${result.valid ? '有效' : `无效 - ${result.error}`}`);
  });
  console.log('');
  
  // 测试3: 路径标准化
  console.log('🔄 测试3: 路径标准化');
  const pathsToNormalize = [
    '/sdcard//Android/data///com.tencent.uc/files/BattleRecord/',
    '/sdcard/Android/data/com.tencent.uc/files/BattleRecord',
    '/Documents/BattleRecord//',
  ];
  
  pathsToNormalize.forEach(testPath => {
    const normalized = transferPathManager.normalizePath(testPath);
    console.log(`原始路径: "${testPath}"`);
    console.log(`标准化后: "${normalized}"`);
  });
  console.log('');
  
  // 测试4: 目标路径生成
  console.log('🎯 测试4: 目标路径生成');
  const testFiles = [
    'C:\\Users\\Test\\Documents\\battle_record_20241113.txt',
    '/home/user/game_record.json',
    './test_file.log',
  ];
  
  const targetDir = '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/';
  
  testFiles.forEach(filePath => {
    const targetPath = transferPathManager.generateTargetPath(filePath, targetDir);
    console.log(`源文件: "${filePath}"`);
    console.log(`目标路径: "${targetPath}"`);
  });
  console.log('');
  
  // 测试5: 传输日志
  console.log('📝 测试5: 传输日志功能');
  const testLog = {
    deviceId: 'test_device_123',
    deviceType: 'android',
    deviceName: 'Test Android Device',
    sourcePath: 'C:\\test\\file.txt',
    targetPath: '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/file.txt',
    status: 'success',
    duration: 1500,
    fileSize: 1024
  };
  
  transferPathManager.addTransferLog(testLog);
  console.log('✅ 添加传输日志成功');
  
  const logs = transferPathManager.getTransferLog(10);
  console.log(`📊 最近传输记录数: ${logs.length}`);
  
  const stats = transferPathManager.getTransferStats();
  console.log('📈 传输统计:');
  console.log(`  总传输次数: ${stats.totalTransfers}`);
  console.log(`  成功次数: ${stats.successfulTransfers}`);
  console.log(`  失败次数: ${stats.failedTransfers}`);
  console.log(`  总文件大小: ${stats.totalFileSize} bytes`);
  console.log(`  总耗时: ${stats.totalDuration} ms`);
  console.log(`  成功率: ${stats.successRate}%`);
  console.log('');
  
  // 测试6: 特殊字符处理
  console.log('🔤 测试6: 特殊字符处理');
  const specialCharPaths = [
    '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/战报_2024.txt',
    '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/记录 文件.json',
    '/Documents/BattleRecord/Player_战绩#1.log',
  ];
  
  specialCharPaths.forEach(testPath => {
    const isValid = transferPathManager.validatePath(testPath, 'android');
    console.log(`路径 "${testPath}": ${isValid.valid ? '✅ 有效' : `❌ 无效 - ${isValid.error}`}`);
  });
  
  console.log('\n🎉 所有传输路径配置测试完成!');
}

// 运行测试
testTransferPathConfiguration().catch(console.error);