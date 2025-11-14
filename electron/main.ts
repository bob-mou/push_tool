import { app, BrowserWindow, ipcMain, dialog, Tray, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
// import Store from 'electron-store';
// import { spawn } from 'child_process';
import { DeviceManager } from '../src/utils/deviceManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
// const store = new Store(); // 暂时注释掉，后续使用
const deviceManager = DeviceManager.getInstance();

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
    mainWindow.webContents.openDevTools();
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

// ADB命令执行函数 - 暂时注释掉，使用设备管理器替代
/*
function executeADB(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const adb = spawn('adb', [command, ...args]);
    let output = '';
    let error = '';

    adb.stdout.on('data', (data: any) => {
      output += data.toString();
    });

    adb.stderr.on('data', (data: any) => {
      error += data.toString();
    });

    adb.on('close', (code: any) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(error || `ADB command failed with code ${code}`));
      }
    });
  });
}
*/

// 获取连接的设备列表
async function getConnectedDevices(): Promise<any[]> {
  try {
    const devices = await deviceManager.getConnectedDevices();
    return devices;
  } catch (error) {
    console.error('获取设备列表失败:', error);
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
    
    console.log(`文件推送成功: ${filePath} -> ${targetPath}`);
  } catch (error) {
    console.error('文件推送失败:', error);
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

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
