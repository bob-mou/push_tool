import path from 'path';
import fs from 'fs';

export function computeDefaultSettingsFor(platform, getPathFn, execSyncFn) {
  const appDir = path.dirname(process.execPath);
  const saveDir = path.join(appDir, 'PushedFiles');
  
  // 默认传输路径配置
  const defaultTransferPaths = {
    android: '/sdcard/Android/media/com.tencent.uc/BattleRecord/',
    ios: '/Documents/BattleRecord/'
  };
  const defaultTransferPathOptions = {
    android: [
      { name: '战报目录', path: '/sdcard/Android/media/com.tencent.uc/BattleRecord/' },
      { name: '引擎目录', path: '/sdcard/Android/media/com.tencent.uc/BattleRecord/' },
      { name: 'UC缓存', path: '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/' }
    ],
    ios: [
      { name: '战报目录', path: '/Documents/BattleRecord/' },
      { name: '引擎目录', path: '/sdcard/Android/media/com.tencent.uc/BattleRecord/' },
      { name: '缓存目录', path: '/Library/Caches/BattleRecord/' }
    ]
  };
  
  return {
    autoStart: true,
    notifications: true,
    saveDir,
    iosBundleId: 'com.tencent.uc',
    iosIdbMode: 'i4',
    pollingInterval: 5000,
    enableADB: true,
    enableIOS: true,
    maxRetries: 3,
    transferPaths: defaultTransferPaths,
    transferPathOptions: defaultTransferPathOptions,
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
