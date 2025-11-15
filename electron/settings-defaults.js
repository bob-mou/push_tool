import path from 'path';
import fs from 'fs';

export function computeDefaultSettingsFor(platform, getPathFn, execSyncFn) {
  const docs = getPathFn('documents');
  const saveDir = platform === 'win32'
    ? 'D:\\workplace\\push_files_tool_temp'
    : path.join(docs, 'FilesPush');
  let adbPath = '';
  try {
    if (platform === 'win32') {
      const out = safeExec(execSyncFn, 'where adb');
      if (out) adbPath = out.split(/\r?\n/)[0].trim();
      // iOS 统一使用本地 idb.exe，不在此处探测
    } else {
      const out = safeExec(execSyncFn, 'which adb');
      if (out) adbPath = out.split(/\r?\n/)[0].trim();
      // iOS 统一使用本地 idb，不在此处探测
    }
  } catch {}
  
  // 默认传输路径配置
  const defaultTransferPaths = {
    android: '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/',
    ios: '/Documents/BattleRecord/'
  };
  
  return {
    autoStart: true,
    notifications: true,
    adbPath,
    saveDir,
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
