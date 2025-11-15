import path from 'path';
import fs from 'fs';

export function computeDefaultSettingsFor(platform, getPathFn, execSyncFn) {
  const docs = getPathFn('documents');
  const saveDir ='D:\\workplace\\push_files_tool_temp';
  let adbPath = '';
  let idbPath = '';
  try {
    if (platform === 'win32') {
      const out = safeExec(execSyncFn, 'where adb');
      if (out) adbPath = out.split(/\r?\n/)[0].trim();
      // 动态获取本应用目录下的 idb.exe 作为默认 idb
      const appDir = path.dirname(process.execPath);
      const localIdb = path.join(appDir, 'src', 'idb', 'idb.exe');
      if (fs.existsSync(localIdb)) idbPath = localIdb;
    } else {
      const out = safeExec(execSyncFn, 'which adb');
      if (out) adbPath = out.split(/\r?\n/)[0].trim();
      // macOS/Linux 下动态获取本应用目录下的 idb
      const appDir = path.dirname(process.execPath);
      const localIdb = path.join(appDir, 'src', 'idb', 'idb');
      if (fs.existsSync(localIdb)) idbPath = localIdb;
    }
  } catch {
    console.warn('[SettingsDefaults] 无法获取 adb/idb 路径，使用默认值');
    adbPath = 'D:\\Android\\Sdk\\platform-tools\\adb.exe';
    idbPath = 'D:\\IOS\\idb\\idb.exe';
  }
  
  // 默认传输路径配置
  const defaultTransferPaths = {
    android: '/sdcard/Android/media/com.tencent.uc/BattleRecord/',
    ios: '/Documents/BattleRecord/'
  };
  
  return {
    autoStart: true,
    notifications: true,
    adbPath,
    saveDir,
    iosToolsPath: idbPath,
    iosBundleId: 'com.tencent.uc',
    iosIdbMode: 'i4',
    transferPaths: defaultTransferPaths,
    autoCreateDirectories: true,
    enableTransferLogging: true,
    logLevel: 'info' // debug, info, warn, error
  };
}

export function validatePathValue(platform, input, kind) {
  if (!input || typeof input !== 'string') return { valid: false, exists: false, error: '空路径' };
  const trimmed = input.trim();
  if (!trimmed) return { valid: false, exists: false, error: '空路径' };
  if (platform === 'win32') {
    const rest = trimmed.length > 2 && /^[A-Za-z]:/.test(trimmed) ? trimmed.slice(2) : trimmed;
    if (/[<>:"\|?*]/.test(rest)) return { valid: false, exists: false, error: '包含非法字符' };
  }
  try {
    const exists = fs.existsSync(trimmed);
    if (kind === 'directory') {
      const statOk = exists ? fs.statSync(trimmed).isDirectory() : false;
      return { valid: statOk, exists, error: statOk ? undefined : exists ? '不是目录' : '不存在' };
    }
    if (kind === 'file') {
      const statOk = exists ? fs.statSync(trimmed).isFile() : false;
      return { valid: statOk, exists, error: statOk ? undefined : exists ? '不是文件' : '不存在' };
    }
    return { valid: exists, exists, error: exists ? undefined : '不存在' };
  } catch {
    return { valid: false, exists: false, error: '无法访问' };
  }
}

function safeExec(execSyncFn, cmd) {
  try {
    return execSyncFn(cmd, { encoding: 'utf8' });
  } catch {
    return '';
  }
}
