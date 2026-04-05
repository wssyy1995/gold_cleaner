/**
 * LoadingScene 加载场景
 * 从云存储下载所有图片资源并缓存
 */

import Scene from '../core/Scene';
import ProgressBar from '../ui/components/ProgressBar';
import Text from '../ui/components/Text';
import CloudStorage from '../cloud/CloudStorage';
import { getAllPreloadImages, getLevelImageKey } from '../cloud/CloudResourceConfig';
import { globalEvent } from '../core/EventEmitter';
import { getGame } from '../../app';
import { getAllDirtTypes, GlobalDirtImageCache } from '../config/dirtyConfig';
import { ALL_TOOLS, GlobalToolImageCache } from '../config/ToolConfig';
import { GlobalPreviewCache } from './HomeScene';
import CoordinateRenderer from '../utils/CoordinateRenderer';


// 全局手指引导图片缓存
export const GlobalFingerImageCache = {
  _image: null,
  set(img) { this._image = img; },
  get() { return this._image; },
  has() { return !!this._image; }
};

class LoadingScene extends Scene {
  constructor() {
    super({ name: 'LoadingScene' });

    this.screenWidth = 750;
    this.screenHeight = 1334;

    this.loadingState = 'initial';
    this.progress = 0;
    this.loadingText = '正在准备清洁工具...';

    this.tips = [
      '正在准备清洁工具...',
      '正在打扫房间...',
      '正在整理物品...',
      '正在检查卫生...',
      '马上就好...'
    ];
    this.currentTipIndex = 0;

    // 云存储
    this.cloudStorage = new CloudStorage();
    
    // 缓存的图片资源
    this.cachedImages = {};
    
    // 预加载的主页背景图（避免切换时白屏）
    this.homeBgImage = null;
    this.homeBgLoaded = false;
    
    // 预加载主页底部按钮图片
    this.bottomButtons = {
      shop: { fileID: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg_bottom_shop.png', img: null, loaded: false },
      bag: { fileID: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg_bottom_bag.png', img: null, loaded: false },
      setting: { fileID: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg_bottom_setting.png', img: null, loaded: false }
    };
    
    // 预加载手指引导图片
    this.fingerImage = null;
    this.fingerImageLoaded = false;
    
    // 需要加载的资源列表
    this.resourcesToLoad = [];
    this.loadedCount = 0;

    // UI组件
    this.progressBar = null;
    this.titleText = null;
    this.tipText = null;

    this.minLoadingTime = 2000;
    this.startTime = 0;
  }

  async onLoad() {
    console.log('[LoadingScene] 开始加载');
    
    // 初始化云存储
    await this.cloudStorage.init();
    
    // 初始化UI
    this._initUI();
    
    // 准备资源列表
    this._prepareResources();
  }

  /**
   * 准备需要加载的资源列表
   */
  _prepareResources() {
    // 获取所有需要预加载的图片
    this.resourcesToLoad = getAllPreloadImages();
    
    // 根据用户当前 stage，只保留对应的主页背景图
    const game = getGame();
    const currentStage = game && game.dataManager ? game.dataManager.getCurrentStage() : 1;
    
    // 过滤掉其他 stage 的背景图，只保留当前 stage 的
    this.resourcesToLoad = this.resourcesToLoad.filter(resource => {
      // 保留非背景图资源
      if (!resource.key.startsWith('bg-stage')) return true;
      // 只保留当前 stage 的背景图
      return resource.key === `bg-stage${currentStage}-home`;
    });
    
    console.log(`[LoadingScene] 需要加载 ${this.resourcesToLoad.length} 个资源，当前 stage: ${currentStage}`);
  }

  /**
   * 加载污垢图片资源（并行下载）
   * 直接从 dirtyConfig.js 中的 imgPath 加载
   */
  async _loadDirtImages() {
    const dirtTypes = getAllDirtTypes();
    
    // 收集所有配置了 imgPath 的污垢类型
    const dirtImagesToLoad = [];
    Object.keys(dirtTypes).forEach(typeKey => {
      const dirtType = dirtTypes[typeKey];
      if (dirtType.imgPath) {
        dirtImagesToLoad.push({
          type: typeKey,
          imgPath: dirtType.imgPath
        });
      }
    });
    
    if (dirtImagesToLoad.length === 0) {
      console.log('[LoadingScene] 没有需要加载的污垢图片');
      return;
    }
    
    console.log(`[LoadingScene] 开始并行加载 ${dirtImagesToLoad.length} 个污垢图片`);
    
    // 并行加载所有污垢图片
    const tasks = dirtImagesToLoad.map(dirt => 
      this._loadDirtImage(dirt.type, dirt.imgPath).catch(e => {
        console.error(`[LoadingScene] 污垢图片加载失败: ${dirt.type}`, e.message);
      })
    );
    
    await Promise.allSettled(tasks);
    console.log('[LoadingScene] 污垢图片并行加载完成');
  }

  /**
   * 加载单个污垢图片
   * @param {string} type - 污垢类型
   * @param {string} imgPath - 云存储路径或本地路径
   */
  async _loadDirtImage(type, imgPath) {
    // 判断是否是云存储路径
    if (imgPath.startsWith('cloud://')) {
      // 云存储路径：提取 fileID 加载
      await this._loadDirtImageFromCloudByPath(type, imgPath);
    } else {
      // 本地路径：直接加载
      await this._loadDirtImageFromLocal(type, imgPath);
    }
  }

  /**
   * 通过云存储路径加载污垢图片
   * @param {string} type - 污垢类型
   * @param {string} fileID - 完整的云存储 fileID
   */
  async _loadDirtImageFromCloudByPath(type, fileID) {
    try {
      const tempURL = await this.cloudStorage.getTempFileURL(fileID);
      
      if (!tempURL) {
        throw new Error('获取临时URL失败');
      }
      
      const img = await this._downloadImage(tempURL);
      GlobalDirtImageCache.set(type, img);
      
      // 保存缓存记录
      const cacheKey = `dirt_${type}`;
      this._saveImageToCache(cacheKey, fileID);
      
      console.log(`[LoadingScene] 污垢图片从云存储加载: ${type}`);
    } catch (error) {
      console.error(`[LoadingScene] 污垢图片加载失败 ${type}:`, error);
      throw error;
    }
  }

  /**
   * 从本地加载污垢图片
   * @param {string} type - 污垢类型
   * @param {string} imagePath - 本地图片路径
   */
  async _loadDirtImageFromLocal(type, imagePath) {
    try {
      const img = await this._downloadLocalImage(imagePath);
      // 保存到共享缓存
      GlobalDirtImageCache.set(type, img);
      console.log(`[LoadingScene] 污垢图片从本地加载: ${type}`);
    } catch (e) {
      throw new Error(`本地加载失败: ${e.message}`);
    }
  }

  /**
   * 从云存储加载污垢图片
   * @param {string} key - 缓存 key (如 'dirt_paper')
   * @param {string} fileID - 云存储 fileID
   */
  async _loadDirtImageFromCloud(key, fileID) {
    if (!fileID) {
      console.warn(`[LoadingScene] 未找到 fileID: ${key}`);
      return;
    }
    
    try {
      const tempURL = await this.cloudStorage.getTempFileURL(fileID);
      
      if (!tempURL) {
        throw new Error('获取临时URL失败');
      }
      
      const img = await this._downloadImage(tempURL);
      // 提取类型（dirt_paper -> paper）
      const type = key.replace('dirt_', '');
      // 保存到共享缓存
      GlobalDirtImageCache.set(type, img);
      this._saveImageToCache(key, fileID);
      
      console.log(`[LoadingScene] 污垢图片从云存储加载: ${key}`);
    } catch (error) {
      console.error(`[LoadingScene] 污垢图片云存储加载失败 ${key}:`, error);
    }
  }

  /**
   * 加载工具图片资源（并行下载）
   * 直接从 ToolConfig.js 中的 imgPath 加载
   */
  async _loadToolImages() {
    // 收集所有配置了 imgPath 的工具
    const toolImagesToLoad = [];
    ALL_TOOLS.forEach(tool => {
      if (tool.imgPath) {
        toolImagesToLoad.push({
          toolId: tool.id,
          imgPath: tool.imgPath
        });
      }
    });
    
    if (toolImagesToLoad.length === 0) {
      console.log('[LoadingScene] 没有需要加载的工具图片');
      return;
    }
    
    console.log(`[LoadingScene] 开始并行加载 ${toolImagesToLoad.length} 个工具图片`);
    
    // 并行加载所有工具图片
    const tasks = toolImagesToLoad.map(tool => 
      this._loadToolImage(tool.toolId, tool.imgPath).catch(e => {
        console.error(`[LoadingScene] 工具图片加载失败: ${tool.toolId}`, e.message);
      })
    );
    
    await Promise.allSettled(tasks);
    console.log('[LoadingScene] 工具图片并行加载完成');
  }

  /**
   * 加载单个工具图片
   * @param {string} toolId - 工具ID
   * @param {string} imgPath - 云存储路径或本地路径
   */
  async _loadToolImage(toolId, imgPath) {
    // 判断是否是云存储路径
    if (imgPath.startsWith('cloud://')) {
      // 云存储路径：获取临时URL并加载
      await this._loadToolImageFromCloud(toolId, imgPath);
    } else {
      // 本地路径：直接加载
      await this._loadToolImageFromLocal(toolId, imgPath);
    }
  }

  /**
   * 从云存储加载工具图片
   * @param {string} toolId - 工具ID
   * @param {string} fileID - 完整的云存储 fileID
   */
  async _loadToolImageFromCloud(toolId, fileID) {
    try {
      const tempURL = await this.cloudStorage.getTempFileURL(fileID);
      
      if (!tempURL) {
        throw new Error('获取临时URL失败');
      }
      
      const img = await this._downloadImage(tempURL);
      GlobalToolImageCache.set(toolId, img);
      
      console.log(`[LoadingScene] 工具图片从云存储加载: ${toolId}`);
    } catch (error) {
      console.error(`[LoadingScene] 工具图片加载失败 ${toolId}:`, error);
      throw error;
    }
  }

  /**
   * 从本地加载工具图片
   * @param {string} toolId - 工具ID
   * @param {string} imagePath - 本地图片路径
   */
  async _loadToolImageFromLocal(toolId, imagePath) {
    try {
      const img = await this._downloadLocalImage(imagePath);
      GlobalToolImageCache.set(toolId, img);
      console.log(`[LoadingScene] 工具图片从本地加载: ${toolId}`);
    } catch (e) {
      throw new Error(`本地加载失败: ${e.message}`);
    }
  }

  _initUI() {
    const centerX = this.screenWidth / 2;
    const s = this.screenWidth / 750;

    this.titleText = new Text({
      x: centerX,
      y: 400 * s,
      text: '金牌保洁升职记',
      fontSize: 57 * s,
      fontWeight: 'bold',
      color: '#4A90D9',
      align: 'center',
      shadow: { color: 'rgba(0,0,0,0.1)', blur: 4 * s, offsetX: 2 * s, offsetY: 2 * s }
    });

    this.subtitleText = new Text({
      x: centerX,
      y: 480 * s,
      text: '金牌保洁，从这里开始',
      fontSize: 28 * s,
      color: '#666666',
      align: 'center'
    });

    this.progressBar = new ProgressBar({
      x: centerX - 250 * s,
      y: 750 * s,
      width: 500 * s,
      height: 16 * s,
      progress: 0,
      bgColor: '#E8E8E8',
      fillColor: '#4A90D9',
      fillGradient: { start: '#4A90D9', end: '#5BA0E9' },
      borderRadius: 8 * s,
      striped: true,
      animated: true
    });

    this.percentText = new Text({
      x: centerX,
      y: 790 * s,
      text: '0%',
      fontSize: 24 * s,
      color: '#4A90D9',
      align: 'center'
    });

    this.tipText = new Text({
      x: centerX,
      y: 850 * s,
      text: this.tips[0],
      fontSize: 24 * s,
      color: '#999999',
      align: 'center'
    });

    this.versionText = new Text({
      x: centerX,
      y: this.screenHeight - 60 * s,
      text: 'v1.0.0',
      fontSize: 20 * s,
      color: '#CCCCCC',
      align: 'center'
    });
  }

  /**
   * 进入场景，开始加载
   */
  async onEnter() {
    console.log('[LoadingScene] 进入场景，开始加载资源');
    this.startTime = Date.now();
    this.loadingState = 'loading';
    
    // 加载本地背景图
    this._loadLocalBackground();
    
    // 加载云存储资源
    await this._startLoading();
  }
  
  /**
   * 从本地加载背景图
   */
  async _loadLocalBackground() {
    if (typeof wx === 'undefined') return;
    
    try {
      // 动态构建路径
      const pathParts = ['images', 'backgrounds', 'bg-001-loading.png'];
      const localPath = pathParts.join('/');
      
      const img = await this._downloadLocalImage(localPath);
      this.bgImage = img;
      this.bgLoaded = true;
      console.log('[LoadingScene] 本地背景加载完成');
    } catch (e) {
      console.log('[LoadingScene] 本地背景加载失败，使用默认背景:', e.message);
    }
  }
  
  /**
   * 从本地下载图片
   */
  _downloadLocalImage(localPath) {
    return new Promise((resolve, reject) => {
      // 延迟加载，避免编译时静态分析
      setTimeout(() => {
        const img = wx.createImage();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('本地图片不存在'));
        img.src = localPath;
      }, 0);
    });
  }

  /**
   * 从云存储批量下载图片（并行下载）
   */
  async _startLoading() {
    const total = this.resourcesToLoad.length;
    this.loadedCount = 0;
    let successCount = 0;
    let failCount = 0;
    
    // 创建并行下载任务
    const downloadTasks = this.resourcesToLoad.map(resource => {
      return this._loadImageFromCloudWithProgress(resource, () => {
        this.loadedCount++;
        this.progress = this.loadedCount / total;
        this._updateProgressUI();
      });
    });
    
    // 等待所有并行下载完成
    const results = await Promise.allSettled(downloadTasks);
    
    // 统计结果
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        failCount++;
        console.warn(`[LoadingScene] 跳过失败资源: ${this.resourcesToLoad[index]?.key}`);
      }
    });
    
