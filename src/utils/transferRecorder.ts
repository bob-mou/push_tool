import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';

export interface TransferRecord {
  id: string;
  sourcePath: string;
  sourceFileName: string;
  targetPath: string;
  fileSize: number;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'success' | 'failed' | 'cancelled';
  error?: string;
  retryCount: number;
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'android' | 'ios';
  checksum?: string;
  transferMethod?: 'adb' | 'ios' | 'local';
}

export interface TransferStats {
  totalTransfers: number;
  successfulTransfers: number;
  failedTransfers: number;
  cancelledTransfers: number;
  totalFileSize: number;
  totalDuration: number;
  averageSpeed: number;
  successRate: number;
  deviceStats: {
    android: number;
    ios: number;
    local: number;
  };
}

export class TransferRecorder {
  private static instance: TransferRecorder;
  private records: TransferRecord[] = [];
  private recordsFile: string;
  private maxRecords = 10000;

  private constructor() {
    const userDataPath = app?.getPath('userData') || process.cwd();
    this.recordsFile = path.join(userDataPath, 'transfer-records.json');
    this.loadRecords();
  }

  static getInstance(): TransferRecorder {
    if (!TransferRecorder.instance) {
      TransferRecorder.instance = new TransferRecorder();
    }
    return TransferRecorder.instance;
  }

  /**
   * 开始一个新的传输记录
   */
  startTransfer(
    sourcePath: string,
    targetPath: string,
    fileSize: number,
    deviceInfo?: {
      deviceId: string;
      deviceName: string;
      deviceType: 'android' | 'ios';
    },
    transferMethod?: 'adb' | 'ios' | 'local'
  ): string {
    const id = this.generateTransferId();
    const record: TransferRecord = {
      id,
      sourcePath,
      sourceFileName: path.basename(sourcePath),
      targetPath,
      fileSize,
      startTime: new Date().toISOString(),
      endTime: '',
      duration: 0,
      status: 'failed', // 默认失败，成功时再更新
      retryCount: 0,
      deviceId: deviceInfo?.deviceId,
      deviceName: deviceInfo?.deviceName,
      deviceType: deviceInfo?.deviceType,
      transferMethod: transferMethod || 'local',
    };

    this.records.unshift(record);
    this.cleanupOldRecords();
    this.saveRecords();

    return id;
  }

  /**
   * 更新传输状态为成功
   */
  completeTransfer(
    transferId: string,
    duration: number,
    checksum?: string
  ): void {
    const record = this.records.find(r => r.id === transferId);
    if (record) {
      record.status = 'success';
      record.endTime = new Date().toISOString();
      record.duration = duration;
      record.checksum = checksum;
      this.saveRecords();
    }
  }

  /**
   * 更新传输状态为失败
   */
  failTransfer(
    transferId: string,
    error: string,
    duration?: number
  ): void {
    const record = this.records.find(r => r.id === transferId);
    if (record) {
      record.status = 'failed';
      record.error = error;
      record.endTime = new Date().toISOString();
      if (duration) {
        record.duration = duration;
      }
      this.saveRecords();
    }
  }

  /**
   * 更新传输状态为取消
   */
  cancelTransfer(transferId: string): void {
    const record = this.records.find(r => r.id === transferId);
    if (record) {
      record.status = 'cancelled';
      record.endTime = new Date().toISOString();
      record.duration = Date.now() - new Date(record.startTime).getTime();
      this.saveRecords();
    }
  }

  /**
   * 增加重试次数
   */
  incrementRetryCount(transferId: string): void {
    const record = this.records.find(r => r.id === transferId);
    if (record) {
      record.retryCount++;
      this.saveRecords();
    }
  }

  /**
   * 获取所有传输记录
   */
  getAllRecords(limit?: number): TransferRecord[] {
    const sortedRecords = [...this.records].sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    return limit ? sortedRecords.slice(0, limit) : sortedRecords;
  }

  /**
   * 获取成功的传输记录
   */
  getSuccessfulRecords(limit?: number): TransferRecord[] {
    return this.getAllRecords()
      .filter(r => r.status === 'success')
      .slice(0, limit);
  }

