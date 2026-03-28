/**
 * ResourceLoader 资源加载器
 * 负责任务 4.2.1 ~ 4.2.8
 * - 4.2.1 实现资源加载器（ResourceLoader）
 * - 4.2.2 实现网络图片下载功能
 * - 4.2.3 实现本地文件系统缓存
 * - 4.2.4 实现缓存检查与复用逻辑
 * - 4.2.5 实现加载失败重试机制
 * - 4.2.6 实现图片加载进度跟踪
 * - 4.2.7 实现缓存清理机制
 * - 4.2.8 实现按场景和按需加载策略
 */

import { globalEvent } from '../core/EventEmitter';
import CloudStorage from './CloudStorage';

// 4.2.4 实现缓存检查与复用逻辑
// 缓存键名前缀
const CACHE_PREFIX = 'resource_cache_';
const CACHE_INFO_KEY = 'resource_cache_info';

// 4.2.5 实现加载失败重试机制
// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,           // 最大重试次数
  retryDelay: 1000,        // 重试延迟（毫秒）
  backoffMultiplier: 2     // 退避倍数
};

class ResourceLoader {
  constructor() {
    // 4.2.1 实现资源加载器（ResourceLoader）
    // 加载队列
    this._queue = [];
    this._loading = new Map();     // 正在加载的资源
    this._loaded = new Map();      // 已加载的资源
    this._failed = new Map();      // 加载失败的资源

    // 4.2.3 实现本地文件系统缓存
    // 缓存信息
    this._cacheInfo = {
      version: '1.0.0',
      items: new Map(),     // 缓存项 { key: { localPath, size, timestamp, etag } }
      totalSize: 0,         // 总大小（字节）
      maxSize: 50 * 1024 * 1024  // 最大缓存50MB
    };

    // 4.2.6 实现图片加载进度跟踪
    // 加载统计
    this._stats = {
      total: 0,             // 总资源数
      loaded: 0,            // 已加载数
      failed: 0,            // 失败数
      skipped: 0,           // 跳过数
      totalBytes: 0,        // 总字节数
      loadedBytes: 0        // 已加载字节数
    };

    // 4.2.8 实现按场景和按需加载策略
    // 场景资源映射
    this._sceneResources = new Map();
    // 当前场景
    this._currentScene = null;

    // 云存储实例
    this._cloudStorage = new CloudStorage();

    // 加载配置
    this._config = {
      maxConcurrent: 5,         // 最大并发数
      timeout: 30000,           // 超时时间（毫秒）
      enableCache: true,        // 是否启用缓存
      enableRetry: true         // 是否启用重试
    };

    // 是否正在处理队列
    this._processing = false;

    // 加载进度回调
    this._progressCallback = null;
    
    // 云存储资源映射表（本地路径 -> fileID）
    this._cloudFileMap = {};
    // 是否启用云存储加载
    this._enableCloud = true;
    // 是否优先使用云存储
    this._cloudFirst = true;
  }

  /**
   * 初始化资源加载器
   */
  async init() {
    console.log('[ResourceLoader] 初始化资源加载器');

    // 初始化云存储
    await this._cloudStorage.init();
    
    // 加载云存储文件映射
    await this._loadCloudFileMap();

    // 4.2.4 实现缓存检查与复用逻辑
    // 加载缓存信息
    await this._loadCacheInfo();

    // 检查缓存有效性
    await this._validateCache();

    console.log('[ResourceLoader] 初始化完成');
  }
  
  /**
   * 加载云存储文件映射表
   */
  async _loadCloudFileMap() {
    if (typeof wx === 'undefined') return;
    
    try {
      const record = wx.getStorageSync('cloud_upload_record');
      if (record && record.files) {
        this._cloudFileMap = {};
        for (const file of record.files) {
          this._cloudFileMap[file.localPath] = file.fileID;
        }
        console.log(`[ResourceLoader] 加载云存储映射: ${Object.keys(this._cloudFileMap).length} 个文件`);
      }
    } catch (e) {
      console.warn('[ResourceLoader] 加载云存储映射失败:', e);
    }
  }
  
