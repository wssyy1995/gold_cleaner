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

// 全局底部按钮图片缓存 - 避免场景切换时重新加载
const GlobalBottomBtnCache = {
  _cache: {},
  
  save(key, img) {
    this._cache[key] = { img, loaded: !!img };
  },
  
  get(key) {
    return this._cache[key] || null;
  },
  
  clear() {
    this._cache = {};
  }
};

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
    
    // 底部按钮图片
    this.bottomButtonImages = {
      shop: null,
      bag: null,
      setting: null
    };
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
    
    // 开始任务按钮按下状态
    this._pressedStartBtn = false;
    
    // 流光呼吸法动画状态
    this._breathingShimmer = {
      breathTime: 0,        // 呼吸动画计时器
      breathDuration: 4000, // 呼吸周期 4s
      shimmerTime: 0,       // 流光动画计时器
      shimmerDuration: 2500 // 流光周期 2.5s
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
    
    // 3. 使用预加载的底部按钮图片并缓存
    if (data.bottomButtons) {
      this.bottomButtonImages.shop = data.bottomButtons.shop;
      this.bottomButtonImages.bag = data.bottomButtons.bag;
      this.bottomButtonImages.setting = data.bottomButtons.setting;
      // 保存到全局缓存
      GlobalBottomBtnCache.save('shop', data.bottomButtons.shop);
      GlobalBottomBtnCache.save('bag', data.bottomButtons.bag);
      GlobalBottomBtnCache.save('setting', data.bottomButtons.setting);
      console.log('[HomeScene] 使用预加载的底部按钮图片并缓存');
    }
    
    // 4. 使用预加载的标题和 tag 图片（确保第一帧就能渲染）
    if (data.preloadedTitleImage) {
      this._bg_game_titleImage = data.preloadedTitleImage;
      this._bg_game_titleLoaded = true;
      console.log('[HomeScene] 使用预加载的游戏标题图片');
    }
    if (data.preloadedTagImage) {
      this._bg_stage1_tagImage = data.preloadedTagImage;
      this._bg_stage1_tagLoaded = true;
      console.log('[HomeScene] 使用预加载的阶段标签图片');
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
    
    // 恢复底部按钮图片
    this._restoreBottomButtonsFromCache();
  }
  
  /**
   * 从场景栈恢复时调用（由 SceneManager.popScene 触发）
   * @param {Object} data - 传递的数据，包含通关信息
   */
  onResumeFromStack(data = {}) {
    console.log('[HomeScene] 从场景栈恢复', data);
    
    // 检查是否需要播放通关动画
    const hasCompleteData = data.justCompletedLevel && data.completedStage === this.currentStage;
    
    if (hasCompleteData) {
      // 有过关动画时，先刷新非过关关卡的状态
      this._refreshLevelStatesExcept(data.justCompletedLevel);
      
      // 然后播放过关动画（动画会处理该关卡的状态变化）
      console.log(`[HomeScene] 播放通关动画: 关卡 ${data.justCompletedLevel}, 星级 ${data.completedStars}`);
      this._startLevelCompleteAnimation(data.justCompletedLevel, data.completedStars);
      
      // 立即异步预加载下一关预览图（动画期间加载）
      this._preloadNextLevelPreview(data.justCompletedLevel);
    } else {
      // 没有过关动画时，刷新所有关卡状态
      this._refreshLevelStates();
    }
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
   * 从全局缓存恢复底部按钮图片
   */
  _restoreBottomButtonsFromCache() {
    const shopCached = GlobalBottomBtnCache.get('shop');
    if (shopCached && shopCached.img) {
      this.bottomButtonImages.shop = shopCached.img;
      console.log('[HomeScene] 商店按钮从全局缓存恢复');
    }
    
    const bagCached = GlobalBottomBtnCache.get('bag');
    if (bagCached && bagCached.img) {
      this.bottomButtonImages.bag = bagCached.img;
      console.log('[HomeScene] 工具包按钮从全局缓存恢复');
    }
    
    const settingCached = GlobalBottomBtnCache.get('setting');
    if (settingCached && settingCached.img) {
      this.bottomButtonImages.setting = settingCached.img;
      console.log('[HomeScene] 设置按钮从全局缓存恢复');
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
   * 刷新关卡状态（从 DataManager 获取最新状态）
   * 在从其他页面返回时调用，避免显示旧状态
   */
  _refreshLevelStates() {
    if (!this.levels || this.levels.length === 0) return;
    
    const game = getGame();
    const dataManager = game ? game.dataManager : null;
    if (!dataManager) return;
    
    console.log('[HomeScene] 刷新关卡状态');
    
    let hasChanged = false;
    
    this.levels.forEach(level => {
      const globalLevelId = (this.currentStage - 1) * 10 + level.id;
      
      // 从 DataManager 获取最新状态
      let isUnlocked = false;
      if (level.id === 1) {
        isUnlocked = true;
      } else {
        isUnlocked = dataManager.isLevelUnlocked(globalLevelId);
      }
      
      const stars = dataManager.getLevelStars(globalLevelId);
      
      // 确定新状态
      let newStatus = 'locked';
      if (isUnlocked) {
        newStatus = stars > 0 ? 'completed' : 'unlocked';
      }
      
      // 如果状态发生变化，更新
      if (level.status !== newStatus || level.stars !== stars) {
        console.log(`[HomeScene] 关卡 ${level.id} 状态更新: ${level.status} -> ${newStatus}, 星级: ${level.stars} -> ${stars}`);
        level.status = newStatus;
        level.stars = stars;
        hasChanged = true;
        
        // 更新全局缓存
        GlobalLevelStateCache.save(this.currentStage, level.id, newStatus, stars);
      }
    });
    
    if (hasChanged) {
      console.log('[HomeScene] 关卡状态已刷新');
    }
  }
  
  /**
   * 刷新关卡状态，但排除指定关卡（用于过关动画）
   * @param {number} excludeLevelId - 要排除的关卡ID
   */
  _refreshLevelStatesExcept(excludeLevelId) {
    if (!this.levels || this.levels.length === 0) return;
    
    const game = getGame();
    const dataManager = game ? game.dataManager : null;
    if (!dataManager) return;
    
    console.log(`[HomeScene] 刷新关卡状态（排除关卡 ${excludeLevelId}）`);
    
    this.levels.forEach(level => {
      // 跳过要播放动画的关卡
      if (level.id === excludeLevelId) {
        // 将该关卡临时设为 unlocked，以便动画正常播放
        // 动画完成后会设为 completed
        level.status = 'unlocked';
        level.displayStatus = 'unlocked';
        return;
      }
      
      const globalLevelId = (this.currentStage - 1) * 10 + level.id;
      
      // 从 DataManager 获取最新状态
      let isUnlocked = false;
      if (level.id === 1) {
        isUnlocked = true;
      } else {
        isUnlocked = dataManager.isLevelUnlocked(globalLevelId);
      }
      
      const stars = dataManager.getLevelStars(globalLevelId);
      
      // 确定新状态
      let newStatus = 'locked';
      if (isUnlocked) {
        newStatus = stars > 0 ? 'completed' : 'unlocked';
      }
      
      // 如果状态发生变化，更新
      if (level.status !== newStatus || level.stars !== stars) {
        console.log(`[HomeScene] 关卡 ${level.id} 状态更新: ${level.status} -> ${newStatus}, 星级: ${level.stars} -> ${stars}`);
        level.status = newStatus;
        level.stars = stars;
        
        // 更新全局缓存
        GlobalLevelStateCache.save(this.currentStage, level.id, newStatus, stars);
      }
    });
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
      { x: 640, y: 1400 },
      { x: 665, y: 1250 },
      { x: 540, y: 1180 },
      { x: 450, y: 1120 },
      { x: 300, y: 1060 },
      { x: 170, y: 1000 },
      { x: 110, y: 800 },
      { x: 480, y: 680 },
      { x: 550, y: 600 },
      { x: 630, y: 520 },
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

    // 底部图片按钮配置（变大并向下移动）
    const btnY = this.screenHeight - 137 * s;  // 再往下 3px
    const btnWidth = 180 * s;  // 变大：160 -> 180
    const btnHeight = 110 * s; // 变大：100 -> 110
    
    // 均匀分布三个按钮在屏幕宽度上（增大间距）
    // 使用 5 等分，按钮中心位于 1/5, 2.5/5, 4/5 位置，间距更大
    const screenW = this.screenWidth;
    const margin = 30 * s;  // 增大边距
    const availableWidth = screenW - 2 * margin;
    
    // 中间按钮稍微加大
    const midWidth = btnWidth * 1.2;
    const midHeight = btnHeight * 1.2;
    
    this.bottomButtons = [
      {
        id: 'shop',
        x: margin + availableWidth * 0.15 - btnWidth / 2,  // 15% 位置
        y: btnY,
        width: btnWidth,
        height: btnHeight,
        imgKey: 'shop',
        onClick: () => globalEvent.emit('scene:switch', 'ShopScene')
      },
      {
        id: 'tool',
        x: margin + availableWidth * 0.5 - midWidth / 2,   // 50% 位置（中间，加大）
        y: btnY - (midHeight - btnHeight) / 2,  // 垂直居中
        width: midWidth,
        height: midHeight,
        imgKey: 'bag',
        onClick: () => globalEvent.emit('scene:switch', 'ToolScene')
      },
      {
        id: 'setting',
        x: margin + availableWidth * 0.85 - btnWidth / 2,  // 85% 位置
        y: btnY,
        width: btnWidth,
        height: btnHeight,
        imgKey: 'setting',
        onClick: () => globalEvent.emit('scene:switch', 'SettingScene')
      }
    ];
    
    // 兼容旧代码的点击检测
    this.shopBtn = { 
      onTouchStart: (x, y) => this._checkBottomButtonClick('shop', x, y),
      onTouchEnd: (x, y) => this._checkBottomButtonClick('shop', x, y),
      update: () => {},
      onRender: () => {}
    };
    this.toolBtn = { 
      onTouchStart: (x, y) => this._checkBottomButtonClick('tool', x, y),
      onTouchEnd: (x, y) => this._checkBottomButtonClick('tool', x, y),
      update: () => {},
      onRender: () => {}
    };
    this.settingBtn = { 
      onTouchStart: (x, y) => this._checkBottomButtonClick('setting', x, y),
      onTouchEnd: (x, y) => this._checkBottomButtonClick('setting', x, y),
      update: () => {},
      onRender: () => {}
    };
  }
  
  /**
   * 检测底部按钮点击
   */
  _checkBottomButtonClick(id, x, y) {
    const btn = this.bottomButtons.find(b => b.id === id);
    if (!btn) return false;
    
    // 矩形区域检测
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      btn.onClick();
      return true;
    }
    return false;
  }
  
  /**
   * 绘制底部图片按钮
   */
  _drawBottomButtons(ctx) {
    this.bottomButtons.forEach(btn => {
      const img = this.bottomButtonImages[btn.imgKey];
      if (img) {
        // 保持图片比例，适应按钮区域
        const scale = Math.min(btn.width / img.width, btn.height / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const drawX = btn.x + (btn.width - drawWidth) / 2;
        const drawY = btn.y + (btn.height - drawHeight) / 2;
        
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      }
    });
  }
  
  /**
   * 绘制立体云朵（三层效果）
   * @param {Array} circles - 圆的配置数组 [{x, y, r}, ...]
   * @param {string} color - 主颜色
   */
  _drawStyledCloud(ctx, circles, color) {
    // 计算加深色（中间层）
    const darkenColor = this._darkenColor(color, 20);
    
    // 第1层：最外层白色 3px 描边
    ctx.fillStyle = '#FFFFFF';
    circles.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 6, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // 第2层：加深色 3px 中间层
    ctx.fillStyle = darkenColor;
    circles.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // 第3层：主颜色 + 渐变（不使用透明度）
    circles.forEach(c => {
      // 创建径向渐变（从左上到右下）模拟光照
      const grad = ctx.createRadialGradient(
        c.x - c.r * 0.3, c.y - c.r * 0.3, 0,  // 高光中心（左上）
        c.x, c.y, c.r  // 渐变范围
      );
      // 不使用透明度，直接使用颜色
      grad.addColorStop(0, this._lightenColor(color, 40));
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, this._darkenColor(color, 15));
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  /**
   * Hex颜色转RGBA
   */
  _hexToRgba(color, alpha) {
    const num = parseInt(color.replace('#', ''), 16);
    const R = num >> 16;
    const G = num >> 8 & 0x00FF;
    const B = num & 0x0000FF;
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
  }
  
  /**
   * 加深颜色
   */
  _darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }
  
  /**
   * 提亮颜色
   */
  _lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min((num >> 16) + amt, 255);
    const G = Math.min((num >> 8 & 0x00FF) + amt, 255);
    const B = Math.min((num & 0x0000FF) + amt, 255);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }
  
  /**
   * 云朵形状 1：标准云朵
   */
  _drawCloudShape1(ctx, cx, cy, r, color) {
    const circles = [
      { x: cx, y: cy + r * 0.1, r: r * 1.1 },           // 主体大圆
      { x: cx - r * 0.9, y: cy + r * 0.2, r: r * 0.7 }, // 左侧圆
      { x: cx + r * 0.9, y: cy + r * 0.2, r: r * 0.7 }, // 右侧圆
      { x: cx - r * 0.3, y: cy - r * 0.5, r: r * 0.6 }, // 顶部左小圆
      { x: cx + r * 0.3, y: cy - r * 0.5, r: r * 0.55 } // 顶部右小圆
    ];
    this._drawStyledCloud(ctx, circles, color);
  }
  
  /**
   * 云朵形状 2：椭圆云朵（横向拉伸）
   */
  _drawCloudShape2(ctx, cx, cy, r, color) {
    const circles = [
      { x: cx, y: cy, r: r * 1.3 },                      // 中央椭圆主体（用圆代替）
      { x: cx - r * 1.0, y: cy - r * 0.2, r: r * 0.65 }, // 左上圆
      { x: cx + r * 1.0, y: cy - r * 0.2, r: r * 0.65 }, // 右上圆
      { x: cx, y: cy - r * 0.7, r: r * 0.5 }             // 顶部凸起
    ];
    this._drawStyledCloud(ctx, circles, color);
  }
  
  /**
   * 云朵形状 3：蓬松云朵（更多小圆）
   */
  _drawCloudShape3(ctx, cx, cy, r, color) {
    const circles = [
      { x: cx, y: cy, r: r * 0.9 },                       // 中心圆
      { x: cx - r * 0.7, y: cy + r * 0.1, r: r * 0.6 },  // 左侧圆1
      { x: cx - r * 1.1, y: cy - r * 0.2, r: r * 0.5 },  // 左侧圆2
      { x: cx + r * 0.7, y: cy + r * 0.1, r: r * 0.6 },  // 右侧圆1
      { x: cx + r * 1.1, y: cy - r * 0.2, r: r * 0.5 },  // 右侧圆2
      { x: cx - r * 0.4, y: cy - r * 0.6, r: r * 0.45 }, // 顶部左小圆
      { x: cx + r * 0.4, y: cy - r * 0.6, r: r * 0.45 }, // 顶部右小圆
      { x: cx, y: cy - r * 0.8, r: r * 0.4 }             // 顶部中心小圆
    ];
    this._drawStyledCloud(ctx, circles, color);
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
    // 如果已经通过预加载获取了图片，跳过异步加载
    if (!this._bg_game_titleLoaded) {
      await this._loadTitleImage('bg_game_title', 'bg_game_title');
    }
    if (!this._bg_stage1_tagLoaded) {
      await this._loadTitleImage('bg_stage1_tag', 'bg_stage1_tag');
    }
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
    // 使用 scene:push 保留 HomeScene，返回时可以恢复状态
    globalEvent.emit('scene:push', 'GameplayScene', { 
      levelId: level.id, stage: this.currentStage 
    });
  }

  onUpdate(deltaTime) {
    if (this.shopBtn) this.shopBtn.update(deltaTime);
    if (this.toolBtn) this.toolBtn.update(deltaTime);
    if (this.settingBtn) this.settingBtn.update(deltaTime);
    
    // 更新通关动画
    this._updateLevelCompleteAnimation(deltaTime);
    
    // 更新流光呼吸法动画
    this._updateBreathingShimmer(deltaTime);
  }
  
  /**
   * 更新流光呼吸法动画
   */
  _updateBreathingShimmer(deltaTime) {
    const anim = this._breathingShimmer;
    anim.breathTime = (anim.breathTime + deltaTime) % anim.breathDuration;
    anim.shimmerTime = (anim.shimmerTime + deltaTime) % anim.shimmerDuration;
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

    // 绘制底部图片按钮
    this._drawBottomButtons(ctx);
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
    
    // 判断关卡图标位置：如果在屏幕右侧，则卡片显示在左侧；否则显示在右侧
    const screenCenterX = this.screenWidth / 2;
    const cardOffset = 50 * s; // 卡片与图标的间距
    let cardX;
    if (iconX > screenCenterX) {
      // 图标在屏幕右侧，卡片显示在左侧
      cardX = iconX - cardWidth - cardOffset;
    } else {
      // 图标在屏幕左侧，卡片显示在右侧
      cardX = iconX + cardOffset;
    }
    
    // 特殊关卡 Y 轴位置处理
    const verticalOffset = 40 * s; // 垂直方向偏移量
    let cardY;
    if (level.id === 1) {
      // 关卡 1：卡片显示在图标上方
      cardY = iconY - cardHeight - verticalOffset;
    } else if (level.id === 9 || level.id === 10) {
      // 关卡 9 和 10：卡片显示在图标下方
      cardY = iconY + verticalOffset;
    } else {
      // 其他关卡：卡片垂直居中于图标
      cardY = iconY - cardHeight / 2;
    }
    
    const sphereRadius = cardWidth * 0.12;
    const cardBorderRadius = cardWidth * 0.08;
    const cardBorderWidth = Math.max(2, cardWidth * 0.02);
    const sphereCenterX = cardX + cardWidth / 2;
    const sphereCenterY = cardY + sphereRadius;
    
    // 计算呼吸动画缩放 (1.0 ~ 1.02)
    const breathProgress = this._breathingShimmer.breathTime / this._breathingShimmer.breathDuration;
    const breathScale = 1 + Math.sin(breathProgress * Math.PI * 2) * 0.02;
    
    // 应用呼吸缩放（以卡片中心为锚点）
    const cardCenterX = cardX + cardWidth / 2;
    const cardCenterY = cardY + cardHeight / 2;
    ctx.save();
    ctx.translate(cardCenterX, cardCenterY);
    ctx.scale(breathScale, breathScale);
    ctx.translate(-cardCenterX, -cardCenterY);
    
    // 卡片背景（带阴影）
    ctx.save();
    ctx.shadowColor = 'rgba(250, 204, 21, 0.25)'; // 金色柔和阴影
    ctx.shadowBlur = 40 * s;
    ctx.shadowOffsetY = -12 * s;
    this._drawRoundedRect(ctx, cardX, cardY + sphereRadius, cardWidth, cardHeight - sphereRadius, cardBorderRadius);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
    
    // 卡片细边框
    ctx.save();
    this._drawRoundedRect(ctx, cardX, cardY + sphereRadius, cardWidth, cardHeight - sphereRadius, cardBorderRadius);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'; // 极淡的边框
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    
    // 恢复呼吸缩放的变换
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
    
    // 关卡数字球（糖果胶材质 Juicy Plastic）
    const badgeY = sphereCenterY - 4 * s; // 更靠上一点
    
    // 外发光阴影
    ctx.save();
    ctx.shadowColor = 'rgba(250, 204, 21, 0.5)'; // 金色阴影 rgba(250,204,21,0.5)
    ctx.shadowBlur = 12 * s;
    ctx.shadowOffsetY = 4 * s;
    ctx.beginPath();
    ctx.arc(sphereCenterX, badgeY, sphereRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#FBBF24'; // 黄色背景 #FBBF24 (yellow-400)
    ctx.fill();
    ctx.restore();
    
    // 白色边框 (6px)
    ctx.save();
    ctx.beginPath();
    ctx.arc(sphereCenterX, badgeY, sphereRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6 * s;
    ctx.stroke();
    ctx.restore();
    
    // 数字文字（带阴影）
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${sphereRadius * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 文字阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 2 * s;
    ctx.shadowOffsetY = 1 * s;
    ctx.fillText(level.id.toString(), sphereCenterX, badgeY);
    ctx.restore();
    
    // 开始任务按钮（流光呼吸法）
    const btnWidth = cardWidth * 0.8;
    const btnHeight = (cardHeight - sphereRadius) * 0.2;
    const btnX = cardX + (cardWidth - btnWidth) / 2;
    const btnY = nameTextY + levelNameHeight * 0.6 - 4 * s;
    const btnRadius = btnHeight * 0.5; // 更圆的按钮
    
    // 检查按钮是否被按下（用于按压动画）
    const isPressed = this._pressedStartBtn && this._startBtnRect && this._startBtnRect.level === level;
    
    // 按钮按下效果：scale(0.9) 并调整位置
    const btnScale = isPressed ? 0.9 : 1;
    const btnCenterX = btnX + btnWidth / 2;
    const btnCenterY = btnY + btnHeight / 2;
    
    ctx.save();
    ctx.translate(btnCenterX, btnCenterY);
    ctx.scale(btnScale, btnScale);
    ctx.translate(-btnCenterX, -btnCenterY);
    
    // 更新点击区域（考虑缩放）
    this._startBtnRect = { 
      x: btnX + (btnWidth * (1 - btnScale)) / 2, 
      y: btnY + (btnHeight * (1 - btnScale)) / 2, 
      width: btnWidth * btnScale, 
      height: btnHeight * btnScale, 
      level 
    };
    
    // 按钮背景（纯色 #FFC107，WXSS 中的颜色）
    ctx.save();
    if (isPressed) {
      // 按下时阴影变小
      ctx.shadowColor = 'rgba(250, 204, 21, 0.4)';
      ctx.shadowBlur = 10 * s;
      ctx.shadowOffsetY = 4 * s;
    } else {
      // 正常状态阴影
      ctx.shadowColor = 'rgba(250, 204, 21, 0.4)';
      ctx.shadowBlur = 20 * s;
      ctx.shadowOffsetY = 8 * s;
    }
    this._drawRoundedRect(ctx, btnX, btnY, btnWidth, btnHeight, btnRadius);
    ctx.fillStyle = '#FFC107'; // 纯色背景，WXSS 中的颜色
    ctx.fill();
    ctx.restore();
    
    // 流光效果（shimmer）- 参考 WXSS 实现
    // shimmerProgress: 0 -> 1 对应 left: -100% -> 200%
    const shimmerProgress = this._breathingShimmer.shimmerTime / this._breathingShimmer.shimmerDuration;
    const shimmerX = btnX - btnWidth + shimmerProgress * btnWidth * 3; // 从 -100% 到 200%
    const shimmerWidth = btnWidth * 0.5; // 宽度 50%
    
    ctx.save();
    // 裁剪到按钮区域（overflow: hidden 效果）
    this._drawRoundedRect(ctx, btnX, btnY, btnWidth, btnHeight, btnRadius);
    ctx.clip();
    
    // 绘制流光条（倾斜 -20度）
    ctx.save();
    ctx.translate(shimmerX, btnY);
    ctx.transform(1, 0, -0.364, 1, 0, 0); // skewX(-20deg) -> tan(-20°) ≈ -0.364
    
    // 半透明白色渐变条
    const shimmerGradient = ctx.createLinearGradient(0, 0, shimmerWidth, 0);
    shimmerGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    shimmerGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)'); // 中间最亮 0.5
    shimmerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shimmerGradient;
    ctx.fillRect(0, -btnHeight, shimmerWidth, btnHeight * 3); // 上下延伸确保覆盖
    ctx.restore();
    ctx.restore();
    
    // 按钮文字（白色，在缩放变换内）
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.max(16, btnHeight * 0.45)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始任务', btnX + btnWidth / 2, btnY + btnHeight / 2);
    ctx.restore();
    
    // 恢复缩放变换
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
        // 按钮点击震动反馈
        if (typeof wx !== 'undefined' && wx.vibrateShort) {
          wx.vibrateShort({ type: 'medium' });
        }
        // 使用 scene:push 保留 HomeScene，返回时可以恢复状态
        globalEvent.emit('scene:push', 'GameplayScene', { 
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
