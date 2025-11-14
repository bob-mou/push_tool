import { TransferRecorder } from './transferRecorder';

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
}

export interface RetryResult {
  success: boolean;
  finalAttempt: number;
  lastError?: string;
  transferId: string;
}

export type TransferFunction = () => Promise<boolean>;

export class TransferRetryManager {
  private static instance: TransferRetryManager;
  private recorder = TransferRecorder.getInstance();
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
  };

  static getInstance(): TransferRetryManager {
    if (!TransferRetryManager.instance) {
      TransferRetryManager.instance = new TransferRetryManager();
    }
    return TransferRetryManager.instance;
  }

  /**
   * 执行带重试的文件传输
   */
  async executeWithRetry(
    transferId: string,
    transferFunction: TransferFunction,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult> {
    const retryConfig = { ...this.defaultConfig, ...config };
    let lastError: string | undefined;
    let attempt = 0;

    while (attempt <= retryConfig.maxRetries) {
      try {
        console.log(`[重试管理器] 尝试传输 ${transferId}，第 ${attempt + 1} 次`);
        
        const success = await transferFunction();
        
        if (success) {
          console.log(`[重试管理器] 传输成功: ${transferId}`);
          return {
            success: true,
            finalAttempt: attempt + 1,
            transferId,
          };
        }

        throw new Error('传输函数返回失败');
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        attempt++;

        if (attempt > retryConfig.maxRetries) {
          console.log(`[重试管理器] 达到最大重试次数，传输失败: ${transferId}`);
          break;
        }

        const delay = this.calculateDelay(attempt - 1, retryConfig);
        console.log(`[重试管理器] 传输失败，${delay}ms后重试: ${transferId}`);
        
        this.recorder.incrementRetryCount(transferId);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      finalAttempt: attempt,
      lastError,
      transferId,
    };
  }

  /**
   * 计算重试延迟时间
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 判断错误是否可重试
   */
  isRetryableError(error: string): boolean {
    const retryablePatterns = [
      /connection.*timeout/i,
      /network.*error/i,
      /device.*not.*found/i,
      /permission.*denied/i,
      /busy/i,
      /resource.*temporarily.*unavailable/i,
      /adb.*server.*version/i,
      /transport.*endpoint/i,
    ];

    return retryablePatterns.some(pattern => pattern.test(error));
  }

  /**
   * 获取重试配置
   */
  getRetryConfig(): RetryConfig {
    return { ...this.defaultConfig };
  }

  /**
   * 更新默认重试配置
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}