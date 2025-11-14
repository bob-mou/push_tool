import { DeviceManager } from './dist-electron/src/utils/deviceManager.js';

async function testFilePush() {
  const deviceManager = DeviceManager.getInstance();
  
  try {
    console.log('Testing file push with Chinese filename...');
    
    // Test pushing to Android device with Chinese filename
    const deviceId = '31014575740020Z';
    const localPath = 'f:/ProgramPlace/Company/UC/file-tool/files_push/回复消息模板.txt';
    const targetDir = '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/';
    
    console.log('Pushing file:', localPath);
    console.log('To device:', deviceId);
    console.log('Target directory:', targetDir);
    
    await deviceManager.pushFileToAndroid(deviceId, localPath, targetDir);
    
    console.log('File push successful!');
  } catch (error) {
    console.error('File push failed:', error.message);
  }
}

testFilePush();