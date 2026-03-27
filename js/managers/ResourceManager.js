/**
 * ResourceManager 资源管理器
 * 负责资源的加载、缓存和管理
 */

import { globalEvent } from '../core/EventEmitter';

class ResourceManager {
  constructor() {
    // 图片资源缓存
    this._imageCache = new Map();
    // 音频资源缓存
    this._audioCache = new Map();
    // 加载队列
    this._loadingQueue = [];
    // 是否正在加载
    this._isLoading = false;
    // 加载进度
    this._loadProgress = 0;
    // 已加载资源数量
    this._loadedCount = 0;
    // 总资源数量
    this._totalCount = 0;
  }

  /**
   * 初始化资源管理器
   */
  init() {
    console.log('[ResourceManager] 初始化资源管理器');
  }

  /**
   * 更新
   * @param {number} deltaTime - 距离上一帧的时间间隔
   */
  update(deltaTime) {
    // 处理加载队列
    if (this._loadingQueue.length > 0 && !this._isLoading) {
      this._processLoadingQueue();
    }
  }

  /**
   * 加载图片资源
   * @param {string} key - 资源标识
   * @param {string} src - 图片路径或URL
   * @returns {Promise<HTMLImageElement>}
   */
  loadImage(key, src) {
    return new Promise((resolve, reject) => {
      // 检查缓存
      if (this._imageCache.has(key)) {
        resolve(this._imageCache.get(key));
        return;
      }

      const image = wx.createImage();
      
      image.onload = () => {
        this._imageCache.set(key, image);
        globalEvent.emit('resource:imageLoaded', key, image);
        resolve(image);
      };

      image.onerror = (err) => {
        console.error(`[ResourceManager] 加载图片失败: ${src}`, err);
        reject(err);
      };

      image.src = src;
    });
  }

  /**
   * 批量加载图片资源
   * @param {Array<{key: string, src: string}>} images - 图片资源列表
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<void>}
   */
  loadImages(images, onProgress = null) {
    this._totalCount = images.length;
    this._loadedCount = 0;
    this._loadProgress = 0;

    const promises = images.map(({ key, src }) => {
      return this.loadImage(key, src).then(() => {
        this._loadedCount++;
        this._loadProgress = this._loadedCount / this._totalCount;
        if (onProgress) {
          onProgress(this._loadProgress, this._loadedCount, this._totalCount);
        }
        globalEvent.emit('resource:progress', this._loadProgress);
      });
    });

    return Promise.all(promises).then(() => {
      globalEvent.emit('resource:allLoaded');
    });
  }

  /**
   * 获取已缓存的图片
   * @param {string} key - 资源标识
   * @returns {HTMLImageElement|undefined}
   */
  getImage(key) {
    return this._imageCache.get(key);
  }

  /**
   * 检查图片是否已加载
   * @param {string} key - 资源标识
   * @returns {boolean}
   */
  hasImage(key) {
    return this._imageCache.has(key);
  }

  /**
   * 加载音频资源
   * @param {string} key - 资源标识
   * @param {string} src - 音频路径或URL
   * @returns {any}
   */
  loadAudio(key, src) {
    if (this._audioCache.has(key)) {
      return this._audioCache.get(key);
    }

    // 在微信小游戏中，音频处理需要特殊方式
    const audio = {
      src: src,
      play: () => {
        const innerAudioContext = wx.createInnerAudioContext();
        innerAudioContext.src = src;
        innerAudioContext.play();
        return innerAudioContext;
      }
    };

    this._audioCache.set(key, audio);
    return audio;
  }

  /**
   * 获取已缓存的音频
   * @param {string} key - 资源标识
   * @returns {any|undefined}
   */
  getAudio(key) {
    return this._audioCache.get(key);
  }

  /**
   * 释放图片资源
   * @param {string} key - 资源标识
   */
  releaseImage(key) {
    this._imageCache.delete(key);
  }

  /**
   * 释放音频资源
   * @param {string} key - 资源标识
   */
  releaseAudio(key) {
    this._audioCache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clearCache() {
    this._imageCache.clear();
    this._audioCache.clear();
  }

  /**
   * 获取缓存大小
   * @returns {{images: number, audio: number}}
   */
  getCacheSize() {
    return {
      images: this._imageCache.size,
      audio: this._audioCache.size
    };
  }

  /**
   * 处理加载队列
   */
  _processLoadingQueue() {
    if (this._loadingQueue.length === 0) {
      this._isLoading = false;
      return;
    }

    this._isLoading = true;
    const { key, src, type } = this._loadingQueue.shift();

    if (type === 'image') {
      this.loadImage(key, src).finally(() => {
        this._isLoading = false;
      });
    }
  }

  /**
   * 添加到加载队列
   * @param {string} key - 资源标识
   * @param {string} src - 资源路径
   * @param {string} type - 资源类型
   */
  enqueue(key, src, type = 'image') {
    this._loadingQueue.push({ key, src, type });
  }
}

export default ResourceManager;
