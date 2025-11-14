import { DeviceManager, Device } from './deviceManager';
import { TransferRecorder } from './transferRecorder';
import { TransferRetryManager } from './transferRetryManager';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createHash } from 'crypto';

const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

export interface TransferResult {
  success: boolean;
  transferId: string;
  fileSize: number;
  duration: number;
  checksum?: string;
  error?: string;
  retryCount: number;
}

export interface TransferOptions {
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
    maxDelay?: number;
  };
  calculateChecksum?: boolean;
  verifyTransfer?: boolean;
}

export class EnhancedDeviceManager {
  private static instance: EnhancedDeviceManager;
  private deviceManager = DeviceManager.getInstance();
  private recorder = TransferRecorder.getInstance();
  private retryManager = TransferRetryManager.getInstance();

  static getInstance(): EnhancedDeviceManager {
    if (!EnhancedDeviceManager.instance) {
      EnhancedDeviceManager.instance = new EnhancedDeviceManager();
    }
    return EnhancedDeviceManager.instance;
  }

  /**
   * 获取所有连接的设备
   */
  async getConnectedDevices(): Promise<Device[]> {
    return this.deviceManager.getConnectedDevices();
  }

  /**
   * 推送文件到设备，集成记录和重试功能
   */
  async pushFileWithRecording(
    device: Device,
    localPath: string,
    remotePath: string,
    options: TransferOptions = {}
  ): Promise<TransferResult> {
    const startTime = Date.now();
    
    try {
      // 检查本地文件
      const fileStats = await fs.stat(localPath);
      if (!fileStats.isFile()) {
        throw new Error(`路径不是文件: ${localPath}`);
      }

      // 开始传输记录
      const transferId = this.recorder.startTransfer(
        localPath,
        remotePath,
        fileStats.size,
        {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
        },
        device.type === 'android' ? 'adb' : 'ios'
      );

      let checksum: string | undefined;
      if (options.calculateChecksum) {
        checksum = await this.calculateFileChecksum(localPath);
      }

      // 执行带重试的传输
      const retryResult = await this.retryManager.executeWithRetry(
        transferId,
        async () => {
          try {
            if (device.type === 'android') {
              await this.deviceManager.pushFileToAndroid(device.id, localPath, remotePath);
            } else {
              await this.deviceManager.pushFileToIOS(device.id, localPath, remotePath);
            }

            // 验证传输
            if (options.verifyTransfer && checksum) {
              const remoteChecksum = await this.getRemoteFileChecksum(device, remotePath);
              if (remoteChecksum !== checksum) {
                throw new Error('文件校验失败，传输可能不完整');
              }
            }

            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // 判断是否应该重试
            if (this.retryManager.isRetryableError(errorMessage)) {
              console.warn(`可重试错误: ${errorMessage}`);
              return false;
            } else {
              throw error; // 不可重试的错误直接抛出
            }
          }
        },
        options.retryConfig
      );

      const duration = Date.now() - startTime;

      if (retryResult.success) {
        // 传输成功
        this.recorder.completeTransfer(transferId, duration, checksum);
        
        return {
          success: true,
          transferId,
          fileSize: fileStats.size,
          duration,
          checksum,
          retryCount: retryResult.finalAttempt - 1,
        };
      } else {
        // 传输失败
        this.recorder.failTransfer(transferId, retryResult.lastError || '未知错误', duration);
        
        return {
          success: false,
          transferId,
          fileSize: fileStats.size,
          duration,
          error: retryResult.lastError,
          retryCount: retryResult.finalAttempt - 1,
        };
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 创建失败的记录
      const transferId = this.recorder.startTransfer(
        localPath,
        remotePath,
        0,
        {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
        },
        device.type === 'android' ? 'adb' : 'ios'
      );
      
      this.recorder.failTransfer(transferId, errorMessage, duration);
      
      return {
        success: false,
        transferId,
        fileSize: 0,
        duration,
        error: errorMessage,
        retryCount: 0,
      };
    }
  }

  /**
   * 批量推送文件到设备
   */
  async batchPushFilesWithRecording(
    device: Device,
    files: Array<{ localPath: string; remotePath: string }>,
    options: TransferOptions = {}
  ): Promise<TransferResult[]> {
    const results: TransferResult[] = [];
    
    for (const file of files) {
      const result = await this.pushFileWithRecording(
        device,
        file.localPath,
        file.remotePath,
        options
      );
      results.push(result);
    }
    
    return results;
  }

  /**
   * 计算本地文件校验和
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    const stream = fs.createReadStream(filePath);
    const hash = createHash('sha256');
    
    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * 获取远程文件校验和（仅Android支持）
   */
  private async getRemoteFileChecksum(device: Device, remotePath: string): Promise<string> {
    if (device.type !== 'android') {
      return ''; // iOS暂不支持远程校验
    }

    try {
      const { stdout } = await execPromise(
        `adb -s ${device.id} shell sha256sum "${remotePath}"`
      );
      return stdout.split(' ')[0];
    } catch (error) {
      console.warn('获取远程文件校验和失败:', error);
      return '';
    }
  }

  /**
   * 获取传输统计
   */
  getTransferStats() {
    return this.recorder.getTransferStats();
  }

  /**
   * 获取传输记录
   */
  getTransferRecords(limit?: number) {
    return this.recorder.getAllRecords(limit);
  }

  /**
   * 导出传输记录到CSV
   */
  async exportTransferRecords(filePath: string) {
    return this.recorder.exportToCSV(filePath);
  }

  /**
   * 搜索传输记录
   */
  searchTransferRecords(query: string) {
    return this.recorder.searchRecords(query);
  }

  /**
   * 清除所有传输记录
   */
  clearTransferRecords() {
    this.recorder.clearAllRecords();
  }
}