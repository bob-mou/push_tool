import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec, execSync } from 'child_process';
import Store from 'electron-store';
import { DeviceManager } from '../dist-electron/src/utils/deviceManager.js';
import { computeDefaultSettingsFor, validatePathValue } from './settings-defaults.js';
import { TransferPathManager } from '../dist-electron/src/utils/transferPathManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化设备管理器
const deviceManager = DeviceManager.getInstance();

function createWindow() {
  const win = new BrowserWindow({
    width: 560,
    height: 360,
    frame: false,  // 移除窗口框架
    titleBarStyle: 'hidden',  // 隐藏标题栏
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-simple.js')
    }
  });

  // 加载Vite开发服务器
  win.loadURL('http://localhost:5173');
  win.webContents.openDevTools();

  // 设置IPC处理程序
  setupIPC(win);
}

function setupIPC(win) {
  const store = new Store({
    name: 'settings',
    defaults: computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync)
  });
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
      const defaultDir = deviceType === 'android'
        ? '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/'
        : '/Documents/BattleRecord/';
      const remoteDir = (typeof targetDir === 'string' && targetDir) ? targetDir : defaultDir;

      
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const limit = 500 * 1024 * 1024;
      if (fileSize > limit) {
        throw new Error('文件过大，最大支持500MB');
      }

      
      if (deviceType === 'android') {
        const ok = await execPromiseSafe(`adb -s ${deviceId} shell echo ok`);
        if (!ok) throw new Error('ADB调试未授权或设备未连接');
        const { stdout: df } = await execPromise(`adb -s ${deviceId} shell df -k /sdcard`);
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

      // 日志：开始
      transferPathManager.addTransferLog({
        deviceId,
        deviceType,
        deviceName: `${deviceType}设备`,
        sourcePath: filePath,
        targetPath,
        status: 'in_progress',
        fileSize
      });

      
      if (deviceType === 'android') {
        await execPromise(`adb -s ${deviceId} shell mkdir -p "${remoteDir}"`);
        const chunkSize = 8 * 1024 * 1024;
        const total = Math.ceil(fileSize / chunkSize);
        const buffer = fs.readFileSync(filePath);
        let startIndex = 0;
        try {
          const { stdout: existing } = await exec(`adb -s ${deviceId} shell ls -1 "${targetPath}.part*"`);
          const lines = String(existing).split('\n').filter(Boolean);
          const idxs = lines.map(l => {
            const m = l.match(/\.part(\d+)$/);
            return m ? parseInt(m[1], 10) : -1;
          }).filter(n => n >= 0);
          if (idxs.length > 0) startIndex = Math.max(...idxs) + 1;
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
              await execPromise(`adb -s ${deviceId} push "${tmp}" "${partRemote}"`);
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
        
        const parts = Array.from({ length: Math.ceil(fileSize / chunkSize) }, (_, i) => `${targetPath}.part${i}`).join(' ');
        await execPromise(`adb -s ${deviceId} shell sh -c "cat ${parts} > \"${targetPath}\" && rm ${parts}"`);
        
        const d = stats.mtime;
        const fmt = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.${String(d.getSeconds()).padStart(2,'0')}`;
        await execPromise(`adb -s ${deviceId} shell toybox touch -t ${fmt} "${targetPath}" || adb -s ${deviceId} shell touch "${targetPath}"`);
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
      return store.store;
    } catch (e) {
      return computeDefaultSettingsFor(process.platform, app.getPath.bind(app), execSync);
    }
  });

  ipcMain.handle('update-settings', async (event, payload) => {
    try {
      const next = { ...store.store, ...payload };
      store.set(next);
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

  // 传输路径与日志相关功能暂不启用（移除依赖导致）

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
});
