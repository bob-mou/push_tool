import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createHash } from 'crypto';

const pipelineAsync = promisify(pipeline);

export interface TransferOptions {
  preserveAttributes?: boolean;
  overwrite?: boolean;
  atomicMove?: boolean;
  conflictStrategy?: 'overwrite' | 'rename' | 'skip';
}

export interface TransferResult {
  success: boolean;
  sourcePath: string;
  targetPath: string;
  finalPath?: string;
  fileSize: number;
  duration: number;
  checksum?: string;
  error?: string;
}

export interface FileConflictInfo {
  exists: boolean;
  suggestedName: string;
  originalName: string;
  targetDir: string;
}

export class FileTransferManager {
  private static instance: FileTransferManager;
  private tempDir: string;
  private saveDir: string;

  private constructor() {
    this.saveDir = this.getDefaultSaveDir();
    this.tempDir = path.join(this.saveDir, '.temp');
    this.ensureDirectories();
    this.initFromIPC();
  }

  /**
   * 使用设置初始化文件传输管理器
   */
  static initializeWithSettings(settings: { saveDir?: string }): FileTransferManager {
    const instance = FileTransferManager.getInstance();
    if (settings.saveDir) {
      instance.setSaveDir(settings.saveDir);
    }
    return instance;
  }

  static getInstance(): FileTransferManager {
    if (!FileTransferManager.instance) {
      FileTransferManager.instance = new FileTransferManager();
    }
    return FileTransferManager.instance;
  }

  private getDefaultSaveDir(): string {
    const documentsDir = path.join(os.homedir(), 'Documents');
    return path.join(documentsDir, 'FilePush', 'ReceivedFiles');
  }

