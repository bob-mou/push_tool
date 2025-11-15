import { DeviceManager } from './src/utils/deviceManager.js';
import { DeviceMonitor } from './src/utils/deviceMonitor.js';

async function testDeviceMonitoring() {
  console.log('=== 测试设备监控功能 ===');
  
  const deviceManager = DeviceManager.getInstance();
  const deviceMonitor = DeviceMonitor.getInstance({ 
    pollingInterval: 3000, // 3秒检测一次
    enableADB: true,
    enableIOS: true
  });
  
  console.log('1. 获取当前设备列表...');
  const initialDevices = await deviceManager.getConnectedDevices();
  console.log(`初始设备数量: ${initialDevices.length}`);
  initialDevices.forEach(device => {
    console.log(`  - ${device.id} (${device.name}) - ${device.type}`);
  });
  
  console.log('\n2. 设置设备状态变化监听...');
  deviceMonitor.on('deviceStatusChanged', (event) => {
    console.log(`\n🔔 设备状态变化: ${event.type}`);
    console.log(`   设备: ${event.device.name} (${event.device.id})`);
    console.log(`   时间: ${new Date(event.timestamp).toLocaleTimeString()}`);
  });
  
  deviceMonitor.on('error', (error) => {
    console.error('❌ 设备监控错误:', error.message);
  });
  
  console.log('\n3. 启动设备监控...');
  deviceMonitor.start();
  
  console.log('\n4. 设备监控已启动，请执行以下操作：');
  console.log('   - 断开一个设备，观察控制台输出');
  console.log('   - 重新连接设备，观察控制台输出');
  console.log('   - 按 Ctrl+C 停止测试');
  
  // 每10秒打印一次当前设备状态
  setInterval(async () => {
    const currentDevices = await deviceManager.getConnectedDevices();
    console.log(`\n📊 当前设备状态 (${new Date().toLocaleTimeString()}):`);
    currentDevices.forEach(device => {
      console.log(`   - ${device.id} (${device.name})`);
    });
  }, 10000);
}

// 运行测试
testDeviceMonitoring().catch(console.error);