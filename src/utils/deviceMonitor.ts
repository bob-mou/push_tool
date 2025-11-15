import { DeviceManager, Device } from './deviceManager.js';
import { EventEmitter } from 'events';

export interface DeviceStatusChangeEvent {
  type: 'connected' | 'disconnected';
  device: Device;
  timestamp: number;
}

export interface DeviceMonitorConfig {
  pollingInterval?: number;
  enableADB?: boolean;
  enableIOS?: boolean;
  maxRetries?: number;
}

export class DeviceMonitor extends EventEmitter {
  private static instance: DeviceMonitor;
  private deviceManager: DeviceManager;
  private pollingInterval: number;
  private enableADB: boolean;
  private enableIOS: boolean;
  private maxRetries: number;
  private isMonitoring: boolean = false;
  private pollingTimer: NodeJS.Timeout | null = null;
  private lastKnownDevices: Map<string, Device> = new Map();
  private retryCount: number = 0;

  private constructor(config: DeviceMonitorConfig = {}) {
    super();
    this.deviceManager = DeviceManager.getInstance();
    this.pollingInterval = config.pollingInterval || 2000; // 默认2秒
    this.enableADB = config.enableADB !== false;
    this.enableIOS = config.enableIOS !== false;
    this.maxRetries = config.maxRetries || 3;
  }

  static getInstance(config?: DeviceMonitorConfig): DeviceMonitor {
    if (!DeviceMonitor.instance) {
      DeviceMonitor.instance = new DeviceMonitor(config);
    }
    return DeviceMonitor.instance;
  }

  /**
   * 开始监控设备连接状态
   */
  start(): void {
    if (this.isMonitoring) {
      console.warn('设备监控已经在运行中');
      return;
    }

    this.isMonitoring = true;
    console.log('开始设备连接状态监控...');
    
    // 立即执行一次检测
    this.checkDevices();
    
    // 设置定时轮询
    this.pollingTimer = setInterval(() => {
      this.checkDevices();
    }, this.pollingInterval);
  }

  /**
   * 停止监控设备连接状态
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    console.log('停止设备连接状态监控');
    
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * 检查设备连接状态
   */
  private async checkDevices(): Promise<void> {
    try {
      console.log('=== 开始设备检测 ===');
      console.log('上次已知设备:', Array.from(this.lastKnownDevices.keys()));
      
      const currentDevices = await this.deviceManager.getConnectedDevices();
      console.log('当前检测到设备:', currentDevices.map(d => d.id));
      
      const currentDeviceMap = new Map<string, Device>();
      
      // 构建当前设备映射
      currentDevices.forEach(device => {
        currentDeviceMap.set(device.id, device);
      });

      // 检查新连接的设备
      const newDevices = currentDevices.filter(device => !this.lastKnownDevices.has(device.id));
      console.log('新连接设备:', newDevices.map(d => d.id));
      
      newDevices.forEach(device => {
        console.log('检测到新设备连接:', device.id);
        this.emitDeviceEvent('connected', device);
      });

      // 检查断开的设备
      const disconnectedDevices = Array.from(this.lastKnownDevices.entries())
        .filter(([deviceId]) => !currentDeviceMap.has(deviceId));
      console.log('断开设备:', disconnectedDevices.map(([id]) => id));
      
      disconnectedDevices.forEach(([deviceId, device]) => {
        console.log('检测到设备断开:', deviceId);
        this.emitDeviceEvent('disconnected', device);
      });

      // 更新已知设备列表
      this.lastKnownDevices = currentDeviceMap;
      console.log('更新后的已知设备:', Array.from(this.lastKnownDevices.keys()));
      console.log('=== 设备检测完成 ===');
      this.retryCount = 0; // 重置重试计数

    } catch (error) {
      console.error('设备检测失败:', error);
      this.retryCount++;
      
      if (this.retryCount >= this.maxRetries) {
        this.emit('error', new Error(`设备检测连续失败 ${this.maxRetries} 次: ${error}`));
        this.retryCount = 0; // 重置计数，继续尝试
      }
    }
  }

  /**
   * 发射设备状态变化事件
   */
  private emitDeviceEvent(type: 'connected' | 'disconnected', device: Device): void {
    const event: DeviceStatusChangeEvent = {
      type,
      device,
      timestamp: Date.now()
    };

    console.log(`设备${type === 'connected' ? '连接' : '断开'}:`, {
      id: device.id,
      name: device.name,
      type: device.type
    });

    this.emit('deviceStatusChanged', event);
  }

  /**
   * 获取当前连接的设备列表
   */
  async getCurrentDevices(): Promise<Device[]> {
    return await this.deviceManager.getConnectedDevices();
  }

  /**
   * 检查监控状态
   */
  isRunning(): boolean {
    return this.isMonitoring;
  }

  /**
   * 获取监控配置
   */
  getConfig(): DeviceMonitorConfig {
    return {
      pollingInterval: this.pollingInterval,
      enableADB: this.enableADB,
      enableIOS: this.enableIOS,
      maxRetries: this.maxRetries
    };
  }

  /**
   * 更新监控配置
   */
  updateConfig(config: Partial<DeviceMonitorConfig>): void {
    if (config.pollingInterval !== undefined) {
      this.pollingInterval = config.pollingInterval;
      if (this.isMonitoring) {
        this.stop();
        this.start();
      }
    }
    
    if (config.enableADB !== undefined) {
      this.enableADB = config.enableADB;
    }
    
    if (config.enableIOS !== undefined) {
      this.enableIOS = config.enableIOS;
    }
    
    if (config.maxRetries !== undefined) {
      this.maxRetries = config.maxRetries;
    }
  }

  /**
   * 强制刷新设备列表
   */
  async forceRefresh(): Promise<Device[]> {
    await this.checkDevices();
    return this.getCurrentDevices();
  }
}