import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function debugADB() {
  console.log('🔍 调试ADB设备检测...\n');
  
  try {
    console.log('📋 执行 adb devices...');
    const { stdout } = await execPromise('adb devices');
    console.log('📋 原始输出:');
    console.log(`"${stdout}"`);
    
    console.log('\n📋 按行分割:');
    const lines = stdout.split('\n');
    lines.forEach((line, index) => {
      console.log(`行 ${index}: "${line}"`);
    });
    
    console.log('\n📋 过滤后的行:');
    const filteredLines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices') && line.includes('device'));
    filteredLines.forEach((line, index) => {
      console.log(`过滤行 ${index}: "${line}"`);
    });
    
    console.log('\n📋 解析设备:');
    for (const line of filteredLines) {
      const [deviceId, status] = line.split('\t');
      console.log(`设备ID: "${deviceId}", 状态: "${status}"`);
    }
    
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

debugADB();