import { DeviceManager } from './dist-electron/src/utils/deviceManager.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function testDirectAndroid() {
  console.log('🧪 直接测试安卓设备检测...\n');
  
  const deviceManager = DeviceManager.getInstance();
  
  try {
    console.log('🔍 使用设备管理器...');
    const androidDevices = await deviceManager.getAndroidDevices();
    console.log(`✅ 设备管理器发现 ${androidDevices.length} 个安卓设备`);
    
    androidDevices.forEach(device => {
      console.log(`📱 ${device.id} - ${device.name} (${device.type})`);
    });
    
    console.log('\n🔍 获取所有设备...');
    const allDevices = await deviceManager.getConnectedDevices();
    console.log(`✅ 总共发现 ${allDevices.length} 个设备`);
    
    allDevices.forEach(device => {
      console.log(`📱 ${device.id} - ${device.name} (${device.type})`);
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误堆栈:', error.stack);
  }
}

testDirectAndroid();