import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

// 使用类型断言来处理window和global变量

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
      console.log('[DeviceManager] Start fetching Android devices...');
      const settings = await this.getSettings();
      const adbPath = settings.adbPath || 'adb';
      
      const { stdout } = await execPromise(`"${adbPath}" devices`);
      console.log('[DeviceManager] ADB output:', stdout);
      
      const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
      console.log('[DeviceManager] Lines to process:', lines.length);
      
      const devices: Device[] = [];
      
      for (const line of lines) {
        console.log('[DeviceManager] Processing line:', line);
        const parts = line.trim().split(/\s+/);
        const deviceId = parts[0];
        const status = parts[1];
        
        console.log(`[DeviceManager] Device ID: ${deviceId}, Status: ${status}`);
        
        if (!deviceId) continue;
        if (status === 'device') {
          try {
            console.log(`[DeviceManager] Fetching device ${deviceId} details...`);
            const modelResult = await execPromise(`"${adbPath}" -s ${deviceId} shell getprop ro.product.model`);
            const manufacturerResult = await execPromise(`"${adbPath}" -s ${deviceId} shell getprop ro.product.manufacturer`);
            const device = {
              id: deviceId,
              name: `${manufacturerResult.stdout.trim()} ${modelResult.stdout.trim()}`,
              type: 'android' as const,
              status: 'connected' as const,
              model: modelResult.stdout.trim(),
              manufacturer: manufacturerResult.stdout.trim()
            };
            console.log('[DeviceManager] Found device:', device);
            devices.push(device);
          } catch (error) {
            console.warn(`[DeviceManager] Failed to fetch device ${deviceId} details:`, error);
            devices.push({ id: deviceId, name: deviceId, type: 'android' as const, status: 'connected' as const });
          }
        } else if (status === 'unauthorized' || status === 'offline') {
          devices.push({ id: deviceId, name: deviceId, type: 'android' as const, status: 'disconnected' as const });
        }
      }
      
      console.log(`[DeviceManager] Found ${devices.length} Android device(s)`);
      return devices;
    } catch (error) {
      console.error('[DeviceManager] Failed to get Android devices:', error);
      return [];
    }
  }

  // 获取iOS设备列表（使用idb）
  private async getIOSDevices(): Promise<Device[]> {
    try {
      const idbPath = await this.getIdbPath();
      try {
        const help = await execPromise(`"${idbPath}" --help`);
        const text = String(help.stdout || help.stderr || '');
        if (/\blist\b/i.test(text)) {
          const { stdout } = await execPromise(`"${idbPath}" list`);
          const rawLines = String(stdout || '').split(/\r?\n/);
          let header = rawLines.find(l => /UDID\s+.*NAME/i.test(l)) || '';
          const lines = rawLines.map(s => s.replace(/\s+$/,'')).filter(s => s && !/^\s*(UDID|Name|Device|Simulator)/i.test(s));
          const devices: Device[] = [];

          const colStarts: Record<string, number> = {};
          if (header) {
            const cols = ['UDID','SerialNumber','NAME','MarketName','ProductVersion','ConnType','DeviceID','Location'];
            for (const c of cols) {
              const idx = header.indexOf(c);
              if (idx >= 0) colStarts[c] = idx;
            }
          }
          const nameStart = colStarts['NAME'] ?? -1;
          const nextCols = ['MarketName','ProductVersion','ConnType','DeviceID','Location'];
          const possibleNext = nextCols
            .map(k => colStarts[k])
            .filter((i): i is number => typeof i === 'number' && i > nameStart)
            .sort((a,b)=>a-b);
          const nameEnd = nameStart >= 0 ? (possibleNext[0] ?? undefined) : undefined;

          for (const l of lines) {
            const m = l.match(/[A-Fa-f0-9]{40}|[A-Za-z0-9-]{24,}/);
            if (!m) continue;
            const id = m[0];
            let name = '';
            if (nameStart >= 0) {
              name = (nameEnd !== undefined ? l.slice(nameStart, nameEnd) : l.slice(nameStart)).trim();
            }
            if (!name) {
              const rest = l.replace(id, '').trim();
              const parts = rest.split(/\s+/);
              name = parts[1] ? parts.slice(1).join(' ') : rest;
            }
            devices.push({ id, name: name || id, type: 'ios', status: 'connected' });
          }
          return devices;
        }
      } catch {}
      return [];
    } catch (error) {
      console.error('获取iOS设备失败:', error);
      return [];
    }
  }

  // 获取所有连接的设备
  async getConnectedDevices(): Promise<Device[]> {
    console.log('[DeviceManager] Start fetching all connected devices...');
    
    try {
      const [androidDevices, iosDevices] = await Promise.all([
        this.getAndroidDevices(),
        this.getIOSDevices()
      ]);
      
      const allDevices = [...androidDevices, ...iosDevices];
      console.log(`[DeviceManager] Total devices found: ${allDevices.length}`);
      
      return allDevices;
    } catch (error) {
      console.error('[DeviceManager] Failed to get device list:', error);
      return [];
    }
  }

  // 检查ADB是否可用
  async isADBAvailable(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      const adbPath = settings.adbPath || 'adb';
      
      await execPromise(`"${adbPath}" version`);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 检查iOS工具是否可用
  async isIOSToolsAvailable(): Promise<boolean> {
    try {
      const idbPath = await this.getIdbPath();
      await execPromise(`"${idbPath}" --help`);
      return true;
    } catch (error) {
      console.error('[DeviceManager] Failed to check iOS tools:', error);
      return false;
    }
  }

  // 推送文件到Android设备
  async pushFileToAndroid(deviceId: string, localPath: string, remotePath: string): Promise<void> {
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
        let lastErr: any = null;
        for (let i = 0; i < 5; i++) {
          try {
            fs.accessSync(fsLocalPath, fs.constants.R_OK);
            ok = true;
            break;
          } catch (e) {
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
      } catch (dirError) {
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
      } catch {
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
        let lastErr: any = null;
        for (let i = 0; i < 5; i++) {
          try {
            fs.accessSync(fsLocalPath, fs.constants.R_OK);
            ok = true;
            break;
          } catch (e) {
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

      const settings = await this.getSettings();
      const iosBundleId: string = String(settings?.iosBundleId || settings?.iosBundleIdentifier || process.env.IOS_BUNDLE_ID || '').trim();
      if (!iosBundleId) {
        console.warn('[DeviceManager] 未在设置中找到 iosBundleId/iosBundleIdentifier，请检查配置');
      }
      const udidArg = `-u ${deviceId}`;

      if (!iosBundleId) {
        throw new Error('未配置 iOS 应用包名（bundle id），无法定位应用容器');
      }

      const fileName = path.basename(normalizedLocalPath);
      const targetPath = `${remotePath.replace(/\/$/, '')}/${fileName}`;
      console.log(`开始推送iOS文件: ${normalizedLocalPath} -> ${targetPath}`);
      
      try {
        const parentDir = path.dirname(targetPath);
        const segs = parentDir.split('/').filter(Boolean);
        let cur = '';
        for (const s of segs) {
          cur = cur ? `${cur}/${s}` : `/${s}`;
          try { await execPromise(`"${idbPath}" ${udidArg} fsync mkdir "${cur}" -B ${iosBundleId}`); } catch {}
        }
      } catch {}
      const pushCommand = `"${idbPath}" ${udidArg} fsync push "${normalizedLocalPath}" "${targetPath}" -B ${iosBundleId}`;
      const pushResult = await execPromise(pushCommand);
      
      console.log(`[DeviceManager] iOS file pushed: ${normalizedLocalPath} -> ${targetPath}`);
      console.log('推送结果:', pushResult.stdout || '无输出');
      
      // 严格验证文件推送结果 - 这是防止假成功的关键
      console.log('[DeviceManager] Verifying file transfer result...');
      {
        let ok = false;
        let lastErr: any = null;
        const parentDir = path.dirname(targetPath);
        const baseName = path.basename(targetPath);
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          try {
            const r = await execPromise(`"${idbPath}" ${udidArg} fsync stat "${targetPath}" -B ${iosBundleId}`);
            const out = String(r.stdout || r.stderr || '').trim();
            if (out.length > 0) {
              ok = true;
              break;
            }
          } catch (e) {
            lastErr = e;
          }
          if (!ok) {
            try {
              const r2 = await execPromise(`"${idbPath}" ${udidArg} fsync ls "${parentDir}" -B ${iosBundleId}`);
              const out2 = String(r2.stdout || r2.stderr || '').trim();
              if (out2 && out2.includes(baseName)) {
                ok = true;
                break;
              }
            } catch (e2) {
              lastErr = e2;
            }
          }
          if (!ok) {
            await new Promise(res => setTimeout(res, 300 * (attempt + 1)));
          }
        }
        if (!ok) {
          throw new Error(`文件验证失败: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
        }
      }
      
    } catch (error) {
      console.error('[DeviceManager] iOS file push failed:', error);
      throw new Error(`iOS推送失败: ${(error as any).message}`);
    }
  }

  // 获取设置配置
  private async getSettings(): Promise<any> {
    try {
      // 1. 优先尝试 Electron 预加载脚本注入的 api
      const w = (globalThis as any).window;
      if (w?.electronAPI?.getSettings) {
        return await w.electronAPI.getSettings();
      }

      // 2. 再试 Node 全局
      const g = (globalThis as any).global;
      if (g?.electronAPI?.getSettings) {
        return await g.electronAPI.getSettings();
      }

      // 3. 如果以上都没有，尝试用 IPC 主动询问主进程（渲染进程专用）
      if (w?.electron?.ipcRenderer) {
        return await w.electron.ipcRenderer.invoke('get-settings');
      }

      // 4. 兜底：生成并读本地 JSON 配置文件（独立运行或测试时）
      const fs = await import('fs/promises');
      const path = await import('path');
      const configFile = path.resolve(process.cwd(), 'settings.json');
      try {
        const txt = await fs.readFile(configFile, 'utf-8');
        const parsed = JSON.parse(txt);
        const envBundle = typeof process.env.IOS_BUNDLE_ID === 'string' ? process.env.IOS_BUNDLE_ID.trim() : '';
        if (envBundle && !parsed.iosBundleId) {
          return { ...parsed, iosBundleId: envBundle };
        }
        return parsed;
      } catch (error){
        // 文件不存在或解析失败，生成默认配置
        console.warn('文件不存在或解析失败，生成默认配置', error);
        const envBundle = typeof process.env.IOS_BUNDLE_ID === 'string' ? process.env.IOS_BUNDLE_ID.trim() : '';
        const defaultSettings = { iosToolsPath: '', adbPath: '', iosBundleId: envBundle || 'com.tencent.uc' };
        await fs.writeFile(configFile, JSON.stringify(defaultSettings, null, 2), 'utf-8');
        return defaultSettings;
      }
    } catch (error) {
      console.warn('[DeviceManager] 无法获取设置，使用空默认值:', error);
      const envBundle = typeof process.env.IOS_BUNDLE_ID === 'string' ? process.env.IOS_BUNDLE_ID.trim() : '';
      return { iosToolsPath: '', adbPath: '', iosBundleId: envBundle || 'com.tencent.uc' };
    }
  }

  private async getIdbPath(): Promise<string> {
    const isWin = process.platform === 'win32';
    const execName = isWin ? 'idb.exe' : 'idb';
    const candidates: string[] = [];
    try {
      const settings = await this.getSettings();
      const p = String(settings?.iosToolsPath || '').trim();
      if (p) {
        candidates.push(p);
      }
    } catch {}
    try { candidates.push(path.join(process.cwd(), execName)); } catch {}
    try { candidates.push(path.join(__dirname, '..', execName)); } catch {}
    try { candidates.push(path.join(process.cwd(), 'idb', execName)); } catch {}
    try { candidates.push(path.join(process.cwd(), 'src', 'idb', execName)); } catch {}
    try { candidates.push(path.join(__dirname, '..', 'idb', execName)); } catch {}
    try { candidates.push(path.join(__dirname, '..', '..', 'src', 'idb', execName)); } catch {}
    try {
      const w = (globalThis as any).window;
      const g = (globalThis as any).global || globalThis;
      const api = w?.electronAPI || g?.electronAPI;
      if (api && typeof api.getAppRoot === 'function') {
        const root = await api.getAppRoot();
        candidates.push(path.join(root, execName));
        candidates.push(path.join(root, 'idb', execName));
        candidates.push(path.join(root, 'src', 'idb', execName));
      }
    } catch {}
    for (const p of candidates) {
      try {
        if (p && fs.existsSync(p)) {
          const dir = path.dirname(p);
          this.ensureInPath(dir);
          return p.replace(/\\/g, '/');
        }
      } catch {}
    }
    // 最后尝试系统路径
    return execName;
  }


  private ensureInPath(dir: string) {
    if (!dir) return;
    const sep = process.platform === 'win32' ? ';' : ':';
    const cur = String(process.env.PATH || '');
    const parts = cur.split(sep).filter(Boolean);
    if (!parts.includes(dir)) {
      process.env.PATH = [dir, ...parts].join(sep);
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