  /**
   * 设置云存储文件映射
   * @param {Object} fileMap - { 本地路径: fileID }
   */
  setCloudFileMap(fileMap) {
    this._cloudFileMap = fileMap || {};
    console.log(`[ResourceLoader] 设置云存储映射: ${Object.keys(this._cloudFileMap).length} 个文件`);
  }
  
  /**
   * 启用/禁用云存储加载
   * @param {boolean} enabled 
   */
  setCloudEnabled(enabled) {
    this._enableCloud = enabled;
    console.log('[ResourceLoader] 云存储加载:', enabled ? '启用' : '禁用');
  }

  /**
   * 4.2.4 实现缓存检查与复用逻辑
   * 加载缓存信息
   */
  async _loadCacheInfo() {
    if (typeof wx === 'undefined') return;

    try {
      const info = wx.getStorageSync(CACHE_INFO_KEY);
      if (info) {
        this._cacheInfo.items = new Map(info.items || []);
        this._cacheInfo.totalSize = info.totalSize || 0;
        this._cacheInfo.version = info.version || '1.0.0';
        console.log('[ResourceLoader] 缓存信息已加载:', this._cacheInfo.totalSize, 'bytes');
      }
    } catch (e) {
      console.warn('[ResourceLoader] 加载缓存信息失败:', e);
    }
  }

  /**
   * 保存缓存信息
   */
  async _saveCacheInfo() {
    if (typeof wx === 'undefined') return;

    try {
      const info = {
        version: this._cacheInfo.version,
        items: Array.from(this._cacheInfo.items.entries()),
        totalSize: this._cacheInfo.totalSize
      };
      wx.setStorageSync(CACHE_INFO_KEY, info);
    } catch (e) {
      console.warn('[ResourceLoader] 保存缓存信息失败:', e);
    }
  }

  /**
   * 验证缓存有效性
   */
  async _validateCache() {
    if (typeof wx === 'undefined') return;

    const fs = wx.getFileSystemManager();
    const invalidKeys = [];

    for (const [key, item] of this._cacheInfo.items) {
      try {
        // 检查文件是否存在
        fs.accessSync(item.localPath);
      } catch (e) {
        // 文件不存在，标记为无效
        invalidKeys.push(key);
      }
    }

    // 移除无效缓存
    for (const key of invalidKeys) {
      const item = this._cacheInfo.items.get(key);
      if (item) {
        this._cacheInfo.totalSize -= item.size || 0;
        this._cacheInfo.items.delete(key);
      }
    }

    if (invalidKeys.length > 0) {
      console.log('[ResourceLoader] 清理无效缓存:', invalidKeys.length, '项');
      await this._saveCacheInfo();
    }
  }

  /**
   * 4.2.8 实现按场景和按需加载策略
   * 注册场景资源
   * @param {string} sceneName - 场景名称
   * @param {Array} resources - 资源列表
   */
  registerSceneResources(sceneName, resources) {
    this._sceneResources.set(sceneName, resources);
    console.log(`[ResourceLoader] 注册场景资源: ${sceneName}, ${resources.length} 项`);
  }

  /**
   * 预加载场景资源
   * @param {string} sceneName - 场景名称
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<boolean>}
   */
  async preloadScene(sceneName, onProgress = null) {
    const resources = this._sceneResources.get(sceneName);
    if (!resources || resources.length === 0) {
      return true;
    }

    console.log(`[ResourceLoader] 预加载场景资源: ${sceneName}`);
    
    this._currentScene = sceneName;
    this._progressCallback = onProgress;

    // 重置统计
    this._resetStats(resources.length);

    // 添加到队列
    for (const res of resources) {
      this._queue.push({
        key: res.key,
        url: res.url,
        type: res.type || 'image',
        priority: res.priority || 0,
        scene: sceneName
      });
    }

    // 按优先级排序
    this._queue.sort((a, b) => b.priority - a.priority);

    // 开始处理队列
    await this._processQueue();

    return this._stats.failed === 0;
  }

