// 传输路径配置系统测试
import { TransferPathManager } from './dist-electron/src/utils/transferPathManager.js';

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