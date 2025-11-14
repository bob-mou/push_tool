import { EnhancedDeviceManager } from './enhancedDeviceManager';
import { TransferRecorder } from './transferRecorder';
import { TransferRetryManager } from './transferRetryManager';
import { errorHandler } from './errorHandler';

/**
 * 文件传输记录系统测试用例
 * 
 * 运行测试：
 * npx ts-node src/utils/transferSystem.test.ts
 */

async function testTransferSystem() {
  console.log('🧪 开始测试文件传输记录系统...\n');

  const enhancedManager = EnhancedDeviceManager.getInstance();
  const recorder = TransferRecorder.getInstance();
  const retryManager = TransferRetryManager.getInstance();

  try {
    // 测试1: 获取传输统计
    console.log('📊 测试1: 获取传输统计');
    const stats = enhancedManager.getTransferStats();
    console.log('当前传输统计:', JSON.stringify(stats, null, 2));

    // 测试2: 记录系统信息
    console.log('\n📝 测试2: 记录系统信息');
    errorHandler.logInfo('开始测试文件传输记录系统');

    // 测试3: 模拟传输记录
    console.log('\n🔄 测试3: 模拟传输记录');
    
    // 模拟成功传输
    const successTransferId = recorder.startTransfer(
      'C:\Users\Test\Documents\test-file.txt',
      '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/',
      1024,
      {
        deviceId: 'test-device-123',
        deviceName: 'Test Android Device',
        deviceType: 'android'
      },
      'adb'
    );
    
    recorder.completeTransfer(successTransferId, 1500, 'abc123def456');
    console.log('✅ 成功记录模拟传输');

    // 模拟失败传输
    const failedTransferId = recorder.startTransfer(
      'C:\Users\Test\Documents\invalid-file.txt',
      '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/',
      2048,
      {
        deviceId: 'test-device-456',
        deviceName: 'Another Test Device',
        deviceType: 'android'
      },
      'adb'
    );
    
    recorder.failTransfer(failedTransferId, '文件不存在', 500);
    console.log('❌ 成功记录失败传输');

    // 测试4: 重试机制配置
    console.log('\n🔄 测试4: 重试机制配置');
    const retryConfig = retryManager.getRetryConfig();
    console.log('默认重试配置:', retryConfig);

    // 测试5: 导出CSV功能
    console.log('\n📤 测试5: 导出CSV功能');
    const exportPath = './transfer-records-test.csv';
    try {
      await recorder.exportToCSV(exportPath);
      console.log(`✅ CSV导出成功: ${exportPath}`);
    } catch (error) {
      console.log('⚠️  CSV导出失败（无记录）:', error);
    }

    // 测试6: 搜索记录
    console.log('\n🔍 测试6: 搜索记录');
    const searchResults = recorder.searchRecords('test');
    console.log(`找到 ${searchResults.length} 条相关记录`);

    // 测试7: 错误处理
    console.log('\n⚠️  测试7: 错误处理');
    errorHandler.logError('测试错误', new Error('这是一个测试错误'), {
      transferId: successTransferId,
      operation: 'test'
    });

    // 测试8: 获取最新统计
    console.log('\n📈 测试8: 获取最新统计');
    const newStats = enhancedManager.getTransferStats();
    console.log('更新后的传输统计:', JSON.stringify(newStats, null, 2));

    // 测试9: 获取传输记录
    console.log('\n📋 测试9: 获取传输记录');
    const records = enhancedManager.getTransferRecords(10);
    console.log(`获取到 ${records.length} 条记录`);
    records.forEach(record => {
      console.log(`- ${record.sourceFileName} -> ${record.status} (${record.duration}ms)`);
    });

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('测试失败:', error);
    errorHandler.logError('测试失败', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 实际使用示例
 */
async function usageExample() {
  console.log('\n📖 使用示例...\n');

  const enhancedManager = EnhancedDeviceManager.getInstance();

  // 示例1: 基本文件传输
  const example1 = async () => {
    console.log('示例1: 基本文件传输');
    
    // 获取设备
    const devices = await enhancedManager.getConnectedDevices();
    if (devices.length === 0) {
      console.log('未找到连接的设备');
      return;
    }

    const device = devices[0];
    console.log(`使用设备: ${device.name} (${device.type})`);

    // 传输文件（需要实际文件）
    // const result = await enhancedManager.pushFileWithRecording(
    //   device,
    //   'C:\path\to\your\file.txt',
    //   device.type === 'android' 
    //     ? '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/'
    //     : '/Documents/BattleRecord/',
    //   {
    //     calculateChecksum: true,
    //     verifyTransfer: true,
    //     retryConfig: { maxRetries: 3, retryDelay: 1000 }
    //   }
    // );
    
    // console.log('传输结果:', result);
  };

  // 示例2: 批量传输
  const example2 = async () => {
    console.log('\n示例2: 批量传输');
    
    const devices = await enhancedManager.getConnectedDevices();
    if (devices.length === 0) return;

    const device = devices[0];
    
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

    // const results = await enhancedManager.batchPushFilesWithRecording(device, files);
    // console.log('批量传输结果:', results);
  };

  // 示例3: 导出记录
  const example3 = async () => {
    console.log('\n示例3: 导出记录');
    
    try {
      await enhancedManager.exportTransferRecords('./transfer-history.csv');
      console.log('传输记录已导出到 transfer-history.csv');
    } catch (error) {
      console.log('导出失败:', error);
    }
  };

  // 示例4: 查看统计
  const example4 = () => {
    console.log('\n示例4: 查看统计');
    const stats = enhancedManager.getTransferStats();
    console.log('传输统计:');
    console.log(`- 总传输次数: ${stats.totalTransfers}`);
    console.log(`- 成功次数: ${stats.successfulTransfers}`);
    console.log(`- 失败次数: ${stats.failedTransfers}`);
    console.log(`- 成功率: ${stats.successRate.toFixed(1)}%`);
    console.log(`- 总文件大小: ${(stats.totalFileSize / 1024 / 1024).toFixed(2)} MB`);
  };

  await example1();
  await example2();
  await example3();
  example4();
}

// 如果直接运行此文件
if (require.main === module) {
  testTransferSystem().then(() => {
    usageExample();
  });
}

export {
  testTransferSystem
};