  private async initFromIPC(): Promise<void> {
    try {
      const api = (window as any)?.electronAPI;
      if (api && typeof api.getSaveDir === 'function') {
        const dir = await api.getSaveDir();
        if (typeof dir === 'string' && dir.trim()) {
          this.setSaveDir(dir.trim());
        }
      }
    } catch {}
  }

  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(this.tempDir);
    await fs.ensureDir(this.saveDir);
  }

  /**
   * 设置保存目录
   */
  setSaveDir(saveDir: string): void {
    this.saveDir = saveDir;
    this.tempDir = path.join(this.saveDir, '.temp');
    fs.ensureDirSync(this.saveDir);
    fs.ensureDirSync(this.tempDir);
  }

  /**
   * 获取保存目录
   */
  getSaveDir(): string {
    return this.saveDir;
  }

  /**
   * 生成安全的文件名（处理冲突）
   */
  private generateUniqueFileName(targetDir: string, originalName: string): string {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    
    let counter = 1;
    let newName = originalName;
    
    while (fs.existsSync(path.join(targetDir, newName))) {
      newName = `${baseName} (${counter})${ext}`;
      counter++;
    }
    
    return newName;
  }

  /**
   * 检查文件冲突信息
   */
  async checkFileConflict(targetDir: string, fileName: string): Promise<FileConflictInfo> {
    const targetPath = path.join(targetDir, fileName);
    const exists = await fs.pathExists(targetPath);
    
    return {
      exists,
      originalName: fileName,
      suggestedName: exists ? this.generateUniqueFileName(targetDir, fileName) : fileName,
      targetDir
    };
  }

  /**
   * 计算文件校验和
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * 原子性移动文件
   */
  private async atomicMove(sourcePath: string, targetPath: string): Promise<void> {
    const tempTargetPath = `${targetPath}.tmp`;
    
    try {
      // 首先复制到临时目标文件
      await fs.copy(sourcePath, tempTargetPath, {
        preserveTimestamps: true,
        errorOnExist: false
      });
      
      // 验证文件完整性
      const sourceStats = await fs.stat(sourcePath);
      const tempStats = await fs.stat(tempTargetPath);
      
      if (tempStats.size !== sourceStats.size) {
        throw new Error(`文件大小不匹配: 期望 ${sourceStats.size}, 实际 ${tempStats.size}`);
      }
      
      // 原子性重命名
      await fs.move(tempTargetPath, targetPath, { overwrite: true });
      
    } catch (error) {
      // 清理临时文件
      if (await fs.pathExists(tempTargetPath)) {
        await fs.remove(tempTargetPath);
      }
      throw error;
    }
  }

  /**
   * 保留文件属性
   */
  private async preserveFileAttributes(sourcePath: string, targetPath: string): Promise<void> {
    try {
      const stats = await fs.stat(sourcePath);
      
      // 保留时间戳
      await fs.utimes(targetPath, stats.atime, stats.mtime);
      
      // 保留权限（在支持的平台上）
      if (process.platform !== 'win32') {
        await fs.chmod(targetPath, stats.mode);
      }
    } catch (error) {
      console.warn('保留文件属性失败:', error);
    }
  }

  /**
   * 处理文件冲突
   */
  private async handleFileConflict(
    targetDir: string,
    fileName: string,
    strategy: 'overwrite' | 'rename' | 'skip'
  ): Promise<string> {
    const targetPath = path.join(targetDir, fileName);
    
    if (await fs.pathExists(targetPath)) {
      switch (strategy) {
        case 'overwrite':
          await fs.remove(targetPath);
          return targetPath;
          
        case 'rename':
          const newName = this.generateUniqueFileName(targetDir, fileName);
          return path.join(targetDir, newName);
          
        case 'skip':
          throw new Error(`文件已存在，跳过: ${fileName}`);
          
        default:
          throw new Error(`未知的冲突处理策略: ${strategy}`);
      }
    }
    
    return targetPath;
  }

  /**
   * 传输文件到本地保存目录
   */
  async transferToLocal(
    sourcePath: string,
    options: TransferOptions = {}
  ): Promise<TransferResult> {
    const startTime = Date.now();
    
    try {
      // 验证源文件
      if (!await fs.pathExists(sourcePath)) {
        throw new Error(`源文件不存在: ${sourcePath}`);
      }

      const sourceStats = await fs.stat(sourcePath);
      if (!sourceStats.isFile()) {
        throw new Error(`源路径不是文件: ${sourcePath}`);
      }

      const fileName = path.basename(sourcePath);
      const conflictStrategy = options.conflictStrategy || 'rename';
      
      // 处理文件冲突
      const finalTargetPath = await this.handleFileConflict(
        this.saveDir,
        fileName,
        conflictStrategy
      );

      // 计算校验和
      const checksum = await this.calculateChecksum(sourcePath);

      // 执行文件传输
      if (options.atomicMove) {
        await this.atomicMove(sourcePath, finalTargetPath);
      } else {
        await fs.copy(sourcePath, finalTargetPath, {
          preserveTimestamps: options.preserveAttributes !== false,
          errorOnExist: false
        });
      }

      // 保留文件属性
      if (options.preserveAttributes !== false) {
        await this.preserveFileAttributes(sourcePath, finalTargetPath);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        sourcePath,
        targetPath: this.saveDir,
        finalPath: finalTargetPath,
        fileSize: sourceStats.size,
        duration,
        checksum
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        sourcePath,
        targetPath: this.saveDir,
        fileSize: 0,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 批量传输文件
   */
  async batchTransfer(
    sourcePaths: string[],
    options: TransferOptions = {}
  ): Promise<TransferResult[]> {
    const results: TransferResult[] = [];
    
    for (const sourcePath of sourcePaths) {
      const result = await this.transferToLocal(sourcePath, options);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      if (await fs.pathExists(this.tempDir)) {
        const files = await fs.readdir(this.tempDir);
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24小时前
        
        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.remove(filePath);
          }
        }
      }
    } catch (error) {
      console.warn('清理临时文件失败:', error);
    }
  }

  /**
   * 获取传输统计信息
   */
  async getTransferStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    saveDir: string;
    availableSpace: number;
  }> {
    try {
      const files = await fs.readdir(this.saveDir);
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = path.join(this.saveDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      }

      // 获取可用空间
      let availableSpace = 0;
      try {
        const stats = await fs.promises.statfs(this.saveDir);
        availableSpace = (stats as any).available || (stats as any).free || 0;
      } catch {
        availableSpace = 0;
      }

      return {
        totalFiles: files.filter(f => !f.startsWith('.')).length,
        totalSize,
        saveDir: this.saveDir,
        availableSpace
      };
    } catch (error) {
      return {
        totalFiles: 0,
        totalSize: 0,
        saveDir: this.saveDir,
        availableSpace: 0
      };
    }
  }
}
