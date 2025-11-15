import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec, execSync } from 'child_process';
import http from 'http';
import https from 'https';
import Store from 'electron-store';
import { DeviceManager } from '../dist-electron/src/utils/deviceManager.js';
import { DeviceMonitor } from '../dist-electron/src/utils/deviceMonitor.js';
import { computeDefaultSettingsFor, validatePathValue } from './settings-defaults.js';
import { TransferPathManager } from '../dist-electron/src/utils/transferPathManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化设备管理器
const deviceManager = DeviceManager.getInstance();

async function createWindow() {
  const win = new BrowserWindow({
    width: 560,
    height: 360,
    minWidth: 320,
    frame: false,  // 移除窗口框架
    titleBarStyle: 'hidden',  // 隐藏标题栏
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-simple.js')
    }
  });

  const target = 'http://localhost:5173';
  const ping = (url) => new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => { try { res.destroy(); } catch {} resolve(true); });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { try { req.destroy(); } catch {} resolve(false); });
  });
  const waitFor = async (url, timeout = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const ok = await ping(url);
      if (ok) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('dev server not ready');
  };

  try {
    await waitFor(target);
    console.log('[Main] Dev server ready, loading', target);
    win.loadURL(target);
  } catch {
    console.log('[Main] Dev server not ready, fallback to build/index.html');
    try { win.loadFile(path.join(__dirname, '../build/index.html')); } catch {}
  }

  win.webContents.openDevTools();

  // 设置IPC处理程序
  setupIPC(win);

  setupDeviceMonitor(win);
}

