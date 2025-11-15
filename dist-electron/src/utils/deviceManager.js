import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
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
            console.log('🔍 [DeviceManager] 开始获取Android设备...');
            const settings = await this.getSettings();
            const adbPath = settings.adbPath || 'adb';
            const { stdout } = await execPromise(`"${adbPath}" devices`);
            console.log('📋 [DeviceManager] ADB输出:', stdout);
            const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
            console.log('📋 [DeviceManager] 处理行数:', lines.length);
            const devices = [];
            for (const line of lines) {
                console.log('📋 [DeviceManager] 处理行:', line);
                const parts = line.trim().split(/\s+/);
                const deviceId = parts[0];
                const status = parts[1];
                console.log(`📋 [DeviceManager] 设备ID: ${deviceId}, 状态: ${status}`);
                if (deviceId && status === 'device') {
                    try {
                        console.log(`📋 [DeviceManager] 获取设备 ${deviceId} 详细信息...`);
                        const modelResult = await execPromise(`"${adbPath}" -s ${deviceId} shell getprop ro.product.model`);
                        const manufacturerResult = await execPromise(`"${adbPath}" -s ${deviceId} shell getprop ro.product.manufacturer`);
                        const device = {
                            id: deviceId,
                            name: `${manufacturerResult.stdout.trim()} ${modelResult.stdout.trim()}`,
                            type: 'android',
                            status: 'connected',
                            model: modelResult.stdout.trim(),
                            manufacturer: manufacturerResult.stdout.trim()
                        };
                        console.log('📋 [DeviceManager] 发现设备:', device);
                        devices.push(device);
                    }
                    catch (error) {
                        console.warn(`⚠️ [DeviceManager] 获取设备 ${deviceId} 详细信息失败:`, error);
                        devices.push({
                            id: deviceId,
                            name: deviceId,
                            type: 'android',
                            status: 'connected'
                        });
                    }
                }
            }
            console.log(`📋 [DeviceManager] 最终发现 ${devices.length} 个Android设备`);
            return devices;
        }
        catch (error) {
            console.error('❌ [DeviceManager] 获取Android设备失败:', error);
            return [];
        }
    }
    // 获取iOS设备列表（使用idb）
    async getIOSDevices() {
        try {
            const idbPath = await this.getIdbPath();
            try {
                const { stdout } = await execPromise(`"${idbPath}" list-targets --format=json`);
                const arr = JSON.parse(stdout);
                const devices = (Array.isArray(arr) ? arr : []).filter((t) => {
                    return String(t?.target_type || t?.type || '').toLowerCase() === 'device' || Boolean(t?.is_physical_device);
                }).map((t) => ({
                    id: String(t?.udid || t?.identifier || t?.name || ''),
                    name: String(t?.name || t?.udid || 'iOS Device'),
                    type: 'ios',
                    status: 'connected'
                }));
                return devices.filter(d => d.id);
            }
            catch {
                try {
                    const { stdout } = await execPromise(`"${idbPath}" list-targets`);
                    const lines = String(stdout || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                    const devices = lines.map(l => ({ id: l.split(/\s+/)[0] || l, name: l, type: 'ios', status: 'connected' }));
                    return devices;
                }
                catch (e) {
                    console.error('获取iOS设备失败(idb):', e);
                    return [];
                }
            }
        }
        catch (error) {
            console.error('获取iOS设备失败:', error);
            return [];
        }
    }
    // 获取所有连接的设备
    async getConnectedDevices() {
        console.log('🔍 [DeviceManager] 开始获取所有连接的设备...');
        try {
            const [androidDevices, iosDevices] = await Promise.all([
                this.getAndroidDevices(),
                this.getIOSDevices()
            ]);
            const allDevices = [...androidDevices, ...iosDevices];
            console.log(`🔍 [DeviceManager] 总共发现 ${allDevices.length} 个设备`);
            return allDevices;
        }
        catch (error) {
            console.error('❌ [DeviceManager] 获取设备列表失败:', error);
            return [];
        }
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
            const idbPath = await this.getIdbPath();
            await execPromise(`"${idbPath}" version`);
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
            let fsLocalPath = path.normalize(localPath);
            if (!path.isAbsolute(fsLocalPath)) {
                fsLocalPath = path.resolve(process.cwd(), fsLocalPath);
            }
            let normalizedLocalPath = fsLocalPath.replace(/\\/g, '/');
            if (!fs.existsSync(fsLocalPath)) {
                throw new Error(`文件不存在: ${fsLocalPath}`);
            }
            {
                let ok = false;
                let lastErr = null;
                for (let i = 0; i < 5; i++) {
                    try {
                        fs.accessSync(fsLocalPath, fs.constants.R_OK);
                        ok = true;
                        break;
                    }
                    catch (e) {
                        lastErr = e;
                        await new Promise(r => setTimeout(r, 200 * Math.pow(2, i)));
                    }
                }
                if (!ok) {
                    console.error('文件检查失败:', lastErr);
                    throw new Error(`无法访问文件: ${fsLocalPath} ${lastErr?.message ? '(' + String(lastErr.message) + ')' : ''}`);
                }
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
            let fsLocalPath = path.normalize(localPath);
            if (!path.isAbsolute(fsLocalPath)) {
                fsLocalPath = path.resolve(process.cwd(), fsLocalPath);
            }
            let normalizedLocalPath = fsLocalPath.replace(/\\/g, '/');
            if (!fs.existsSync(fsLocalPath)) {
                throw new Error(`文件不存在: ${fsLocalPath}`);
            }
            {
                let ok = false;
                let lastErr = null;
                for (let i = 0; i < 5; i++) {
                    try {
                        fs.accessSync(fsLocalPath, fs.constants.R_OK);
                        ok = true;
                        break;
                    }
                    catch (e) {
                        lastErr = e;
                        await new Promise(r => setTimeout(r, 200 * Math.pow(2, i)));
                    }
                }
                if (!ok) {
                    console.error('文件检查失败:', lastErr);
                    throw new Error(`无法访问文件: ${fsLocalPath} ${lastErr?.message ? '(' + String(lastErr.message) + ')' : ''}`);
                }
            }
            // 验证iOS路径格式
            if (!remotePath.startsWith('/Documents/') && !remotePath.startsWith('/Library/')) {
                throw new Error('iOS路径必须以/Documents/或/Library/开头');
            }
            const idbPath = await this.getIdbPath();
            console.log(`使用本地 iDB 工具: ${idbPath}`);
            // 验证设备连接
            try {
                try {
                    await execPromise(`"${idbPath}" connect ${deviceId}`);
                }
                catch { }
                await execPromise(`"${idbPath}" file ls "/"`);
                console.log(`✅ iOS设备连接验证成功: ${deviceId}`);
            }
            catch (deviceError) {
                console.error('❌ iOS设备连接验证失败:', deviceError);
                throw new Error(`无法连接到iOS设备: ${deviceId}。请确保设备已连接并信任此电脑。`);
            }
            // 创建远程目录
            const mkdirCommand = `"${idbPath}" shell "mkdir -p \"${remotePath}\""`;
            console.log(`创建iOS远程目录(iDB): ${mkdirCommand}`);
            try {
                await execPromise(mkdirCommand);
                console.log('✅ 远程目录创建成功(iDB)');
            }
            catch (mkdirError) {
                console.log(`⏭️ 目录可能已存在(iDB)，继续推送: ${mkdirError.message}`);
            }
            // 推送文件
            const fileName = path.basename(normalizedLocalPath);
            const targetPath = `${remotePath.replace(/\/$/, '')}/${fileName}`;
            console.log(`开始推送iOS文件: ${normalizedLocalPath} -> ${targetPath}`);
            // 使用配置的iOS工具路径推送文件
            const pushCommand = `"${idbPath}" file push "${normalizedLocalPath}" "${targetPath}"`;
            const pushResult = await execPromise(pushCommand);
            console.log(`✅ iOS文件推送成功: ${normalizedLocalPath} -> ${targetPath}`);
            console.log('推送结果:', pushResult.stdout || '无输出');
            // 严格验证文件推送结果 - 这是防止假成功的关键
            console.log('🔍 验证文件传输结果...');
            try {
                const verifyCommand = `"${idbPath}" file ls "${targetPath}"`;
                const verifyResult = await execPromise(verifyCommand);
                console.log(`✅ iOS文件验证成功: ${verifyResult.stdout.trim()}`);
                // 额外验证：检查文件大小
                const localStats = fs.statSync(fsLocalPath);
                const lsCommand = `"${idbPath}" shell "ls -la \"${targetPath}\""`;
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
    async getIdbPath() {
        const isWin = process.platform === 'win32';
        const execName = isWin ? 'idb.exe' : 'idb';
        const candidates = [];
        try {
            candidates.push(path.join(process.cwd(), execName));
        }
        catch { }
        try {
            candidates.push(path.join(__dirname, '..', execName));
        }
        catch { }
        try {
            const w = globalThis.window;
            const g = globalThis.global || globalThis;
            const api = w?.electronAPI || g?.electronAPI;
            if (api && typeof api.getAppRoot === 'function') {
                const root = await api.getAppRoot();
                candidates.push(path.join(root, execName));
            }
        }
        catch { }
        for (const p of candidates) {
            try {
                if (p && fs.existsSync(p)) {
                    return p.replace(/\\/g, '/');
                }
            }
            catch { }
        }
        // 最后尝试系统路径
        return execName;
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
