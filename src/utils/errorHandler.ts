import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context?: {
    transferId?: string;
    deviceId?: string;
    deviceName?: string;
    filePath?: string;
    operation?: string;
  };
  metadata?: {
    appVersion?: string;
    platform?: string;
    nodeVersion?: string;
    electronVersion?: string;
  };
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorLog[] = [];
  private errorLogFile: string;
  private maxLogEntries = 5000;

  private constructor() {
    const userDataPath = app?.getPath('userData') || process.cwd();
    this.errorLogFile = path.join(userDataPath, 'error-logs.json');
    this.loadErrorLogs();
    this.setupGlobalErrorHandling();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 记录错误
   */
  logError(
    message: string,
    error?: Error,
    context?: ErrorLog['context']
  ): void {
    const errorLog: ErrorLog = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      stack: error?.stack,
      context,
      metadata: this.getSystemMetadata(),
    };

    this.errorLog.unshift(errorLog);
    this.cleanupOldLogs();
    this.saveErrorLogs();
    
    // 同时输出到控制台
    console.error(`[ERROR] ${message}`, error || '');
  }

  /**
   * 记录警告
   */
  logWarning(
    message: string,
    context?: ErrorLog['context']
  ): void {
    const warningLog: ErrorLog = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      context,
      metadata: this.getSystemMetadata(),
    };

    this.errorLog.unshift(warningLog);
    this.cleanupOldLogs();
    this.saveErrorLogs();
    
    console.warn(`[WARNING] ${message}`);
  }

  /**
   * 记录信息
   */
  logInfo(
    message: string,
    context?: ErrorLog['context']
  ): void {
    const infoLog: ErrorLog = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      metadata: this.getSystemMetadata(),
    };

    this.errorLog.unshift(infoLog);
    this.cleanupOldLogs();
    this.saveErrorLogs();
    
    console.log(`[INFO] ${message}`);
  }

  /**
   * 获取错误日志
   */
  getErrorLogs(level?: ErrorLog['level'], limit?: number): ErrorLog[] {
    let logs = this.errorLog;
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * 获取特定传输的错误日志
   */
  getTransferErrorLogs(transferId: string): ErrorLog[] {
    return this.errorLog.filter(log => log.context?.transferId === transferId);
  }

  /**
   * 获取特定设备的错误日志
   */
  getDeviceErrorLogs(deviceId: string): ErrorLog[] {
    return this.errorLog.filter(log => log.context?.deviceId === deviceId);
  }

  /**
   * 搜索错误日志
   */
  searchErrorLogs(query: string): ErrorLog[] {
    const lowerQuery = query.toLowerCase();
    return this.errorLog.filter(log =>
      log.message.toLowerCase().includes(lowerQuery) ||
      log.stack?.toLowerCase().includes(lowerQuery) ||
      log.context?.operation?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 导出错误日志到文件
   */
  async exportErrorLogs(filePath: string): Promise<void> {
    const logs = this.getErrorLogs();
    
    if (logs.length === 0) {
      throw new Error('没有可导出的错误日志');
    }

    await fs.writeJson(filePath, logs, { spaces: 2 });
  }

  /**
   * 清除所有错误日志
   */
  clearErrorLogs(): void {
    this.errorLog = [];
    this.saveErrorLogs();
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    byOperation: Record<string, number>;
    byDevice: Record<string, number>;
  } {
    const stats = {
      total: this.errorLog.length,
      errors: this.errorLog.filter(log => log.level === 'error').length,
      warnings: this.errorLog.filter(log => log.level === 'warning').length,
      info: this.errorLog.filter(log => log.level === 'info').length,
      byOperation: {} as Record<string, number>,
      byDevice: {} as Record<string, number>,
    };

    this.errorLog.forEach(log => {
      if (log.context?.operation) {
        stats.byOperation[log.context.operation] = 
          (stats.byOperation[log.context.operation] || 0) + 1;
      }
      
      if (log.context?.deviceId) {
        stats.byDevice[log.context.deviceId] = 
          (stats.byDevice[log.context.deviceId] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * 创建错误报告
   */
  async createErrorReport(): Promise<string> {
    const report = {
      timestamp: new Date().toISOString(),
      systemInfo: this.getSystemMetadata(),
      stats: this.getErrorStats(),
      recentErrors: this.getErrorLogs('error', 50),
      recentWarnings: this.getErrorLogs('warning', 50),
    };

    const reportPath = path.join(
      path.dirname(this.errorLogFile),
      `error-report-${Date.now()}.json`
    );

    await fs.writeJson(reportPath, report, { spaces: 2 });
    return reportPath;
  }

  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandling(): void {
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      this.logError('未捕获的异常', error, { operation: 'global' });
    });

    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.logError('未处理的Promise拒绝', error, { operation: 'global' });
    });

    // 处理警告
    process.on('warning', (warning) => {
      this.logWarning(warning.message, { operation: 'global' });
    });
  }

  /**
   * 获取系统元数据
   */
  private getSystemMetadata(): ErrorLog['metadata'] {
    return {
      appVersion: process.env.npm_package_version || 'unknown',
      platform: process.platform,
      nodeVersion: process.version,
      electronVersion: process.versions.electron || 'unknown',
    };
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理旧的错误日志
   */
  private cleanupOldLogs(): void {
    if (this.errorLog.length > this.maxLogEntries) {
      this.errorLog = this.errorLog.slice(0, this.maxLogEntries);
    }
  }

  /**
   * 保存错误日志
   */
  private async saveErrorLogs(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.errorLogFile));
      await fs.writeJson(this.errorLogFile, this.errorLog, { spaces: 2 });
    } catch (error) {
      console.error('保存错误日志失败:', error);
    }
  }

  /**
   * 加载错误日志
   */
  private async loadErrorLogs(): Promise<void> {
    try {
      if (await fs.pathExists(this.errorLogFile)) {
        const data = await fs.readJson(this.errorLogFile);
        this.errorLog = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error('加载错误日志失败:', error);
      this.errorLog = [];
    }
  }
}

/**
 * 便捷的错误处理函数
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * 包装异步函数的错误处理
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorLog['context']
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorHandler.logError(
        `函数执行失败: ${fn.name}`,
        error instanceof Error ? error : new Error(errorMessage),
        { ...context, operation: fn.name }
      );
      throw error;
    }
  }) as T;
}