import { DeviceManager } from './dist-electron/src/utils/deviceManager.js';

async function testToolPathConfiguration() {
  console.log('🧪 测试iOS和Android工具路径配置系统...\n');
  
  const deviceManager = DeviceManager.getInstance();
  
  // 模拟设置获取
  const originalGetSettings = deviceManager.getSettings;
  deviceManager.getSettings = async () => ({
    adbPath: 'C:\\Android\\platform-tools\\adb.exe',
    iosToolsPath: 'C:\\Program Files\\libimobiledevice'
  });
  
  console.log('✅ 已配置模拟设置');
  console.log('📍 ADB路径: C:\\Android\\platform-tools\\adb.exe');
  console.log('📍 iOS工具路径: C:\\Program Files\\libimobiledevice');
  
  try {
    // 测试ADB可用性检查
    console.log('\n🔍 测试ADB可用性检查...');
    const adbAvailable = await deviceManager.isADBAvailable();
    console.log(`ADB可用性: ${adbAvailable ? '✅ 可用' : '❌ 不可用'}`);
    
    // 测试iOS工具可用性检查
    console.log('\n🔍 测试iOS工具可用性检查...');
    const iosAvailable = await deviceManager.isIOSToolsAvailable();
    console.log(`iOS工具可用性: ${iosAvailable ? '✅ 可用' : '❌ 不可用'}`);
    
    // 测试设备列表获取
    console.log('\n🔍 测试设备列表获取...');
    const devices = await deviceManager.getConnectedDevices();
    console.log(`发现设备数量: ${devices.length}`);
    devices.forEach(device => {
      console.log(`  - ${device.name} (${device.type})`);
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 恢复原始方法
    deviceManager.getSettings = originalGetSettings;
  }
  
  console.log('\n✅ 工具路径配置测试完成');
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testToolPathConfiguration().catch(console.error);
}