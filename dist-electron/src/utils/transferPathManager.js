export class TransferPathManager {
  static instance;
  transferLog = [];
  maxLogEntries = 1000;

  static getInstance() {
    if (!TransferPathManager.instance) {
      TransferPathManager.instance = new TransferPathManager();
    }
    return TransferPathManager.instance;
  }

  getDefaultPath(deviceType) {
    const defaultPaths = {
      android: '/sdcard/Android/media/com.tencent.uc/BattleRecord/',
      ios: '/Documents/BattleRecord/'
    };
    return defaultPaths[deviceType];
  }

  validatePath(p, deviceType) {
    if (!p || typeof p !== 'string') return { valid: false, error: '路径不能为空' };
    const trimmed = p.trim();
    if (!trimmed) return { valid: false, error: '路径不能为空' };
    if (!trimmed.startsWith('/')) return { valid: false, error: '路径必须以/开头' };
    const invalidChars = /[<>:"|?*\x00-\x1F]/;
    if (invalidChars.test(trimmed)) return { valid: false, error: '路径包含非法字符' };
    if (trimmed.length > 500) return { valid: false, error: '路径过长' };
    if (deviceType === 'android') {
      if (!trimmed.startsWith('/sdcard/') && !trimmed.startsWith('/storage/')) {
        return { valid: false, error: 'Android路径必须以/sdcard/或/storage/开头' };
      }
    } else if (deviceType === 'ios') {
      if (!trimmed.startsWith('/Documents/') && !trimmed.startsWith('/Library/')) {
        return { valid: false, error: 'iOS路径必须以/Documents/或/Library/开头' };
      }
    }
    return { valid: true };
  }

  normalizePath(p) {
    if (!p) return '';
    let normalized = String(p).replace(/\\/g, '/');
    normalized = normalized.replace(/\/+/g, '/');
    if (!normalized.endsWith('/')) normalized += '/';
    normalized = normalized.replace(/^\/+/, '/');
    return normalized;
  }

  generateTargetPath(sourcePath, targetDir) {
    const parts = sourcePath.split('/');
    const alt = sourcePath.split('\\');
    const fileName = parts.pop() || alt.pop() || '';
    const dir = this.normalizePath(targetDir);
    return `${dir}${fileName}`;
  }

  addTransferLog(entry) {
    const fullEntry = { ...entry, timestamp: new Date().toISOString() };
    if (fullEntry.status !== 'in_progress') {
      this.transferLog = this.transferLog.filter((l) => {
        return !(l && l.status === 'in_progress'
          && l.deviceId === fullEntry.deviceId
          && l.deviceType === fullEntry.deviceType
          && l.sourcePath === fullEntry.sourcePath
          && l.targetPath === fullEntry.targetPath);
      });
    }
    this.transferLog.unshift(fullEntry);
    if (this.transferLog.length > this.maxLogEntries) {
      this.transferLog = this.transferLog.slice(0, this.maxLogEntries);
    }
  }

  getTransferLog(limit) {
    const logs = this.transferLog.filter((l) => Boolean(l) && l.status !== 'in_progress');
    return limit ? logs.slice(0, limit) : logs;
  }

  clearTransferLog() {
    this.transferLog = [];
  }

  getTransferStats() {
    const total = this.transferLog.length;
    const successful = this.transferLog.filter((l) => l.status === 'success').length;
    const failed = this.transferLog.filter((l) => l.status === 'failed').length;
    const android = this.transferLog.filter((l) => l.deviceType === 'android').length;
    const ios = this.transferLog.filter((l) => l.deviceType === 'ios').length;
    const recent = this.transferLog.slice(0, 10);
    return { total, successful, failed, byDeviceType: { android, ios }, recent };
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}
