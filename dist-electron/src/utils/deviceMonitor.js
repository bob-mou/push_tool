import { DeviceManager } from './deviceManager.js';
import { EventEmitter } from 'events';
export class DeviceMonitor extends EventEmitter {
    constructor(config = {}) {
        super();
        this.isMonitoring = false;
        this.pollingTimer = null;
        this.lastKnownDevices = new Map();
        this.retryCount = 0;
        this.deviceManager = DeviceManager.getInstance();
        this.pollingInterval = config.pollingInterval || 2000; // 默认2秒
        this.enableADB = config.enableADB !== false;
        this.enableIOS = config.enableIOS !== false;
        this.maxRetries = config.maxRetries || 3;
    }
    static getInstance(config) {
        if (!DeviceMonitor.instance) {
            DeviceMonitor.instance = new DeviceMonitor(config);
        }
        return DeviceMonitor.instance;
    }
    /**
     * 开始监控设备连接状态
     */
    start() {
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
    stop() {
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
    async checkDevices() {
        try {
            const currentDevices = await this.deviceManager.getConnectedDevices();
            const currentDeviceMap = new Map();
            // 构建当前设备映射
            currentDevices.forEach(device => {
                currentDeviceMap.set(device.id, device);
            });
            // 检查新连接的设备
            currentDevices.forEach(device => {
                if (!this.lastKnownDevices.has(device.id)) {
                    // 新设备连接
                    this.emitDeviceEvent('connected', device);
                }
            });
            // 检查断开的设备
            this.lastKnownDevices.forEach((device, deviceId) => {
                if (!currentDeviceMap.has(deviceId)) {
                    // 设备断开
                    this.emitDeviceEvent('disconnected', device);
                }
            });
            // 更新已知设备列表
            this.lastKnownDevices = currentDeviceMap;
            this.retryCount = 0; // 重置重试计数
        }
        catch (error) {
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
    emitDeviceEvent(type, device) {
        const event = {
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
    async getCurrentDevices() {
        return await this.deviceManager.getConnectedDevices();
    }
    /**
     * 检查监控状态
     */
    isRunning() {
        return this.isMonitoring;
    }
    /**
     * 获取监控配置
     */
    getConfig() {
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
    updateConfig(config) {
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
    async forceRefresh() {
        await this.checkDevices();
        return this.getCurrentDevices();
    }
}
