// 测试设备监控功能的脚本
import { DeviceMonitor } from './dist-electron/src/utils/deviceMonitor.js';

async function testDeviceMonitor() {
  console.log('🧪 测试设备监控功能...\n');
  
  const monitor = DeviceMonitor.getInstance({
    pollingInterval: 1000, // 1秒轮询一次，便于测试
    maxRetries: 2
  });
  
  // 监听设备状态变化
  monitor.on('deviceStatusChanged', (event) => {
    console.log('📱 设备状态变化:', {
      类型: event.type === 'connected' ? '连接' : '断开',
      设备: event.device.name,
      ID: event.device.id,
      类型: event.device.type,
      时间: new Date(event.timestamp).toLocaleTimeString()
    });
  });
  
  // 监听错误
  monitor.on('error', (error) => {
    console.error('❌ 监控错误:', error.message);
  });
  
  console.log('📊 当前配置:', monitor.getConfig());
  
  // 获取初始设备列表
  console.log('🔍 获取初始设备列表...');
  const initialDevices = await monitor.getCurrentDevices();
  console.log(`✅ 发现 ${initialDevices.length} 个设备`);
  initialDevices.forEach(device => {
    console.log(`  - ${device.name} (${device.type})`);
  });
  
  // 启动监控
  console.log('\n▶️ 启动设备监控...');
  monitor.start();
  
  console.log('⏳ 监控已启动，请连接或断开设备来测试状态变化...');
  console.log('按 Ctrl+C 停止监控\n');
  
  // 运行30秒后自动停止
  setTimeout(() => {
    console.log('\n⏹️ 停止设备监控...');
    monitor.stop();
    console.log('✅ 测试完成');
    process.exit(0);
  }, 30000);
}

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n⏹️ 收到中断信号，停止监控...');
  const monitor = DeviceMonitor.getInstance();
  monitor.stop();
  console.log('✅ 已停止');
  process.exit(0);
});

// 运行测试
testDeviceMonitor().catch(console.error);