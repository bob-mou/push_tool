import { app, BrowserWindow, ipcMain, dialog, Tray, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
// import Store from 'electron-store';
// import { spawn } from 'child_process';
import { DeviceManager } from '../src/utils/deviceManager.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow = null;
let tray = null;
// const store = new Store(); // 暂时注释掉，后续使用
const deviceManager = DeviceManager.getInstance();
const isDev = process.env.NODE_ENV === 'development';
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
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
    }
    else {
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
            }
            else {
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
async function getConnectedDevices() {
    try {
        const devices = await deviceManager.getConnectedDevices();
        return devices;
    }
    catch (error) {
        console.error('获取设备列表失败:', error);
        return [];
    }
}
// 推送文件到设备
async function pushFileToDevice(deviceId, filePath, deviceType) {
    try {
        let targetPath = '';
        if (deviceType === 'android') {
            targetPath = '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/';
            await deviceManager.pushFileToAndroid(deviceId, filePath, targetPath);
        }
        else if (deviceType === 'ios') {
            targetPath = '/Documents/BattleRecord/';
            await deviceManager.pushFileToIOS(deviceId, filePath, targetPath);
        }
        console.log(`文件推送成功: ${filePath} -> ${targetPath}`);
    }
    catch (error) {
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
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '所有文件', extensions: ['*'] }
        ]
    });
    return result.canceled ? null : result.filePaths[0];
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