    console.log(`[LoadingScene] PRELOAD资源加载完成: 成功${successCount} 失败${failCount}`);
    
    // 并行加载污垢图片和工具图片
    this.loadingText = '准备污垢和工具资源...';
    await Promise.all([
      this._loadDirtImages(),
      this._loadToolImages()
    ]);
    
    // 云存储资源加载完成后，预加载主页背景图（避免切换白屏）
    this.loadingText = '准备主页...';
    await this._preloadHomeBackground();
    
    // 预加载手指引导图片
    this.loadingText = '准备指引...';
    await this._preloadFingerImage();
    
    // 只要有部分资源加载成功就继续
    if (successCount > 0 || this.homeBgLoaded) {
      console.log(`[LoadingScene] 资源加载完成，成功:${successCount} 失败:${failCount} 主页背景:${this.homeBgLoaded}`);
      this._onLoadingComplete();
    } else {
      // 全部失败才报错
      console.error('[LoadingScene] 所有资源加载失败');
      this.loadingText = '加载失败，请检查网络';
    }
  }
  
  /**
   * 加载单个图片并触发进度回调
   */
  async _loadImageFromCloudWithProgress(resource, onProgress) {
    try {
      await this._loadImageFromCloud(resource);
    } finally {
      onProgress();
    }
  }
  
  /**
   * 预加载主页背景图（避免切换时白屏）
   * 从云存储获取已下载的背景图，并行加载预览图和底部按钮
   */
  async _preloadHomeBackground() {
    if (typeof wx === 'undefined') return;
    
    try {
      // 获取用户当前 stage
      const game = getGame();
      const currentStage = game && game.dataManager ? game.dataManager.getCurrentStage() : 1;
      
      // 从缓存记录中获取云存储 fileID
      const cacheRecord = wx.getStorageSync('cloud_image_cache') || {};
      const cacheKey = `bg-stage${currentStage}-home`;
      const cacheInfo = cacheRecord[cacheKey];
      
      if (cacheInfo && cacheInfo.fileID) {
        // 从云存储获取临时 URL
        const tempURL = await this.cloudStorage.getTempFileURL(cacheInfo.fileID);
        if (tempURL) {
          // 下载图片
          this.homeBgImage = await this._downloadImage(tempURL);
          this.homeBgLoaded = true;
          console.log(`[LoadingScene] 主页背景从云存储预加载完成: ${cacheKey}`);
        }
      } else {
        console.warn(`[LoadingScene] 云存储背景图未找到: ${cacheKey}`);
        this.homeBgLoaded = false;
      }
      
      // 并行预加载当前关卡的预览图和底部按钮
      await Promise.all([
        this._preloadCurrentLevelPreview(),
        this._preloadBottomButtons()
      ]);
      
    } catch (e) {
      console.log('[LoadingScene] 主页背景预加载失败:', e.message);
      this.homeBgLoaded = false;
    }
  }
  
  /**
   * 预加载主页底部按钮图片（并行下载）
   */
  async _preloadBottomButtons() {
    if (typeof wx === 'undefined') return;
    
    console.log('[LoadingScene] 开始并行加载底部按钮图片');
    
    // 创建并行下载任务
    const tasks = Object.entries(this.bottomButtons).map(async ([key, config]) => {
      try {
        const tempURL = await this.cloudStorage.getTempFileURL(config.fileID);
        if (tempURL) {
          const img = await this._downloadImage(tempURL);
          this.bottomButtons[key].img = img;
          this.bottomButtons[key].loaded = true;
          console.log(`[LoadingScene] 底部按钮加载成功: ${key}`);
        }
      } catch (e) {
        console.warn(`[LoadingScene] 底部按钮加载失败: ${key}`, e.message);
      }
    });
    
    await Promise.allSettled(tasks);
    console.log('[LoadingScene] 底部按钮并行加载完成');
  }
  
  /**
   * 预加载手指引导图片
   */
  async _preloadFingerImage() {
    if (typeof wx === 'undefined') return;
    
    try {
      const fileID = 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/icon/ui_icon_finger.png';
      const tempURL = await this.cloudStorage.getTempFileURL(fileID);
      if (tempURL) {
        this.fingerImage = await this._downloadImage(tempURL);
        this.fingerImageLoaded = true;
        console.log('[LoadingScene] 手指引导图片加载成功');
        
        // 保存到全局缓存供其他场景使用
        GlobalFingerImageCache.set(this.fingerImage);
      }
    } catch (e) {
      console.warn('[LoadingScene] 手指引导图片加载失败:', e.message);
      this.fingerImageLoaded = false;
    }
  }
  
  /**
   * 预加载当前关卡的预览图
   * 根据用户的 currentStage 和当前解锁的关卡加载
   */
  async _preloadCurrentLevelPreview() {
    if (typeof wx === 'undefined') return;
    
    try {
      // 获取用户当前 stage 和解锁的关卡
      const game = getGame();
      if (!game || !game.dataManager) return;
      
      const currentStage = game.dataManager.getCurrentStage();
      // 找到当前 stage 第一个未完成的关卡，或最后一个已完成的关卡+1
      const unlockedLevels = game.dataManager.userData.unlockedLevels || [1];
      
      // 计算当前 stage 的关卡范围（1-10, 11-20, ...）
      const stageStartLevel = (currentStage - 1) * 10 + 1;
      const stageEndLevel = currentStage * 10;
      
      // 找到当前 stage 中已解锁的第一个关卡
      let currentLevelId = stageStartLevel;
      for (const levelId of unlockedLevels) {
        if (levelId >= stageStartLevel && levelId <= stageEndLevel) {
          currentLevelId = levelId;
          break;
        }
      }
      
      // 计算关卡在 stage 内的序号（1-10）
      const levelInStage = currentLevelId - (currentStage - 1) * 10;
      
      console.log(`[LoadingScene] 预加载当前关卡预览图: stage${currentStage}_l${levelInStage}`);
      
      // 使用 require 获取配置（避免动态 import 在微信小程序中的问题）
      const CloudResourceConfig = require('../cloud/CloudResourceConfig.js');
      const config = CloudResourceConfig.getLevelImageConfig(currentStage, levelInStage);
      
      if (config.type === 'cloud') {
        // 从云存储加载
        const cacheRecord = wx.getStorageSync('cloud_image_cache') || {};
        const cacheInfo = cacheRecord[config.cacheKey];
        
        if (cacheInfo && cacheInfo.fileID) {
          const tempURL = await this.cloudStorage.getTempFileURL(cacheInfo.fileID);
          if (tempURL) {
            const img = await this._downloadImage(tempURL);
            this.cachedImages[config.cacheKey] = img;
            console.log(`[LoadingScene] 关卡预览图预加载完成: ${config.cacheKey}`);
          }
        }
      } else {
        // 从本地加载
        try {
          const img = await this._downloadLocalImage(config.localPath);
          this.cachedImages[`game_stage${currentStage}_l${levelInStage}`] = img;
          console.log(`[LoadingScene] 关卡预览图从本地加载: ${config.localPath}`);
        } catch (e) {
          console.log('[LoadingScene] 关卡预览图本地加载失败:', e.message);
        }
      }
    } catch (e) {
      console.log('[LoadingScene] 预加载关卡预览图失败:', e.message);
    }
  }

  /**
   * 从云存储加载单个图片
   */
  async _loadImageFromCloud(resource) {
    const { key, fileID } = resource;
    
    if (!fileID) {
      console.warn(`[LoadingScene] 未找到 fileID: ${key}`);
      return;
    }
    
    try {
      // 1. 获取临时访问链接
      const tempURL = await this.cloudStorage.getTempFileURL(fileID);
      
      if (!tempURL) {
        throw new Error('获取临时URL失败');
      }
      
      // 2. 下载图片
      const img = await this._downloadImage(tempURL);
      
      // 3. 缓存图片
      this.cachedImages[key] = img;
      
      // 4. 保存到本地存储（用于 ResourceLoader 后续使用）
      this._saveImageToCache(key, fileID);
      
      console.log(`[LoadingScene] 加载成功: ${key}`);
      
    } catch (error) {
      console.error(`[LoadingScene] 加载失败 ${key}:`, error);
      // 失败不阻断，继续加载其他资源
    }
  }

  /**
   * 下载图片
   */
  _downloadImage(url) {
    return new Promise((resolve, reject) => {
      if (typeof wx === 'undefined') {
        reject(new Error('非微信环境'));
        return;
      }
      
      const img = wx.createImage();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片下载失败'));
      img.src = url;
    });
  }

  /**
   * 保存图片缓存记录
   */
  _saveImageToCache(key, fileID) {
    try {
      // 保存到本地存储，记录已缓存的图片
      const cacheRecord = wx.getStorageSync('cloud_image_cache') || {};
      cacheRecord[key] = {
        fileID,
        timestamp: Date.now()
      };
      wx.setStorageSync('cloud_image_cache', cacheRecord);
    } catch (e) {
      console.warn('[LoadingScene] 保存缓存记录失败:', e);
    }
  }

  /**
   * 更新进度UI
   */
  _updateProgressUI() {
    if (this.progressBar) {
      this.progressBar.setProgress(this.progress);
    }
    if (this.percentText) {
      this.percentText.setText(`${Math.floor(this.progress * 100)}%`);
    }
    
    // 更新提示文字
    const tipIndex = Math.floor(this.progress * (this.tips.length - 1));
    if (tipIndex !== this.currentTipIndex && tipIndex < this.tips.length) {
      this.currentTipIndex = tipIndex;
      if (this.tipText) {
        this.tipText.setText(this.tips[tipIndex]);
      }
    }
  }

  /**
   * 加载完成
   */
  _onLoadingComplete() {
    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.minLoadingTime - elapsed);

    console.log(`[LoadingScene] 资源加载完成，用时 ${elapsed}ms`);

    setTimeout(() => {
      this.loadingState = 'complete';
      this.progress = 1;
      
      if (this.progressBar) this.progressBar.setProgress(1);
      if (this.percentText) this.percentText.setText('100%');
      if (this.tipText) this.tipText.setText('准备就绪！');

      // 同步缓存的图片到全局缓存，供其他场景使用
      this._syncToGlobalCache();

      // 切换到首页
      this._switchToHome();
    }, remaining);
  }

  /**
   * 切换到首页
   */
  _switchToHome() {
    console.log('[LoadingScene] 切换到首页');

    setTimeout(() => {
      // 传递预加载的主页背景图、底部按钮图片和标题图片，避免白屏
      globalEvent.emit('scene:switch', 'HomeScene', {
        preloadedBgImage: this.homeBgImage,
        preloadedBgLoaded: this.homeBgLoaded,
        bottomButtons: {
          shop: this.bottomButtons.shop.img,
          bag: this.bottomButtons.bag.img,
          setting: this.bottomButtons.setting.img
        },
        // 预加载的标题和 tag 图片
        preloadedTitleImage: this.cachedImages['bg_game_title'] || null,
        preloadedTagImage: this.cachedImages['bg_stage1_tag'] || null
      });
    }, 500);
  }

  /**
   * 获取已缓存的图片
   */
  getCachedImage(key) {
    return this.cachedImages[key] || null;
  }

  /**
   * 同步缓存的图片到全局缓存
   * 供 HomeScene 和 GameplayScene 使用
   */
  _syncToGlobalCache() {
    // 同步关卡预览图（使用统一的 game_stage1_l1_home 格式）
    Object.keys(this.cachedImages).forEach(key => {
      const img = this.cachedImages[key];
      if (img && key.startsWith('game_stage') && key.endsWith('_home')) {
        GlobalPreviewCache.save(key, img);
        console.log(`[LoadingScene] 同步预览图到全局缓存: ${key}`);
      }
    });
    
    // 同步 sad 表情图片到全局缓存
    if (this.cachedImages['ui_icon_sad']) {
      GlobalToolImageCache.set('ui_icon_sad', this.cachedImages['ui_icon_sad']);
      console.log('[LoadingScene] 同步 sad 表情到全局缓存');
    }
  }

  /**
   * Cover 模式绘制背景图
   */
  _drawBackgroundCover(ctx, img, sw, sh) {
    const scaleX = sw / img.width;
    const scaleY = sh / img.height;
    const scale = Math.max(scaleX, scaleY);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (sw - dw) / 2;
    const dy = (sh - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  onUpdate(deltaTime) {
    if (this.progressBar) {
      this.progressBar.update(deltaTime);
    }
    this._rotation = (this._rotation || 0) + deltaTime * 0.005;
    if (this._rotation > Math.PI * 2) {
      this._rotation -= Math.PI * 2;
    }
  }

  onRender(ctx) {
    const width = this.screenWidth;
    const height = this.screenHeight;

    // 绘制背景图（如果已加载）
    if (this.bgImage && this.bgLoaded) {
      this._drawBackgroundCover(ctx, this.bgImage, width, height);
    } else {
      // 默认背景色
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, width, height);
    }
    
    // 装饰圆形
    ctx.fillStyle = 'rgba(74, 144, 217, 0.05)';
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.3, 100, 0, Math.PI * 2);
    ctx.fill();

    if (!this.titleText) return;

    this.titleText.onRender(ctx);
    if (this.subtitleText) this.subtitleText.onRender(ctx);

    const s = this.screenWidth / 750;
    this._drawLoadingIcon(ctx, width / 2, 620 * s, s);

    if (this.progressBar) this.progressBar.onRender(ctx);
    if (this.percentText) this.percentText.onRender(ctx);
    if (this.tipText) this.tipText.onRender(ctx);
    if (this.versionText) this.versionText.onRender(ctx);
    
    // 绘制坐标网格（调试用）
    if (CoordinateRenderer.isEnabled()) {
      CoordinateRenderer.render(ctx, this.screenWidth, this.screenHeight, 100);
    }
  }

  _drawLoadingIcon(ctx, x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._rotation || 0);

    const dotCount = 8;
    const radius = 30 * s;
    const dotRadius = 6 * s;

    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const dotX = Math.cos(angle) * radius;
      const dotY = Math.sin(angle) * radius;
      const alpha = 0.3 + ((i / dotCount) * 0.7);

      ctx.fillStyle = `rgba(74, 144, 217, ${alpha})`;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export default LoadingScene;