  /**
   * 获取失败的传输记录
   */
  getFailedRecords(limit?: number): TransferRecord[] {
    return this.getAllRecords()
      .filter(r => r.status === 'failed')
      .slice(0, limit);
  }

  /**
   * 获取传输统计
   */
  getTransferStats(): TransferStats {
    const records = this.records;
    const totalTransfers = records.length;
    const successfulTransfers = records.filter(r => r.status === 'success').length;
    const failedTransfers = records.filter(r => r.status === 'failed').length;
    const cancelledTransfers = records.filter(r => r.status === 'cancelled').length;
    const totalFileSize = records.reduce((sum, r) => sum + r.fileSize, 0);
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const averageSpeed = totalDuration > 0 ? totalFileSize / totalDuration : 0;
    const successRate = totalTransfers > 0 ? (successfulTransfers / totalTransfers) * 100 : 0;

    const deviceStats = {
      android: records.filter(r => r.deviceType === 'android').length,
      ios: records.filter(r => r.deviceType === 'ios').length,
      local: records.filter(r => !r.deviceType).length,
    };

    return {
      totalTransfers,
      successfulTransfers,
      failedTransfers,
      cancelledTransfers,
      totalFileSize,
      totalDuration,
      averageSpeed,
      successRate,
      deviceStats,
    };
  }

  /**
   * 导出传输记录为CSV格式
   */
  async exportToCSV(filePath: string): Promise<void> {
    const records = this.getAllRecords();
    
    if (records.length === 0) {
      throw new Error('没有可导出的传输记录');
    }

    const headers = [
      'ID',
      '源文件路径',
      '源文件名',
      '目标路径',
      '文件大小(字节)',
      '开始时间',
      '结束时间',
      '传输时长(毫秒)',
      '状态',
      '错误信息',
      '重试次数',
      '设备ID',
      '设备名称',
      '设备类型',
      '校验和',
      '传输方式'
    ];

    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.id,
        `"${record.sourcePath}"`,
        `"${record.sourceFileName}"`,
        `"${record.targetPath}"`,
        record.fileSize,
        `"${record.startTime}"`,
        `"${record.endTime}"`,
        record.duration,
        record.status,
        `"${record.error || ''}"`,
        record.retryCount,
        `"${record.deviceId || ''}"`,
        `"${record.deviceName || ''}"`,
        `"${record.deviceType || ''}"`,
        `"${record.checksum || ''}"`,
        `"${record.transferMethod || ''}"`
      ].join(','))
    ].join('\n');

    await fs.writeFile(filePath, csvContent, 'utf8');
  }

  /**
   * 搜索传输记录
   */
  searchRecords(query: string): TransferRecord[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllRecords().filter(record =>
      record.sourceFileName.toLowerCase().includes(lowerQuery) ||
      record.sourcePath.toLowerCase().includes(lowerQuery) ||
      record.targetPath.toLowerCase().includes(lowerQuery) ||
      record.deviceName?.toLowerCase().includes(lowerQuery) ||
      record.error?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 清除所有记录
   */
  clearAllRecords(): void {
    this.records = [];
    this.saveRecords();
  }

  /**
   * 删除指定时间之前的记录
   */
  cleanupOldRecords(beforeDate?: Date): void {
    const cutoffDate = beforeDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 默认30天前
    this.records = this.records.filter(r => new Date(r.startTime) > cutoffDate);
    this.saveRecords();
  }

  /**
   * 获取记录数量
   */
  getRecordCount(): number {
    return this.records.length;
  }

  /**
   * 生成唯一的传输ID
   */
  private generateTransferId(): string {
    return `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存记录到文件
   */
  private async saveRecords(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.recordsFile));
      await fs.writeJson(this.recordsFile, this.records, { spaces: 2 });
    } catch (error) {
      console.error('保存传输记录失败:', error);
    }
  }

  /**
   * 从文件加载记录
   */
  private async loadRecords(): Promise<void> {
    try {
      if (await fs.pathExists(this.recordsFile)) {
        const data = await fs.readJson(this.recordsFile);
        this.records = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error('加载传输记录失败:', error);
      this.records = [];
    }
  }
}