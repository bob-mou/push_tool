import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
const execPromise = promisify(exec);
export class DeviceManager {
    static getInstance() {
        if (!DeviceManager.instance) {
            DeviceManager.instance = new DeviceManager();
        }
        return DeviceManager.instance;
    }
    // 获取Android设备列表
    async getAndroidDevices() {
        try {
            const { stdout } = await execPromise('adb devices');
            const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
            const devices = [];
            for (const line of lines) {
                const [deviceId, status] = line.split(/\s+/);
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
                    }
                    catch (error) {
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
        }
        catch (error) {
            console.error('获取Android设备失败:', error);
            return [];
        }
    }
    // 获取iOS设备列表（使用idevice_id）
    async getIOSDevices() {
        try {
            const { stdout } = await execPromise('idevice_id -l');
            const deviceIds = stdout.split('\n').filter(id => id.trim()).map(id => id.trim());
            const devices = [];
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
                }
                catch (error) {
                    devices.push({
                        id: deviceId,
                        name: `iOS Device ${deviceId}`,
                        type: 'ios',
                        status: 'connected'
                    });
                }
            }
            return devices;
        }
        catch (error) {
            console.error('获取iOS设备失败:', error);
            return [];
        }
    }
    // 获取所有连接的设备
    async getConnectedDevices() {
        const [androidDevices, iosDevices] = await Promise.all([
            this.getAndroidDevices(),
            this.getIOSDevices()
        ]);
        return [...androidDevices, ...iosDevices];
    }
    // 检查ADB是否可用
    async isADBAvailable() {
        try {
            await execPromise('adb version');
            return true;
        }
        catch (error) {
            return false;
        }
    }
    // 检查iOS工具是否可用
    async isIOSToolsAvailable() {
        try {
            await execPromise('idevice_id -h');
            return true;
        }
        catch (error) {
            return false;
        }
    }
    // 推送文件到Android设备
    async pushFileToAndroid(deviceId, localPath, remotePath) {
        try {
            let normalizedPath = localPath.replace(/\\/g, '/');
            if (!path.isAbsolute(normalizedPath)) {
                normalizedPath = path.resolve(process.cwd(), normalizedPath).replace(/\\/g, '/');
            }
            const fs = await import('fs');
            if (!fs.existsSync(normalizedPath)) {
                throw new Error(`文件不存在: ${normalizedPath}`);
            }
            await execPromise(`adb -s ${deviceId} shell mkdir -p "${remotePath}"`);
            const fileName = path.basename(normalizedPath);
            const targetPath = `${remotePath.replace(/\/$/, '')}/${fileName}`;
            await execPromise(`adb -s ${deviceId} push -a "${normalizedPath}" "${targetPath}"`);
            console.log(`文件推送成功: ${normalizedPath} -> ${targetPath}`);
        }
        catch (error) {
            console.error('Android文件推送失败:', error);
            throw new Error(`推送失败: ${error.message}`);
        }
    }
    // 推送文件到iOS设备
    async pushFileToIOS(_deviceId, localPath, remotePath) {
        try {
            // 检查是否有可用的iOS文件传输工具
            const tools = ['idevicefs', 'ifuse', 'afc2-client'];
            let availableTool = null;
            
            for (const tool of tools) {
                try {
                    await execPromise(`which ${tool}`);
                    availableTool = tool;
                    break;
                } catch {
                    // Tool not available, continue checking
                }
            }
            
            if (!availableTool) {
                throw new Error('未找到可用的iOS文件传输工具。请安装 idevicefs, ifuse 或 afc2-client。');
            }
            
            const fileName = path.basename(localPath);
            const targetPath = `${remotePath}/${fileName}`;
            
            // 根据可用工具选择不同的命令
            let command;
            switch (availableTool) {
                case 'idevicefs':
                    command = `idevicefs put "${localPath}" "${targetPath}"`;
                    break;
                case 'ifuse':
                    // 使用ifuse挂载设备并复制文件
                    throw new Error('ifuse 支持尚未实现');
                case 'afc2-client':
                    command = `afc2-client put "${localPath}" "${targetPath}"`;
                    break;
                default:
                    throw new Error(`不支持的工具: ${availableTool}`);
            }
            
            await execPromise(command);
            console.log(`iOS文件推送成功: ${localPath} -> ${targetPath}`);
        }
        catch (error) {
            console.error('iOS文件推送失败:', error);
            throw new Error(`iOS推送失败: ${error.message}`);
        }
    }
    // 安装APK到Android设备
    async installAPK(deviceId, apkPath) {
        try {
            await execPromise(`adb -s ${deviceId} install -r "${apkPath}"`);
            console.log(`APK安装成功: ${apkPath}`);
        }
        catch (error) {
            console.error('APK安装失败:', error);
            throw new Error(`安装失败: ${error.message}`);
        }
    }
    // 获取设备屏幕截图
    async takeScreenshot(deviceId, outputPath) {
        try {
            const timestamp = Date.now();
            const tempPath = `/sdcard/screenshot_${timestamp}.png`;
            await execPromise(`adb -s ${deviceId} shell screencap -p ${tempPath}`);
            await execPromise(`adb -s ${deviceId} pull ${tempPath} "${outputPath}"`);
            await execPromise(`adb -s ${deviceId} shell rm ${tempPath}`);
            console.log(`截图保存成功: ${outputPath}`);
        }
        catch (error) {
            console.error('截图失败:', error);
            throw new Error(`截图失败: ${error.message}`);
        }
    }
}
