const { DeviceManager } = require('./dist/utils/deviceManager.js');
const deviceManager = DeviceManager.getInstance();

deviceManager.getConnectedDevices().then(devices => {
  console.log('当前连接的设备:');
  devices.forEach(device => {
    console.log(`  - ${device.id} (${device.name}) - ${device.type}`);
  });
}).catch(console.error);