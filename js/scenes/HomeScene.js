/**
 * HomeScene 首页场景
 * 使用从云存储缓存的图片
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import { globalEvent } from '../core/EventEmitter';
import { getLevelImageKey, getLevelImageConfig } from '../cloud/CloudResourceConfig';
import CloudStorage from '../cloud/CloudStorage';
import { getGame } from '../../app';
import { getLevel } from '../config/LevelConfig';

// 全局背景图缓存 - 避免场景切换时重新加载
const GlobalBgCache = {
  bgImage: null,
  bgLoaded: false,
  currentStage: null,
  
  // 保存背景图
  save(bgImage, stage) {
    this.bgImage = bgImage;
    this.bgLoaded = !!bgImage;
    this.currentStage = stage;
  },
  
  // 获取背景图（如果 stage 匹配）
  get(stage) {
    if (this.bgImage && this.currentStage === stage) {
      return { bgImage: this.bgImage, bgLoaded: true };
    }
    return null;
  },
  
  // 清除缓存
  clear() {
    this.bgImage = null;
    this.bgLoaded = false;
    this.currentStage = null;
  }
};

// 全局关卡预览图缓存 - 避免重复加载
// 导出供其他场景复用（如 GameplayScene）
export const GlobalPreviewCache = {
  // key: "game_stage1_l1_home" -> { img, loaded }
  _cache: {},
  
  // 保存预览图
  save(key, img) {
    this._cache[key] = { img, loaded: true };
  },
  
  // 获取预览图
  get(key) {
    return this._cache[key] || null;
  },
  
  // 检查是否存在
  has(key) {
    return !!this._cache[key];
  },
  
  // 清除缓存
  clear() {
    this._cache = {};
  }
};

// 全局标题图片缓存 - 避免场景切换时重新加载
const GlobalTitleCache = {
  _cache: {},
  
  save(key, img) {
    this._cache[key] = { img, loaded: true };
  },
  
  get(key) {
    return this._cache[key] || null;
  },
  
  has(key) {
    return !!this._cache[key];
  },
  
  clear() {
    this._cache = {};
  }
};

// 全局关卡状态缓存 - 保存关卡图标和状态
export const GlobalLevelStateCache = {
  // key: "stage1_level1" -> { status, stars, displayStatus }
  _cache: {},
  
  // 保存关卡状态
  save(stage, levelId, status, stars = 0) {
    const key = `stage${stage}_level${levelId}`;
    this._cache[key] = { status, stars, displayStatus: status };
  },
  
  // 获取关卡状态
  get(stage, levelId) {
    const key = `stage${stage}_level${levelId}`;
    return this._cache[key] || null;
  },
  
  // 批量保存关卡列表
  saveLevels(levels) {
    levels.forEach(level => {
      this.save(level.stage, level.id, level.status, level.stars);
    });
  },
  
  // 获取所有缓存的关卡
  getAll() {
    return { ...this._cache };
  },
  
  // 清除缓存
  clear() {
    this._cache = {};
  }
};

class HomeScene extends Scene {
  constructor() {
    super({ name: 'HomeScene' });
    this.screenWidth = 750;
    this.screenHeight = 1334;
    this.currentStage = 1;
    this.levels = [];
    
    // 缓存的图片
    this.iconImages = {};
    this.iconsLoaded = false;
    this.bgImage = null;
    this.bgLoaded = false;
    this._previewImages = {};
    
    // 标题图片（初始化为未加载状态）
    this._bg_game_titleImage = null;
    this._bg_game_titleLoaded = false;
    this._bg_stage1_tagImage = null;
    this._bg_stage1_tagLoaded = false;
    
    // 云存储
    this.cloudStorage = new CloudStorage();
    
    // 通关动画状态
    this._levelCompleteAnim = {
      active: false,        // 是否正在动画
      levelId: null,        // 哪个关卡在动画
      phase: 'none',        // 动画阶段: 'none' | 'jumping' | 'transforming'
      jumpCount: 0,         // 当前跳跃次数
      maxJumps: 3,          // 最大跳跃次数
      jumpProgress: 0,      // 当前跳跃进度 0-1
      transformProgress: 0, // 变形进度 0-1
      timer: 0              // 动画计时器
    };
  }

  async onLoad(data = {}) {
    // 从 DataManager 获取当前 stage
    const game = getGame();
    if (game && game.dataManager) {
      this.currentStage = game.dataManager.getCurrentStage();
      console.log(`[HomeScene] 当前阶段: ${this.currentStage}`);
    }
    
    // 1. 优先从全局缓存获取背景图（从其他场景返回时）
    const cachedBg = GlobalBgCache.get(this.currentStage);
    if (cachedBg) {
      this.bgImage = cachedBg.bgImage;
      this.bgLoaded = true;
      console.log('[HomeScene] 从全局缓存恢复背景图');
    }
    // 2. 其次使用预加载的背景图（首次从 LoadingScene 进入）
    else if (data.preloadedBgImage && data.preloadedBgLoaded) {
      this.bgImage = data.preloadedBgImage;
      this.bgLoaded = true;
      GlobalBgCache.save(this.bgImage, this.currentStage);
      console.log('[HomeScene] 使用预加载的背景图并缓存');
    }
    
    // 初始化云存储
    await this.cloudStorage.init();
    
    // 生成关卡（优先从全局缓存恢复状态）
    this.generateLevels(data);
    
    // 检查是否需要播放通关动画
    if (data.justCompletedLevel && data.completedStage === this.currentStage) {
      this._startLevelCompleteAnimation(data.justCompletedLevel, data.completedStars);
      
      // 立即异步预加载下一关预览图（动画期间加载，避免卡片显示时图片未准备好）
      this._preloadNextLevelPreview(data.justCompletedLevel);
    }
    
    this._initUI();
    
    // 串行加载图片，避免并发请求云存储导致临时 URL 获取失败
    await this._loadCachedImages();
    await this._preloadCurrentLevelPreview();
    await this._loadTitleImages();
  }

  /**
   * 从其他场景返回时触发
   * 恢复全局缓存中的图片数据
   */
  onEnter(data = {}) {
    console.log('[HomeScene] 进入场景，恢复缓存数据');
    
    // 恢复关卡图标
    this._restoreIconsFromCache();
    
    // 恢复背景图
    this._restoreBackgroundFromCache();
    
    // 恢复预览图
    this._restorePreviewImagesFromCache();
    
    // 恢复标题和标签图
    this._restoreTitleImagesFromCache();
  }
  
  /**
   * 从全局缓存恢复标题和标签图
   */
  _restoreTitleImagesFromCache() {
    // 恢复游戏标题
    const titleCached = GlobalTitleCache.get('bg_game_title');
    if (titleCached && titleCached.img) {
      this._bg_game_titleImage = titleCached.img;
      this._bg_game_titleLoaded = true;
      console.log('[HomeScene] 游戏标题从全局缓存恢复');
    }
    
    // 恢复阶段标签
    const tagCached = GlobalTitleCache.get('bg_stage1_tag');
    if (tagCached && tagCached.img) {
      this._bg_stage1_tagImage = tagCached.img;
      this._bg_stage1_tagLoaded = true;
      console.log('[HomeScene] 阶段标签从全局缓存恢复');
    }
  }
  
  /**
   * 从全局缓存恢复图标
   */
  _restoreIconsFromCache() {
    // 图标已经在 _loadCachedImages 中加载，这里不需要额外处理
    // 因为图标是通用的，已经缓存在 iconImages 中
  }
  
  /**
   * 从全局缓存恢复背景图
   */
  _restoreBackgroundFromCache() {
    const cachedBg = GlobalBgCache.get(this.currentStage);
    if (cachedBg && cachedBg.bgImage) {
      this.bgImage = cachedBg.bgImage;
      this.bgLoaded = true;
      console.log('[HomeScene] 背景图从全局缓存恢复');
    }
  }
  
  /**
   * 从全局缓存恢复预览图
   */
  _restorePreviewImagesFromCache() {
    if (!this.levels) return;
    
    this.levels.forEach(level => {
      const key = `game_stage${this.currentStage}_l${level.id}_home`;
      const cached = GlobalPreviewCache.get(key);
      if (cached && cached.img) {
        this._previewImages[key] = cached;
        console.log(`[HomeScene] 预览图从全局缓存恢复: ${key}`);
      }
    });
  }

  /**
   * 从本地缓存加载图片（LoadingScene 已下载）
   */
  async _loadCachedImages() {
    // 加载图标 - key 与文件名保持一致（不含扩展名）
    await this._loadCachedIcon('locked', 'ui-icon-locked');
    await this._loadCachedIcon('unlocked', 'ui-icon-unlocked');
    await this._loadCachedIcon('pass', 'ui-icon-pass');
    
    // 加载背景
    await this._loadCachedBackground();
  }

  /**
   * 加载图标（优先云存储缓存，否则本地）
   */
  async _loadCachedIcon(name, cacheKey) {
    // 1. 尝试从云存储缓存加载
    try {
      const cacheRecord = wx.getStorageSync('cloud_image_cache') || {};
      const cacheInfo = cacheRecord[cacheKey];
      
      if (cacheInfo && cacheInfo.fileID) {
        const tempURL = await this.cloudStorage.getTempFileURL(cacheInfo.fileID);
        if (tempURL) {
          const img = await this._downloadImage(tempURL);
          this.iconImages[name] = img;
          this.iconsLoaded = true;
          console.log(`[HomeScene] 图标${name}从云存储加载完成`);
          return;
        }
      }
    } catch (e) {
      console.log(`[HomeScene] 图标${name}云存储加载失败，尝试本地`);
    }
    
    // 2. 云存储没有，尝试从本地加载
    try {
      const pathParts = ['images', 'ui', 'icon', `ui-icon-${name}.png`];
      const localPath = pathParts.join('/');
      
      const img = await this._downloadLocalImage(localPath);
      this.iconImages[name] = img;
      this.iconsLoaded = true;
      console.log(`[HomeScene] 图标${name}从本地加载完成`);
    } catch (e) {
      console.log(`[HomeScene] 图标${name}本地加载失败:`, e.message);
    }
  }

  /**
   * 加载背景（优先使用预加载的，其次云存储缓存，最后本地）
   * 根据 currentStage 从云存储加载对应的背景图
   */
  async _loadCachedBackground() {
    // 0. 如果已经有背景图（从全局缓存或预加载），直接使用
    if (this.bgImage && this.bgLoaded) {
      console.log('[HomeScene] 背景已缓存，跳过重复加载');
      return;
    }
    
    // 1. 尝试从云存储缓存加载（根据 currentStage 选择对应的背景）
    try {
      const cacheRecord = wx.getStorageSync('cloud_image_cache') || {};
      const cacheKey = `bg-stage${this.currentStage}-home`;
      const cacheInfo = cacheRecord[cacheKey];
      
      if (cacheInfo && cacheInfo.fileID) {
        const tempURL = await this.cloudStorage.getTempFileURL(cacheInfo.fileID);
        if (tempURL) {
          const img = await this._downloadImage(tempURL);
          this.bgImage = img;
          this.bgLoaded = true;
          // 保存到全局缓存
          GlobalBgCache.save(this.bgImage, this.currentStage);
          console.log(`[HomeScene] 背景从云存储加载完成: ${cacheKey}`);
          return;
        }
      }
    } catch (e) {
      console.log('[HomeScene] 云存储背景加载失败，尝试本地');
    }
    
    // 2. 云存储没有，尝试从本地加载（根据 currentStage 加载对应背景）
    try {
      // 动态构建路径：bg-stage1-home.png, bg-stage2-home.png, etc.
      const pathParts = ['images', 'backgrounds', `bg-stage${this.currentStage}-home.png`];
      const localPath = pathParts.join('/');
      
      const img = await this._downloadLocalImage(localPath);
      this.bgImage = img;
      this.bgLoaded = true;
      // 保存到全局缓存
      GlobalBgCache.save(this.bgImage, this.currentStage);
      console.log(`[HomeScene] 背景从本地加载完成: stage${this.currentStage}`);
    } catch (e) {
      console.log('[HomeScene] 本地背景加载失败，使用默认背景色:', e.message);
    }
  }
  
  /**
   * 从本地下载图片
   */
  _downloadLocalImage(localPath) {
    return new Promise((resolve, reject) => {
      if (typeof wx === 'undefined') {
        reject(new Error('非微信环境'));
        return;
      }
      
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
   * 下载图片
   */
  _downloadImage(url) {
    return new Promise((resolve, reject) => {
      console.log(`[HomeScene] 开始下载图片: ${url.substring(0, 50)}...`);
      const img = wx.createImage();
      img.onload = () => {
        console.log(`[HomeScene] 图片下载成功`);
        resolve(img);
      };
      img.onerror = (err) => {
        console.error(`[HomeScene] 图片下载失败: ${url.substring(0, 50)}...`, err);
        reject(new Error('下载失败'));
      };
      img.src = url;
    });
  }

  generateLevels(data = {}) {
    // 重置关卡数组，避免累积旧数据
    this.levels = [];
    
    const positions = [
      { x: 375, y: 1180 },
      { x: 375, y: 1060 },
      { x: 250, y: 940 },
      { x: 500, y: 940 },
      { x: 375, y: 820 },
      { x: 180, y: 720 },
      { x: 570, y: 720 },
      { x: 375, y: 620 },
      { x: 250, y: 520 },
      { x: 500, y: 520 },
    ];
    
    // 获取 DataManager 中的解锁状态和星级
    const game = getGame();
    const dataManager = game ? game.dataManager : null;
    
    // 尝试从全局缓存恢复关卡状态
    const cachedStates = GlobalLevelStateCache.getAll();
    const hasCache = Object.keys(cachedStates).length > 0;
    
    // 如果是刚通关返回，强制从 DataManager 获取最新状态（缓存可能过期）
    const isJustCompleted = data.justCompletedLevel && data.completedStage === this.currentStage;
    
    for (let i = 1; i <= 10; i++) {
      // 计算全局关卡ID（用于 DataManager）
      // stage1: 1-10, stage2: 11-20, stage3: 21-30, stage4: 31-40
      const globalLevelId = (this.currentStage - 1) * 10 + i;
      const cacheKey = `stage${this.currentStage}_level${i}`;
      
      // 优先从缓存获取状态（如果有）- 但刚通关返回时不使用缓存
      let status, stars;
      const cached = cachedStates[cacheKey];
      
      if (!isJustCompleted && hasCache && cached && cached.status) {
        // 使用缓存的状态
        status = cached.status;
        stars = cached.stars || 0;
        console.log(`[HomeScene] 关卡 ${i} 从缓存恢复: ${status}, 星级: ${stars}`);
      } else {
        // 从 DataManager 获取最新状态
        // 判断是否解锁：第一关始终默认解锁，其他检查 DataManager
        let isUnlocked = false;
        if (i === 1) {
          isUnlocked = true;
        } else {
          isUnlocked = dataManager ? dataManager.isLevelUnlocked(globalLevelId) : false;
        }
        
        stars = dataManager ? dataManager.getLevelStars(globalLevelId) : 0;
        
        // 确定状态
        status = 'locked';
        if (isUnlocked) {
          status = stars > 0 ? 'completed' : 'unlocked';
        }
        
        if (isJustCompleted) {
          console.log(`[HomeScene] 关卡 ${i} 从 DataManager 获取（刚通关返回）: ${status}, 星级: ${stars}`);
        }
      }
      
      // 从 LevelConfig 获取关卡名称
      const levelConfig = getLevel(this.currentStage, i);
      const levelName = levelConfig ? levelConfig.name : `关卡 ${i}`;
      
      this.levels.push({ 
        id: i, 
        globalId: globalLevelId,
        stage: this.currentStage, 
        name: levelName, 
        status: status,
        stars: stars,
        x: positions[i-1].x,
        y: positions[i-1].y
      });
    }
    
    // 保存到全局缓存
    GlobalLevelStateCache.saveLevels(this.levels);
    
    console.log(`[HomeScene] 生成阶段 ${this.currentStage} 的关卡:`, this.levels.map(l => `${l.id}:${l.status}`).join(', '));
  }

  _initUI() {
    const s = this.screenWidth / 750;
    const cx = this.screenWidth / 2;
    
    // 金币组件配置
    this.coinComponent = {
      x: 30 * s,
      y: 40 * s,
      height: 56 * s,
      padding: 16 * s,
      bgColor: '#E3F2FD',  // 浅蓝色背景
      borderColor: '#BBDEFB',
      textColor: '#1976D2', // 深蓝色文字
      fontSize: 24 * s,
      coinSize: 36 * s,
      coinIcon: '💰'
    };
    
    // 初始化时更新金币显示
    this._updateCoinDisplay();
    
    // 初始化按钮和图标
    this._initButtonAndIcon();
  }

  /**
   * 更新金币显示
   */
  _updateCoinDisplay() {
    const game = getGame();
    const dataManager = game ? game.dataManager : null;
    this.coinAmount = dataManager ? dataManager.getCoins() : 100;
  }

  /**
   * 绘制金币组件
   */
  _drawCoinComponent(ctx) {
    if (!this.coinComponent) return;
    
    const s = this.screenWidth / 750;
    const { x, y, height, padding, bgColor, borderColor, textColor, fontSize, coinSize, coinIcon } = this.coinComponent;
    
    // 计算文字宽度
    ctx.font = `bold ${fontSize}px Arial`;
    const text = this.coinAmount !== undefined ? this.coinAmount.toString() : '100';
    const textWidth = ctx.measureText(text).width;
    
    // 胶囊总宽度 = 左边距 + 金币图标 + 间距 + 文字 + 右边距
    const capsuleWidth = padding + coinSize + 8 * s + textWidth + padding;
    const capsuleHeight = height;
    const capsuleX = x;
    const capsuleY = y;
    
    // 绘制胶囊背景
    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2 * s;
    this._drawRoundedRect(ctx, capsuleX, capsuleY, capsuleWidth, capsuleHeight, capsuleHeight / 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    
    // 绘制金币图标（带圆形金色背景）
    const coinCenterX = capsuleX + padding + coinSize / 2;
    const coinCenterY = capsuleY + capsuleHeight / 2;
    
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(coinCenterX, coinCenterY, coinSize / 2 + 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFA000';
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    ctx.restore();
    
    ctx.save();
    ctx.font = `${coinSize * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(coinIcon, coinCenterX, coinCenterY + 2 * s);
    ctx.restore();
    
    // 绘制金币数字
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textX = capsuleX + padding + coinSize + 8 * s;
    const textY = capsuleY + capsuleHeight / 2;
    ctx.fillText(text, textX, textY);
    ctx.restore();
  }

  _initButtonAndIcon() {
    const s = this.screenWidth / 750;
    
    this.iconSize = 80 * s;
    this.iconHitArea = 100 * s;

    const btnW = 120 * s, btnH = 80 * s;
    const btnY = this.screenHeight - 150 * s;
    
    this.shopBtn = new Button({ 
      x: 50 * s, y: btnY, width: btnW, height: btnH, 
      text: '商店', fontSize: 24 * s, bgColor: '#FF9500', borderRadius: 8 * s,
      onClick: () => globalEvent.emit('scene:switch', 'ShopScene')
    });
    this.toolBtn = new Button({ 
      x: 200 * s, y: btnY, width: btnW, height: btnH, 
      text: '工具包', fontSize: 24 * s, bgColor: '#4CAF50', borderRadius: 8 * s,
      onClick: () => globalEvent.emit('scene:switch', 'ToolScene')
    });
    this.settingBtn = new Button({ 
      x: 350 * s, y: btnY, width: btnW, height: btnH, 
      text: '设置', fontSize: 24 * s, bgColor: '#9C27B0', borderRadius: 8 * s,
      onClick: () => globalEvent.emit('scene:switch', 'SettingScene')
    });
  }

  /**
   * 预加载当前关卡预览图
   */
  async _preloadCurrentLevelPreview() {
    const currentLevel = this._getCurrentLevel();
    if (currentLevel) {
      await this._loadPreviewImage(this.currentStage, currentLevel.id);
    }
  }

  /**
   * 加载主页面标题和阶段标签图
   */
  async _loadTitleImages() {
    // 加载游戏标题图（带缓存）
    await this._loadTitleImage('bg_game_title', 'bg_game_title');
    // 加载阶段标签图（带缓存）
    await this._loadTitleImage('bg_stage1_tag', 'bg_stage1_tag');
  }

  /**
   * 加载标题图片（优先从全局缓存获取）
   * @param {string} cacheKey - 缓存key
   * @param {string} configKey - 配置key
   */
  async _loadTitleImage(cacheKey, configKey) {
    // 1. 优先从全局缓存获取
    const cached = GlobalTitleCache.get(cacheKey);
    if (cached && cached.loaded) {
      this[`_${cacheKey}Image`] = cached.img;
      this[`_${cacheKey}Loaded`] = true;
      console.log(`[HomeScene] ${cacheKey} 从全局缓存恢复`);
      return;
    }
    
    // 2. 从云存储加载
    try {
      const cacheRecord = wx.getStorageSync('cloud_image_cache') || {};
      const cacheInfo = cacheRecord[configKey];
      
      if (cacheInfo && cacheInfo.fileID) {
        const tempURL = await this.cloudStorage.getTempFileURL(cacheInfo.fileID);
        if (tempURL) {
          const img = await this._downloadImage(tempURL);
          this[`_${cacheKey}Image`] = img;
          this[`_${cacheKey}Loaded`] = true;
          
          // 保存到全局缓存
          GlobalTitleCache.save(cacheKey, img);
          console.log(`[HomeScene] ${cacheKey} 从云存储加载完成`);
          return;
        }
      }
    } catch (e) {
      console.log(`[HomeScene] ${cacheKey} 加载失败:`, e.message);
    }
  }

  /**
   * 加载预览图片（混合方案：优先全局缓存，其次云存储缓存，否则本地）
   */
  async _loadPreviewImage(stage, levelId) {
    const key = `game_stage${stage}_l${levelId}_home`;
    
    // 0. 检查实例缓存
    if (this._previewImages[key]) return;
    
    // 1. 优先从全局缓存获取
    const globalCached = GlobalPreviewCache.get(key);
    if (globalCached && globalCached.loaded) {
      this._previewImages[key] = globalCached;
      console.log(`[HomeScene] 预览图从全局缓存恢复: ${key}`);
      return;
    }
    
    // 2. 从 LevelConfig 获取 homeImagePath
    const { getLevel } = require('../config/LevelConfig');
    const levelConfig = getLevel(stage, levelId);
    
    if (!levelConfig || !levelConfig.homeImagePath) {
      console.log(`[HomeScene] 关卡 ${levelId} 未配置 homeImagePath`);
      return;
    }
    
    try {
      const fileID = levelConfig.homeImagePath;
      console.log(`[HomeScene] 从云存储加载预览图: ${fileID.substring(0, 50)}...`);
      
      const tempURL = await this.cloudStorage.getTempFileURL(fileID);
      if (!tempURL) {
        console.log(`[HomeScene] 获取临时URL失败，尝试本地加载: ${key}`);
        throw new Error('getTempFileURL failed');
      }
      
      const img = await this._downloadImage(tempURL);
      
      // 保存到实例缓存和全局缓存
      const cacheEntry = { loaded: true, img };
      this._previewImages[key] = cacheEntry;
      GlobalPreviewCache.save(key, img);
      console.log(`[HomeScene] 预览图加载成功: ${key}`);
      
    } catch (e) {
      console.log(`[HomeScene] 云存储加载失败，尝试本地: ${key}`, e.message);
      
      // 尝试从本地加载降级
      try {
        const localPath = `images/game/${key}.png`;
        const img = await this._downloadLocalImage(localPath);
        const cacheEntry = { loaded: true, img };
        this._previewImages[key] = cacheEntry;
        GlobalPreviewCache.save(key, img);
        console.log(`[HomeScene] 预览图从本地加载成功: ${key}`);
      } catch (localErr) {
        console.log(`[HomeScene] 预览图本地加载也失败: ${key}`, localErr.message);
      }
    }
  }
  
  /**
   * 从本地加载图片（动态路径，避免编译检查）
   */
  _loadLocalImage(key, localPath) {
    return new Promise((resolve, reject) => {
      if (typeof wx === 'undefined') {
        reject(new Error('非微信环境'));
        return;
      }
      
      // 延迟设置路径，避免编译时静态分析
      setTimeout(() => {
        const img = wx.createImage();
        img.onload = () => {
          this._previewImages[key] = { loaded: true, img };
          resolve(img);
        };
        img.onerror = () => reject(new Error('本地图片不存在'));
        img.src = localPath;
      }, 0);
    });
  }
  
  /**
   * 从本地下载图片（用于缓存，直接返回 Image 对象）
   */
  _downloadLocalImageForCache(localPath) {
    return new Promise((resolve, reject) => {
      if (typeof wx === 'undefined') {
        reject(new Error('非微信环境'));
        return;
      }
      
      const img = wx.createImage();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('本地图片不存在'));
      img.src = localPath;
    });
  }

  _getCurrentLevel() {
    // 如果动画刚完成，优先显示下一关的预览卡片
    const anim = this._levelCompleteAnim;
    if (!anim.active && anim.levelId && anim.phase === 'none') {
      // 动画已完成，找到刚通关关卡的下一关
      const nextLevel = this.levels.find(l => l.id === anim.levelId + 1);
      if (nextLevel && nextLevel.status !== 'locked') {
        return nextLevel;
      }
    }
    
    // 动画进行中或没有动画时，按原逻辑查找
    const unlockedLevel = this.levels.find(l => l.status === 'unlocked');
    if (unlockedLevel) return unlockedLevel;
    const lockedLevel = this.levels.find(l => l.status === 'locked');
    if (lockedLevel) return lockedLevel;
    return this.levels[this.levels.length - 1];
  }

  passLevel(levelId, stars) {
    const level = this.levels.find(l => l.id === levelId);
    if (!level) return;
    
    level.status = 'completed';
    level.stars = stars;
    
    // 更新全局缓存
    GlobalLevelStateCache.save(this.currentStage, levelId, 'completed', stars);
    
    const nextLevel = this.levels.find(l => l.id === levelId + 1);
    if (nextLevel && nextLevel.status === 'locked') {
      nextLevel.status = 'unlocked';
      GlobalLevelStateCache.save(this.currentStage, nextLevel.id, 'unlocked', 0);
      this._loadPreviewImage(this.currentStage, nextLevel.id);
    }
  }

  /**
   * 启动关卡通关动画
   * @param {number} levelId - 通关的关卡ID
   * @param {number} stars - 获得的星级
   */
  _startLevelCompleteAnimation(levelId, stars = 3) {
    const level = this.levels.find(l => l.id === levelId);
    if (!level) return;
    
    console.log(`[HomeScene] 启动关卡 ${levelId} 通关动画，星级: ${stars}`);
    
    // 设置关卡星级（用于后续状态更新）
    level.stars = stars;
    
    // 设置动画状态
    this._levelCompleteAnim = {
      active: true,
      levelId: levelId,
      phase: 'jumping',      // 第一阶段：跳跃
      jumpCount: 0,
      maxJumps: 3,
      jumpProgress: 0,
      transformProgress: 0,
      timer: 0,
      jumpDuration: 667,     // 每次跳跃 667ms，3次共2秒
      transformDuration: 300 // 变形阶段 300ms
    };
    
    // 确保关卡当前显示为 unlocked 状态（用于跳跃动画）
    level.displayStatus = 'unlocked';
  }

  /**
   * 更新通关动画
   */
  _updateLevelCompleteAnimation(deltaTime) {
    const anim = this._levelCompleteAnim;
    if (!anim.active) return;
    
    const level = this.levels.find(l => l.id === anim.levelId);
    if (!level) {
      anim.active = false;
      return;
    }
    
    anim.timer += deltaTime;
    
    if (anim.phase === 'jumping') {
      // 跳跃阶段：每次跳跃 667ms，3次共2秒
      const jumpDuration = anim.jumpDuration || 667;
      anim.jumpProgress = Math.min(1, anim.jumpProgress + deltaTime / jumpDuration);
      
      // 完成一次跳跃
      if (anim.jumpProgress >= 1) {
        anim.jumpCount++;
        anim.jumpProgress = 0;
        console.log(`[HomeScene] 跳跃 ${anim.jumpCount}/${anim.maxJumps}`);
        
        // 完成3次跳跃，进入变形阶段
        if (anim.jumpCount >= anim.maxJumps) {
          anim.phase = 'transforming';
          anim.transformProgress = 0;
          console.log('[HomeScene] 进入变形阶段');
        }
      }
    } else if (anim.phase === 'transforming') {
      // 变形阶段：unlocked -> completed，持续 300ms
      const transformDuration = anim.transformDuration || 300;
      anim.transformProgress = Math.min(1, anim.transformProgress + deltaTime / transformDuration);
      
      // 变形完成
      if (anim.transformProgress >= 1) {
        // 更新关卡状态为 completed
        level.status = 'completed';
        level.displayStatus = null; // 清除显示状态，使用实际状态
        
        // 更新全局缓存
        GlobalLevelStateCache.save(this.currentStage, anim.levelId, 'completed', level.stars);
        
        // 解锁下一关
        const nextLevelId = anim.levelId + 1;
        if (nextLevelId <= 10) {
          const nextLevel = this.levels.find(l => l.id === nextLevelId);
          if (nextLevel && nextLevel.status === 'locked') {
            nextLevel.status = 'unlocked';
            GlobalLevelStateCache.save(this.currentStage, nextLevelId, 'unlocked', 0);
            console.log(`[HomeScene] 解锁下一关: ${nextLevelId}`);
          }
        }
        
        // 结束动画
        anim.active = false;
        anim.phase = 'none';
        console.log(`[HomeScene] 关卡 ${anim.levelId} 通关动画完成`);
        
        // 预加载下一关的预览图（如果还没加载）
        this._preloadNextLevelPreview(anim.levelId);
      }
    }
  }

  /**
   * 预加载下一关的预览图（动画完成后调用）
   * 使用 LevelConfig.homeImagePath 获取完整的云存储路径
   */
  async _preloadNextLevelPreview(currentLevelId) {
    const nextLevelId = currentLevelId + 1;
    if (nextLevelId > 10) return; // 超过本stage最后一关
    
    console.log(`[HomeScene] 动画完成后预加载下一关预览图: ${nextLevelId}`);
    
    try {
      // 首先检查全局缓存是否已有
      const previewKey = `game_stage${this.currentStage}_l${nextLevelId}_home`;
      const globalCached = GlobalPreviewCache.get(previewKey);
      if (globalCached && globalCached.loaded && globalCached.img) {
        console.log(`[HomeScene] 下一关预览图已在全局缓存中`);
        this._previewImages[previewKey] = globalCached;
        return;
      }
      
      // 从 LevelConfig 获取 homeImagePath
      const { getLevel } = require('../config/LevelConfig');
      const nextLevelConfig = getLevel(this.currentStage, nextLevelId);
      
      if (!nextLevelConfig || !nextLevelConfig.homeImagePath) {
        console.log('[HomeScene] 下一关未配置 homeImagePath');
        return;
      }
      
      // 从云存储加载
      const fileID = nextLevelConfig.homeImagePath;
      console.log(`[HomeScene] 从云存储加载下一关预览图: ${fileID}`);
      
      const tempURL = await this.cloudStorage.getTempFileURL(fileID);
      if (tempURL) {
        const img = await this._downloadImage(tempURL);
        this._previewImages[previewKey] = { loaded: true, img };
        GlobalPreviewCache.save(previewKey, img);
        console.log(`[HomeScene] 下一关预览图加载完成: ${previewKey}`);
      }
    } catch (e) {
      console.log(`[HomeScene] 预加载下一关预览图失败:`, e.message);
    }
  }

  /**
   * 获取关卡图标的动画偏移
   */
  _getLevelIconOffset(levelId) {
    const anim = this._levelCompleteAnim;
    if (!anim.active || anim.levelId !== levelId || anim.phase !== 'jumping') {
      return { x: 0, y: 0, scale: 1, glow: 0 };
    }
    
    // 跳跃动画：正弦波，每次跳跃高度递减（幅度减小：30px -> 24px -> 18px）
    const progress = anim.jumpProgress;
    const jumpHeight = 30 * (1 - anim.jumpCount * 0.2); // 减小基础高度：60 -> 30
    
    // 使用正弦波计算Y偏移 (0 -> -height -> 0)
    const yOffset = -Math.sin(progress * Math.PI) * jumpHeight;
    
    // 轻微压缩（形变效果减小）
    const scaleY = 1 - Math.sin(progress * Math.PI) * 0.05; // 减小形变：0.1 -> 0.05
    const scaleX = 1 + Math.sin(progress * Math.PI) * 0.03; // 减小形变：0.05 -> 0.03
    
    // 绿色光芒强度（跳跃最高点时最亮）
    const glow = Math.sin(progress * Math.PI);
    
    return { x: 0, y: yOffset, scaleX, scaleY, glow };
  }

  _onLevelClick(level) {
    if (level.status === 'locked') {
      console.log(`[HomeScene] 关卡${level.id}未解锁`);
      return;
    }
    globalEvent.emit('scene:switch', 'GameplayScene', { 
      levelId: level.id, stage: this.currentStage 
    });
  }

  onUpdate(deltaTime) {
    if (this.shopBtn) this.shopBtn.update(deltaTime);
    if (this.toolBtn) this.toolBtn.update(deltaTime);
    if (this.settingBtn) this.settingBtn.update(deltaTime);
    
    // 更新通关动画
    this._updateLevelCompleteAnimation(deltaTime);
  }

  onRender(ctx) {
    const w = this.screenWidth;
    const h = this.screenHeight;
    
    // 背景
    if (this.bgImage && this.bgLoaded) {
      this._drawBackgroundCover(ctx, this.bgImage, w, h);
    } else {
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#4A90D9';
      ctx.fillRect(0, 0, w, 60);
    }

    // 绘制顶部淡蓝色渐变蒙层（占屏幕顶部 30%）
    this._drawTopBlueOverlay(ctx, w, h);

    if (!this.coinComponent) return;

    // 绘制金币组件
    this._drawCoinComponent(ctx);

    // 先绘制关卡图标
    this._drawLevelIcons(ctx);
    
    // 再绘制游戏标题和阶段标签（确保在关卡图标之上）
    this._drawTitleImages(ctx);

    if (this.shopBtn) this.shopBtn.onRender(ctx);
    if (this.toolBtn) this.toolBtn.onRender(ctx);
    if (this.settingBtn) this.settingBtn.onRender(ctx);
  }

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

  /**
   * 绘制顶部白色渐变蒙层
   * 占屏幕顶部 30%，从顶部向下渐变变淡
   */
  _drawTopBlueOverlay(ctx, sw, sh) {
    const overlayHeight = sh * 0.40; // 顶部 30% 区域
    
    // 创建从上到下的渐变（白色 -> 透明）
    const gradient = ctx.createLinearGradient(0, 0, 0, overlayHeight);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.50)');    // 顶部：较深的白色
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.30)');  // 中间：更淡
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');       // 底部：完全透明
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, sw, overlayHeight);
  }

  /**
   * 绘制游戏标题和阶段标签
   */
  _drawTitleImages(ctx) {
    const s = this.screenWidth / 750;
    const centerX = this.screenWidth / 2;
    const startY = 80 * s; // 从屏幕顶部往下 80px 开始绘制（可调整这个值）
    
    // 绘制游戏标题
    if (this._bg_game_titleImage && this._bg_game_titleLoaded) {
      const titleHeight = 600 * s; // 标题高度
      const titleScale = titleHeight / this._bg_game_titleImage.height;
      const titleWidth = this._bg_game_titleImage.width * titleScale;
      const titleX = centerX - titleWidth / 2;
      const titleY = startY-20;
      
      ctx.drawImage(
        this._bg_game_titleImage, 
        titleX, titleY, 
        titleWidth, titleHeight
      );
    }
    
    // 绘制阶段标签（在标题下方）
    if (this._bg_stage1_tagImage && this._bg_stage1_tagLoaded) {
      const tagHeight = 120 * s; // 标签高度（从60加大到80）
      const tagScale = tagHeight / this._bg_stage1_tagImage.height;
      const tagWidth = this._bg_stage1_tagImage.width * tagScale;
      const tagX = centerX - tagWidth / 2;
      // 如果有标题，标签放在标题下方 20px；如果没有，放在 startY
      const tagY = (this._bg_game_titleImage && this._bg_game_titleLoaded) 
        ? startY + 300 * s -10
        : startY;
      
      ctx.drawImage(
        this._bg_stage1_tagImage, 
        tagX, tagY, 
        tagWidth, tagHeight
      );
    }
  }

  _drawLevelIcons(ctx) {
    if (!this.iconsLoaded || !this.levels.length) return;
    
    const s = this.screenWidth / 750;
    const iconSize = this.iconSize;
    const currentLevel = this._getCurrentLevel();
    
    // 第一步：绘制所有关卡图标（确保在最底层）
    this.levels.forEach(level => {
      // 判断是否是动画中的关卡
      const isAnimating = this._levelCompleteAnim.active && 
                          this._levelCompleteAnim.levelId === level.id;
      
      // 确定要显示的图标
      let displayStatus = level.status;
      if (isAnimating) {
        const anim = this._levelCompleteAnim;
        if (anim.phase === 'jumping') {
          // 跳跃阶段显示 unlocked 图标
          displayStatus = 'unlocked';
        } else if (anim.phase === 'transforming') {
          // 变形阶段：根据进度混合
          displayStatus = anim.transformProgress < 0.5 ? 'unlocked' : 'completed';
        }
      }
      
      // 状态到图标的映射: completed -> pass
      const iconName = displayStatus === 'completed' ? 'pass' : displayStatus;
      let iconImg = this.iconImages[iconName] || this.iconImages.locked;
      if (!iconImg) return;
      
      let x = level.x * s;
      let y = level.y * s;
      let drawSize = iconSize;
      
      // 应用动画偏移和缩放
      let offset = { x: 0, y: 0, scaleX: 1, scaleY: 1, glow: 0 };
      if (isAnimating) {
        offset = this._getLevelIconOffset(level.id);
        x += offset.x;
        y += offset.y;
        
        // 应用形变缩放
        if (offset.scaleX && offset.scaleY) {
          drawSize = iconSize * Math.max(offset.scaleX, offset.scaleY);
        }
      }
      
      ctx.save();
      
      // 如果是动画中的关卡且处于跳跃阶段，绘制绿色光芒
      if (isAnimating && this._levelCompleteAnim.phase === 'jumping' && offset.glow > 0) {
        // 绘制绿色光芒（在图标后面）
        const glowRadius = drawSize * (0.8 + offset.glow * 0.4); // 光芒大小随跳跃变化
        const glowAlpha = offset.glow * 0.6; // 透明度随跳跃变化，最大0.6
        
        // 外圈光芒
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(76, 175, 80, ${glowAlpha * 0.3})`; // 淡绿色
        ctx.fill();
        
        // 内圈光芒
        ctx.beginPath();
        ctx.arc(x, y, glowRadius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(76, 175, 80, ${glowAlpha * 0.5})`; // 稍深一点的绿色
        ctx.fill();
        
        // 核心光芒
        ctx.beginPath();
        ctx.arc(x, y, glowRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129, 199, 132, ${glowAlpha * 0.8})`; // 亮绿色
        ctx.fill();
      }
      
      // 如果是动画中的关卡，应用形变变换
      if (isAnimating && this._levelCompleteAnim.phase === 'jumping') {
        ctx.translate(x, y);
        ctx.scale(offset.scaleX || 1, offset.scaleY || 1);
        ctx.drawImage(iconImg, -drawSize/2, -drawSize/2, drawSize, drawSize);
      } else {
        ctx.drawImage(iconImg, x - drawSize/2, y - drawSize/2, drawSize, drawSize);
      }
      
      ctx.restore();
      
      // 绘制关卡数字
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${18 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(level.id.toString(), x, y + drawSize/2 + 16 * s);
    });
    
    // 第二步：在所有图标绘制完成后，再绘制预览卡片（确保在最上层）
    if (currentLevel) {
      const currentLevelData = this.levels.find(l => l.id === currentLevel.id);
      if (currentLevelData) {
        this._drawLevelPreviewCard(ctx, currentLevelData, s);
      }
    }
  }

  _drawLevelPreviewCard(ctx, level, s) {
    const cardWidth = 280 * s;
    const cardHeight = 324 * s;
    const iconX = level.x * s;
    const iconY = level.y * s;
    const cardX = iconX + 50 * s;
    const cardY = iconY - cardHeight / 2;
    
    const sphereRadius = cardWidth * 0.12;
    const cardBorderRadius = cardWidth * 0.08;
    const cardBorderWidth = Math.max(2, cardWidth * 0.02);
    const sphereCenterX = cardX + cardWidth / 2;
    const sphereCenterY = cardY + sphereRadius;
    
    // 卡片背景
    ctx.save();
    this._drawRoundedRect(ctx, cardX, cardY + sphereRadius, cardWidth, cardHeight - sphereRadius, cardBorderRadius);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
    
    // 卡片边框
    ctx.save();
    this._drawRoundedRect(ctx, cardX, cardY + sphereRadius, cardWidth, cardHeight - sphereRadius, cardBorderRadius);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = cardBorderWidth;
    ctx.stroke();
    ctx.restore();
    
    // 预览图片 - 优先从全局缓存获取
    const previewImgKey = `game_stage${this.currentStage}_l${level.id}_home`;
    let previewImg = this._previewImages[previewImgKey];
    
    // 如果实例缓存没有，尝试从全局缓存获取
    if (!previewImg || !previewImg.loaded) {
      const globalCached = GlobalPreviewCache.get(previewImgKey);
      if (globalCached && globalCached.loaded && globalCached.img) {
        previewImg = globalCached;
        // 同步到实例缓存
        this._previewImages[previewImgKey] = globalCached;
      }
    }
    
    const contentPadding = cardWidth * 0.08;
    const previewImgX = cardX + contentPadding;
    const previewImgY = cardY + sphereRadius + contentPadding;
    const previewImgW = cardWidth - 2 * contentPadding;
    const levelNameHeight = (cardHeight - sphereRadius) * 0.18;
    const previewImgH = (cardHeight - sphereRadius) - 2 * contentPadding - levelNameHeight;
    
    if (previewImg && previewImg.loaded && previewImg.img) {
      const img = previewImg.img;
      ctx.save();
      this._drawRoundedRect(ctx, previewImgX, previewImgY, previewImgW, previewImgH, cardBorderRadius * 0.5);
      ctx.clip();
      
      const imgRatio = img.width / img.height;
      const frameRatio = previewImgW / previewImgH;
      let drawW, drawH, drawX, drawY;
      if (imgRatio > frameRatio) {
        drawH = previewImgH;
        drawW = previewImgH * imgRatio;
        drawX = previewImgX + (previewImgW - drawW) / 2;
        drawY = previewImgY;
      } else {
        drawW = previewImgW;
        drawH = previewImgW / imgRatio;
        drawX = previewImgX;
        drawY = previewImgY + (previewImgH - drawH) / 2;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = '#E8E8E8';
      this._drawRoundedRect(ctx, previewImgX, previewImgY, previewImgW, previewImgH, cardBorderRadius * 0.5);
      ctx.fill();
      ctx.fillStyle = '#999999';
      ctx.font = `${12 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('加载中...', previewImgX + previewImgW / 2, previewImgY + previewImgH / 2);
      ctx.restore();
    }
    
    // 关卡名称
    ctx.save();
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${Math.max(12, cardWidth * 0.08)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameTextY = previewImgY + previewImgH + levelNameHeight / 2;
    ctx.fillText(level.name, cardX + cardWidth / 2, nameTextY);
    ctx.restore();
    
    // 关卡数字球
    ctx.save();
    ctx.beginPath();
    ctx.arc(sphereCenterX, sphereCenterY, sphereRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFA500';
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = cardBorderWidth * 1.5;
    ctx.stroke();
    ctx.restore();
    
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${sphereRadius * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(level.id.toString(), sphereCenterX, sphereCenterY);
    ctx.restore();
    
    // 开始任务按钮
    const btnWidth = cardWidth * 0.8;
    const btnHeight = (cardHeight - sphereRadius) * 0.2;
    const btnX = cardX + (cardWidth - btnWidth) / 2;
    const btnY = nameTextY + levelNameHeight * 0.6;
    const btnRadius = btnHeight * 0.3;
    
    this._startBtnRect = { x: btnX, y: btnY, width: btnWidth, height: btnHeight, level };
    
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8 * s;
    ctx.shadowOffsetY = 4 * s;
    this._drawRoundedRect(ctx, btnX, btnY, btnWidth, btnHeight, btnRadius);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.restore();
    
    ctx.save();
    this._drawRoundedRect(ctx, btnX, btnY, btnWidth, btnHeight, btnRadius);
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    
    ctx.save();
    ctx.fillStyle = '#8B4513';
    ctx.font = `bold ${Math.max(16, btnHeight * 0.45)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始任务', btnX + btnWidth / 2, btnY + btnHeight / 2);
    ctx.restore();
  }

  _drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    ctx.lineTo(x + radius, y + height);
    ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + radius);
    ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }

  _getClickedLevel(x, y) {
    const s = this.screenWidth / 750;
    const hitArea = this.iconHitArea;
    
    for (const level of this.levels) {
      const lx = level.x * s;
      const ly = level.y * s;
      if (x >= lx - hitArea/2 && x <= lx + hitArea/2 &&
          y >= ly - hitArea/2 && y <= ly + hitArea/2) {
        return level;
      }
    }
    return null;
  }

  _checkStartBtnClick(x, y) {
    if (!this._startBtnRect) return false;
    const rect = this._startBtnRect;
    if (x >= rect.x && x <= rect.x + rect.width &&
        y >= rect.y && y <= rect.y + rect.height) {
      return rect.level;
    }
    return false;
  }

  onTouchStart(x, y) {
    if (this.shopBtn && this.shopBtn.onTouchStart(x, y)) return true;
    if (this.toolBtn && this.toolBtn.onTouchStart(x, y)) return true;
    if (this.settingBtn && this.settingBtn.onTouchStart(x, y)) return true;
    
    const btnLevel = this._checkStartBtnClick(x, y);
    if (btnLevel) {
      this._pressedStartBtn = true;
      return true;
    }
    
    this._pressedLevel = this._getClickedLevel(x, y);
    return this._pressedLevel !== null;
  }

  onTouchEnd(x, y) {
    if (this.shopBtn && this.shopBtn.onTouchEnd(x, y)) return true;
    if (this.toolBtn && this.toolBtn.onTouchEnd(x, y)) return true;
    if (this.settingBtn && this.settingBtn.onTouchEnd(x, y)) return true;
    
    if (this._pressedStartBtn) {
      const btnLevel = this._checkStartBtnClick(x, y);
      if (btnLevel) {
        globalEvent.emit('scene:switch', 'GameplayScene', { 
          levelId: btnLevel.id, stage: this.currentStage 
        });
      }
      this._pressedStartBtn = false;
      return true;
    }
    
    const level = this._getClickedLevel(x, y);
    if (level && this._pressedLevel && level.id === this._pressedLevel.id) {
      this._onLevelClick(level);
    }
    this._pressedLevel = null;
    return level !== null;
  }
}

export default HomeScene;
