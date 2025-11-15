import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
// 使用类型断言来处理window和global变量
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
            const settings = await this.getSettings();
            const adbPath = settings.adbPath || 'adb';
            const { stdout } = await execPromise(`"${adbPath}" devices`);
            const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices') && line.includes('device'));
            const devices = [];
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const deviceId = parts[0];
                const status = parts[1];
                if (deviceId && status === 'device') {
                    try {
                        // 获取设备详细信息
                        const modelResult = await execPromise(`"${adbPath}" -s ${deviceId} shell getprop ro.product.model`);
                        const manufacturerResult = await execPromise(`"${adbPath}" -s ${deviceId} shell getprop ro.product.manufacturer`);
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
            const settings = await this.getSettings();
            const iosToolsPath = settings.iosToolsPath || '';
            // 构建idevice_id路径
            const ideviceIdPath = iosToolsPath ?
                path.join(iosToolsPath, 'idevice_id').replace(/\\/g, '/') :
                'idevice_id';
            const { stdout } = await execPromise(`"${ideviceIdPath}" -l`);
            const deviceIds = stdout.split('\n').filter(id => id.trim());
            const devices = [];
            for (const deviceId of deviceIds) {
                try {
                    // 构建ideviceinfo路径
                    const ideviceinfoPath = iosToolsPath ?
                        path.join(iosToolsPath, 'ideviceinfo').replace(/\\/g, '/') :
                        'ideviceinfo';
                    // 获取iOS设备名称
                    const nameResult = await execPromise(`"${ideviceinfoPath}" -u ${deviceId} -k DeviceName`);
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
            const settings = await this.getSettings();
            const adbPath = settings.adbPath || 'adb';
            await execPromise(`"${adbPath}" version`);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    // 检查iOS工具是否可用
    async isIOSToolsAvailable() {
        try {
            const settings = await this.getSettings();
            const iosToolsPath = settings.iosToolsPath || '';
            // 构建idevice_id路径
            const ideviceIdPath = iosToolsPath ?
                path.join(iosToolsPath, 'idevice_id').replace(/\\/g, '/') :
                'idevice_id';
            await execPromise(`"${ideviceIdPath}" -h`);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    // 推送文件到Android设备
    async pushFileToAndroid(deviceId, localPath, remotePath) {
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
            }
            catch (checkError) {
                console.error('文件检查失败:', checkError);
                throw new Error(`无法访问文件: ${normalizedLocalPath}`);
            }
            // 验证Android路径格式
            if (!remotePath.startsWith('/sdcard/') && !remotePath.startsWith('/storage/')) {
                throw new Error('Android路径必须以/sdcard/或/storage/开头');
            }
            // 获取ADB路径配置
            const settings = await this.getSettings();
            const adbPath = settings.adbPath || 'adb';
            console.log(`使用ADB路径: ${adbPath}`);
            // 首先创建远程目录（支持自动创建）
            const mkdirCommand = `"${adbPath}" -s ${deviceId} shell mkdir -p "${remotePath}"`;
            console.log(`创建远程目录: ${mkdirCommand}`);
            await execPromise(mkdirCommand);
            // 验证目录创建成功
            const checkDirCommand = `"${adbPath}" -s ${deviceId} shell ls -la "${remotePath}"`;
            try {
                await execPromise(checkDirCommand);
                console.log(`远程目录验证成功: ${remotePath}`);
            }
            catch (dirError) {
                console.warn(`远程目录验证警告: ${dirError}`);
            }
            // 推送文件
            const fileName = path.basename(normalizedLocalPath);
            const targetPath = `${remotePath.replace(/\/$/, '')}/${fileName}`;
            console.log(`开始推送文件: ${normalizedLocalPath} -> ${targetPath}`);
            // 检查目标文件是否已存在
            // 使用已有的adbPath变量
            const checkFileCommand = `"${adbPath}" -s ${deviceId} shell ls "${targetPath}" 2>/dev/null`;
            try {
                await execPromise(checkFileCommand);
                console.log(`目标文件已存在，将覆盖: ${targetPath}`);
            }
            catch {
                // 文件不存在，正常推送
            }
            const pushCommand = `"${adbPath}" -s ${deviceId} push "${normalizedLocalPath}" "${targetPath}"`;
            await execPromise(pushCommand);
            console.log(`文件推送成功: ${normalizedLocalPath} -> ${targetPath}`);
            // 验证文件推送结果
            const verifyCommand = `"${adbPath}" -s ${deviceId} shell ls -la "${targetPath}"`;
            try {
                const verifyResult = await execPromise(verifyCommand);
                console.log(`文件验证成功: ${verifyResult.stdout}`);
            }
            catch (verifyError) {
                console.warn(`文件验证警告: ${verifyError}`);
            }
        }
        catch (error) {
            console.error('Android文件推送失败:', error);
            throw new Error(`推送失败: ${error.message}`);
        }
    }
    // 推送文件到iOS设备
    async pushFileToIOS(deviceId, localPath, remotePath) {
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
            }
            catch (checkError) {
                console.error('文件检查失败:', checkError);
                throw new Error(`无法访问文件: ${normalizedLocalPath}`);
            }
            // 验证iOS路径格式
            if (!remotePath.startsWith('/Documents/') && !remotePath.startsWith('/Library/')) {
                throw new Error('iOS路径必须以/Documents/或/Library/开头');
            }
            // 获取iOS工具路径配置
            let iosToolsPath = '';
            try {
                const iosSettings = await this.getSettings();
                iosToolsPath = iosSettings.iosToolsPath || '';
            }
            catch (settingsError) {
                console.warn('无法获取iOS工具路径配置，使用系统默认路径:', settingsError);
            }
            // 构建iOS工具命令路径
            const idevicefsPath = iosToolsPath ?
                path.join(iosToolsPath, 'idevicefs').replace(/\\/g, '/') :
                'idevicefs';
            console.log(`使用iOS工具路径: ${idevicefsPath}`);
            // 首先检查iOS工具是否可用 - 这是关键步骤
            try {
                await execPromise(`"${idevicefsPath}" --help`);
                console.log(`✅ iOS工具验证成功: ${idevicefsPath}`);
            }
            catch (toolError) {
                console.error('❌ iOS工具不可用:', toolError);
                throw new Error(`iOS文件传输工具不可用: ${idevicefsPath}。请在设置中配置正确的iOS工具路径，或确保libimobiledevice工具包已正确安装。`);
            }
            // 验证设备连接
            try {
                await execPromise(`"${idevicefsPath}" -u ${deviceId} ls "/"`);
                console.log(`✅ iOS设备连接验证成功: ${deviceId}`);
            }
            catch (deviceError) {
                console.error('❌ iOS设备连接验证失败:', deviceError);
                throw new Error(`无法连接到iOS设备: ${deviceId}。请确保设备已连接并信任此电脑。`);
            }
            // 首先创建远程目录
            const mkdirCommand = `"${idevicefsPath}" -u ${deviceId} mkdir "${remotePath}"`;
            console.log(`创建iOS远程目录: ${mkdirCommand}`);
            try {
                await execPromise(mkdirCommand);
            }
            catch (mkdirError) {
                // 目录可能已存在，继续执行
                console.log(`⏭️ 目录可能已存在，继续推送: ${mkdirError.message}`);
            }
            // 推送文件
            const fileName = path.basename(normalizedLocalPath);
            const targetPath = `${remotePath.replace(/\/$/, '')}/${fileName}`;
            console.log(`开始推送iOS文件: ${normalizedLocalPath} -> ${targetPath}`);
            // 使用配置的iOS工具路径推送文件
            const pushCommand = `"${idevicefsPath}" -u ${deviceId} put "${normalizedLocalPath}" "${targetPath}"`;
            const pushResult = await execPromise(pushCommand);
            console.log(`✅ iOS文件推送成功: ${normalizedLocalPath} -> ${targetPath}`);
            console.log('推送结果:', pushResult.stdout || '无输出');
            // 严格验证文件推送结果 - 这是防止假成功的关键
            console.log('🔍 验证文件传输结果...');
            const verifyCommand = `"${idevicefsPath}" -u ${deviceId} ls "${targetPath}"`;
            try {
                const verifyResult = await execPromise(verifyCommand);
                console.log(`✅ iOS文件验证成功: ${verifyResult.stdout.trim()}`);
                // 额外验证：检查文件大小
                const localStats = fs.statSync(normalizedLocalPath);
                const lsCommand = `"${idevicefsPath}" -u ${deviceId} ls -la "${targetPath}"`;
                const lsResult = await execPromise(lsCommand);
                console.log(`远程文件详情: ${lsResult.stdout.trim()}`);
                // 如果验证输出为空或包含错误，则抛出异常
                if (!verifyResult.stdout || verifyResult.stdout.trim().length === 0) {
                    throw new Error('文件验证失败：远程文件不存在或为空');
                }
            }
            catch (verifyError) {
                console.error('❌ iOS文件验证失败:', verifyError);
                throw new Error(`文件推送验证失败: ${verifyError.message}`);
            }
        }
        catch (error) {
            console.error('❌ iOS文件推送失败:', error);
            throw new Error(`iOS推送失败: ${error.message}`);
        }
    }
    // 获取设置配置
    async getSettings() {
        try {
            // 检查是否在Electron渲染进程中
            const w = globalThis.window;
            if (w && w.electronAPI) {
                return await w.electronAPI.getSettings();
            }
            // 检查是否在Node.js环境中
            const g = globalThis.global || globalThis;
            if (g && g.electronAPI) {
                return await g.electronAPI.getSettings();
            }
            // 降级到默认值（用于测试和独立运行）
            return {
                iosToolsPath: '',
                adbPath: ''
            };
        }
        catch (error) {
            console.warn('无法获取设置，使用默认值:', error);
            return {
                iosToolsPath: '',
                adbPath: ''
            };
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