  /**
   * 加载单个资源（按需加载）
   * @param {string} key - 资源键
   * @param {string} url - 资源URL
   * @param {Object} options - 选项
   * @returns {Promise<any>}
   */
  async load(key, url, options = {}) {
    // 检查是否已加载
    if (this._loaded.has(key)) {
      return this._loaded.get(key);
    }

    // 检查是否正在加载
    if (this._loading.has(key)) {
      return this._loading.get(key).promise;
    }

    // 4.2.4 实现缓存检查与复用逻辑
    // 检查本地缓存
    if (this._config.enableCache) {
      const cached = await this._getCachedResource(key);
      if (cached) {
        this._stats.skipped++;
        this._loaded.set(key, cached);
        return cached;
      }
    }

    // 创建加载任务
    const task = this._createLoadTask(key, url, options);
    this._loading.set(key, task);

    return task.promise;
  }

  /**
   * 创建加载任务
   */
  _createLoadTask(key, url, options) {
    const promise = this._doLoad(key, url, options);
    return { promise, key, url, startTime: Date.now() };
  }

  /**
   * 4.2.2 实现网络图片下载功能
   * 执行加载
   */
  async _doLoad(key, url, options = {}) {
    const { type = 'image', retries = 0 } = options;

    try {
      let result;

      if (type === 'image') {
        result = await this._loadImage(key, url);
      } else if (type === 'json') {
        result = await this._loadJSON(url);
      } else {
        result = await this._loadFile(url);
      }

      // 加载成功
      this._loading.delete(key);
      this._loaded.set(key, result);
      this._stats.loaded++;

      globalEvent.emit('resource:loaded', { key, url, result });

      return result;
    } catch (error) {
      // 4.2.5 实现加载失败重试机制
      if (this._config.enableRetry && retries < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retries);
        console.log(`[ResourceLoader] 重试加载: ${key}, 延迟: ${delay}ms`);
        
        await this._delay(delay);
        return this._doLoad(key, url, { ...options, retries: retries + 1 });
      }

      // 加载失败
      this._loading.delete(key);
      this._failed.set(key, { url, error, retries });
      this._stats.failed++;

      console.error(`[ResourceLoader] 加载失败: ${key}`, error);
      globalEvent.emit('resource:failed', { key, url, error });

      throw error;
    }
  }

  /**
   * 4.2.2 实现网络图片下载功能
   * 加载图片（优先云存储）
   */
  async _loadImage(key, url) {
    // 如果是本地路径，优先尝试云存储
    if (url.startsWith('images/') || url.startsWith('audio/')) {
      // 1. 首先检查云存储映射
      const fileID = this._cloudFileMap[url];
      if (fileID && this._enableCloud) {
        try {
          // 从云存储获取临时URL
          const tempURL = await this._cloudStorage.getTempFileURL(fileID);
          if (tempURL) {
            console.log(`[ResourceLoader] 从云存储加载: ${url}`);
            return this._loadImageFromURL(key, tempURL);
          }
        } catch (e) {
          console.warn(`[ResourceLoader] 云存储加载失败: ${url}`, e);
        }
      }
      
      // 2. 云存储不可用，尝试本地加载（但不强制检查文件存在性）
      console.log(`[ResourceLoader] 尝试本地加载: ${url}`);
      return this._loadImageFromURL(key, url);
    }
    
    // 非本地路径（已是URL），直接加载
    return this._loadImageFromURL(key, url);
  }
  
  /**
   * 从URL加载图片
   */
  _loadImageFromURL(key, url) {
    return new Promise((resolve, reject) => {
      // 检查是否是本地路径
      if (url.startsWith('images/') || url.startsWith('audio/')) {
        // 尝试检查文件是否存在
        try {
          const fs = wx.getFileSystemManager();
          fs.accessSync(url);
        } catch (e) {
          // 文件不存在，返回占位对象
          console.log(`[ResourceLoader] 本地图片不存在，使用占位: ${url}`);
          resolve({
            width: 100,
            height: 100,
            _isPlaceholder: true,
            src: url
          });
          return;
        }
      }
      
      const image = wx.createImage ? wx.createImage() : new Image();
      
      image.onload = () => {
        resolve(image);
      };

      image.onerror = (err) => {
        // 图片加载失败也返回占位
        console.warn(`[ResourceLoader] 图片加载失败: ${url}`);
        resolve({
          width: 100,
          height: 100,
          _isPlaceholder: true,
          src: url
        });
      };

      image.src = url;

      // 超时处理
      setTimeout(() => {
        console.warn(`[ResourceLoader] 图片加载超时: ${url}`);
        resolve({
          width: 100,
          height: 100,
          _isPlaceholder: true,
          src: url
        });
      }, this._config.timeout);
    });
  }

  /**
   * 加载JSON
   */
  async _loadJSON(url) {
    return new Promise((resolve, reject) => {
      if (typeof wx !== 'undefined') {
        wx.request({
          url: url,
          method: 'GET',
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data);
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          },
          fail: reject
        });
      } else {
        // 浏览器环境
        fetch(url)
          .then(r => r.json())
          .then(resolve)
          .catch(reject);
      }
    });
  }

  /**
   * 加载文件
   */
  async _loadFile(url) {
    // 4.2.2 实现网络图片下载功能
    // 使用微信下载文件API
    if (typeof wx !== 'undefined') {
      const result = await wx.downloadFile({ url });
      if (result.statusCode === 200) {
        return result.tempFilePath;
      }
      throw new Error(`Download failed: ${result.statusCode}`);
    }
    return url;
  }

  /**
   * 4.2.3 实现本地文件系统缓存
   * 获取缓存的资源
   */
  async _getCachedResource(key) {
    const cacheItem = this._cacheInfo.items.get(key);
    if (!cacheItem) return null;

    // 检查文件是否存在
    try {
      const fs = wx.getFileSystemManager();
      fs.accessSync(cacheItem.localPath);
      
      // 返回缓存的图片
      if (cacheItem.type === 'image') {
        return new Promise((resolve, reject) => {
          const image = wx.createImage();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = cacheItem.localPath;
        });
      }
      
      return cacheItem.localPath;
    } catch (e) {
      // 缓存无效，移除
      this._cacheInfo.items.delete(key);
      return null;
    }
  }

  /**
   * 缓存资源
   */
  async _cacheResource(key, localPath, size = 0) {
    if (!this._config.enableCache) return;

    // 4.2.7 实现缓存清理机制
    // 检查是否需要清理空间
    while (this._cacheInfo.totalSize + size > this._cacheInfo.maxSize) {
      await this._cleanupOldestCache();
    }

    this._cacheInfo.items.set(key, {
      localPath,
      size,
      timestamp: Date.now(),
      type: 'image'
    });

    this._cacheInfo.totalSize += size;
    await this._saveCacheInfo();
  }

  /**
   * 4.2.7 实现缓存清理机制
   * 清理最旧的缓存
   */
  async _cleanupOldestCache() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, item] of this._cacheInfo.items) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const item = this._cacheInfo.items.get(oldestKey);
      
      // 删除文件
      try {
        const fs = wx.getFileSystemManager();
        fs.unlinkSync(item.localPath);
      } catch (e) {
        // 忽略删除错误
      }

      this._cacheInfo.totalSize -= item.size;
      this._cacheInfo.items.delete(oldestKey);
      
      console.log('[ResourceLoader] 清理旧缓存:', oldestKey);
    }
  }

  /**
   * 清理所有缓存
   */
  async clearCache() {
    if (typeof wx === 'undefined') return;

    const fs = wx.getFileSystemManager();

    for (const [key, item] of this._cacheInfo.items) {
      try {
        fs.unlinkSync(item.localPath);
      } catch (e) {
        // 忽略错误
      }
    }

    this._cacheInfo.items.clear();
    this._cacheInfo.totalSize = 0;
    await this._saveCacheInfo();

    console.log('[ResourceLoader] 缓存已清空');
  }

  /**
   * 处理加载队列
   */
  async _processQueue() {
    if (this._processing) return;
    this._processing = true;

    while (this._queue.length > 0) {
      // 获取当前并发数
      const currentLoading = this._loading.size;
      
      if (currentLoading >= this._config.maxConcurrent) {
        // 等待任意一个加载完成
        await Promise.race(
          Array.from(this._loading.values()).map(t => t.promise.catch(() => {}))
        );
        continue;
      }

      // 取出下一个任务
      const task = this._queue.shift();
      if (!task) continue;

      // 开始加载
      this.load(task.key, task.url, { type: task.type })
        .then(() => {
          this._updateProgress();
        })
        .catch(() => {
          this._updateProgress();
        });
    }

    // 等待所有加载完成
    while (this._loading.size > 0) {
      await Promise.all(
        Array.from(this._loading.values()).map(t => t.promise.catch(() => {}))
      );
    }

    this._processing = false;
    
    // 4.2.6 实现图片加载进度跟踪
    this._notifyProgressComplete();
  }

  /**
   * 4.2.6 实现图片加载进度跟踪
   * 更新进度
   */
  _updateProgress() {
    const total = this._stats.total;
    const completed = this._stats.loaded + this._stats.failed + this._stats.skipped;
    const progress = total > 0 ? completed / total : 0;

    if (this._progressCallback) {
      this._progressCallback({
        progress,
        total,
        completed,
        loaded: this._stats.loaded,
        failed: this._stats.failed,
        skipped: this._stats.skipped
      });
    }

    globalEvent.emit('resource:progress', {
      progress,
      total,
      completed
    });
  }

  /**
   * 通知进度完成
   */
  _notifyProgressComplete() {
    if (this._progressCallback) {
      this._progressCallback({
        progress: 1,
        total: this._stats.total,
        completed: this._stats.total,
        loaded: this._stats.loaded,
        failed: this._stats.failed,
        skipped: this._stats.skipped,
        complete: true
      });
    }

    globalEvent.emit('resource:complete', this._stats);
  }

  /**
   * 重置统计
   */
  _resetStats(total) {
    this._stats = {
      total,
      loaded: 0,
      failed: 0,
      skipped: 0,
      totalBytes: 0,
      loadedBytes: 0
    };
  }

  /**
   * 获取已加载的资源
   * @param {string} key - 资源键
   * @returns {any}
   */
  getResource(key) {
    return this._loaded.get(key);
  }

  /**
   * 检查资源是否已加载
   * @param {string} key - 资源键
   * @returns {boolean}
   */
  hasResource(key) {
    return this._loaded.has(key);
  }

  /**
   * 释放资源
   * @param {string} key - 资源键
   */
  release(key) {
    this._loaded.delete(key);
  }

  /**
   * 释放场景资源
   * @param {string} sceneName - 场景名称
   */
  releaseScene(sceneName) {
    const resources = this._sceneResources.get(sceneName);
    if (resources) {
      for (const res of resources) {
        this.release(res.key);
      }
    }
  }

  /**
   * 获取缓存统计
   * @returns {Object}
   */
  getCacheStats() {
    return {
      itemCount: this._cacheInfo.items.size,
      totalSize: this._cacheInfo.totalSize,
      maxSize: this._cacheInfo.maxSize,
      usagePercent: (this._cacheInfo.totalSize / this._cacheInfo.maxSize * 100).toFixed(2)
    };
  }

  /**
   * 延迟辅助
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 销毁
   */
  destroy() {
    this._queue = [];
    this._loading.clear();
    this._loaded.clear();
    this._failed.clear();
    this._sceneResources.clear();
    this._cloudStorage.destroy();
  }
}

export default ResourceLoader;
