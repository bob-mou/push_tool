import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execPromise = promisify(exec);

export interface Device {
  id: string;
  name: string;
  type: 'android' | 'ios';
  status: 'connected' | 'disconnected';
  model?: string;
  manufacturer?: string;
}

export class DeviceManager {
  private static instance: DeviceManager;

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  // 获取Android设备列表
  private async getAndroidDevices(): Promise<Device[]> {
    try {
      const { stdout } = await execPromise('adb devices');
      const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
      
      const devices: Device[] = [];
      
      for (const line of lines) {
        const [deviceId, status] = line.split('\t');
        if (deviceId && status === 'device') {
          try {
            // 获取设备详细信息
            const modelResult = await execPromise(`adb -s ${deviceId} shell getprop ro.product.model`);
            const manufacturerResult = await execPromise(`adb -s ${deviceId} shell getprop ro.product.manufacturer`);
            
            devices.push({
              id: deviceId,
              name: `${manufacturerResult.stdout.trim()} ${modelResult.stdout.trim()}`,
              type: 'android',
              status: 'connected',
              model: modelResult.stdout.trim(),
              manufacturer: manufacturerResult.stdout.trim()
            });
          } catch (error) {
            // 如果获取详细信息失败，使用设备ID作为名称
            devices.push({
              id: deviceId,
              name: deviceId,
              type: 'android',
              status: 'connected'
            });
          }
        }
      }
      
      return devices;
    } catch (error) {
      console.error('获取Android设备失败:', error);
      return [];
    }
  }

  // 获取iOS设备列表（使用idevice_id）
  private async getIOSDevices(): Promise<Device[]> {
    try {
      const { stdout } = await execPromise('idevice_id -l');
      const deviceIds = stdout.split('\n').filter(id => id.trim());
      
      const devices: Device[] = [];
      
      for (const deviceId of deviceIds) {
        try {
          // 获取iOS设备名称
          const nameResult = await execPromise(`ideviceinfo -u ${deviceId} -k DeviceName`);
          devices.push({
            id: deviceId,
            name: nameResult.stdout.trim() || `iOS Device ${deviceId}`,
            type: 'ios',
            status: 'connected'
          });
        } catch (error) {
          devices.push({
            id: deviceId,
            name: `iOS Device ${deviceId}`,
            type: 'ios',
            status: 'connected'
          });
        }
      }
      
      return devices;
    } catch (error) {
      console.error('获取iOS设备失败:', error);
      return [];
    }
  }

  // 获取所有连接的设备
  async getConnectedDevices(): Promise<Device[]> {
    const [androidDevices, iosDevices] = await Promise.all([
      this.getAndroidDevices(),
      this.getIOSDevices()
    ]);
    
    return [...androidDevices, ...iosDevices];
  }

  // 检查ADB是否可用
  async isADBAvailable(): Promise<boolean> {
    try {
      await execPromise('adb version');
      return true;
    } catch (error) {
      return false;
    }
  }

  // 检查iOS工具是否可用
  async isIOSToolsAvailable(): Promise<boolean> {
    try {
      await execPromise('idevice_id -h');
      return true;
    } catch (error) {
      return false;
    }
  }

  // 推送文件到Android设备
  async pushFileToAndroid(deviceId: string, localPath: string, remotePath: string): Promise<void> {
    try {
      // 标准化路径，处理Windows路径分隔符
      let normalizedLocalPath = localPath.replace(/\\/g, '/');
      if (!path.isAbsolute(normalizedLocalPath)) {
        normalizedLocalPath = path.resolve(process.cwd(), normalizedLocalPath).replace(/\\/g, '/');
      }
      
      // 检查文件路径是否存在（避免编码错误）
      try {
        const fs = require('fs');
        if (!fs.existsSync(normalizedLocalPath)) {
          throw new Error(`文件不存在: ${normalizedLocalPath}`);
        }
      } catch (checkError) {
        console.error('文件检查失败:', checkError);
        throw new Error(`无法访问文件: ${normalizedLocalPath}`);
      }
      
      // 验证Android路径格式
      if (!remotePath.startsWith('/sdcard/') && !remotePath.startsWith('/storage/')) {
        throw new Error('Android路径必须以/sdcard/或/storage/开头');
      }
      
      // 首先创建远程目录（支持自动创建）
      const mkdirCommand = `adb -s ${deviceId} shell mkdir -p "${remotePath}"`;
      console.log(`创建远程目录: ${mkdirCommand}`);
      await execPromise(mkdirCommand);
      
      // 验证目录创建成功
      const checkDirCommand = `adb -s ${deviceId} shell ls -la "${remotePath}"`;
      try {
        await execPromise(checkDirCommand);
        console.log(`远程目录验证成功: ${remotePath}`);
      } catch (dirError) {
        console.warn(`远程目录验证警告: ${dirError}`);
      }
      
      // 推送文件
      const fileName = path.basename(normalizedLocalPath);
      const targetPath = `${remotePath.replace(/\/$/, '')}/${fileName}`;
      
      console.log(`开始推送文件: ${normalizedLocalPath} -> ${targetPath}`);
      
      // 检查目标文件是否已存在
      const checkFileCommand = `adb -s ${deviceId} shell ls "${targetPath}" 2>/dev/null`;
      try {
        await execPromise(checkFileCommand);
        console.log(`目标文件已存在，将覆盖: ${targetPath}`);
      } catch {
        // 文件不存在，正常推送
      }
      
      const pushCommand = `adb -s ${deviceId} push "${normalizedLocalPath}" "${targetPath}"`;
      await execPromise(pushCommand);
      
      console.log(`文件推送成功: ${normalizedLocalPath} -> ${targetPath}`);
      
      // 验证文件推送结果
      const verifyCommand = `adb -s ${deviceId} shell ls -la "${targetPath}"`;
      try {
        const verifyResult = await execPromise(verifyCommand);
        console.log(`文件验证成功: ${verifyResult.stdout}`);
      } catch (verifyError) {
        console.warn(`文件验证警告: ${verifyError}`);
      }
      
    } catch (error) {
      console.error('Android文件推送失败:', error);
      throw new Error(`推送失败: ${(error as any).message}`);
    }
  }

