import { app, BrowserWindow, ipcMain, dialog, Tray, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeviceManager } from '../src/utils/deviceManager.js';
import { DeviceMonitor } from '../src/utils/deviceMonitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
// const store = new Store(); // 暂时注释掉，后续使用
const deviceManager = DeviceManager.getInstance();
const deviceMonitor = DeviceMonitor.getInstance();

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 560,
    height: 360,
    frame: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../build/icon.ico'),
    show: false
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('minimize', () => {
    mainWindow?.hide();
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  // 隐藏菜单栏并保留窗口阴影
  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setHasShadow(true);
}

function createTray() {
  const iconPath = path.join(__dirname, '../build/icon.ico');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      }
    },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('文件推送工具');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}


// 获取连接的设备列表
  async function getConnectedDevices(): Promise<any[]> {
    try {
      const devices = await deviceManager.getConnectedDevices();
      return devices;
    } catch (error) {
      return [];
    }
  }

// 推送文件到设备
  async function pushFileToDevice(deviceId: string, filePath: string, deviceType: string): Promise<void> {
    try {
      let targetPath = '';
      
      if (deviceType === 'android') {
        targetPath = '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/';
        await deviceManager.pushFileToAndroid(deviceId, filePath, targetPath);
      } else if (deviceType === 'ios') {
        targetPath = '/Documents/BattleRecord/';
        await deviceManager.pushFileToIOS(deviceId, filePath, targetPath);
      }
    } catch (error) {
      throw error;
    }
  }

// IPC通信处理
ipcMain.handle('get-devices', async () => {
  return await getConnectedDevices();
});

ipcMain.handle('push-file', async (_, { deviceId, filePath, deviceType }) => {
  try {
    await pushFileToDevice(deviceId, filePath, deviceType);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-help', async () => {
  const helpWin = new BrowserWindow({
    width: 532,
    height: 360,
    useContentSize: true,
    resizable: true,
    minimizable: true,
    fullscreenable: false,
    parent: mainWindow ?? undefined,
    modal: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  if (isDev) {
    helpWin.loadURL('http://localhost:5173/#/help');
  } else {
    helpWin.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'help' });
  }
});

// 设备监控相关函数
let isDeviceMonitorSetup = false;

function setupDeviceMonitor() {
  if (isDeviceMonitorSetup) {
    return;
  }

  // 监听设备状态变化事件
  deviceMonitor.on('deviceStatusChanged', (event) => {
    // 通知渲染进程
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('device-status-changed', event);
    }
  });

  // 监听错误事件
  deviceMonitor.on('error', (error) => {
    // 通知渲染进程错误信息
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('device-monitor-error', error.message);
    }
  });

  // 启动设备监控
  deviceMonitor.start();
  isDeviceMonitorSetup = true;
}

// 停止设备监控
function stopDeviceMonitor() {
  deviceMonitor.stop();
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // 设置设备监控
  setupDeviceMonitor();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      // 窗口重新创建后，确保设备监控仍在运行
      if (!deviceMonitor.isRunning()) {
        setupDeviceMonitor();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理资源
app.on('before-quit', () => {
  stopDeviceMonitor();
});

// 新增IPC通信处理 - 设备监控相关
ipcMain.handle('start-device-monitoring', () => {
  if (!deviceMonitor.isRunning()) {
    deviceMonitor.start();
  }
  return { success: true };
});

ipcMain.handle('stop-device-monitoring', () => {
  if (deviceMonitor.isRunning()) {
    deviceMonitor.stop();
  }
  return { success: true };
});

ipcMain.handle('get-device-monitor-config', () => {
  return deviceMonitor.getConfig();
});

ipcMain.handle('update-device-monitor-config', (_, config) => {
  deviceMonitor.updateConfig(config);
  return { success: true };
});

ipcMain.handle('force-refresh-devices', async () => {
  try {
    const devices = await deviceMonitor.forceRefresh();
    return { success: true, devices };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
