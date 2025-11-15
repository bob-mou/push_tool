// 测试设备断开检测
const { DeviceMonitor } = require('./dist/utils/deviceMonitor.js');
const { DeviceManager } = require('./dist/utils/deviceManager.js');

async function testDeviceMonitoring() {
  console.log('=== 开始测试设备监控 ===');
  
  const deviceManager = DeviceManager.getInstance();
  const deviceMonitor = DeviceMonitor.getInstance({ pollingInterval: 1000 });
  
  // 监听设备状态变化
  deviceMonitor.on('deviceStatusChanged', (event) => {
    console.log('设备状态变化事件:', event);
  });
  
  deviceMonitor.on('error', (error) => {
    console.error('设备监控错误:', error);
  });
  
  // 启动监控
  deviceMonitor.start();
  
  // 每5秒打印一次当前设备列表
  setInterval(async () => {
    const devices = await deviceManager.getConnectedDevices();
    console.log('当前设备:', devices.map(d => `${d.id} (${d.name})`));
  }, 5000);
  
  console.log('设备监控已启动，请连接/断开设备测试...');
  console.log('按 Ctrl+C 停止测试');
}

// 运行测试
if (require.main === module) {
  testDeviceMonitoring().catch(console.error);
}