  // 推送文件到iOS设备
  async pushFileToIOS(deviceId: string, localPath: string, remotePath: string): Promise<void> {
    try {
      // 标准化路径，处理Windows路径分隔符
      let normalizedLocalPath = localPath.replace(/\\/g, '/');
      if (!path.isAbsolute(normalizedLocalPath)) {
        normalizedLocalPath = path.resolve(process.cwd(), normalizedLocalPath).replace(/\\/g, '/');
      }
      
      // 检查文件路径是否存在
      try {
        const fs = require('fs');
        if (!fs.existsSync(normalizedLocalPath)) {
          throw new Error(`文件不存在: ${normalizedLocalPath}`);
        }
      } catch (checkError) {
        console.error('文件检查失败:', checkError);
        throw new Error(`无法访问文件: ${normalizedLocalPath}`);
      }
      
      // 验证iOS路径格式
      if (!remotePath.startsWith('/Documents/') && !remotePath.startsWith('/Library/')) {
        throw new Error('iOS路径必须以/Documents/或/Library/开头');
      }
      
      // 首先创建远程目录
      const mkdirCommand = `idevicefs -u ${deviceId} mkdir "${remotePath}"`;
      console.log(`创建iOS远程目录: ${mkdirCommand}`);
      try {
        await execPromise(mkdirCommand);
      } catch (mkdirError) {
        // 目录可能已存在，继续执行
        console.log(`目录可能已存在: ${mkdirError}`);
      }
      
      // 推送文件
      const fileName = path.basename(normalizedLocalPath);
      const targetPath = `${remotePath.replace(/\/$/, '')}/${fileName}`;
      
      console.log(`开始推送iOS文件: ${normalizedLocalPath} -> ${targetPath}`);
      
      // 使用idevicefs推送文件
      const pushCommand = `idevicefs -u ${deviceId} put "${normalizedLocalPath}" "${targetPath}"`;
      await execPromise(pushCommand);
      
      console.log(`iOS文件推送成功: ${normalizedLocalPath} -> ${targetPath}`);
      
      // 验证文件推送结果
      const verifyCommand = `idevicefs -u ${deviceId} ls "${targetPath}"`;
      try {
        const verifyResult = await execPromise(verifyCommand);
        console.log(`iOS文件验证成功: ${verifyResult.stdout}`);
      } catch (verifyError) {
        console.warn(`iOS文件验证警告: ${verifyError}`);
      }
      
    } catch (error) {
      console.error('iOS文件推送失败:', error);
      throw new Error(`iOS推送失败: ${(error as any).message}`);
    }
  }

  // 安装APK到Android设备
  async installAPK(deviceId: string, apkPath: string): Promise<void> {
    try {
      await execPromise(`adb -s ${deviceId} install -r "${apkPath}"`);
      console.log(`APK安装成功: ${apkPath}`);
    } catch (error) {
      console.error('APK安装失败:', error);
      throw new Error(`安装失败: ${(error as any).message}`);
    }
  }

  // 获取设备屏幕截图
  async takeScreenshot(deviceId: string, outputPath: string): Promise<void> {
    try {
      const timestamp = Date.now();
      const tempPath = `/sdcard/screenshot_${timestamp}.png`;
      
      await execPromise(`adb -s ${deviceId} shell screencap -p ${tempPath}`);
      await execPromise(`adb -s ${deviceId} pull ${tempPath} "${outputPath}"`);
      await execPromise(`adb -s ${deviceId} shell rm ${tempPath}`);
      
      console.log(`截图保存成功: ${outputPath}`);
    } catch (error) {
      console.error('截图失败:', error);
      throw new Error(`截图失败: ${(error as any).message}`);
    }
  }
}
