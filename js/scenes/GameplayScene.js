/**
 * GameplayScene 游戏进行场景
 * 负责任务 5.5.1 ~ 5.5.11
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import ProgressBar from '../ui/components/ProgressBar';
import TopBar from '../ui/components/TopBar';
import ToolSlot from '../ui/components/ToolSlot';
import { GlobalPreviewCache } from './HomeScene';
import { globalEvent } from '../core/EventEmitter';
import { getGame } from '../../app';
import { getLevelImageKey } from '../cloud/CloudResourceConfig';
import CloudStorage from '../cloud/CloudStorage';

import PauseMenu from '../ui/dialogs/PauseMenu';
import LevelCompleteDialog from '../ui/dialogs/LevelCompleteDialog';

class GameplayScene extends Scene {
  constructor() {
    super({ name: 'GameplayScene' });
    this.screenWidth = 750;
    this.screenHeight = 1334;
    this.levelId = 0;
    this.cleanProgress = 0;
    this.toolSlots = [];
    this.currentToolIndex = 0;
    this.dirtObjects = [];
    this.isPaused = false;
    
    // 视图状态
    this.viewMode = 'room';
    this.zoomedDirt = null;
    this.zoomAnimation = 0;
    
    // ToolSlot 组件
    this.toolSlot = null;
    
    // 工具拖动清洁
    this.isDraggingTool = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.dragCurrentPos = { x: 0, y: 0 };
    
    // 动画效果
    this.sparkles = [];
    this.toolShake = 0;
    
    // 云存储
    this.cloudStorage = new CloudStorage();
  }

  async onLoad(data = {}) {
    this.levelId = data.levelId || 1;
    this.stage = data.stage || 1;
    this.bgImage = null;
    this.bgLoaded = false;
    
    // 初始化云存储
    await this.cloudStorage.init();
    
    this._initUI();
    this._generateDirts();
    await this._loadBackground();
  }

  /**
   * 加载关卡背景图（复用预览缓存 → 云存储 → 本地）
   */
  async _loadBackground() {
    if (typeof wx === 'undefined') return;
    
    const previewKey = `preview_${this.stage}_${this.levelId}`;
    const cacheKey = `game_stage${this.stage}_l${this.levelId}`;
    
    // 1. 优先复用内存中的预览图缓存（HomeScene 已加载）
    if (GlobalPreviewCache) {
      const cached = GlobalPreviewCache.get(previewKey);
      if (cached && cached.img) {
        this.bgImage = cached.img;
        this.bgLoaded = true;
        console.log(`[GameplayScene] 背景复用预览缓存: ${previewKey}`);
        return;
      }
    }
    
    // 2. 从云存储缓存加载
    try {
      const cacheRecord = wx.getStorageSync('cloud_image_cache') || {};
      const cacheInfo = cacheRecord[cacheKey];
      
      if (cacheInfo && cacheInfo.fileID) {
        const tempURL = await this.cloudStorage.getTempFileURL(cacheInfo.fileID);
        if (tempURL) {
          const img = await this._downloadImage(tempURL);
          this.bgImage = img;
          this.bgLoaded = true;
          console.log(`[GameplayScene] 背景从云存储加载: ${cacheKey}`);
          return;
        }
      }
    } catch (e) {
      console.log(`[GameplayScene] 云存储背景加载失败: ${cacheKey}`);
    }
    
    // 3. 从本地加载（后备）
    try {
      const pathParts = ['images', 'game', `game_stage${this.stage}_l${this.levelId}_home.png`];
      const localPath = pathParts.join('/');
      
      const img = await this._downloadLocalImage(localPath);
      this.bgImage = img;
      this.bgLoaded = true;
      console.log(`[GameplayScene] 背景从本地加载: ${cacheKey}`);
    } catch (e) {
      console.log(`[GameplayScene] 本地背景加载失败: ${cacheKey}`);
    }
  }
  
  /**
   * 从本地下载图片
   */
  _downloadLocalImage(localPath) {
    return new Promise((resolve, reject) => {
      const img = wx.createImage();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('本地图片不存在'));
      img.src = localPath;
    });
  }

  _initUI() {
    const s = this.screenWidth / 750;
    
    // 新的 TopBar 组件（替换原有顶部 UI）
    this.topBar = new TopBar({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      levelText: `${this.levelId}/10`,
      progress: 0,
      timeText: '60s',
      paused: false,
      onPauseClick: () => this._showPauseMenu()
    });
    
    // 通关按钮（调试用，自动完成本关）- 放在 TopBar 下方
    this.winBtn = new Button({
      x: 20 * s, y: 150 * s, width: 120 * s, height: 60 * s,
      text: '通关', fontSize: 28 * s,
      bgColor: '#4CAF50', textColor: '#FFFFFF',
      borderRadius: 12 * s,
      shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 0, offsetY: 4 },
      onClick: () => {
        console.log('[GameplayScene] 通关按钮 onClick 回调触发');
        this._onWinClick();
      }
    });
    
    // 返回按钮（调试用）- 放在通关按钮下方
    this.backBtn = new Button({ 
      x: 20 * s, y: 220 * s, width: 100 * s, height: 50 * s, 
      text: '← 返回', fontSize: 24 * s, 
      bgColor: 'rgba(0,0,0,0.3)', textColor: '#FFFFFF', 
      borderRadius: 8 * s,
      onClick: () => {
        if (this.viewMode === 'zoom') {
          this._exitZoomView();
        } else {
          globalEvent.emit('scene:switch', 'HomeScene');
        }
      }
    });

    // 工具数据
    this.tools = [
      { id: 'cloth', name: '抹布', color: '#4A90D9' },
      { id: 'sponge', name: '海绵', color: '#66BB6A' },
      { id: 'brush', name: '刷子', color: '#FFA726' },
      { id: 'spray', name: '喷雾', color: '#AB47BC' },
      { id: 'vacuum', name: '吸尘器', color: '#EF5350' },
    ];
    this.currentToolIndex = 0;
    
    // 创建 ToolSlot 组件
    this.toolSlot = new ToolSlot({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      tools: this.tools,
      selectedIndex: this.currentToolIndex,
      onSelect: (index, tool) => {
        this._selectTool(index);
      }
    });
    
    // 工具提示框
    this.toolTipText = new Text({
      x: 375 * s, y: 950 * s,
      text: '点击拖动清洁',
      fontSize: 20 * s,
      color: '#666666',
      align: 'center'
    });
    this.showToolTip = true;

    // 污垢点击处理
    this._touchStartTime = 0;
    this._lastClickDirt = null;
    this._lastClickTime = 0;
    
    // 退出放大视图按钮
    this.exitZoomBtn = new Button({
      x: 20 * s, y: 100 * s, width: 80 * s, height: 40 * s,
      text: '✕', fontSize: 24 * s,
      bgColor: 'rgba(0,0,0,0.5)', textColor: '#FFFFFF',
      borderRadius: 20 * s,
      onClick: () => this._exitZoomView()
    });
  }

  _generateDirts() {
    const s = this.screenWidth / 750;
    this.dirtObjects = [];
    
    // 定义几种污垢类型和对应的清洁配方
    const dirtTypes = [
      { type: 'dust', name: '灰尘', color: '#8B4513', recipes: [['cloth'], ['sponge']] },
      { type: 'stain', name: '污渍', color: '#654321', recipes: [['spray', 'cloth'], ['sponge']] },
      { type: 'grime', name: '油垢', color: '#3E2723', recipes: [['spray', 'brush'], ['sponge', 'sponge']] },
    ];
    
    // 游戏区域是屏幕下方 90%
    const gameAreaHeight = this.screenHeight * 0.9;
    
    for (let i = 0; i < 5; i++) {
      const dirtType = dirtTypes[Math.floor(Math.random() * dirtTypes.length)];
      // y 坐标基于游戏区域（0 ~ gameAreaHeight），渲染时会加上 top_bar 偏移
      const relativeY = (50 + Math.random() * (gameAreaHeight / s - 150)) * s;
      
      this.dirtObjects.push({
        id: i,
        type: dirtType.type,
        name: dirtType.name,
        x: (80 + Math.random() * 590) * s,
        y: relativeY, // 相对于游戏区域的 y 坐标
        width: 100 * s, 
        height: 100 * s,
        state: 'dirty', // dirty, cleaning, clean
        cleanProgress: 0,
        maxProgress: dirtType.recipes[0].length * 100, // 需要多少次清洁
        currentRecipe: dirtType.recipes[0],
        currentStep: 0, // 当前清洁步骤
        color: dirtType.color,
        recipes: dirtType.recipes
      });
    }
  }

  _selectTool(index) {
    this.currentToolIndex = index;
    
    // 同步更新 ToolSlot 组件
    if (this.toolSlot && this.toolSlot.selectedIndex !== index) {
      this.toolSlot.selectedIndex = index;
    }
    
    this.showToolTip = true;
    // 重置提示框定时器
    if (this._toolTipTimer) clearTimeout(this._toolTipTimer);
    this._toolTipTimer = setTimeout(() => {
      this.showToolTip = false;
    }, 2000);
  }

  /**
   * 进入放大视图
   */
  _enterZoomView(dirt) {
    this.zoomedDirt = dirt;
    this.viewMode = 'zoom';
    this.zoomAnimation = 0;
    this.showToolTip = true;
    
    // 2秒后隐藏提示
    if (this._toolTipTimer) clearTimeout(this._toolTipTimer);
    this._toolTipTimer = setTimeout(() => {
      this.showToolTip = false;
    }, 2000);
  }

  /**
   * 退出放大视图
   */
  _exitZoomView() {
    this.viewMode = 'room';
    this.zoomedDirt = null;
    this.zoomAnimation = 0;
    this.isDraggingTool = false;
  }

  /**
   * 检查工具是否匹配当前步骤
   */
  _checkToolMatch(dirt) {
    const currentTool = this.tools[this.currentToolIndex].id;
    const requiredTool = dirt.currentRecipe[dirt.currentStep];
    return currentTool === requiredTool;
  }

  /**
   * 使用工具清洁
   */
  _useToolOnDirt(dirt) {
    if (!this._checkToolMatch(dirt)) {
      // 工具不匹配 - 触发震动效果
      this.toolShake = 1;
      setTimeout(() => { this.toolShake = 0; }, 500);
      return false;
    }
    
    // 正确工具 - 增加进度
    dirt.cleanProgress += 100;
    dirt.currentStep++;
    dirt.state = 'cleaning';
    
    // 检查是否完成所有步骤
    if (dirt.currentStep >= dirt.currentRecipe.length) {
      this._completeCleanDirt(dirt);
    }
    
    return true;
  }

  /**
   * 完成清洁污垢
   */
  _completeCleanDirt(dirt) {
    dirt.state = 'clean';
    
    // 添加闪光粒子效果
    const s = this.screenWidth / 750;
    for (let i = 0; i < 8; i++) {
      this.sparkles.push({
        x: dirt.x + dirt.width / 2,
        y: dirt.y + dirt.height / 2,
        vx: (Math.random() - 0.5) * 10 * s,
        vy: (Math.random() - 0.5) * 10 * s,
        life: 1,
        size: (5 + Math.random() * 10) * s
      });
    }
    
    // 检查是否全部清洁完成
    if (this.dirtObjects.every(d => d.state === 'clean')) {
      setTimeout(() => {
        this._showSettlement();
      }, 1000);
    }
  }

  /**
   * 显示结算弹窗
   */
  _showSettlement() {
    const stars = 3; // 根据时间和清洁度计算
    const coins = 100 + Math.floor(Math.random() * 50);
    
    globalEvent.emit('dialog:show', 'SettlementDialog', {
      levelId: this.levelId,
      stars: stars,
      coins: coins,
      onNext: () => {
        globalEvent.emit('scene:switch', 'GameplayScene', { levelId: this.levelId + 1 });
      },
      onReplay: () => {
        globalEvent.emit('scene:switch', 'GameplayScene', { levelId: this.levelId });
      },
      onHome: () => {
        globalEvent.emit('scene:switch', 'HomeScene');
      }
    });
  }

  /**
   * 显示暂停菜单
   */
  _showPauseMenu() {
    this.isPaused = true;
    globalEvent.emit('game:pause');
    
    // 更新 TopBar 暂停状态
    if (this.topBar) {
      this.topBar.updateData({ paused: true });
    }
    
    const s = this.screenWidth / 750;
    const pauseMenu = new PauseMenu({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      onResume: () => {
        this.isPaused = false;
        // 恢复 TopBar 暂停状态
        if (this.topBar) {
          this.topBar.updateData({ paused: false });
        }
        globalEvent.emit('game:resume');
      },
      onRestart: () => {
        this.isPaused = false;
        globalEvent.emit('scene:switch', 'GameplayScene', { levelId: this.levelId });
      },
      onHome: () => {
        this.isPaused = false;
        globalEvent.emit('scene:switch', 'HomeScene');
      }
    });
    
    globalEvent.emit('dialog:show', 'PauseMenu', pauseMenu);
  }

  /**
   * 退出按钮点击处理
   */
  _onQuitClick() {
    // 显示确认弹窗
    globalEvent.emit('dialog:show', 'ConfirmDialog', {
      title: '确认退出',
      message: '确定要退出当前关卡吗？进度将不会保存。',
      confirmText: '退出',
      cancelText: '继续游戏',
      onConfirm: () => {
        // 返回首页
        globalEvent.emit('scene:switch', 'HomeScene');
      }
    });
  }
  
  /**
   * 通关按钮点击 - 显示通关弹窗
   */
  _onWinClick() {
    console.log(`[GameplayScene] === 通关按钮被点击: level ${this.levelId} ===`);
    
    // 显示简易通关弹窗
    this._showLevelCompleteDialog();
  }
  
  /**
   * 显示通关弹窗
   */
  _showLevelCompleteDialog() {
    console.log('[GameplayScene] _showLevelCompleteDialog 开始执行');
    
    try {
      const dialog = new LevelCompleteDialog({
        screenWidth: this.screenWidth,
        screenHeight: this.screenHeight,
        levelId: this.levelId,
        stage: this.stage,
        stars: 3,
        onConfirm: (result) => {
          console.log('[GameplayScene] 弹窗确认回调触发:', result);
          this._handleLevelComplete(result);
        }
      });
      
      console.log('[GameplayScene] LevelCompleteDialog 实例创建成功');
      
      // 注册并显示弹窗
      globalEvent.emit('dialog:open', 'LevelCompleteDialog', dialog);
      console.log('[GameplayScene] dialog:open 事件已发送');
    } catch (e) {
      console.error('[GameplayScene] 显示通关弹窗失败:', e);
    }
  }
  
  /**
   * 处理关卡完成
   */
  _handleLevelComplete(result) {
    console.log('[GameplayScene] 处理关卡完成:', result);
    
    const game = getGame();
    const dataManager = game ? game.dataManager : null;
    
    if (dataManager) {
      // 计算全局关卡ID
      const globalLevelId = (this.stage - 1) * 10 + this.levelId;
      const nextGlobalLevelId = globalLevelId + 1;
      
      // 1. 完成当前关卡
      dataManager.completeLevel(globalLevelId, result.stars);
      console.log(`[GameplayScene] 关卡 ${globalLevelId} 完成，星级: ${result.stars}`);
      
      // 2. 解锁下一关
      if (this.levelId < 10) {
        // 同一阶段的下一关
        dataManager.unlockLevel(nextGlobalLevelId);
        console.log(`[GameplayScene] 解锁关卡 ${nextGlobalLevelId}`);
      }
      
      // 3. 增加金币奖励
      dataManager.addCoins(50);
      console.log('[GameplayScene] 获得金币奖励: 50');
      
      // 4. 保存数据
      dataManager.save();
    }
    
    // 5. 预加载下一关预览图
    this._preloadNextLevelPreview();
    
    // 6. 返回游戏主页面
    globalEvent.emit('scene:switch', 'HomeScene');
  }
  
  /**
   * 预加载下一关的预览图（通关后立即调用）
   */
  _preloadNextLevelPreview() {
    try {
      // 计算下一关
      const isLastLevelOfStage = this.levelId % 10 === 0;
      const nextLevelId = this.levelId + 1;
      const nextStage = isLastLevelOfStage ? this.stage + 1 : this.stage;
      const nextLevelInStage = isLastLevelOfStage ? 1 : (this.levelId % 10) + 1;
      
      // 如果超过 stage4 level10，不再预加载
      if (nextStage > 4 || (nextStage === 4 && nextLevelInStage > 10)) {
        console.log('[GameplayScene] 已是最后一关，无需预加载');
        return;
      }
      
      console.log(`[GameplayScene] 预加载下一关预览图: stage${nextStage}_l${nextLevelInStage}`);
      
      // 使用 require 获取配置（避免动态 import 在微信小程序中的问题）
      const CloudResourceConfig = require('../cloud/CloudResourceConfig.js');
      const config = CloudResourceConfig.getLevelImageConfig(nextStage, nextLevelInStage);
      
      if (config.type === 'cloud') {
        // 从云存储加载
        const cacheRecord = wx.getStorageSync('cloud_image_cache') || {};
        const cacheInfo = cacheRecord[config.cacheKey];
        
        if (cacheInfo && cacheInfo.fileID) {
          this.cloudStorage.getTempFileURL(cacheInfo.fileID).then(tempURL => {
            if (tempURL) {
              // 静默下载，不阻塞
              const img = wx.createImage();
              img.onload = () => {
                console.log(`[GameplayScene] 下一关预览图预加载完成: ${config.cacheKey}`);
              };
              img.onerror = () => {
                console.log(`[GameplayScene] 下一关预览图预加载失败: ${config.cacheKey}`);
              };
              img.src = tempURL;
            }
          });
        }
      } else {
        // 从本地加载
        const img = wx.createImage();
        img.onload = () => {
          console.log(`[GameplayScene] 下一关预览图从本地预加载: ${config.localPath}`);
        };
        img.src = config.localPath;
      }
    } catch (e) {
      console.log('[GameplayScene] 预加载下一关预览图失败:', e.message);
    }
  }

  onUpdate(deltaTime) {
    // 暂停时不更新游戏逻辑
    if (this.isPaused) return;
    
    const s = this.screenWidth / 750;
    
    // 更新按钮
    if (this.backBtn) this.backBtn.update(deltaTime);
    if (this.winBtn) this.winBtn.update(deltaTime);
    if (this.exitZoomBtn) this.exitZoomBtn.update(deltaTime);
    
    // 更新清洁度
    if (this.dirtObjects && this.dirtObjects.length > 0) {
      const cleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
      this.cleanProgress = (cleaned / this.dirtObjects.length) * 100;
      
      // 更新 TopBar 的进度
      if (this.topBar) {
        this.topBar.updateData({ progress: this.cleanProgress });
      }
    }
    
    // 更新粒子
    this.sparkles.forEach((p, i) => {
      p.life -= deltaTime * 0.002;
      if (p.life <= 0) this.sparkles.splice(i, 1);
    });
    
    // 震动效果衰减
    if (this.toolShake > 0) {
      this.toolShake -= deltaTime * 0.002;
      if (this.toolShake < 0) this.toolShake = 0;
    }
    
    // 检查是否全部完成
    if (this.dirtObjects && this.dirtObjects.length > 0 && 
        this.dirtObjects.every(d => d.state === 'clean') && 
        !this._completed) {
      this._completed = true;
      setTimeout(() => this._showSettlement(), 500);
    }
  }

  onRender(ctx) {
    const s = this.screenWidth / 750;
    
    // 背景
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    if (this.viewMode === 'zoom' && this.zoomedDirt) {
      this._renderZoomView(ctx, s);
    } else {
      this._renderRoomView(ctx, s);
    }
    
    // 绘制闪光粒子
    this._renderSparkles(ctx);
  }

  /**
   * 渲染房间视图
   * 布局：顶部 8% 浅棕黄色，中间 80% 游戏区域，底部 10% 浅棕黄色（工具槽）
   */
  _renderRoomView(ctx, s) {
    // 区域划分
    const topAreaHeight = this.screenHeight * 0.08;    // 顶部 8%
    const gameAreaHeight = this.screenHeight * 0.80;   // 中间 80%（游戏区域）
    const bottomAreaHeight = this.screenHeight * 0.10; // 底部 10%
    
    const gameAreaY = topAreaHeight;  // 游戏区域起始 Y
    const bottomAreaY = gameAreaY + gameAreaHeight; // 底部区域起始 Y
    
    // 浅棕黄色（与 TopBar 背景色一致）
    const lightBrown = '#f3c06a';
    
    // 1. 绘制顶部 8% 浅棕黄色背景
    ctx.fillStyle = lightBrown;
    ctx.fillRect(0, 0, this.screenWidth, topAreaHeight);
    
    // 2. 绘制中间 80% 游戏区域（背景图）
    if (this.bgImage && this.bgLoaded) {
      // 使用 Cover 模式绘制背景图填满游戏区域
      ctx.save();
      ctx.rect(0, gameAreaY, this.screenWidth, gameAreaHeight);
      ctx.clip();
      this._drawBackgroundCover(ctx, this.bgImage, 0, gameAreaY, this.screenWidth, gameAreaHeight);
      ctx.restore();
    } else {
      // 未加载时显示默认背景
      ctx.fillStyle = '#F5F5DC';
      ctx.fillRect(0, gameAreaY, this.screenWidth, gameAreaHeight);
    }

    // 检查UI是否已初始化
    if (!this.dirtObjects) return;
    
    // 3. 绘制污垢（y 坐标相对于游戏区域）
    this.dirtObjects.forEach(dirt => {
      if (dirt.state !== 'clean') {
        const dy = dirt.y + gameAreaY; // 加上游戏区域偏移
        const alpha = 1 - (dirt.cleanProgress / dirt.maxProgress) * 0.5;
        ctx.fillStyle = this._hexToRgba(dirt.color, alpha);
        ctx.fillRect(dirt.x, dy, dirt.width, dirt.height);
        ctx.strokeStyle = this._hexToRgba(dirt.color, 0.8);
        ctx.lineWidth = 2 * s;
        ctx.strokeRect(dirt.x, dy, dirt.width, dirt.height);
        
        // 绘制进度
        if (dirt.cleanProgress > 0) {
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(dirt.x, dy - 10 * s, dirt.width * (dirt.cleanProgress / dirt.maxProgress), 6 * s);
        }
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${14 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('双击', dirt.x + dirt.width / 2, dy + dirt.height / 2 + 5 * s);
      }
    });

    // 4. 绘制底部 10% 浅棕黄色背景（工具槽区域）
    ctx.fillStyle = lightBrown;
    ctx.fillRect(0, bottomAreaY, this.screenWidth, bottomAreaHeight);

    // 5. 绘制 TopBar（在顶部区域）
    if (this.topBar) {
      this.topBar.render(ctx);
    }
    
    // UI元素（调试按钮）
    if (this.backBtn) this.backBtn.onRender(ctx);
    if (this.winBtn) this.winBtn.onRender(ctx);

    // 6. 绘制 ToolSlot 组件（在底部区域）
    if (this.toolSlot) {
      this.toolSlot.render(ctx);
    }
  }

  /**
   * Cover 模式绘制背景图 - 保持比例，填满指定区域，裁剪溢出
   * @param {number} targetX - 目标区域 X
   * @param {number} targetY - 目标区域 Y  
   * @param {number} targetW - 目标区域宽度
   * @param {number} targetH - 目标区域高度
   */
  _drawBackgroundCover(ctx, img, targetX, targetY, targetW, targetH) {
    const scaleX = targetW / img.width;
    const scaleY = targetH / img.height;
    
    // Cover 模式：选择较大的缩放比例，确保填满区域
    const scale = Math.max(scaleX, scaleY);
    
    // 计算绘制尺寸
    const dw = img.width * scale;
    const dh = img.height * scale;
    
    // 居中显示（超出部分自动被裁剪）
    const dx = targetX + (targetW - dw) / 2;
    const dy = targetY + (targetH - dh) / 2;
    
    // 绘制图片
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /**
   * 渲染放大视图
   */
  _renderZoomView(ctx, s) {
    const dirt = this.zoomedDirt;
    if (!dirt) return;
    
    // 深色背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    
    // 顶部栏（简化）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, this.screenWidth, 80 * s);
    
    if (this.exitZoomBtn) this.exitZoomBtn.onRender(ctx);
    
    // 绘制污垢名称
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${24 * s}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(dirt.name, 375 * s, 120 * s);
    
    // 绘制放大的污垢
    const centerX = 375 * s;
    const centerY = 600 * s;
    const size = 300 * s;
    
    const progress = dirt.cleanProgress / dirt.maxProgress;
    const alpha = 1 - progress * 0.5;
    
    ctx.fillStyle = this._hexToRgba(dirt.color, alpha);
    ctx.fillRect(centerX - size/2, centerY - size/2, size, size);
    ctx.strokeStyle = this._hexToRgba(dirt.color, 0.8);
    ctx.lineWidth = 4 * s;
    ctx.strokeRect(centerX - size/2, centerY - size/2, size, size);
    
    // 绘制进度条
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(centerX - 100 * s, centerY + size/2 + 20 * s, 200 * s, 10 * s);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(centerX - 100 * s, centerY + size/2 + 20 * s, 200 * s * progress, 10 * s);
    
    // 显示当前需要的工具
    if (dirt.state !== 'clean') {
      const requiredTool = this.tools.find(t => t.id === dirt.currentRecipe[dirt.currentStep]);
      if (requiredTool) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${18 * s}px sans-serif`;
        ctx.fillText(`需要使用: ${requiredTool.name}`, centerX, centerY + size/2 + 60 * s);
      }
    }
    
    // 绘制工具提示
    if (this.showToolTip && this.toolTipText) {
      this.toolTipText.onRender(ctx);
    }
    
    // 绘制 ToolSlot 组件（在底部 10% 区域）
    if (this.toolSlot) {
      this.toolSlot.render(ctx);
    }
    
    // 绘制拖动的工具
    if (this.isDraggingTool) {
      const tool = this.tools[this.currentToolIndex];
      const shakeX = this.toolShake > 0 ? (Math.random() - 0.5) * 10 * s : 0;
      const shakeY = this.toolShake > 0 ? (Math.random() - 0.5) * 10 * s : 0;
      
      ctx.fillStyle = tool.color;
      ctx.beginPath();
      ctx.arc(this.dragCurrentPos.x + shakeX, this.dragCurrentPos.y + shakeY, 30 * s, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${24 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tool.icon, this.dragCurrentPos.x + shakeX, this.dragCurrentPos.y + shakeY);
      
      // 错误提示
      if (this.toolShake > 0) {
        ctx.strokeStyle = '#FF5252';
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.arc(this.dragCurrentPos.x, this.dragCurrentPos.y, 35 * s, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /**
   * 渲染清洁度球
   */
  _renderCleanlinessBall(ctx, s) {
    const cx = 680 * s;
    const cy = 65 * s;
    const radius = 40 * s;
    
    // 背景圆
    ctx.fillStyle = '#E0E0E0';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 进度圆
    ctx.fillStyle = `rgba(76, 175, 80, ${this.cleanProgress})`;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * this.cleanProgress, 0, Math.PI * 2);
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * 渲染闪光粒子
   */
  _renderSparkles(ctx) {
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const p = this.sparkles[i];
      
      ctx.fillStyle = `rgba(255, 215, 0, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      
      // 更新粒子
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      
      if (p.life <= 0) {
        this.sparkles.splice(i, 1);
      }
    }
  }

  /**
   * Hex颜色转RGBA
   */
  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * 绘制圆角矩形路径（兼容小程序）
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x 
   * @param {number} y 
   * @param {number} width 
   * @param {number} height 
   * @param {number} radius 
   */
  _drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  onTouchStart(x, y) {
    this._touchStartTime = Date.now();
    this._touchStartPos = { x, y };
    
    const s = this.screenWidth / 750;
    
    // 放大视图模式
    if (this.viewMode === 'zoom') {
      // 检查退出按钮
      if (this.exitZoomBtn && this.exitZoomBtn.onTouchStart(x, y)) return true;
      
      // 检查 ToolSlot 区域（底部 10%）
      if (this.toolSlot) {
        const result = this.toolSlot.onTouchStart(x, y);
        if (result) {
          // 点击了工具槽，稍后 onTouchEnd 会处理选中
          return true;
        }
      }
      
      // 检查是否点击污垢区域（开始拖动工具）
      const s = this.screenWidth / 750;
      const centerX = 375 * s;
      const centerY = 600 * s;
      const size = 300 * s;
      
      if (x >= centerX - size/2 && x <= centerX + size/2 &&
          y >= centerY - size/2 && y <= centerY + size/2) {
        // 在污垢区域点击，开始拖动工具
        this.isDraggingTool = true;
        this.dragStartPos = { x, y };
        this.dragCurrentPos = { x, y };
        this.showToolTip = false;
        return true;
      }
      
      return true;
    }
    
    // 房间视图模式
    // 先检查 TopBar（暂停按钮）
    if (this.topBar && this.topBar.onTouchStart(x, y)) {
      return true;
    }
    
    if (this.backBtn && this.backBtn.onTouchStart(x, y)) return true;
    if (this.winBtn && this.winBtn.onTouchStart(x, y)) {
      console.log('[GameplayScene] 通关按钮 onTouchStart 触发');
      return true;
    }
    
    // 检查 ToolSlot 区域（底部 10%）
    if (this.toolSlot) {
      const result = this.toolSlot.onTouchStart(x, y);
      if (result) {
        // 点击了工具槽内的工具
        return true;
      }
    }

    // 检查污垢点击（双击检测）
    const clickedDirt = this._findDirtAt(x, y);
    if (clickedDirt) {
      const now = Date.now();
      if (this._lastClickDirt === clickedDirt && now - this._lastClickTime < 300) {
        // 双击 - 进入放大视图
        this._enterZoomView(clickedDirt);
      }
      this._lastClickTime = now;
      this._lastClickDirt = clickedDirt;
      return true;
    }

    return false;
  }

  onTouchMove(x, y) {
    if (this.viewMode === 'zoom' && this.isDraggingTool) {
      // 放大视图中的工具拖动
      this.dragCurrentPos = { x, y };
      return true;
    }
    
    return false;
  }

  onTouchEnd(x, y) {
    const s = this.screenWidth / 750;
    
    // 放大视图模式
    if (this.viewMode === 'zoom') {
      if (this.exitZoomBtn && this.exitZoomBtn.onTouchEnd(x, y)) return true;
      
      // 先处理 ToolSlot 的触摸结束（用于选中工具）
      if (this.toolSlot && this.toolSlot.onTouchEnd(x, y)) {
        return true;
      }
      
      // 检查工具拖动结束
      if (this.isDraggingTool && this.zoomedDirt) {
        // 检查是否在污垢区域内
        const dirt = this.zoomedDirt;
        const centerX = 375 * s;
        const centerY = 600 * s;
        const size = 300 * s;
        
        if (x >= centerX - size/2 && x <= centerX + size/2 &&
            y >= centerY - size/2 && y <= centerY + size/2) {
          // 在污垢区域内使用工具
          this._useToolOnDirt(dirt);
        }
        
        this.isDraggingTool = false;
        return true;
      }
      
      return true;
    }
    
    // 房间视图模式
    // 先检查 TopBar（暂停按钮）
    if (this.topBar && this.topBar.onTouchEnd(x, y)) {
      return true;
    }
    
    if (this.backBtn && this.backBtn.onTouchEnd(x, y)) return true;
    if (this.winBtn && this.winBtn.onTouchEnd(x, y)) {
      console.log('[GameplayScene] 通关按钮 onTouchEnd 触发');
      return true;
    }
    
    // 处理 ToolSlot 的触摸结束（用于选中工具）
    if (this.toolSlot && this.toolSlot.onTouchEnd(x, y)) {
      return true;
    }
    
    return false;
  }

  _findDirtAt(x, y) {
    // 将屏幕坐标转换为游戏区域坐标（减去顶部 8%）
    const gameAreaY = this.screenHeight * 0.08;
    const gameY = y - gameAreaY;
    
    for (let i = this.dirtObjects.length - 1; i >= 0; i--) {
      const dirt = this.dirtObjects[i];
      // 使用游戏区域坐标进行比较
      if (dirt.state !== 'clean' && x >= dirt.x && x <= dirt.x + dirt.width && 
          gameY >= dirt.y && gameY <= dirt.y + dirt.height) {
        return dirt;
      }
    }
    return null;
  }

  _cleanDirt(dirt) {
    dirt.cleanProgress += 0.3;
    if (dirt.cleanProgress >= 1) {
      dirt.state = 'clean';
      // 检查是否全部清洁完成
      if (this.dirtObjects.every(d => d.state === 'clean')) {
        // 预加载下一关预览图
        this._preloadNextLevelPreview();
        
        setTimeout(() => {
          globalEvent.emit('game:levelComplete', { levelId: this.levelId, stars: 3 });
        }, 500);
      }
    }
  }
}

export default GameplayScene;
