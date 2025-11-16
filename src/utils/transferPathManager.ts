export interface TransferPathConfig {
  android: string;
  ios: string;
}

export interface TransferLogEntry {
  timestamp: string;
  deviceId: string;
  deviceType: 'android' | 'ios';
  deviceName: string;
  sourcePath: string;
  targetPath: string;
  status: 'success' | 'failed' | 'in_progress';
  error?: string;
  duration?: number;
  fileSize?: number;
}

export class TransferPathManager {
  private static instance: TransferPathManager;
  private transferLog: TransferLogEntry[] = [];
  private maxLogEntries = 1000;

  static getInstance(): TransferPathManager {
    if (!TransferPathManager.instance) {
      TransferPathManager.instance = new TransferPathManager();
    }
    return TransferPathManager.instance;
  }

  // 获取设备类型的默认传输路径
  getDefaultPath(deviceType: 'android' | 'ios'): string {
    const defaultPaths = {
      android: '/sdcard/Android/media/com.tencent.uc/BattleRecord/',
      ios: '/Documents/BattleRecord/'
    };
    return defaultPaths[deviceType];
  }

  // 验证传输路径
  validatePath(path: string, deviceType: 'android' | 'ios'): { valid: boolean; error?: string } {
    if (!path || typeof path !== 'string') {
      return { valid: false, error: '路径不能为空' };
    }

    const trimmedPath = path.trim();
    if (!trimmedPath) {
      return { valid: false, error: '路径不能为空' };
    }

    // 检查路径格式
    if (!trimmedPath.startsWith('/')) {
      return { valid: false, error: '路径必须以/开头' };
    }

    // 检查非法字符
    const invalidChars = /[<>:"|?*\x00-\x1F]/;
    if (invalidChars.test(trimmedPath)) {
      return { valid: false, error: '路径包含非法字符' };
    }

    // 检查路径长度
    if (trimmedPath.length > 500) {
      return { valid: false, error: '路径过长' };
    }

    // 设备类型特定验证
    if (deviceType === 'android') {
      // Android路径验证
      if (!trimmedPath.startsWith('/sdcard/') && !trimmedPath.startsWith('/storage/')) {
        return { valid: false, error: 'Android路径必须以/sdcard/或/storage/开头' };
      }
    } else if (deviceType === 'ios') {
      // iOS路径验证
      if (!trimmedPath.startsWith('/Documents/') && !trimmedPath.startsWith('/Library/')) {
        return { valid: false, error: 'iOS路径必须以/Documents/或/Library/开头' };
      }
    }

    return { valid: true };
  }

  // 标准化路径
  normalizePath(path: string): string {
    if (!path) return '';
    
    // 移除多余的斜杠
    let normalized = path.replace(/\/+/g, '/');
    
    // 确保以斜杠结尾（对于目录）
    if (!normalized.endsWith('/')) {
      normalized += '/';
    }
    
    // 移除开头的多余斜杠
    normalized = normalized.replace(/^\/+/, '/');
    
    return normalized;
  }

  // 生成目标文件路径
  generateTargetPath(sourcePath: string, targetDir: string): string {
    const fileName = sourcePath.split('/').pop() || sourcePath.split('\\').pop() || '';
    const normalizedTargetDir = this.normalizePath(targetDir);
    return `${normalizedTargetDir}${fileName}`;
  }

  // 添加传输日志
  addTransferLog(entry: Omit<TransferLogEntry, 'timestamp'>): void {
    const fullEntry: TransferLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };
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
    
    // 限制日志条目数量
    if (this.transferLog.length > this.maxLogEntries) {
      this.transferLog = this.transferLog.slice(0, this.maxLogEntries);
    }
  }

  // 获取传输日志
  getTransferLog(limit?: number): TransferLogEntry[] {
    const logs = this.transferLog.filter(log => log && log.status !== 'in_progress');
    return limit ? logs.slice(0, limit) : logs;
  }

  // 清除传输日志
  clearTransferLog(): void {
    this.transferLog = [];
  }

  // 获取传输统计
  getTransferStats(): {
    total: number;
    successful: number;
    failed: number;
    byDeviceType: { android: number; ios: number };
    recent: TransferLogEntry[];
  } {
    const total = this.transferLog.length;
    const successful = this.transferLog.filter(log => log.status === 'success').length;
    const failed = this.transferLog.filter(log => log.status === 'failed').length;
    const android = this.transferLog.filter(log => log.deviceType === 'android').length;
    const ios = this.transferLog.filter(log => log.deviceType === 'ios').length;
    const recent = this.transferLog.slice(0, 10);

    return {
      total,
      successful,
      failed,
      byDeviceType: { android, ios },
      recent
    };
  }

  // 格式化文件大小
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 格式化传输时间
  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}
