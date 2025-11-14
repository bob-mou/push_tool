import { DeviceManager } from './dist-electron/src/utils/deviceManager.js';

async function testAndroidDevices() {
  console.log('🧪 测试安卓设备检测...\n');
  
  const deviceManager = DeviceManager.getInstance();
  
  try {
    console.log('🔍 检查ADB可用性...');
    const adbAvailable = await deviceManager.isADBAvailable();
    console.log(`✅ ADB可用: ${adbAvailable}`);
    
    console.log('🔍 获取安卓设备...');
    const androidDevices = await deviceManager.getAndroidDevices();
    console.log(`✅ 发现 ${androidDevices.length} 个安卓设备`);
    
    if (androidDevices.length > 0) {
      androidDevices.forEach(device => {
        console.log(`📱 ${device.id} - ${device.name} (${device.type})`);
      });
    }
    
    console.log('🔍 获取所有设备...');
    const allDevices = await deviceManager.getConnectedDevices();
    console.log(`✅ 总共发现 ${allDevices.length} 个设备`);
    
    allDevices.forEach(device => {
      console.log(`📱 ${device.id} - ${device.name} (${device.type})`);
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testAndroidDevices();