// 测试完整的文件传输流程，包括路径验证
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);

// 简化的传输路径管理器（复制自实际实现）
class TransferPathManager {
  getDefaultPath(deviceType) {
    const defaultPaths = {
      android: '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/',
      ios: '/Documents/BattleRecord/'
    };
    return defaultPaths[deviceType] || defaultPaths.android;
  }

  validatePath(path, deviceType) {
    if (!path || typeof path !== 'string') {
      return { valid: false, error: '路径不能为空' };
    }

    const trimmedPath = path.trim();
    if (trimmedPath.length === 0) {
      return { valid: false, error: '路径不能为空' };
    }

    if (!trimmedPath.startsWith('/')) {
      return { valid: false, error: '路径必须以/开头' };
    }

    if (deviceType === 'android') {
      if (!trimmedPath.startsWith('/sdcard/') && !trimmedPath.startsWith('/storage/')) {
        return { valid: false, error: 'Android路径必须以/sdcard/或/storage/开头' };
      }
    } else if (deviceType === 'ios') {
      if (!trimmedPath.startsWith('/Documents/') && !trimmedPath.startsWith('/Library/')) {
        return { valid: false, error: 'iOS路径必须以/Documents/或/Library/开头' };
      }
    }

    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(trimmedPath)) {
      return { valid: false, error: '路径包含非法字符' };
    }

    if (trimmedPath.length > 1000) {
      return { valid: false, error: '路径过长' };
    }

    return { valid: true };
  }

  normalizePath(path) {
    if (!path || typeof path !== 'string') {
      return '/';
    }

    let normalized = path.trim();
    normalized = normalized.replace(/\/+/g, '/');
    
    if (!normalized.endsWith('/')) {
      normalized += '/';
    }
    
    return normalized;
  }

  generateTargetPath(sourcePath, targetDir) {
    if (!sourcePath || !targetDir) {
      return null;
    }

    const fileName = sourcePath.split(/[/\\]/).pop();
    if (!fileName) {
      return null;
    }

    const normalizedTargetDir = this.normalizePath(targetDir);
    return normalizedTargetDir + fileName;
  }
}

async function testCompleteTransferFlow() {
  console.log('🧪 测试完整文件传输流程...\n');
  
  const transferPathManager = new TransferPathManager();
  
  // 获取连接的设备
  console.log('📱 1. 检测设备连接...');
  try {
    const { stdout: devicesOutput } = await execPromise('adb devices');
    const devices = devicesOutput
      .split('\n')
      .slice(1)
      .filter(line => line.includes('device') && !line.includes('List of devices'))
      .map(line => line.split('\t')[0].trim())
      .filter(id => id.length > 0);

    if (devices.length === 0) {
      console.log('❌ 没有找到连接的设备');
      return;
    }
    
    console.log(`✅ 发现 ${devices.length} 个设备: ${devices.join(', ')}`);
    
    // 使用第一个设备进行测试
    const testDevice = devices[0];
    console.log(`🎯 使用设备: ${testDevice}`);
    
    // 测试路径配置
    console.log('\n📍 2. 测试传输路径配置...');
    const androidPath = transferPathManager.getDefaultPath('android');
    console.log(`Android默认路径: ${androidPath}`);
    
    const pathValidation = transferPathManager.validatePath(androidPath, 'android');
    console.log(`路径验证结果: ${pathValidation.valid ? '✅ 有效' : `❌ 无效 - ${pathValidation.error}`}`);
    
    // 创建测试文件
    console.log('\n📝 3. 创建测试文件...');
    const testFileName = '传输测试_战报_20241113.txt';
    const testFileContent = `战报测试文件
生成时间: ${new Date().toLocaleString()}
测试设备: ${testDevice}
目标路径: ${androidPath}`;
    
    fs.writeFileSync(testFileName, testFileContent, 'utf8');
    console.log(`✅ 创建测试文件: ${testFileName}`);
    
    // 验证目标路径并创建目录
    console.log('\n🔧 4. 验证并创建目标目录...');
    const normalizedPath = transferPathManager.normalizePath(androidPath);
    
    try {
      await execPromise(`adb -s ${testDevice} shell mkdir -p "${normalizedPath}"`);
      console.log(`✅ 创建目录成功: ${normalizedPath}`);
      
      // 验证目录存在
      await execPromise(`adb -s ${testDevice} shell ls -la "${normalizedPath}"`);
      console.log(`✅ 目录验证成功`);
    } catch (error) {
      console.log(`❌ 目录操作失败: ${error.message}`);
      return;
    }
    
    // 执行文件传输
    console.log('\n📤 5. 执行文件传输...');
    const targetFilePath = transferPathManager.generateTargetPath(testFileName, normalizedPath);
    console.log(`目标文件路径: ${targetFilePath}`);
    
    try {
      const startTime = Date.now();
      
      // 使用ADB推送文件
      const pushCommand = `adb -s ${testDevice} push "${testFileName}" "${targetFilePath}"`;
      console.log(`执行命令: ${pushCommand}`);
      
      const { stdout, stderr } = await execPromise(pushCommand);
      const duration = Date.now() - startTime;
      
      console.log(`✅ 文件传输成功 (${duration}ms)`);
      if (stdout) console.log(`输出: ${stdout}`);
      if (stderr) console.log(`错误输出: ${stderr}`);
      
      // 验证文件传输结果
      console.log('\n🔍 6. 验证传输结果...');
      try {
        const { stdout: lsOutput } = await execPromise(`adb -s ${testDevice} shell ls -la "${targetFilePath}"`);
        console.log(`✅ 文件存在验证成功:`);
        console.log(lsOutput);
        
        // 验证文件内容
        const { stdout: contentOutput } = await execPromise(`adb -s ${testDevice} shell cat "${targetFilePath}"`);
        console.log(`✅ 文件内容验证成功:`);
        console.log('文件内容预览:');
        console.log(contentOutput.split('\n').slice(0, 3).join('\n'));
        
      } catch (verifyError) {
        console.log(`❌ 文件验证失败: ${verifyError.message}`);
      }
      
      // 清理测试文件
      console.log('\n🧹 7. 清理测试文件...');
      try {
        fs.unlinkSync(testFileName);
        console.log(`✅ 本地测试文件已删除: ${testFileName}`);
        
        await execPromise(`adb -s ${testDevice} shell rm "${targetFilePath}"`);
        console.log(`✅ 远程测试文件已删除: ${targetFilePath}`);
      } catch (cleanupError) {
        console.log(`⚠️  清理文件时出错: ${cleanupError.message}`);
      }
      
      console.log('\n🎉 完整传输流程测试完成!');
      
    } catch (transferError) {
      console.log(`❌ 文件传输失败: ${transferError.message}`);
      
      // 清理本地测试文件
      try {
        fs.unlinkSync(testFileName);
      } catch (e) {
        // 忽略清理错误
      }
    }
    
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
  }
}

// 运行测试
testCompleteTransferFlow().catch(console.error);