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
            console.log('[DeviceManager] Start fetching Android devices...');
            const settings = await this.getSettings();
            const adbPath = settings.adbPath || 'adb';
            const { stdout } = await execPromise(`"${adbPath}" devices`);
            console.log('[DeviceManager] ADB output:', stdout);
            const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
            console.log('[DeviceManager] Lines to process:', lines.length);
            const devices = [];
            for (const line of lines) {
                console.log('[DeviceManager] Processing line:', line);
                const parts = line.trim().split(/\s+/);
                const deviceId = parts[0];
                const status = parts[1];
                console.log(`[DeviceManager] Device ID: ${deviceId}, Status: ${status}`);
                if (deviceId && status === 'device') {
                    try {
                        console.log(`[DeviceManager] Fetching device ${deviceId} details...`);
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
                        console.log('[DeviceManager] Found device:', device);
                        devices.push(device);
                    }
                    catch (error) {
                        console.warn(`[DeviceManager] Failed to fetch device ${deviceId} details:`, error);
                        devices.push({
                            id: deviceId,
                            name: deviceId,
                            type: 'android',
                            status: 'connected'
                        });
                    }
                }
            }
            console.log(`[DeviceManager] Found ${devices.length} Android device(s)`);
            return devices;
        }
        catch (error) {
            console.error('[DeviceManager] Failed to get Android devices:', error);
            return [];
        }
    }
    async getIOSDevices() {
        try {
            const idbPath = await this.getIdbPath();
            try {
                const help = await execPromise(`"${idbPath}" --help`);
                const text = String(help.stdout || help.stderr || '');
                if (/\blist\b/i.test(text) || /list-targets/i.test(text)) {
                    const { stdout } = await execPromise(`"${idbPath}" list`);
                    const lines = String(stdout || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                    const devices = [];
                    for (const l of lines) {
                        if (/^\s*(UDID|Name|Device|Simulator)/i.test(l)) continue;
                        const m = l.match(/[A-Fa-f0-9]{40}|[A-Za-z0-9-]{24,}/);
                        if (!m) continue;
                        const id = m[0];
                        const name = l.replace(id, '').trim() || id;
                        devices.push({ id, name, type: 'ios', status: 'connected' });
                    }
                    return devices;
                }
            }
            catch { }
            return [];
        }
        catch (error) {
            console.error('获取iOS设备失败:', error);
            return [];
        }
    }
    // 获取所有连接的设备
    async getConnectedDevices() {
        console.log('[DeviceManager] Start fetching all connected devices...');
        try {
            const [androidDevices, iosDevices] = await Promise.all([
                this.getAndroidDevices(),
                this.getIOSDevices()
            ]);
            const allDevices = [...androidDevices, ...iosDevices];
            console.log(`[DeviceManager] Total devices found: ${allDevices.length}`);
            return allDevices;
        }
        catch (error) {
            console.error('[DeviceManager] Failed to get device list:', error);
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
            if (!remotePath.startsWith('/Documents/') && !remotePath.startsWith('/Library/')) {
                throw new Error('iOS路径必须以/Documents/或/Library/开头');
            }
            const idbPath = await this.getIdbPath();
            const udidArg = `-u ${deviceId}`;
            const settings = await this.getSettings();
            const iosBundleId = String(settings?.iosBundleId || '').trim();
            if (!iosBundleId) {
                throw new Error('未配置 iOS 应用包名（bundle id），无法定位应用容器');
            }
            let appBase = '';
            try {
                const info = await execPromise(`"${idbPath}" ${udidArg} appinfo ${iosBundleId}`);
                const text = String(info.stdout || info.stderr || '');
                const m = text.match(/\/var\/mobile\/Containers\/Data\/Application\/[A-Za-z0-9-]+/);
                if (m) appBase = m[0];
            }
            catch { }
            if (!appBase) {
                throw new Error('无法解析应用容器路径，请确认 bundle id 正确');
            }
            const fileName = path.basename(normalizedLocalPath);
            const targetPath = `${appBase}${remotePath.replace(/\/$/, '')}/${fileName}`;
            try { await execPromise(`"${idbPath}" ${udidArg} fsync mkdir -p "${path.dirname(targetPath)}"`); }
            catch { }
            const pushResult = await execPromise(`"${idbPath}" ${udidArg} fsync push "${normalizedLocalPath}" "${targetPath}"`);
            try {
                const verifyResult = await execPromise(`"${idbPath}" ${udidArg} ls "${targetPath}"`);
                if (!verifyResult.stdout || String(verifyResult.stdout).trim().length === 0) {
                    throw new Error('文件验证失败：远程文件不存在或为空');
                }
            }
            catch (verifyError) {
                throw new Error(`文件推送验证失败: ${verifyError.message}`);
            }
        }
        catch (error) {
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
            const settings = await this.getSettings();
            const p = String(settings?.iosToolsPath || '').trim();
            if (p) {
                candidates.push(p);
            }
        }
        catch { }
        try { candidates.push(path.join(process.cwd(), execName)); }
        catch { }
        try { candidates.push(path.join(__dirname, '..', execName)); }
        catch { }
        try { candidates.push(path.join(process.cwd(), 'idb', execName)); }
        catch { }
        try { candidates.push(path.join(process.cwd(), 'src', 'idb', execName)); }
        catch { }
        try { candidates.push(path.join(__dirname, '..', 'idb', execName)); }
        catch { }
        try { candidates.push(path.join(__dirname, '..', '..', 'src', 'idb', execName)); }
        catch { }
        try {
            const w = globalThis.window;
            const g = globalThis.global || globalThis;
            const api = w?.electronAPI || g?.electronAPI;
            if (api && typeof api.getAppRoot === 'function') {
                const root = await api.getAppRoot();
                candidates.push(path.join(root, execName));
                candidates.push(path.join(root, 'idb', execName));
                candidates.push(path.join(root, 'src', 'idb', execName));
            }
        }
        catch { }
        for (const p of candidates) {
            try {
                if (p && fs.existsSync(p)) {
                    const dir = path.dirname(p);
                    this.ensureInPath(dir);
                    return p.replace(/\\/g, '/');
                }
            }
            catch { }
        }
        return execName;
    }

    async getIdeviceIdPath() {
        const isWin = process.platform === 'win32';
        const execName = isWin ? 'idevice_id.exe' : 'idevice_id';
        const candidates = [];
        try { candidates.push(path.join(process.cwd(), execName)); }
        catch { }
        try { candidates.push(path.join(__dirname, '..', execName)); }
        catch { }
        try { candidates.push(path.join(process.cwd(), 'idevice', execName)); }
        catch { }
        try { candidates.push(path.join(process.cwd(), 'src', 'idevice', execName)); }
        catch { }
        try { candidates.push(path.join(__dirname, '..', 'idevice', execName)); }
        catch { }
        try { candidates.push(path.join(__dirname, '..', '..', 'src', 'idevice', execName)); }
        catch { }
        for (const p of candidates) {
            try {
                if (p && fs.existsSync(p)) {
                    const dir = path.dirname(p);
                    this.ensureInPath(dir);
                    return p.replace(/\\/g, '/');
                }
            }
            catch { }
        }
        return execName;
    }

    ensureInPath(dir) {
        if (!dir) return;
        const sep = process.platform === 'win32' ? ';' : ':';
        const cur = String(process.env.PATH || '');
        const parts = cur.split(sep).filter(Boolean);
        if (!parts.includes(dir)) {
            process.env.PATH = [dir, ...parts].join(sep);
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
