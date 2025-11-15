import { DeviceManager } from './dist-electron/src/utils/deviceManager.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function debugAndroidDetailed() {
  console.log('🔍 详细调试安卓设备检测...\n');
  
  const deviceManager = DeviceManager.getInstance();
  
  try {
    console.log('🔍 获取设置...');
    const settings = await deviceManager.getSettings();
    console.log('✅ 设置:', settings);
    
    const adbPath = settings.adbPath || 'adb';
    console.log(`✅ ADB路径: ${adbPath}`);
    
    console.log('\n📋 执行 adb devices...');
    
    const { stdout } = await execPromise(`"${adbPath}" devices`);
    console.log('📋 原始输出:');
    console.log(stdout);
    
    console.log('\n📋 行处理:');
    const lines = stdout.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.includes('List of devices') && trimmed.includes('device')) {
        console.log(`✅ 有效行 ${index}: "${trimmed}"`);
        const parts = trimmed.split(/\s+/);
        console.log(`   分割结果:`, parts);
        if (parts.length >= 2) {
          console.log(`   设备ID: "${parts[0]}", 状态: "${parts[1]}"`);
        }
      } else {
        console.log(`❌ 跳过行 ${index}: "${trimmed}"`);
      }
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

debugAndroidDetailed();