function setupIPC(win) {
  const store = new Store({
    name: 'settings',
    defaults: computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync)
  });
  try {
    const v = store.get('iosBundleId');
    if (typeof v !== 'string' || !v.trim()) {
      store.set('iosBundleId', 'com.tencent.uc');
    }
  } catch {}
  const transferPathManager = TransferPathManager.getInstance();
  

  // 获取设备列表
  ipcMain.handle('get-devices', async () => {
    try {
      const devices = await deviceManager.getConnectedDevices();
      return devices;
    } catch (error) {
      console.error('获取设备失败:', error);
      return [];
    }
  });

  
  ipcMain.handle('push-file', async (event, { deviceId, filePath, deviceType, targetDir }) => {
    try {
      try {
        const v = store.get('iosBundleId');
        if (typeof v === 'string' && v.trim()) {
          process.env.IOS_BUNDLE_ID = v.trim();
        }
      } catch {}
      const defaultDir = deviceType === 'android'
        ? '/sdcard/Android/media/com.tencent.uc/BattleRecord/'
        : '/Documents/BattleRecord/';
      const remoteDir = (typeof targetDir === 'string' && targetDir) ? targetDir : defaultDir;

      
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const limit = 500 * 1024 * 1024;
      if (fileSize > limit) {
        throw new Error('文件过大，最大支持500MB');
      }

      
      if (deviceType === 'android') {
        const adbPath = (() => {
          try {
            const val = store.get('adbPath');
            if (typeof val === 'string' && val.trim()) return val.trim();
          } catch {}
          return 'adb';
        })();
        const ok = await execPromiseSafe(`"${adbPath}" -s ${deviceId} shell echo ok`);
        if (!ok) throw new Error('ADB调试未授权或设备未连接');
        const { stdout: df } = await execPromise(`"${adbPath}" -s ${deviceId} shell df -k /sdcard`);
        const m = df.match(/\s(\d+)\s+(\d+)\s+(\d+)\s+\d+%/);
        if (m) {
          const availKB = parseInt(m[3], 10);
          if (fileSize / 1024 > availKB) {
            throw new Error('目标设备存储空间不足');
          }
        }
      }

      
      const fileName = path.basename(filePath);
      const sendProgress = (payload) => {
        win.webContents.send('transfer-progress', { fileName, ...payload });
      };
      sendProgress({ progress: 0, speedMbps: 0, etaSeconds: undefined, targetPath: undefined });

      const start = Date.now();
      let targetPath = remoteDir.replace(/\/$/, '') + '/' + fileName;

      

      
      if (deviceType === 'android') {
        const adbPath = (() => {
          try {
            const val = store.get('adbPath');
            if (typeof val === 'string' && val.trim()) return val.trim();
          } catch {}
          return 'adb';
        })();
        await execPromise(`"${adbPath}" -s ${deviceId} shell mkdir -p "${remoteDir}"`);
        const chunkSize = 8 * 1024 * 1024;
        if (fileSize <= chunkSize) {
          await execPromise(`"${adbPath}" -s ${deviceId} push "${filePath}" "${targetPath}"`);
          const d = stats.mtime;
          const fmt = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.${String(d.getSeconds()).padStart(2,'0')}`;
          const quoted = targetPath.replace(/'/g, "'\\''");
          await execPromise(`"${adbPath}" -s ${deviceId} shell sh -c "toybox touch -t ${fmt} '${quoted}' || touch '${quoted}'"`);
        } else {
          const total = Math.ceil(fileSize / chunkSize);
          const buffer = fs.readFileSync(filePath);
          let startIndex = 0;
          let existingIdxs = [];
          try {
            const { stdout: existing } = await execPromise(`"${adbPath}" -s ${deviceId} shell ls -1 "${targetPath}.part*"`);
            const lines = String(existing).split('\n').filter(Boolean);
            const idxs = lines.map(l => {
              const m = l.match(/\.part(\d+)$/);
              return m ? parseInt(m[1], 10) : -1;
            }).filter(n => n >= 0);
            if (idxs.length > 0) startIndex = Math.max(...idxs) + 1;
            existingIdxs = idxs;
          } catch {}
          for (let i = startIndex; i < total; i++) {
            const begin = i * chunkSize;
            const end = Math.min(begin + chunkSize, fileSize);
            const tmp = path.join(__dirname, `.__upload_part_${Date.now()}_${i}`);
            fs.writeFileSync(tmp, buffer.slice(begin, end));
            const partRemote = `${targetPath}.part${i}`;
            let tries = 0;
            while (true) {
              try {
                await execPromise(`"${adbPath}" -s ${deviceId} push "${tmp}" "${partRemote}"`);
                break;
              } catch (e) {
                if (++tries >= 3) throw e;
              }
            }
            fs.unlinkSync(tmp);
            const transferred = end;
            const elapsed = (Date.now() - start) / 1000;
            const speed = elapsed > 0 ? (transferred / 1024 / 1024) / elapsed : 0;
            const eta = speed > 0 ? (fileSize / 1024 / 1024 - transferred / 1024 / 1024) / speed : undefined;
            sendProgress({ progress: Math.round((transferred / fileSize) * 100), speedMbps: speed, etaSeconds: eta, targetPath });
          }
          const present = new Set(existingIdxs);
          for (let i = startIndex; i < total; i++) present.add(i);
          for (let i = 0; i < total; i++) {
            if (!present.has(i)) {
              const begin = i * chunkSize;
              const end = Math.min(begin + chunkSize, fileSize);
              const tmp = path.join(__dirname, `.__upload_part_${Date.now()}_${i}`);
              fs.writeFileSync(tmp, buffer.slice(begin, end));
              const partRemote = `${targetPath}.part${i}`;
              let tries = 0;
              while (true) {
                try {
                  await execPromise(`"${adbPath}" -s ${deviceId} push "${tmp}" "${partRemote}"`);
                  break;
                } catch (e) {
                  if (++tries >= 3) throw e;
                }
              }
              fs.unlinkSync(tmp);
            }
          }
          try {
            const { stdout: verifyExisting } = await execPromise(`"${adbPath}" -s ${deviceId} shell ls -1 "${targetPath}.part*"`);
            const verifyLines = String(verifyExisting).split('\n').filter(Boolean);
            const verifyIdxs = verifyLines.map(l => { const m = l.match(/\.part(\d+)$/); return m ? parseInt(m[1], 10) : -1; }).filter(n => n >= 0);
            if (verifyIdxs.length !== total) {
              throw new Error('分片校验失败');
            }
          } catch {}
          const parts = Array.from({ length: total }, (_, i) => `${targetPath}.part${i}`).map(p => `'${p.replace(/'/g, "'\\''")}'`).join(' ');
          const quotedTarget = targetPath.replace(/'/g, "'\\''");
          await execPromise(`"${adbPath}" -s ${deviceId} shell sh -c "cat ${parts} > '${quotedTarget}' && rm ${parts}"`);
          const d = stats.mtime;
          const fmt = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.${String(d.getSeconds()).padStart(2,'0')}`;
          await execPromise(`"${adbPath}" -s ${deviceId} shell sh -c "toybox touch -t ${fmt} '${quotedTarget}' || touch '${quotedTarget}'"`);
        }
      } else {
        await deviceManager.pushFileToIOS(deviceId, filePath, remoteDir);
      }

      const duration = Date.now() - start;
      sendProgress({ progress: 100, speedMbps: (fileSize/1024/1024)/(duration/1000), etaSeconds: 0, targetPath });
      transferPathManager.addTransferLog({
        deviceId,
        deviceType,
        deviceName: `${deviceType}设备`,
        sourcePath: filePath,
        targetPath,
        status: 'success',
        duration,
        fileSize
      });
      return { success: true, targetPath, duration };
    } catch (error) {
      console.error('文件推送失败:', error);
      win.webContents.send('transfer-progress', { fileName: path.basename(filePath), progress: 0, speedMbps: 0, etaSeconds: undefined, error: error.message });
      try {
        transferPathManager.addTransferLog({
          deviceId,
          deviceType,
          deviceName: `${deviceType}设备`,
          sourcePath: filePath,
          targetPath: targetDir || '',
          status: 'failed',
          error: error.message,
          fileSize: (()=>{ try { return fs.statSync(filePath).size } catch { return 0 }})()
        });
      } catch {}
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('materialize-file', async (event, { fileName, data }) => {
    try {
      const base = path.basename(String(fileName || 'file'));
      const defaultsForPlatform = computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync);
      const saveDir = store.get('saveDir') || defaultsForPlatform.saveDir;
      const tempDir = path.join(saveDir, '.temp');
      fs.mkdirSync(tempDir, { recursive: true });
      const out = path.join(tempDir, base);
      let buf;
      if (Buffer.isBuffer(data)) buf = data;
      else if (data && data.type === 'Buffer' && Array.isArray(data.data)) buf = Buffer.from(data.data);
      else if (ArrayBuffer.isView(data)) buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      else if (data && typeof data === 'object' && 'byteLength' in data) buf = Buffer.from(data);
      else buf = Buffer.from([]);
      fs.writeFileSync(out, buf);
      return out;
    } catch (e) {
      return null;
    }
  });

  // 选择文件
  ipcMain.handle('select-file', async () => {
    try {
      const result = await dialog.showOpenDialog(win, {
        title: '选择文件',
        properties: ['openFile']
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (error) {
      console.error('选择文件失败:', error);
      return null;
    }
  });

  // 检查ADB是否可用
  ipcMain.handle('check-adb', async () => {
    try {
      const adbPath = store.get('adbPath');
      if (adbPath && typeof adbPath === 'string' && adbPath.trim()) {
        return await execPromiseSafe(`"${adbPath}" version`);
      }
      const isAvailable = await deviceManager.isADBAvailable();
      return isAvailable;
    } catch (error) {
      return false;
    }
  });

  // 检查iOS工具是否可用
  ipcMain.handle('check-ios-tools', async () => {
    try {
      const isAvailable = await deviceManager.isIOSToolsAvailable();
      return isAvailable;
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('get-settings', async () => {
    try {
      const defaults = computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync);
      const s = store.store;
      const v = typeof s.iosBundleId === 'string' ? s.iosBundleId.trim() : '';
      if (!v) {
        s.iosBundleId = defaults.iosBundleId;
        try { store.set('iosBundleId', s.iosBundleId); } catch {}
      }
      return s;
    } catch (e) {
      return computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync);
    }
  });

  ipcMain.handle('update-settings', async (event, payload) => {
    try {
      const prev = store.store;
      const next = { ...prev, ...payload };
      const defaults = computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync);
      const b = typeof next.iosBundleId === 'string' ? next.iosBundleId.trim() : '';
      if (!b) next.iosBundleId = defaults.iosBundleId;
      store.set(next);
      try {
        const p = String(next?.iosToolsPath || '').trim();
        if (p) {
          const dir = path.dirname(p);
          ensureInPath(dir);
        }
      } catch {}
      return next;
    } catch (e) {
      return store.store;
    }
  });

  ipcMain.handle('reset-settings', async () => {
    const defaults = computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync);
    store.set(defaults);
    return defaults;
  });

  ipcMain.handle('get-transfer-log', async (event, limit) => {
    try {
      return transferPathManager.getTransferLog(typeof limit === 'number' ? limit : undefined);
    } catch (e) {
      return [];
    }
  });

  ipcMain.handle('clear-transfer-log', async () => {
    try {
      transferPathManager.clearTransferLog();
      return { success: true };
    } catch (e) {
      return { success: false, error: '清理失败' };
    }
  });

  ipcMain.handle('get-transfer-stats', async () => {
    try {
      return transferPathManager.getTransferStats();
    } catch (e) {
      return { total: 0, successful: 0, failed: 0, byDeviceType: { android: 0, ios: 0 }, recent: [] };
    }
  });

  ipcMain.handle('get-idb-path', async () => {
    try {
      const p = await deviceManager.getIdbPath();
      return p || '';
    } catch (e) {
      return '';
    }
  });

  ipcMain.handle('get-transfer-paths', async () => {
    try {
      const defaults = {
        android: transferPathManager.getDefaultPath('android'),
        ios: transferPathManager.getDefaultPath('ios')
      };
      const saved = store.get('transferPaths');
      if (saved && typeof saved === 'object' && saved.android && saved.ios) return saved;
      return defaults;
    } catch (e) {
      return {
        android: transferPathManager.getDefaultPath('android'),
        ios: transferPathManager.getDefaultPath('ios')
      };
    }
  });

  ipcMain.handle('update-transfer-paths', async (event, paths) => {
    try {
      const a = transferPathManager.validatePath(paths?.android, 'android');
      const i = transferPathManager.validatePath(paths?.ios, 'ios');
      if (!a.valid) return { success: false, error: a.error || 'Android路径无效' };
      if (!i.valid) return { success: false, error: i.error || 'iOS路径无效' };
      const normalized = {
        android: transferPathManager.normalizePath(paths.android),
        ios: transferPathManager.normalizePath(paths.ios)
      };
      store.set('transferPaths', normalized);
      return { success: true, paths: normalized };
    } catch (e) {
      return { success: false, error: '更新失败' };
    }
  });

  ipcMain.handle('select-directory', async () => {
    try {
      const result = await dialog.showOpenDialog(win, {
        title: '选择目录',
        properties: ['openDirectory']
      });
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('select-executable', async () => {
    try {
      const result = await dialog.showOpenDialog(win, {
        title: '选择可执行文件',
        properties: ['openFile']
      });
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('validate-path', async (event, { input, kind }) => {
    try {
      const res = validatePathValue(process.platform, input, kind);
      return res;
    } catch (e) {
      return { valid: false, exists: false, error: '验证失败' };
    }
  });

  ipcMain.handle('get-app-root', async () => {
    try {
      const exeDir = path.dirname(app.getPath('exe'));
      const devDir = path.resolve(__dirname, '..');
      // 优先返回开发目录以便本地运行，打包后返回可执行目录
      return process.env.NODE_ENV === 'development' ? devDir : exeDir;
    } catch (e) {
      return path.resolve(__dirname, '..');
    }
  });

  ipcMain.handle('validate-transfer-path', async (event, { path: input, deviceType }) => {
    try {
      if (typeof input !== 'string' || !input.trim()) return { valid: false, error: '路径不能为空' };
      const p = input.trim();
      if (!p.startsWith('/')) return { valid: false, error: '路径必须以/开头' };
      if (deviceType === 'android') {
        if (!p.startsWith('/sdcard/') && !p.startsWith('/storage/')) {
          return { valid: false, error: 'Android路径必须以/sdcard/或/storage/开头' };
        }
      } else if (deviceType === 'ios') {
        if (!p.startsWith('/Documents/') && !p.startsWith('/Library/')) {
          return { valid: false, error: 'iOS路径必须以/Documents/或/Library/开头' };
        }
      }
      return { valid: true };
    } catch (e) {
      return { valid: false, error: '验证失败' };
    }
  });

  ipcMain.handle('open-help', async () => {
    const helpWin = new BrowserWindow({
      width: 760,
      height: 600,
      useContentSize: true,
      resizable: true,
      minimizable: true,
      fullscreenable: false,
      parent: win,
      modal: true,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload-simple.js')
      }
    });
    helpWin.loadURL('http://localhost:5173/#/help');
  });

  ipcMain.handle('get-save-dir', async () => {
    try {
      let dir = store.get('saveDir');
      if (typeof dir !== 'string' || !dir.trim()) {
        dir = computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync).saveDir;
      }
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch (e) {
      const fallback = computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync).saveDir;
      try { fs.mkdirSync(fallback, { recursive: true }); } catch {}
      return fallback;
    }
  });

  ipcMain.handle('save-local-file', async (event, { sourcePath, options }) => {
    try {
      if (!sourcePath || typeof sourcePath !== 'string') {
        return { success: false, error: '无效的源文件路径' };
      }

      const stat = fs.statSync(sourcePath);
      if (!stat.isFile()) return { success: false, error: '源路径不是文件' };

      let saveDir = store.get('saveDir');
      if (typeof saveDir !== 'string' || !saveDir.trim()) {
        saveDir = computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync).saveDir;
      }
      fs.mkdirSync(saveDir, { recursive: true });

      const fileName = path.basename(sourcePath);
      const strategy = options?.conflictStrategy === 'overwrite' ? 'overwrite' : (options?.conflictStrategy === 'skip' ? 'skip' : 'rename');

      const targetBase = path.join(saveDir, fileName);
      let finalTarget = targetBase;
      if (fs.existsSync(targetBase)) {
        if (strategy === 'overwrite') {
          try { fs.unlinkSync(targetBase); } catch {}
        } else if (strategy === 'skip') {
          return { success: false, error: '文件已存在，跳过' };
        } else {
          const ext = path.extname(fileName);
          const base = path.basename(fileName, ext);
          let i = 1;
          while (fs.existsSync(finalTarget)) {
            finalTarget = path.join(saveDir, `${base} (${i})${ext}`);
            i++;
          }
        }
      }

      const tempTarget = `${finalTarget}.tmp`;
      fs.copyFileSync(sourcePath, tempTarget);

      const srcSize = stat.size;
      const tmpStat = fs.statSync(tempTarget);
      if (tmpStat.size !== srcSize) {
        try { fs.unlinkSync(tempTarget); } catch {}
        return { success: false, error: '文件大小不匹配' };
      }

      try { fs.renameSync(tempTarget, finalTarget); } catch (e) {
        try { fs.unlinkSync(tempTarget); } catch {}
        return { success: false, error: '原子重命名失败' };
      }

      try {
        fs.utimesSync(finalTarget, stat.atime, stat.mtime);
      } catch {}

      return { success: true, finalPath: finalTarget, targetDir: saveDir };
    } catch (e) {
      return { success: false, error: e?.message || '保存失败' };
    }
  });
}

let isDeviceMonitorSetup = false;

function setupDeviceMonitor(win) {
  if (isDeviceMonitorSetup) return;
  const monitor = DeviceMonitor.getInstance();
  monitor.on('deviceStatusChanged', (event) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('device-status-changed', event);
    }
  });
  monitor.on('error', (error) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('device-monitor-error', error.message);
    }
  });
  monitor.start();
  isDeviceMonitorSetup = true;
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function execPromiseSafe(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err) => {
      if (err) resolve(false);
      else resolve(true);
    });
  });
}

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });
}

function ensureInPath(dir) {
  if (!dir) return;
  const sep = process.platform === 'win32' ? ';' : ':';
  const cur = String(process.env.PATH || '');
  const parts = cur.split(sep).filter(Boolean);
  if (!parts.includes(dir)) {
    process.env.PATH = [dir, ...parts].join(sep);
  }
}
