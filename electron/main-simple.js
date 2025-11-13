import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeviceManager } from '../dist-electron/src/utils/deviceManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化设备管理器
const deviceManager = DeviceManager.getInstance();

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,  // 移除窗口框架
    titleBarStyle: 'hidden',  // 隐藏标题栏
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

  // 推送文件
  ipcMain.handle('push-file', async (event, { deviceId, filePath, deviceType }) => {
    try {
      console.log('推送文件:', { deviceId, filePath, deviceType });
      
      if (deviceType === 'android') {
        // Android目标目录
        const targetDir = '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/';
        await deviceManager.pushFileToAndroid(deviceId, filePath, targetDir);
      } else if (deviceType === 'ios') {
        // iOS目标目录
        const targetDir = '/Documents/BattleRecord/';
        await deviceManager.pushFileToIOS(deviceId, filePath, targetDir);
      }
      
      return { success: true };
    } catch (error) {
      console.error('文件推送失败:', error);
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