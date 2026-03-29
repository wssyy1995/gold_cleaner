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
  // key: "preview_1_1" -> { img, loaded }
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
    
    // 云存储
    this.cloudStorage = new CloudStorage();
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
    
    this.generateLevels();
    this._initUI();
    
    // 从缓存加载图片（如果背景图未缓存）
    this._loadCachedImages();
    
    // 预加载当前关卡预览图
    this._preloadCurrentLevelPreview();
  }

  /**
   * 从本地缓存加载图片（LoadingScene 已下载）
   */
  async _loadCachedImages() {
    // 加载图标
    await this._loadCachedIcon('locked', 'ui_icon_locked');
    await this._loadCachedIcon('unlocked', 'ui_icon_unlocked');
    await this._loadCachedIcon('pass', 'ui_icon_pass');
    
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
      const cacheKey = `bg_home_stage${this.currentStage}`;
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

  generateLevels() {
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
    
    for (let i = 1; i <= 10; i++) {
      // 计算全局关卡ID（用于 DataManager）
      // stage1: 1-10, stage2: 11-20, stage3: 21-30, stage4: 31-40
      const globalLevelId = (this.currentStage - 1) * 10 + i;
      
      // 判断是否解锁：第一关默认解锁，其他检查 DataManager
      let isUnlocked = false;
      if (i === 1 && this.currentStage === 1) {
        // Stage1 Level1 默认解锁（新用户起点）
        isUnlocked = true;
      } else if (i === 1 && this.currentStage > 1) {
        // 其他 stage 的第一关，检查是否已解锁该 stage
        isUnlocked = dataManager ? dataManager.getCurrentStage() >= this.currentStage : false;
      } else {
        // 其他关卡，检查是否已解锁
        isUnlocked = dataManager ? dataManager.isLevelUnlocked(globalLevelId) : (i === 1);
      }
      
      // 获取星级
      const stars = dataManager ? dataManager.getLevelStars(globalLevelId) : 0;
      
      // 确定状态
      let status = 'locked';
      if (isUnlocked) {
        status = stars > 0 ? 'completed' : 'unlocked';
      }
      
      this.levels.push({ 
        id: i, 
        globalId: globalLevelId,
        stage: this.currentStage, 
        name: `关卡 ${i}`, 
        status: status,
        stars: stars,
        x: positions[i-1].x,
        y: positions[i-1].y
      });
    }
    
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
   * 加载预览图片（混合方案：优先全局缓存，其次云存储缓存，否则本地）
   */
  async _loadPreviewImage(stage, levelId) {
    const key = `preview_${stage}_${levelId}`;
    
    // 0. 检查实例缓存
    if (this._previewImages[key]) return;
    
    // 1. 优先从全局缓存获取
    const globalCached = GlobalPreviewCache.get(key);
    if (globalCached && globalCached.loaded) {
      this._previewImages[key] = globalCached;
      console.log(`[HomeScene] 预览图从全局缓存恢复: ${key}`);
      return;
    }
    
    const config = getLevelImageConfig(stage, levelId);
    console.log(`[HomeScene] 加载预览图配置:`, config);
    
    try {
      let img = null;
      
      if (config.type === 'cloud') {
        // 尝试从云存储加载
        let fileID = config.fileID; // 优先使用配置中的 fileID
        
        // 如果配置中没有，尝试从缓存获取
        if (!fileID) {
          const cacheRecord = wx.getStorageSync('cloud_image_cache') || {};
          const cacheInfo = cacheRecord[config.cacheKey];
          if (cacheInfo && cacheInfo.fileID) {
            fileID = cacheInfo.fileID;
          }
        }
        
        if (!fileID) {
          console.log(`[HomeScene] 关卡预览图无 fileID，尝试本地: ${config.cacheKey}`);
          // 尝试从本地加载作为后备
          if (config.localPath) {
            img = await this._downloadLocalImageForCache(config.localPath);
          } else {
            return;
          }
        } else {
          console.log(`[HomeScene] 从云存储下载: ${config.cacheKey}, fileID: ${fileID.substring(0, 30)}...`);
          try {
            const tempURL = await this.cloudStorage.getTempFileURL(fileID);
            console.log(`[HomeScene] 获取临时URL: ${tempURL ? '成功' : '失败'}`);
            if (!tempURL) {
              console.log(`[HomeScene] 获取临时URL失败，尝试本地: ${config.cacheKey}`);
              if (config.localPath) {
                img = await this._downloadLocalImageForCache(config.localPath);
              } else {
                return;
              }
            } else {
              img = await this._downloadImage(tempURL);
              console.log(`[HomeScene] 云存储下载完成: ${config.cacheKey}`);
            }
          } catch (e) {
            console.error(`[HomeScene] 云存储下载失败: ${config.cacheKey}`, e);
            // 尝试本地后备
            if (config.localPath) {
              console.log(`[HomeScene] 尝试本地后备: ${config.localPath}`);
              img = await this._downloadLocalImageForCache(config.localPath);
            }
          }
        }
      } else {
        // 从本地加载
        console.log(`[HomeScene] 从本地加载: ${config.localPath}`);
        img = await this._downloadLocalImageForCache(config.localPath);
      }
      
      // 保存到实例缓存和全局缓存
      const cacheEntry = { loaded: true, img };
      this._previewImages[key] = cacheEntry;
      GlobalPreviewCache.save(key, img);
      console.log(`[HomeScene] 预览图加载成功: ${key}`);
      
    } catch (e) {
      // 加载失败不报错
      console.log(`[HomeScene] 预览图加载失败: ${key}`, e.message);
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
    const unlockedLevel = this.levels.find(l => l.status === 'unlocked');
    if (unlockedLevel) return unlockedLevel;
    const lockedLevel = this.levels.find(l => l.status === 'locked');
    if (lockedLevel) return lockedLevel;
    return this.levels[this.levels.length - 1];
  }

  passLevel(levelId, stars) {
    const level = this.levels.find(l => l.id === levelId);
    if (!level) return;
    
    level.status = 'pass';
    level.stars = stars;
    
    const nextLevel = this.levels.find(l => l.id === levelId + 1);
    if (nextLevel && nextLevel.status === 'locked') {
      nextLevel.status = 'unlocked';
      this._loadPreviewImage(this.currentStage, nextLevel.id);
    }
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

    if (!this.coinComponent) return;

    // 绘制金币组件
    this._drawCoinComponent(ctx);

    this._drawLevelIcons(ctx);

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

  _drawLevelIcons(ctx) {
    if (!this.iconsLoaded || !this.levels.length) return;
    
    const s = this.screenWidth / 750;
    const iconSize = this.iconSize;
    const currentLevel = this._getCurrentLevel();
    
    // 第一步：绘制所有关卡图标（确保在最底层）
    this.levels.forEach(level => {
      // 状态到图标的映射: completed -> pass
      const iconName = level.status === 'completed' ? 'pass' : level.status;
      let iconImg = this.iconImages[iconName] || this.iconImages.locked;
      if (!iconImg) return;
      
      const x = level.x * s;
      const y = level.y * s;
      
      ctx.drawImage(iconImg, x - iconSize/2, y - iconSize/2, iconSize, iconSize);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${18 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(level.id.toString(), x, y + iconSize/2 + 16 * s);
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
    
    // 预览图片
    const previewImgKey = `preview_${this.currentStage}_${level.id}`;
    const previewImg = this._previewImages[previewImgKey];
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
