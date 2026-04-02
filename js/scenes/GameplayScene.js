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
import GameConfig from '../config/GameConfig';
import { BASE_TOOLS, PREMIUM_TOOLS, getTool, GlobalToolImageCache } from '../config/ToolConfig';
import { getLevel } from '../config/LevelConfig';
import { DIRT_TYPES, GlobalDirtImageCache } from '../config/dirtyConfig';
import { GlobalPreviewCache } from './HomeScene';
import { globalEvent } from '../core/EventEmitter';
import { getGame } from '../../app';
import { getLevelImageKey } from '../cloud/CloudResourceConfig';
import CloudStorage from '../cloud/CloudStorage';

import PauseMenu from '../ui/dialogs/PauseMenu';
import LevelCompleteDialog from '../ui/dialogs/LevelCompleteDialog';
import SettlementDialog from '../ui/dialogs/SettlementDialog';
import ToolUnlockDialog from '../ui/dialogs/ToolUnlockDialog';
import { GlobalFingerImageCache } from './LoadingScene';
import haptic from '../utils/HapticFeedback';

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
    
    // 新的清洁玩法状态
    this.selectedDirt = null;           // 当前选中的污垢圆圈
    this.activeTool = null;             // 当前在页面上的工具
    this.toolPosition = { x: 0, y: 0 }; // 工具在页面上的位置
    this.isDraggingTool = false;        // 是否正在拖动工具
    this.clothInDirt = false;           // cloth 工具是否在污垢区域内（用于计数）
    this.wipeStartAngle = null;         // 涂抹起始角度
    this.totalWipeAngle = 0;            // 总涂抹角度
    this.clockwiseWipes = 0;            // 顺时针涂抹圈数
    
    // broom 工具状态
    this.broomInDirt = false;           // broom 工具是否在污垢区域内
    this.broomFlipTimer = 0;            // broom 翻滚动画计时器
    this.broomFlipDirection = 1;        // 翻滚方向 1或-1
    
    // 工具弹出动画状态
    this.toolAnim = {
      active: false,        // 是否正在动画
      progress: 0,          // 动画进度 0-1
      startY: 0,            // 起始Y位置（工具槽内）
      targetY: 0,           // 目标Y位置（工具槽上方）
      slotX: 0,             // 槽位X位置
      scale: 0,             // 当前缩放
      alpha: 0              // 当前透明度
    };
    
    // 活动工具摇晃动画（不倒翁效果，用于垃圾桶接垃圾时）
    this.toolShakeAnim = {
      active: false,
      angle: 0,           // 当前旋转角度
      velocity: 0,        // 角速度
      targetToolId: null  // 触发摇晃的工具ID
    };
    
    // 动画效果
    this.sparkles = [];
    this.toolShake = 0;
    this.pulseTime = 0;                 // 闪烁动画时间
    
    // 清洁完成后的亮晶晶特效
    this.shineEffects = [];             // 存储亮晶晶特效
    
    // 结算弹窗（新方式：独立弹窗，不依赖 DialogManager）
    this.settlementDialog = null;
    
    // 工具解锁弹窗
    this.toolUnlockDialog = null;
    
    // 本关新解锁的工具列表
    this.newUnlockedTools = [];
    
    // 新手引导状态（被动式）
    this.tutorial = {
      isActive: false,               // 是否正在引导中
      targetRubbishBinDirt: null,    // 第一个需要 rubbish_bin 的污垢
      targetDcBasketDirt: null,      // 第一个需要 dc_basket 的污垢
      targetClothDirt: null,         // 第一个需要 cloth 的污垢
      
      // 金色边框提示只显示一次
      rubbishBinGlowShown: false,
      dcBasketGlowShown: false,
      clothGlowShown: false,
      showingRubbishBinGlow: false,  // 当前是否正在显示 rubbish_bin 金色边框
      showingDcBasketGlow: false,    // 当前是否正在显示 dc_basket 金色边框
      showingClothGlow: false,       // 当前是否正在显示 cloth 金色边框
      
      // 生气 emoji
      showAngryEmoji: false,
      angryEmojiEndTime: 0,
      
      // 工具选中后的目标污垢提示
      showRubbishBinDirtHint: false, // 是否显示 rubbish_bin 目标污垢的白色光圈+手指
      showDcBasketDirtHint: false,   // 是否显示 dc_basket 目标污垢的白色光圈+手指
      showClothDirtHint: false,      // 是否显示 cloth 目标污垢的 Z 字形动画
      
      // 记录用户是否已正确使用
      rubbishBinUsed: false,
      dcBasketUsed: false,
      clothUsed: false,
      
      handAnim: {                     // 小手动画状态
        offset: 0,
        time: 0
      },
      circularAnim: {                 // Z 字形动画状态
        time: 0,
        repeatCount: 0,
        maxRepeats: 2,
        duration: 1000
      }
    };
    
    // 划动清洁状态（用于 sweep 和 wipe 新玩法）
    this.strokeState = {
      active: false,
      dirt: null,
      strokeCount: 0,        // 已完成划动次数（0-3）
      maxStrokes: 3,         // 需要划动的总次数
      lastPos: null,         // 上一次位置
      totalDistance: 0,      // 本次划动的累计距离
      minStrokeDistance: 60, // 算作一次有效划动的最小距离（像素）
      lastCountTime: 0       // 上次计数时间，300ms防重复
    };
    
    // 云存储
    this.cloudStorage = new CloudStorage();
  }

  async onLoad(data = {}) {
    this.levelId = data.levelId || 1;
    this.stage = data.stage || 1;
    this.bgImage = null;
    this.bgLoaded = false;
    
    // 从 LevelConfig 获取关卡配置
    this.levelConfig = getLevel(this.stage, this.levelId);
    if (!this.levelConfig) {
      console.error(`[GameplayScene] 未找到关卡配置: stage=${this.stage}, level=${this.levelId}`);
      // 使用默认配置
      this.levelConfig = {
        name: `关卡 ${this.levelId}`,
        timeLimit: 60,
        dirts: []
      };
    }
    console.log(`[GameplayScene] 加载关卡: ${this.levelConfig.name}`);
    
    // 初始化云存储
    await this.cloudStorage.init();
    
    // 检查当前关卡解锁的新工具（unlockLevel === 当前关卡ID）
    this._checkNewUnlockedTools();
    
    this._initUI();
    this._generateDirts();
    await this._loadBackground();
    
    // 检查是否需要显示新手引导（第一关且未完成引导）
    // 注意：必须在 _generateDirts 之后调用，因为需要污垢数据
    this._checkTutorial();
    
    // 如果有新解锁的工具，显示解锁弹窗（在引导之后）
    if (this.newUnlockedTools && this.newUnlockedTools.length > 0 && !this.tutorial.isActive) {
      this._showToolUnlockDialog();
    }
  }

  /**
   * 加载关卡背景图
   * 优先从 LevelConfig.homeImagePath 获取完整的云存储路径
   */
  async _loadBackground() {
    if (typeof wx === 'undefined') return;
    
    const previewKey = `game_stage${this.stage}_l${this.levelId}_home`;
    
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
    
    // 2. 使用 LevelConfig 中的 homeImagePath（完整的云存储 fileID）
    if (this.levelConfig && this.levelConfig.homeImagePath) {
      try {
        const fileID = this.levelConfig.homeImagePath;
        console.log(`[GameplayScene] 从云存储加载背景: ${fileID}`);
        
        const tempURL = await this.cloudStorage.getTempFileURL(fileID);
        if (tempURL) {
          const img = await this._downloadImage(tempURL);
          this.bgImage = img;
          this.bgLoaded = true;
          console.log(`[GameplayScene] 背景从云存储加载成功`);
          
          // 保存到全局缓存
          GlobalPreviewCache.save(previewKey, img);
          return;
        }
      } catch (e) {
        console.log(`[GameplayScene] 云存储背景加载失败:`, e.message);
      }
    }
    
    console.warn('[GameplayScene] 关卡未配置 homeImagePath 或加载失败');
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

  /**
   * 检查是否需要显示新手引导（被动式）
   * 条件：第一关 + 新玩家 + 未展示过引导
   */
  _checkTutorial() {
    // 只有第一关才显示引导
    if (this.levelId !== 1) return;
    
    const game = getGame();
    const dataManager = game ? game.dataManager : null;
    
    // 检查是否已完成引导
    if (dataManager && dataManager.hasCompletedTutorial) {
      if (dataManager.hasCompletedTutorial()) return;
    } else {
      // 降级检查：使用本地存储
      try {
        const hasShown = wx.getStorageSync('tutorial_completed');
        if (hasShown) return;
      } catch (e) {
        // 忽略错误
      }
    }
    
    // 找到第一个 recipes 包含 rubbish_bin 的污垢
    const rubbishBinDirt = this.dirtObjects.find(d => {
      const dirtType = DIRT_TYPES[d.type];
      return dirtType && dirtType.recipes && dirtType.recipes.some(r => r.includes('rubbish_bin'));
    });
    
    // 找到第一个 recipes 包含 dc_basket 的污垢
    const dcBasketDirt = this.dirtObjects.find(d => {
      const dirtType = DIRT_TYPES[d.type];
      return dirtType && dirtType.recipes && dirtType.recipes.some(r => r.includes('dc_basket'));
    });
    
    // 找到第一个 recipes 包含 cloth 的污垢
    const clothDirt = this.dirtObjects.find(d => {
      const dirtType = DIRT_TYPES[d.type];
      return dirtType && dirtType.recipes && dirtType.recipes.some(r => r.includes('cloth'));
    });
    
    if (!rubbishBinDirt && !dcBasketDirt && !clothDirt) {
      console.warn('[GameplayScene] 未找到适合引导的污垢，无法开启引导');
      return;
    }
    
    // 开启引导
    console.log('[GameplayScene] 开启被动式新手引导');
    this.tutorial.isActive = true;
    this.tutorial.targetRubbishBinDirt = rubbishBinDirt || null;
    this.tutorial.targetDcBasketDirt = dcBasketDirt || null;
    this.tutorial.targetClothDirt = clothDirt || null;
  }
  
  /**
   * 完成新手引导
   */
  _completeTutorial() {
    console.log('[GameplayScene] 完成新手引导');
    this.tutorial.isActive = false;
    this.tutorial.showingRubbishBinGlow = false;
    this.tutorial.showingDcBasketGlow = false;
    this.tutorial.showingClothGlow = false;
    this.tutorial.showAngryEmoji = false;
    this.tutorial.showRubbishBinDirtHint = false;
    this.tutorial.showDcBasketDirtHint = false;
    this.tutorial.showClothDirtHint = false;
    
    const game = getGame();
    const dataManager = game ? game.dataManager : null;
    
    // 保存引导完成状态
    if (dataManager && dataManager.setTutorialCompleted) {
      dataManager.setTutorialCompleted();
    } else {
      try {
        wx.setStorageSync('tutorial_completed', true);
      } catch (e) {
        // 忽略错误
      }
    }
  }
  
  /**
   * 检查引导是否可以完成
   */
  _checkTutorialComplete() {
    if (!this.tutorial.isActive) return;
    if (this.tutorial.rubbishBinUsed && this.tutorial.dcBasketUsed && this.tutorial.clothUsed) {
      this._completeTutorial();
    }
  }
  
  /**
   * 强制开始新手引导（调试用）
   * 重置所有引导状态并从头开始
   */
  _forceStartTutorial() {
    console.log('[GameplayScene] 强制开始新手引导');
    
    // 重置引导完成状态
    const game = getGame();
    const dataManager = game ? game.dataManager : null;
    if (dataManager && dataManager.setTutorialCompleted) {
      dataManager.tutorialCompleted = false;
    }
    try {
      wx.setStorageSync('tutorial_completed', false);
    } catch (e) {}
    
    // 重置所有工具槽状态
    if (this.toolSlot) {
      this.toolSlot.emptySlots.clear();
      this.toolSlot.selectedIndex = -1;
    }
    this.activeTool = null;
    this.toolAnim = { active: false };
    
    // 重置引导状态
    this.tutorial.isActive = false;
    this.tutorial.targetRubbishBinDirt = null;
    this.tutorial.targetDcBasketDirt = null;
    this.tutorial.targetClothDirt = null;
    this.tutorial.rubbishBinGlowShown = false;
    this.tutorial.dcBasketGlowShown = false;
    this.tutorial.clothGlowShown = false;
    this.tutorial.showingRubbishBinGlow = false;
    this.tutorial.showingDcBasketGlow = false;
    this.tutorial.showingClothGlow = false;
    this.tutorial.showAngryEmoji = false;
    this.tutorial.angryEmojiEndTime = 0;
    this.tutorial.showRubbishBinDirtHint = false;
    this.tutorial.showDcBasketDirtHint = false;
    this.tutorial.showClothDirtHint = false;
    this.tutorial.rubbishBinUsed = false;
    this.tutorial.dcBasketUsed = false;
    this.tutorial.clothUsed = false;
    this.tutorial.handAnim = { offset: 0, time: 0 };
    this.tutorial.circularAnim = { time: 0, repeatCount: 0, maxRepeats: 2, duration: 1000 };
    
    // 重新检查并启动引导
    this._checkTutorial();
  }
  
  /**
   * 检查当前关卡新解锁的工具
   * unlockLevel === 当前关卡ID 的工具
   * 注意：关卡1不弹出（初始工具已在工具槽中）
   */
  _checkNewUnlockedTools() {
    // 关卡1不弹出解锁弹窗（初始工具已在工具槽中）
    if (this.levelId === 1) {
      this.newUnlockedTools = [];
      return;
    }
    
    // 筛选出本关解锁的工具（unlockLevel 等于当前关卡ID）
    this.newUnlockedTools = BASE_TOOLS.filter(t => t.unlockLevel === this.levelId);
    
    if (this.newUnlockedTools.length > 0) {
      console.log('[GameplayScene] 本关解锁新工具:', this.newUnlockedTools.map(t => t.name).join(', '));
    }
  }
  
  /**
   * 显示工具解锁弹窗
   */
  _showToolUnlockDialog() {
    // 准备弹窗需要的工具数据（包含图片）
    const toolsWithImages = this.newUnlockedTools.map(tool => {
      const toolImage = GlobalToolImageCache.get(tool.id);
      return {
        ...tool,
        image: toolImage
      };
    });
    
    // 创建解锁弹窗
    this.toolUnlockDialog = new ToolUnlockDialog({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      unlockedTools: toolsWithImages,
      onCollect: () => {
        // 点击收取后将工具添加到工具槽
        this._addUnlockedToolsToSlot();
      }
    });
    
    // 显示弹窗
    this.toolUnlockDialog.show();
    console.log('[GameplayScene] 显示工具解锁弹窗');
  }
  
  /**
   * 将解锁的工具添加到工具槽第一位
   */
  _addUnlockedToolsToSlot() {
    if (!this.newUnlockedTools || this.newUnlockedTools.length === 0) return;
    
    // 将新工具插入到工具列表开头
    const newTools = [...this.newUnlockedTools, ...this.tools];
    this.tools = newTools;
    
    // 更新 ToolSlot 组件
    if (this.toolSlot) {
      // 使用 updateData 方法更新工具，确保槽位位置正确更新
      this.toolSlot.updateData({
        tools: this.tools,
        selectedIndex: 0  // 选中新添加的第一个工具
      });
    }
    
    // 设置当前工具索引为0（新工具）
    this.currentToolIndex = 0;
    
    console.log('[GameplayScene] 新工具已添加到工具槽:', this.newUnlockedTools.map(t => t.name).join(', '));
    
    // 清空新解锁工具列表（避免重复添加）
    this.newUnlockedTools = [];
  }

  _initUI() {
    const s = this.screenWidth / 750;
    
    // 从 LevelConfig 获取时间限制
    this.timeLimit = this.levelConfig.timeLimit || 60;
    this.remainingTime = this.timeLimit;
    
    // 工具槽显示已解锁的基础工具（根据 unlockLevel 过滤）
    // 如果有新解锁的工具，先不包含它们，等点击收取后再添加
    const unlockedToolIds = (this.newUnlockedTools || []).map(t => t.id);
    this.tools = BASE_TOOLS.filter(t => t.unlockLevel <= this.levelId && !unlockedToolIds.includes(t.id));
    this.currentToolIndex = 0;
    
    // 新的 TopBar 组件（替换原有顶部 UI）
    this.topBar = new TopBar({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      levelText: `${this.levelId}/10`,
      progress: 0,
      timeText: `${this.timeLimit}s`,
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
          // 使用 scene:pop 返回上一个场景（HomeScene）
          globalEvent.emit('scene:pop');
        }
      }
    });
    
    // 引导按钮（调试用，仅在第1关显示）- 点击强制触发新人引导
    this.guideBtn = null;
    if (this.levelId === 1) {
      this.guideBtn = new Button({
        x: 20 * s, y: 290 * s, width: 100 * s, height: 50 * s,
        text: '引导', fontSize: 24 * s,
        bgColor: 'rgba(255,152,0,0.8)', textColor: '#FFFFFF',
        borderRadius: 8 * s,
        onClick: () => {
          this._forceStartTutorial();
        }
      });
    }

    // 创建 ToolSlot 组件（默认不选中任何工具）
    this.toolSlot = new ToolSlot({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      tools: this.tools,
      selectedIndex: -1, // 默认不选中
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

  /**
   * 获取关卡需要的工具（从污垢配方中提取）
   */
  _getRequiredTools() {
    const configDirts = this.levelConfig.dirts || [];
    const requiredToolIds = new Set();
    
    // 收集所有需要的工具
    configDirts.forEach(dirtConfig => {
      const dirtType = DIRT_TYPES[dirtConfig.type];
      if (dirtType && dirtType.recipes) {
        // 使用第一个配方
        const recipe = dirtType.recipes[0];
        recipe.forEach(toolId => requiredToolIds.add(toolId));
      }
    });
    
    // 如果没有配置污垢，返回所有基础工具
    if (requiredToolIds.size === 0) {
      return BASE_TOOLS.filter(t => t.unlockLevel <= this.levelId);
    }
    
    // 从 BASE_TOOLS 和 PREMIUM_TOOLS 中查找需要的工具
    const allTools = [...BASE_TOOLS, ...PREMIUM_TOOLS];
    
    // 过滤出需要的工具，保持基础工具始终可用
    const tools = allTools.filter(t => 
      requiredToolIds.has(t.id) || (t.type === 'base' && t.unlockLevel <= this.levelId)
    );
    
    console.log('[GameplayScene] 关卡可用工具:', tools.map(t => t.id).join(', '));
    return tools.length > 0 ? tools : BASE_TOOLS.slice(0, 4);
  }

  _generateDirts() {
    const s = this.screenWidth / 750;
    this.dirtObjects = [];
    
    // 从 LevelConfig 获取配置的污垢
    const configDirts = this.levelConfig.dirts || [];
    
    if (configDirts.length === 0) {
      console.warn('[GameplayScene] 关卡没有配置污垢，使用随机生成');
      this._generateRandomDirts();
      return;
    }
    
    configDirts.forEach((dirtConfig, i) => {
      // 获取污垢类型定义
      const dirtType = DIRT_TYPES[dirtConfig.type];
      if (!dirtType) {
        console.warn(`[GameplayScene] 未知污垢类型: ${dirtConfig.type}`);
        return;
      }
      
      // 配置中的坐标是设计尺寸（750x1334），需要适配当前屏幕
      const x = (dirtConfig.x || 300) * s;
      const y = (dirtConfig.y || 400) * s;
      
      // 圆圈直径固定 60px，适配屏幕
      const circleSize = 60 * s;
      
      this.dirtObjects.push({
        id: i,
        type: dirtConfig.type,
        name: dirtType.name,
        x: x,
        y: y,
        width: circleSize,          // 宽度
        height: circleSize,         // 高度
        size: circleSize,           // 圆圈直径（兼容旧代码）
        state: 'dirty',             // dirty, selected, cleaning, clean
        selected: false,            // 是否被选中（闪烁）
        cleaning: false,            // 是否正在清洁中
        strokeCount: 0,             // 划动清洁次数（0-3）
        maxStrokes: 3,              // 需要划动的总次数
        currentRecipe: dirtType.recipes[0],
        currentStep: 0,
        recipes: dirtType.recipes,
        score: 10,
        coinReward: 5
      });
    });
    
    console.log(`[GameplayScene] 生成了 ${this.dirtObjects.length} 个污垢圆圈`);
  }

  /**
   * 随机生成污垢（后备方案）
   */
  _generateRandomDirts() {
    const s = this.screenWidth / 750;
    const availableDirtTypes = GameConfig.getAvailableDirtTypes(this.levelId);
    const dirtCount = GameConfig.getDirtCount(this.levelId);
    
    for (let i = 0; i < dirtCount; i++) {
      const dirtConfig = availableDirtTypes[Math.floor(Math.random() * availableDirtTypes.length)];
      const relativeY = (50 + Math.random() * (this.screenHeight * 0.9 / s - 150)) * s;
      
      this.dirtObjects.push({
        id: i,
        type: dirtConfig.type,
        name: dirtConfig.name,
        x: (80 + Math.random() * 590) * s,
        y: relativeY,
        width: 100 * s,
        height: 100 * s,
        state: 'dirty',
        strokeCount: 0,
        maxStrokes: 3,
        currentRecipe: dirtConfig.recipes[0],
        currentStep: 0,
        color: dirtConfig.color,
        recipes: dirtConfig.recipes,
        score: dirtConfig.score,
        coinReward: dirtConfig.coinReward
      });
    }
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
   * 显示结算弹窗（新方式：直接实例化独立弹窗）
   */
  _showSettlement() {
    // 从 LevelConfig 获取奖励配置
    const reward = this.levelConfig.reward || { coins: 50, stars: 3 };
    
    // 计算星级（基于剩余时间比例）
    const timeRatio = (this.remainingTime || this.timeLimit) / this.timeLimit;
    let stars = 1;
    if (timeRatio >= 0.6) stars = 3;
    else if (timeRatio >= 0.3) stars = 2;
    
    // 计算金币（基础奖励 + 星级奖励）
    const baseCoins = reward.coins || 50;
    const starBonus = (stars - 1) * 25;
    const coins = baseCoins + starBonus;
    
    // 动态导入并创建独立弹窗（不依赖 DialogManager）
    const SettlementDialog = require('../ui/dialogs/SettlementDialog').default;
    
    // 获取 dataManager 用于保存进度
    const game = getGame();
    const dataManager = game ? game.dataManager : null;
    
    this.settlementDialog = new SettlementDialog({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      levelId: this.levelId,
      stars: stars,
      coins: coins,
      onNext: () => {
        // 计算全局关卡ID（1-40）
        const globalLevelId = (this.stage - 1) * 10 + this.levelId;
        const nextGlobalLevelId = globalLevelId + 1;
        
        // 保存进度：标记当前关卡完成，解锁下一关
        if (dataManager) {
          dataManager.completeLevel(globalLevelId, stars);
          dataManager.unlockLevel(nextGlobalLevelId);
          dataManager.addCoins(coins);
          dataManager.save();
        }
        globalEvent.emit('scene:switch', 'GameplayScene', { levelId: this.levelId + 1, stage: this.stage });
      },
      onReplay: () => {
        // 重玩不保存进度，只是重新开始
        globalEvent.emit('scene:switch', 'GameplayScene', { levelId: this.levelId });
      },
      onHome: () => {
        // 计算全局关卡ID（1-40）
        const globalLevelId = (this.stage - 1) * 10 + this.levelId;
        const nextGlobalLevelId = globalLevelId + 1;
        
        // 保存进度：标记当前关卡完成，解锁下一关
        if (dataManager) {
          dataManager.completeLevel(globalLevelId, stars);
          dataManager.unlockLevel(nextGlobalLevelId);
          dataManager.addCoins(coins);
          dataManager.save();
        }
        
        // 先更新全局关卡状态缓存（用于首页恢复）
        const { GlobalLevelStateCache } = require('./HomeScene');
        GlobalLevelStateCache.save(this.stage, this.levelId, 'unlocked', stars);
        
        // 使用 scene:pop 返回 HomeScene，并传递通关动画标记
        globalEvent.emit('scene:pop', {
          justCompletedLevel: this.levelId,  // 刚通关的关卡ID
          completedStage: this.stage,         // 通关的stage
          completedStars: stars               // 获得的星级
        });
      }
    });
    
    // 显示弹窗（设置 visible=true，触发动画）
    this.settlementDialog.show();
    
    // 立即异步预加载下一关的背景图（弹窗弹出时就开始加载）
    this._preloadNextLevelBackground();
  }

  /**
   * 立即异步预加载下一关的背景图
   * 使用 LevelConfig.homeImagePath 获取完整的云存储路径
   */
  async _preloadNextLevelBackground() {
    const nextLevelId = this.levelId + 1;
    if (nextLevelId > 10) {
      console.log('[GameplayScene] 已是本stage最后一关，无需预加载');
      return;
    }
    
    console.log(`[GameplayScene] 弹窗显示，立即异步预加载下一关背景图: stage${this.stage}_level${nextLevelId}`);
    
    try {
      // 1. 首先检查全局预览缓存
      const { GlobalPreviewCache } = require('./HomeScene');
      const previewKey = `game_stage${this.stage}_l${nextLevelId}_home`;
      const cached = GlobalPreviewCache.get(previewKey);
      if (cached && cached.img) {
        console.log(`[GameplayScene] 下一关背景图已在全局缓存中`);
        return;
      }
      
      // 2. 从 LevelConfig 获取下一关的 homeImagePath
      const { getLevel } = require('../config/LevelConfig');
      const nextLevelConfig = getLevel(this.stage, nextLevelId);
      
      if (!nextLevelConfig || !nextLevelConfig.homeImagePath) {
        console.log('[GameplayScene] 下一关未配置 homeImagePath');
        return;
      }
      
      // 3. 从云存储加载
      const fileID = nextLevelConfig.homeImagePath;
      console.log(`[GameplayScene] 从云存储预加载下一关: ${fileID}`);
      
      const tempURL = await this.cloudStorage.getTempFileURL(fileID);
      if (tempURL) {
        const img = await this._downloadImage(tempURL);
        GlobalPreviewCache.save(previewKey, img);
        console.log(`[GameplayScene] 下一关背景图已缓存到全局: ${previewKey}`);
      }
    } catch (e) {
      console.log(`[GameplayScene] 预加载下一关背景图失败:`, e.message);
    }
  }
  
  /**
   * 更新结算弹窗
   */
  _updateSettlementDialog(dt) {
    if (this.settlementDialog && this.settlementDialog.update) {
      this.settlementDialog.update(dt);
    }
  }
  
  /**
   * 更新工具解锁弹窗
   */
  _updateToolUnlockDialog(dt) {
    if (this.toolUnlockDialog && this.toolUnlockDialog.update) {
      this.toolUnlockDialog.update(dt);
    }
  }
  
  /**
   * 显示生气 emoji（错误工具提示）
   */
  _showAngryEmoji() {
    if (!this.tutorial.isActive) return;
    this.tutorial.showAngryEmoji = true;
    this.tutorial.angryEmojiEndTime = Date.now() + 1200; // 显示 1.2 秒
  }
  
  /**
   * 更新新手引导动画（被动式）
   */
  _updateTutorial(dt) {
    if (!this.tutorial.isActive) return;
    
    // 更新小手摆动动画（正弦波，周期2秒）
    this.tutorial.handAnim.time += dt;
    this.tutorial.handAnim.offset = Math.sin(this.tutorial.handAnim.time * 0.003) * 10;
    
    // 更新生气 emoji 定时器
    if (this.tutorial.showAngryEmoji) {
      if (Date.now() >= this.tutorial.angryEmojiEndTime) {
        this.tutorial.showAngryEmoji = false;
      }
    }
    
    // 更新 Z 字形动画（用于 cloth 选中后的提示）
    if (this.tutorial.showClothDirtHint) {
      const anim = this.tutorial.circularAnim;
      anim.time += dt;
      
      if (anim.time >= anim.duration) {
        anim.time = 0;
        anim.repeatCount++;
        
        // 完成2次重复后自动隐藏 Z 字形提示（引导不结束，只是提示动画完成）
        if (anim.repeatCount >= anim.maxRepeats) {
          anim.repeatCount = 0;
          anim.time = 0;
          // 不自动隐藏，循环播放以持续提示用户
        }
      }
    }
  }
  
  /**
   * 渲染新手引导UI（主入口，在 onRender 中调用）
   */
  _renderTutorial(ctx, s) {
    if (!this.tutorial.isActive) return;
  }
  
  /**
   * 渲染 rubbish_bin 槽位金色边框闪烁+呼吸感
   */
  _renderTutorialRubbishBinGlow(ctx, s) {
    if (!this.tutorial.showingRubbishBinGlow) return;
    
    const toolIndex = this.tools.findIndex(t => t.id === 'rubbish_bin');
    if (toolIndex === -1 || !this.toolSlot) return;
    
    const slotPos = this.toolSlot.slotPositions[toolIndex];
    if (!slotPos) return;
    
    const { x, y, size } = slotPos;
    
    // 加强呼吸感：更快频率、更大振幅
    const breath = (Math.sin(this.tutorial.handAnim.time * 0.008) + 1) / 2; // 0~1，频率加快
    const alpha = 0.4 + breath * 0.6; // 透明度 0.4 ~ 1.0，变化更大
    const lineWidth = 3 + breath * 4; // 线宽 3 ~ 7，更明显的粗细变化
    const glowBlur = 15 * s + breath * 20 * s; // 发光 15 ~ 35，更强烈的辉光
    
    ctx.save();
    
    const padding = 6 * s;
    const rx = x - padding;
    const ry = y - padding;
    const rw = size + padding * 2;
    const rh = size + padding * 2;
    const r = 16 * s;
    
    // 构建路径
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    
    // 1. 最外层金色光晕（大范围呼吸）
    ctx.lineWidth = 5 * s;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.1 + breath * 0.15})`;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = glowBlur + 10 * s;
    ctx.stroke();
    
    // 2. 中层金色扩散
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.25 + breath * 0.3})`;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = glowBlur;
    ctx.stroke();
    
    // 3. 主金色呼吸边框（最亮）
    ctx.lineWidth = lineWidth * s;
    ctx.strokeStyle = `rgba(255, 235, 80, ${alpha})`; // 偏亮的金色
    ctx.shadowColor = 'rgba(255, 215, 0, 1.0)';
    ctx.shadowBlur = glowBlur * 0.6;
    ctx.stroke();
    
    ctx.restore();
  }
  
  /**
   * 渲染 cloth 槽位金色边框闪烁+呼吸感
   */
  _renderTutorialClothGlow(ctx, s) {
    if (!this.tutorial.showingClothGlow) return;
    
    const toolIndex = this.tools.findIndex(t => t.id === 'cloth');
    if (toolIndex === -1 || !this.toolSlot) return;
    
    const slotPos = this.toolSlot.slotPositions[toolIndex];
    if (!slotPos) return;
    
    const { x, y, size } = slotPos;
    
    // 加强呼吸感
    const breath = (Math.sin(this.tutorial.handAnim.time * 0.008) + 1) / 2;
    const alpha = 0.4 + breath * 0.6;
    const lineWidth = 3 + breath * 4;
    const glowBlur = 15 * s + breath * 20 * s;
    
    ctx.save();
    
    const padding = 6 * s;
    const rx = x - padding;
    const ry = y - padding;
    const rw = size + padding * 2;
    const rh = size + padding * 2;
    const r = 16 * s;
    
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    
    // 1. 最外层金色光晕
    ctx.lineWidth = 5 * s;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.1 + breath * 0.15})`;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = glowBlur + 10 * s;
    ctx.stroke();
    
    // 2. 中层金色扩散
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.25 + breath * 0.3})`;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = glowBlur;
    ctx.stroke();
    
    // 3. 主金色呼吸边框
    ctx.lineWidth = lineWidth * s;
    ctx.strokeStyle = `rgba(255, 235, 80, ${alpha})`;
    ctx.shadowColor = 'rgba(255, 215, 0, 1.0)';
    ctx.shadowBlur = glowBlur * 0.6;
    ctx.stroke();
    
    ctx.restore();
  }
  
  /**
   * 渲染 dc_basket 槽位金色边框闪烁+呼吸感
   */
  _renderTutorialDcBasketGlow(ctx, s) {
    if (!this.tutorial.showingDcBasketGlow) return;
    
    const toolIndex = this.tools.findIndex(t => t.id === 'dc_basket');
    if (toolIndex === -1 || !this.toolSlot) return;
    
    const slotPos = this.toolSlot.slotPositions[toolIndex];
    if (!slotPos) return;
    
    const { x, y, size } = slotPos;
    
    // 加强呼吸感
    const breath = (Math.sin(this.tutorial.handAnim.time * 0.008) + 1) / 2;
    const alpha = 0.4 + breath * 0.6;
    const lineWidth = 3 + breath * 4;
    const glowBlur = 15 * s + breath * 20 * s;
    
    ctx.save();
    
    const padding = 6 * s;
    const rx = x - padding;
    const ry = y - padding;
    const rw = size + padding * 2;
    const rh = size + padding * 2;
    const r = 16 * s;
    
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    
    // 1. 最外层金色光晕（大范围呼吸）
    ctx.lineWidth = 5 * s;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.1 + breath * 0.15})`;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = glowBlur + 10 * s;
    ctx.stroke();
    
    // 2. 中层金色扩散
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.25 + breath * 0.3})`;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = glowBlur;
    ctx.stroke();
    
    // 3. 主金色呼吸边框（最亮）
    ctx.lineWidth = lineWidth * s;
    ctx.strokeStyle = `rgba(255, 235, 80, ${alpha})`;
    ctx.shadowColor = 'rgba(255, 215, 0, 1.0)';
    ctx.shadowBlur = glowBlur * 0.6;
    ctx.stroke();
    
    ctx.restore();
  }
  
  /**
   * 渲染生气 emoji（在弹出的工具左上角）
   */
  _renderAngryEmoji(ctx, s) {
    if (!this.tutorial.showAngryEmoji || !this.activeTool) return;
    
    const x = this.toolPosition.x - 40 * s;
    const y = this.toolPosition.y - 50 * s;
    
    ctx.save();
    ctx.font = `bold ${40 * s}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 小弹跳动画
    const bounce = Math.sin(Date.now() * 0.02) * 3 * s;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillText('😠', x + 2 * s, y + bounce + 2 * s);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('😠', x, y + bounce);
    
    ctx.restore();
  }
  
  /**
   * 渲染 rubbish_bin 目标污垢提示：极简现代金色轮廓光圈
   */
  _renderTutorialRubbishBinDirtHint(ctx, s) {
    if (!this.tutorial.showRubbishBinDirtHint) return;
    
    const dirt = this.tutorial.targetRubbishBinDirt;
    if (!dirt || dirt.state === 'clean') return;
    
    const gameAreaY = this.screenHeight * 0.08;
    const cx = dirt.x;
    const cy = dirt.y + gameAreaY;
    const baseRadius = dirt.size / 2 + 15 * s;
    
    // 白色光圈波纹扩散 + 手指图标（指尖朝上）
    ctx.save();
    
    // 波纹扩散动画
    const cycle = 1750;
    const progress = (this.tutorial.handAnim.time % cycle) / cycle;
    
    ctx.lineWidth = 3.5 * s;
    
    // 2层波纹
    for (let i = 0; i < 2; i++) {
      const ringProgress = (progress + i * 0.5) % 1;
      const radius = baseRadius + ringProgress * 20 * s;
      const alpha = (1 - ringProgress) * 0.6;
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 6 * s;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // 主光圈圈
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2.5 * s;
    ctx.shadowBlur = 8 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
    
    // 手指（指尖朝上）- 更靠近光圈，摆动幅度更小
    const handOffset = Math.sin(this.tutorial.handAnim.time * 0.006) * 4;
    this._renderHandBig(ctx, s, cx, cy + baseRadius + 45 * s, handOffset, true);
  }
  
  /**
   * 渲染 dc_basket 目标污垢提示：极简现代金色轮廓光圈
   */
  _renderTutorialDcBasketDirtHint(ctx, s) {
    if (!this.tutorial.showDcBasketDirtHint) return;
    
    const dirt = this.tutorial.targetDcBasketDirt;
    if (!dirt || dirt.state === 'clean') return;
    
    const gameAreaY = this.screenHeight * 0.08;
    const cx = dirt.x;
    const cy = dirt.y + gameAreaY;
    const baseRadius = dirt.size / 2 + 15 * s;
    
    // 白色光圈波纹扩散 + 手指图标（指尖朝上）
    ctx.save();
    
    // 波纹扩散动画
    const cycle = 1750;
    const progress = (this.tutorial.handAnim.time % cycle) / cycle;
    
    ctx.lineWidth = 3.5 * s;
    
    // 2层波纹
    for (let i = 0; i < 2; i++) {
      const ringProgress = (progress + i * 0.5) % 1;
      const radius = baseRadius + ringProgress * 20 * s;
      const alpha = (1 - ringProgress) * 0.6;
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 6 * s;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // 主光圈圈
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2.5 * s;
    ctx.shadowBlur = 8 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
    
    // 手指（指尖朝上）- 更靠近光圈，摆动幅度更小
    const handOffset = Math.sin(this.tutorial.handAnim.time * 0.006) * 4;
    this._renderHandBig(ctx, s, cx, cy + baseRadius + 45 * s, handOffset, true);
  }
  
  /**
   * 渲染 cloth 目标污垢提示：Z 字形动画（逆时针旋转 30 度）
   * 放大尺寸，带旋转效果更有动感
   */
  _renderTutorialClothDirtHint(ctx, s) {
    if (!this.tutorial.showClothDirtHint) return;
    
    const dirt = this.tutorial.targetClothDirt;
    if (!dirt || dirt.state === 'clean') return;
    
    const gameAreaY = this.screenHeight * 0.08;
    const centerX = dirt.x;
    const centerY = dirt.y + gameAreaY;
    
    // 放大尺寸：原来的 1.5 倍
    const size = dirt.size * 1.2;
    
    // 使用 handAnim.time 作为 Z 字动画的计时器（因为它一直在更新）
    const animDuration = 1800;   // 动画时长 1.8 秒
    const pauseDuration = 500;   // 停顿 0.5 秒
    const cycle = animDuration + pauseDuration;
    
    // 计算整体进度 (0 - 1)
    const timeInCycle = this.tutorial.handAnim.time % cycle;
    const t = Math.min(1, timeInCycle / animDuration);
    
    // 定义 Z 字的 4 个关键点
    const zPointsLocal = [
      { x: -size * 0.5, y: -size * 0.4 },   // 左上起点
      { x: size * 0.5, y: -size * 0.4 },    // 第一横终点
      { x: -size * 0.5, y: size * 0.4 },    // 斜线终点
      { x: size * 0.5, y: size * 0.4 }      // 第二横终点
    ];
    
    // 逆时针旋转 30 度
    const angle = -30 * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const zPoints = zPointsLocal.map(pt => ({
      x: centerX + (pt.x * cos - pt.y * sin),
      y: centerY + (pt.x * sin + pt.y * cos)
    }));
    
    // 计算旋转后各段的实际长度
    const len1 = Math.hypot(zPoints[1].x - zPoints[0].x, zPoints[1].y - zPoints[0].y);
    const len2 = Math.hypot(zPoints[2].x - zPoints[1].x, zPoints[2].y - zPoints[1].y);
    const len3 = Math.hypot(zPoints[3].x - zPoints[2].x, zPoints[3].y - zPoints[2].y);
    const totalLen = len1 + len2 + len3;
    
    // 根据实际长度计算各段占比
    const ratio1 = len1 / totalLen;              // 第一横占比
    const ratio2 = len2 / totalLen;              // 斜线占比  
    const ratio3 = len3 / totalLen;              // 第二横占比
    const threshold1 = ratio1;                   // 第一横结束点
    const threshold2 = ratio1 + ratio2;          // 斜线结束点
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 8 * s;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 20 * s;
    
    // 背景虚线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([4 * s, 4 * s]);
    ctx.beginPath();
    ctx.moveTo(zPoints[0].x, zPoints[0].y);
    ctx.lineTo(zPoints[1].x, zPoints[1].y);
    ctx.lineTo(zPoints[2].x, zPoints[2].y);
    ctx.lineTo(zPoints[3].x, zPoints[3].y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 动画 Z 字（使用实际长度比例）
    ctx.strokeStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 18 * s;
    
    // 计算当前应该画到哪里（基于路径长度）
    const currentLen = t * totalLen;
    
    ctx.beginPath();
    ctx.moveTo(zPoints[0].x, zPoints[0].y);

    if (currentLen <= len1) {
      // 还在第一横
      const p = currentLen / len1;
      ctx.lineTo(
        zPoints[0].x + (zPoints[1].x - zPoints[0].x) * p,
        zPoints[0].y + (zPoints[1].y - zPoints[0].y) * p
      );
    } else if (currentLen <= len1 + len2) {
      // 第一横完成，正在画斜线
      ctx.lineTo(zPoints[1].x, zPoints[1].y);
      const p = (currentLen - len1) / len2;
      ctx.lineTo(
        zPoints[1].x + (zPoints[2].x - zPoints[1].x) * p,
        zPoints[1].y + (zPoints[2].y - zPoints[1].y) * p
      );
    } else {
      // 第一横和斜线完成，正在画第二横
      ctx.lineTo(zPoints[1].x, zPoints[1].y);
      ctx.lineTo(zPoints[2].x, zPoints[2].y);
      const p = Math.min(1, (currentLen - len1 - len2) / len3);
      
      ctx.lineTo(
        zPoints[2].x + (zPoints[3].x - zPoints[2].x) * p,
        zPoints[2].y + (zPoints[3].y - zPoints[2].y) * p
      );
    }
    
    ctx.stroke();
    
    // 起点闪烁
    const blink = (Math.sin(this.tutorial.handAnim.time * 0.01) + 1) / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 15 * s;
    ctx.beginPath();
    ctx.arc(zPoints[0].x, zPoints[0].y, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    
    // 动画过半后终点闪烁
    if (t > 0.5) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + blink * 0.4})`;
      ctx.beginPath();
      ctx.arc(zPoints[3].x, zPoints[3].y, 6 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  /**
   * 绘制手指引导图片（带摆动动画）
   * 使用预加载的手指图片替代emoji
   * @param {boolean} pointUp - 是否指尖朝上（默认朝下）
   */
  _renderHandBig(ctx, s, x, y, offset = 0, pointUp = false) {
    const fingerImg = GlobalFingerImageCache.get();
    
    if (fingerImg) {
      // 使用手指图片
      const size = 70 * s; // 手指图片大小（加大）
      
      ctx.save();
      
      // 不绘制阴影（用户要求去掉指尖阴影）
      
      if (pointUp) {
        // 指尖朝上：旋转180度
        ctx.translate(x, y + offset);
        ctx.rotate(Math.PI);
        ctx.drawImage(fingerImg, -size / 2, -size, size, size);
      } else {
        // 指尖朝下（默认）：不旋转
        ctx.drawImage(fingerImg, x - size / 2, y + offset - size, size, size);
      }
      
      ctx.restore();
    } else {
      // 降级：使用emoji
      ctx.save();
      ctx.font = `bold ${56 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText('👆', x + 3 * s, y + offset + 3 * s);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('👆', x, y + offset);
      
      ctx.restore();
    }
  }
  
  /**
   * 渲染结算弹窗
   */
  _renderSettlementDialog(ctx) {
    if (this.settlementDialog && this.settlementDialog.render) {
      this.settlementDialog.render(ctx);
    }
  }
  
  /**
   * 渲染工具解锁弹窗
   */
  _renderToolUnlockDialog(ctx) {
    if (this.toolUnlockDialog && this.toolUnlockDialog.render) {
      this.toolUnlockDialog.render(ctx);
    }
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
    
    const pauseMenu = new PauseMenu({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      onResume: () => {
        this.isPaused = false;
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
        // 使用 scene:pop 返回 HomeScene
        globalEvent.emit('scene:pop');
      }
    });
    
    globalEvent.emit('dialog:show', pauseMenu);
  }

  /**
   * 退出按钮点击处理
   */
  _onQuitClick() {
    const ConfirmDialog = require('../ui/dialogs/ConfirmDialog').default;
    
    const dialog = new ConfirmDialog({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      title: '确认退出',
      message: '确定要退出当前关卡吗？进度将不会保存。',
      confirmText: '退出',
      cancelText: '继续游戏',
      onConfirm: () => {
        // 使用 scene:pop 返回 HomeScene
        globalEvent.emit('scene:pop');
      }
    });
    
    globalEvent.emit('dialog:show', dialog);
  }
  
  /**
   * 通关按钮点击 - 走正常结算逻辑
   */
  _onWinClick() {
    // 标记为已完成，走正常结算流程
    this._completed = true;
    this._showSettlement();
  }
  
  /**
   * 显示通关弹窗
   */
  _showLevelCompleteDialog() {
    console.log('[GameplayScene] 显示通关弹窗');
    
    const dialog = new LevelCompleteDialog({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      levelId: this.levelId,
      stage: this.stage,
      stars: 3,
      onConfirm: (result) => {
        this._handleLevelComplete(result);
      }
    });
    
    // 直接显示弹窗
    globalEvent.emit('dialog:show', dialog);
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
    
    // 6. 使用 scene:pop 返回 HomeScene，并传递通关数据
    globalEvent.emit('scene:pop', {
      justCompletedLevel: this.levelId,
      completedStage: this.stage,
      completedStars: result.stars
    });
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
    
    // 更新新手引导动画
    this._updateTutorial(deltaTime);
    
    // 更新按钮
    if (this.backBtn) this.backBtn.update(deltaTime);
    if (this.winBtn) this.winBtn.update(deltaTime);
    if (this.exitZoomBtn) this.exitZoomBtn.update(deltaTime);
    
    // 更新工具槽（滑动惯性）
    if (this.toolSlot) this.toolSlot.update(deltaTime);
    
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
    
    // 更新亮晶晶特效
    this.shineEffects.forEach((effect, i) => {
      effect.life -= deltaTime * 0.001;
      effect.particles.forEach(p => {
        p.phase += deltaTime * 0.005;
        p.y -= deltaTime * 0.02; // 轻微上浮
      });
      if (effect.life <= 0) this.shineEffects.splice(i, 1);
    });
    
    // 震动效果衰减
    if (this.toolShake > 0) {
      this.toolShake -= deltaTime * 0.002;
      if (this.toolShake < 0) this.toolShake = 0;
    }
    
    // 更新 broom 翻滚动画（500ms 一个周期，持续左右镜像翻滚）
    if (this.isDraggingTool && this.activeTool && this.activeTool.id === 'broom') {
      this.broomFlipTimer += deltaTime;
      // 500ms 一个完整周期
      const cycle = 500;
      this.broomFlipDirection = Math.sin((this.broomFlipTimer / cycle) * Math.PI * 2) > 0 ? 1 : -1;
    } else {
      // 不拖动时重置翻滚状态
      this.broomFlipTimer = 0;
      this.broomFlipDirection = 1;
    }
    
    // 更新活动工具摇晃动画（不倒翁效果）
    if (this.toolShakeAnim.active) {
      // 模拟不倒翁物理：弹簧阻尼系统
      const springStrength = 0.15;  // 弹簧强度
      const damping = 0.92;         // 阻尼系数
      
      // 恢复力（向中心拉）
      const restoreForce = -springStrength * this.toolShakeAnim.angle;
      this.toolShakeAnim.velocity += restoreForce;
      this.toolShakeAnim.velocity *= damping;
      this.toolShakeAnim.angle += this.toolShakeAnim.velocity * deltaTime * 0.05;
      
      // 当角度和速度都很小时停止动画
      if (Math.abs(this.toolShakeAnim.angle) < 0.01 && Math.abs(this.toolShakeAnim.velocity) < 0.001) {
        this.toolShakeAnim.active = false;
        this.toolShakeAnim.angle = 0;
        this.toolShakeAnim.velocity = 0;
      }
    }
    
    // 更新工具弹出动画
    if (this.toolAnim.active) {
      this.toolAnim.progress += deltaTime * 0.003; // 动画速度
      if (this.toolAnim.progress >= 1) {
        this.toolAnim.progress = 1;
        this.toolAnim.active = false;
      }
      
      const t = this.toolAnim.progress;
      const easeT = this._easeOutElastic(t);
      
      // 计算当前位置和大小
      this.toolPosition.x = this.toolAnim.startX + (this.toolAnim.targetX - this.toolAnim.startX) * t;
      this.toolPosition.y = this.toolAnim.startY + (this.toolAnim.targetY - this.toolAnim.startY) * easeT;
      this.toolAnim.scale = 0.3 + 0.7 * easeT; // 从0.3缩放到1
      this.toolAnim.alpha = Math.min(1, t * 2); // 快速淡入
    }
    
    // 检查是否全部完成
    if (this.dirtObjects && this.dirtObjects.length > 0 && 
        this.dirtObjects.every(d => d.state === 'clean') && 
        !this._completed) {
      this._completed = true;
      setTimeout(() => this._showSettlement(), 500);
    }
    
    // 更新工具解锁弹窗
    this._updateToolUnlockDialog(deltaTime);
    
    // 更新结算弹窗
    this._updateSettlementDialog(deltaTime);
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
    
    // 绘制亮晶晶特效（清洁完成后的闪烁效果）
    this._renderShineEffects(ctx);
    
    // 渲染新手引导
    this._renderTutorial(ctx, s);
    
    // 渲染工具解锁弹窗
    this._renderToolUnlockDialog(ctx);
    
    // 渲染结算弹窗（在最上层）
    this._renderSettlementDialog(ctx);
    
    // 在最顶层渲染生气 emoji
    if (this.tutorial.isActive) {
      this._renderAngryEmoji(ctx, s);
    }
  }

  /**
   * 渲染房间视图
   * 布局：顶部 8% 浅棕黄色，中间 80% 游戏区域，底部 12% 浅棕黄色（工具槽）
   */
  _renderRoomView(ctx, s) {
    // 区域划分（总和 100%）
    const topAreaHeight = this.screenHeight * 0.08;    // 顶部 8%
    const gameAreaHeight = this.screenHeight * 0.80;   // 中间 80%（游戏区域）
    const bottomAreaHeight = this.screenHeight * 0.12; // 底部 12%（原来是10%，现在填满剩余空间）
    
    const gameAreaY = topAreaHeight;  // 游戏区域起始 Y
    const bottomAreaY = gameAreaY + gameAreaHeight; // 底部区域起始 Y
    
    // 浅棕黄色（与 TopBar 背景色一致）
    const lightBrown = '#f3c06a';
    
    // 先填充整个屏幕背景（确保没有空白）
    ctx.fillStyle = lightBrown;
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    
    // 1. 顶部区域已经是浅棕黄色（上面已填充）
    
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
    
    // 3.1 绘制污垢圆圈（y 坐标相对于游戏区域）
    this._renderDirts(ctx, gameAreaY, s);
    
    // 3.5 渲染被动引导：目标污垢提示（在污垢之上）
    if (this.tutorial.isActive) {
      this._renderTutorialRubbishBinDirtHint(ctx, s);
      this._renderTutorialDcBasketDirtHint(ctx, s);
      this._renderTutorialClothDirtHint(ctx, s);
    }

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
    if (this.guideBtn) this.guideBtn.onRender(ctx);

    // 6. 绘制 ToolSlot 组件（在底部区域）
    if (this.toolSlot) {
      this.toolSlot.render(ctx);
    }
    
    // 6.5 渲染被动引导：工具槽金色边框高亮
    if (this.tutorial.isActive) {
      this._renderTutorialRubbishBinGlow(ctx, s);
      this._renderTutorialDcBasketGlow(ctx, s);
      this._renderTutorialClothGlow(ctx, s);
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
   * 绘制污垢（优先使用图片，否则使用圆圈）
   */
  _renderDirts(ctx, gameAreaY, s) {
    const now = Date.now();
    
    this.dirtObjects.forEach(dirt => {
      if (dirt.state === 'clean') return;
      
      const cx = dirt.x;
      const cy = dirt.y + gameAreaY;
      
      // 计算高亮缩放（cloth 工具拖动时）
      const highlightScale = dirt.highlightScale || 1;
      const radius = (dirt.width / 2) * highlightScale;
      
      // 注：wipe/sweep 时的高亮圆形背景已去掉
      
      // 计算闪烁效果（选中状态）
      let pulseAlpha = 1;
      if (dirt.selected) {
        const pulse = Math.sin(now / 100) * 0.3 + 0.7;
        pulseAlpha = pulse;
      }
      
      // 如果从缓存能获取到图片，使用图片渲染
      const dirtImg = GlobalDirtImageCache.get(dirt.type);
      if (dirtImg) {
        this._renderDirtWithImage(ctx, dirt, cx, cy, radius, pulseAlpha, s, dirtImg);
      } else {
        // 否则使用默认圆圈渲染
        this._renderDirtWithCircle(ctx, dirt, cx, cy, radius, pulseAlpha, s);
      }
    });
    
    // 绘制活动工具（如果在页面上，包括拖动状态）
    if (this.activeTool) {
      this._renderActiveTool(ctx, s);
    }
  }

  /**
   * 使用图片渲染污垢
   */
  _renderDirtWithImage(ctx, dirt, cx, cy, radius, pulseAlpha, s, img) {
      // 获取污垢类型的缩放配置
      const dirtType = DIRT_TYPES[dirt.type];
      const scale = dirtType?.scale || 1; // 默认1倍
      
      // 使用图片渲染
      ctx.save();
      ctx.globalAlpha = pulseAlpha;
      
      // 计算图片绘制尺寸（保持原始比例，类似 CSS object-fit: contain）
      // 应用 scale 配置，默认基础放大1.5倍
      const maxSize = radius * 2 * 1.5 * scale;
      const imgRatio = img.width / img.height;
      
      let drawWidth, drawHeight;
      if (imgRatio > 1) {
        // 宽图：以宽度为基准
        drawWidth = maxSize;
        drawHeight = maxSize / imgRatio;
      } else {
        // 高图或正方形：以高度为基准
        drawHeight = maxSize;
        drawWidth = maxSize * imgRatio;
      }
      
      const x = cx - drawWidth / 2;
      const y = cy - drawHeight / 2;
      
      // 根据划动清洁进度裁切显示图片（从下往上消失）
      // 3次滑动分别裁切: 1/4, 1/4, 2/4
      const strokeCount = dirt.strokeCount || 0;
      let remainingRatio = 1;
      if (strokeCount >= 3) {
        remainingRatio = 0;
      } else if (strokeCount === 2) {
        remainingRatio = 2 / 4; // 剩一半
      } else if (strokeCount === 1) {
        remainingRatio = 3 / 4; // 剩3/4
      } else {
        remainingRatio = 1; // 完整显示
      }
      
      if (remainingRatio > 0) {
        // 计算裁切区域（从下往上消失）
        const clipHeight = drawHeight * remainingRatio;
        const clipY = y + (drawHeight - clipHeight); // 从下往上裁切
        
        // 设置裁切区域
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, clipY, drawWidth, clipHeight);
        ctx.clip();
        
        // 绘制图片（只显示裁切部分）
        // 计算图片源区域（对应裁切部分）
        const srcY = img.height * (1 - remainingRatio);
        const srcHeight = img.height * remainingRatio;
        
        ctx.drawImage(
          img,
          0, srcY, img.width, srcHeight,  // 源区域（从下往上取）
          x, clipY, drawWidth, clipHeight  // 目标区域
        );
        
        ctx.restore();
      }
      
      ctx.restore();
      
      // 渲染划动清洁进度条（三格蓝色能量条）
      // 当前正在对该污垢进行划动清洁时显示
      if (this.strokeState && this.strokeState.active && 
          this.strokeState.dirt === dirt && dirt.strokeCount < dirt.maxStrokes) {
        this._renderStrokeProgress(ctx, cx, cy, radius, dirt.strokeCount || 0, dirt.maxStrokes || 3, s);
      }
  }

  /**
   * 辅助方法：绘制圆角矩形（兼容小游戏Canvas API）
   */
  _drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * 渲染划动清洁进度条（三格蓝色能量条）
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {number} cx - 中心X坐标
   * @param {number} cy - 中心Y坐标
   * @param {number} radius - 污垢半径
   * @param {number} strokeCount - 当前划动次数
   * @param {number} maxStrokes - 最大划动次数
   * @param {number} s - 屏幕缩放比例
   */
  _renderStrokeProgress(ctx, cx, cy, radius, strokeCount, maxStrokes, s) {
    const barWidth = radius * 2.4;      // 进度条总宽度（更大）
    const barHeight = 16 * s;           // 进度条高度（更大）
    const gap = 8 * s;                  // 格子之间的间隙（更大）
    const cellWidth = (barWidth - gap * (maxStrokes - 1)) / maxStrokes;  // 每个格子的宽度
    const startX = cx - barWidth / 2;   // 起始X坐标
    const startY = cy - radius - 40 * s; // 在污垢上方显示，距离更大
    const cornerRadius = 5 * s;         // 圆角半径（更大）
    
    ctx.save();
    
    // 绘制背景（未填充的格子）
    for (let i = 0; i < maxStrokes; i++) {
      const x = startX + i * (cellWidth + gap);
      
      // 背景边框
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this._drawRoundRect(ctx, x, startY, cellWidth, barHeight, cornerRadius);
      ctx.fill();
    }
    
    // 绘制已填充的蓝色格子
    for (let i = 0; i < strokeCount; i++) {
      const x = startX + i * (cellWidth + gap);
      
      // 蓝色填充，带发光效果
      ctx.fillStyle = '#4A90D9';
      ctx.shadowColor = 'rgba(74, 144, 217, 0.8)';
      ctx.shadowBlur = 8 * s;
      
      this._drawRoundRect(ctx, x, startY, cellWidth, barHeight, cornerRadius);
      ctx.fill();
      
      // 重置阴影
      ctx.shadowBlur = 0;
    }
    
    // 显示数字进度（如 "1/3"）
    ctx.fillStyle = '#4A90D9';
    ctx.font = `bold ${12 * s}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${strokeCount}/${maxStrokes}`, cx, startY + barHeight + 12 * s);
    
    ctx.restore();
  }

  /**
   * 从云存储缓存加载污垢图片
   */
  _loadDirtImageFromCache(type) {
    if (typeof wx === 'undefined') return null;
    
    try {
      const cacheRecord = wx.getStorageSync('cloud_image_cache') || {};
      const cacheKey = `dirt_${type}`;
      const cacheInfo = cacheRecord[cacheKey];
      
      if (cacheInfo && cacheInfo.fileID) {
        // 异步加载图片并缓存
        this.cloudStorage.getTempFileURL(cacheInfo.fileID).then(tempURL => {
          if (tempURL) {
            const img = wx.createImage();
            img.onload = () => {
              GlobalDirtImageCache.set(type, img);
              console.log(`[GameplayScene] 污垢图片加载完成: ${type}`);
            };
            img.src = tempURL;
          }
        });
      }
    } catch (e) {
      console.warn(`[GameplayScene] 加载污垢图片失败: ${type}`, e.message);
    }
    
    return null;
  }

  /**
   * 使用圆圈渲染污垢（默认样式）
   * 支持擦拭进度显示
   */
  _renderDirtWithCircle(ctx, dirt, cx, cy, radius, pulseAlpha, s) {
    // 获取污垢类型的缩放配置
    const dirtType = DIRT_TYPES[dirt.type];
    const scale = dirtType?.scale || 1; // 默认1倍
    
    // 应用 scale 配置
    const scaledRadius = radius * scale;
    
    // 根据划动清洁进度计算显示比例（从下往上消失）
    // 3次滑动分别裁切: 1/4, 1/4, 2/4
    const strokeCount = dirt.strokeCount || 0;
    let remainingRatio = 1;
    if (strokeCount >= 3) {
      remainingRatio = 0;
    } else if (strokeCount === 2) {
      remainingRatio = 2 / 4;
    } else if (strokeCount === 1) {
      remainingRatio = 3 / 4;
    } else {
      remainingRatio = 1;
    }
    
    if (remainingRatio <= 0) return; // 完全擦除后不显示
    
    // 裁切区域（从下往上）
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - scaledRadius, cy + scaledRadius - (scaledRadius * 2 * remainingRatio), scaledRadius * 2, scaledRadius * 2 * remainingRatio);
    ctx.clip();
    
    // 绘制金黄色圆圈外圈
    ctx.beginPath();
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${0.3 * pulseAlpha})`;
    ctx.fill();
    
    // 绘制金黄色边框
    ctx.beginPath();
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 193, 7, ${pulseAlpha})`;
    ctx.lineWidth = 3 * s;
    ctx.stroke();
    
    // 绘制内部小圆点
    ctx.beginPath();
    ctx.arc(cx, cy, scaledRadius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 160, 0, ${0.6 * pulseAlpha})`;
    ctx.fill();
    
    ctx.restore();
    
    // 渲染划动清洁进度条（三格蓝色能量条）
    if (dirt.strokeCount !== undefined && dirt.strokeCount < dirt.maxStrokes) {
      this._renderStrokeProgress(ctx, cx, cy, radius, dirt.strokeCount, dirt.maxStrokes, s);
    }
  }

  /**
   * 绘制活动工具（带淡发光效果，无背景圆圈）
   * 优先使用真实图片，如果没有则使用 emoji
   */
  _renderActiveTool(ctx, s) {
    const tool = this.activeTool;
    const x = this.toolPosition.x;
    const y = this.toolPosition.y;
    
    // 获取工具槽大小
    const slotSize = this.toolSlot ? this.toolSlot.slotSize : 80;
    
    // 拖动时是工具槽的1.2倍，静止时是工具槽的1.5倍
    const dragScale = this.isDraggingTool ? 1.2 : 1.5;
    const animScale = (this.toolAnim.active || this.toolAnim.scale === undefined) ? (this.toolAnim.scale || 1) : 1;
    const size = slotSize * dragScale * animScale;
    const alpha = this.toolAnim.alpha !== undefined ? this.toolAnim.alpha : 1;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // 应用摇晃动画（不倒翁效果）
    if (this.toolShakeAnim.active && this.activeTool && this.activeTool.id === this.toolShakeAnim.targetToolId) {
      // 以工具底部中心为旋转中心（像不倒翁一样）
      // 拖动时工具底部在指尖位置(y)，静止时工具底部在 y + size/2
      const pivotY = this.isDraggingTool ? y : y + size / 2;
      ctx.translate(x, pivotY);
      ctx.rotate(this.toolShakeAnim.angle);
      ctx.translate(-x, -pivotY);
    }
    
    // 拖动时光效消失，静止时显示光效
    if (!this.isDraggingTool) {
      // 绘制淡发光效果（纯白色柔和光晕，更淡）
      const glowRadius = size * 1.6;
      const glowGradient = ctx.createRadialGradient(x, y, size * 0.3, x, y, glowRadius);
      glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');   // 中心稍亮
      glowGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)'); // 中间更淡
      glowGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');// 外围很淡
      glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');     // 完全透明
      
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();
      
      // 添加第二层柔和白光（更淡）
      const softGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 1.8);
      softGlow.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      softGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
      softGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = softGlow;
      ctx.fill();
    }
    
    // 优先使用缓存的工具图片
    const toolImage = GlobalToolImageCache.get(tool.id);
    if (toolImage) {
      // 计算图片绘制尺寸（保持比例）
      const padding = size * 0.1;
      const availableSize = size - padding * 2;
      const scale = Math.min(
        availableSize / toolImage.width,
        availableSize / toolImage.height
      );
      const drawWidth = toolImage.width * scale;
      const drawHeight = toolImage.height * scale;
      const drawX = x - drawWidth / 2;
      // 拖动时工具底部对齐指尖，静止时居中
      const drawY = this.isDraggingTool ? y - drawHeight : y - drawHeight / 2;
      
      // broom 工具拖动时添加翻滚效果（左右镜像）
      if (tool.id === 'broom' && this.isDraggingTool) {
        ctx.save();
        // 根据翻滚方向进行水平翻转
        if (this.broomFlipDirection < 0) {
          ctx.translate(x * 2, 0);
          ctx.scale(-1, 1);
        }
        // 绘制主图
        ctx.drawImage(toolImage, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
      } else {
        // 绘制主图
        ctx.drawImage(toolImage, drawX, drawY, drawWidth, drawHeight);
      }
    } else {
      // 没有图片时使用 emoji 图标
      // 绘制工具图标阴影（增加立体感）
      ctx.font = `bold ${Math.floor(size)}px sans-serif`;
      ctx.textAlign = 'center';
      // 拖动时底部对齐指尖，静止时居中
      const textY = this.isDraggingTool ? y - size / 2 : y;
      ctx.textBaseline = 'middle';
      
      // 阴影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillText(tool.icon, x + 2, textY + 2);
      
      // 主图标
      ctx.fillStyle = tool.color;
      ctx.fillText(tool.icon, x, textY);
      
      // 高光
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(tool.icon, x - 1, textY - 1);
    }
    
    ctx.restore();
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
   * 添加亮晶晶特效（清洁完成后）
   * @param {number} x - 中心X坐标
   * @param {number} y - 中心Y坐标
   * @param {number} s - 屏幕缩放比例
   */
  _addShineEffect(x, y, s) {
    const particles = [];
    const particleCount = 8 + Math.floor(Math.random() * 4); // 8-12个闪光点
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const distance = (30 + Math.random() * 40) * s; // 分布范围更大
      particles.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        size: (6 + Math.random() * 6) * s, // 星星大小加倍
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5
      });
    }
    
    this.shineEffects.push({
      x,
      y,
      particles,
      life: 1.0, // 持续约1秒
      maxLife: 1.0
    });
  }

  /**
   * 渲染亮晶晶特效
   */
  _renderShineEffects(ctx) {
    for (const effect of this.shineEffects) {
      const alpha = effect.life / effect.maxLife;
      
      for (const p of effect.particles) {
        // 闪烁效果
        const twinkle = 0.5 + 0.5 * Math.sin(p.phase);
        const currentAlpha = alpha * twinkle;
        
        // 绘制四角星形状
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.phase * 0.5);
        
        // 外发光
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = p.size * 2;
        
        // 绘制星星
        ctx.fillStyle = `rgba(255, 255, 220, ${currentAlpha})`;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI * 2 * i) / 4;
          const r1 = p.size; // 长半径
          const r2 = p.size * 0.3; // 短半径
          if (i === 0) {
            ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
          } else {
            ctx.lineTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
          }
          ctx.lineTo(Math.cos(angle + Math.PI / 4) * r2, Math.sin(angle + Math.PI / 4) * r2);
        }
        ctx.closePath();
        ctx.fill();
        
        // 中心亮点
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
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
    // 优先检查工具解锁弹窗（最上层，游戏开始时显示）
    if (this.toolUnlockDialog && this.toolUnlockDialog.visible) {
      if (this.toolUnlockDialog.onTouchStart && this.toolUnlockDialog.onTouchStart(x, y)) {
        return true;
      }
      // 弹窗显示时阻挡下方所有触摸
      return true;
    }
    
    // 检查结算弹窗（游戏结束时显示）
    if (this.settlementDialog && this.settlementDialog.visible) {
      if (this.settlementDialog.onTouchStart && this.settlementDialog.onTouchStart(x, y)) {
        return true;
      }
      // 弹窗显示时阻挡下方所有触摸
      return true;
    }
    
    this._touchStartTime = Date.now();
    this._touchStartPos = { x, y };
    
    const s = this.screenWidth / 750;
    const gameAreaY = this.screenHeight * 0.08;
    
    // 房间视图模式
    // 先检查 TopBar（暂停按钮）
    if (this.topBar && this.topBar.onTouchStart(x, y)) {
      return true;
    }
    
    if (this.backBtn && this.backBtn.onTouchStart(x, y)) return true;
    if (this.winBtn && this.winBtn.onTouchStart(x, y)) return true;
    if (this.guideBtn && this.guideBtn.onTouchStart(x, y)) return true;
    
    // 检查是否正在拖动活动工具
    if (this.activeTool && !this.isDraggingTool) {
      const dx = x - this.toolPosition.x;
      const dy = y - this.toolPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // 工具大小为 120 * s，检测范围稍微大一点
      if (distance < 80 * s) {
        // 验证工具使用条件
        if (!this._validateToolUsage(this.activeTool)) {
          // 验证失败，显示错误提示但不开始拖动
          this._showToolError();
          return true; // 拦截事件，防止后续处理
        }
        // 开始拖动工具（cloth 和 broom 也可以拖动）
        this.isDraggingTool = true;
        this.dragStartPos = { x, y };
        return true;
      }
    }
    
    // 检查 ToolSlot 区域（底部 12%）
    if (this.toolSlot) {
      const result = this.toolSlot.onTouchStart(x, y);
      if (result) {
        return true;
      }
    }

    // 检查污垢圆圈点击
    const clickedDirt = this._findDirtAt(x, y);
    if (clickedDirt) {
      // 选中/取消选中圆圈（传入坐标用于 Z 字绘制模式）
      this._selectDirt(clickedDirt, x, y);
      return true;
    }

    return false;
  }

  onTouchMove(x, y) {
    // 工具解锁弹窗显示时阻止下方触摸
    if (this.toolUnlockDialog && this.toolUnlockDialog.visible) {
      return false;
    }
    
    // 结算弹窗显示时阻止下方触摸
    if (this.settlementDialog && this.settlementDialog.visible) {
      return false;
    }
    
    // 处理工具槽滑动（如果不在拖动工具模式下）
    if (!this.isDraggingTool && this.toolSlot) {
      if (this.toolSlot.onTouchMove(x, y)) {
        return true;
      }
    }
    
    // 【新功能】手指直接滑动到 wipe/sweep 污垢上触发清洁
    // 不需要点击，直接滑动即可开始划动清洁
    if (!this.isDraggingTool && this.activeTool && 
        (this.activeTool.id === 'cloth' || this.activeTool.id === 'broom')) {
      const nearbyDirt = this._findNearbyDirt(x, y);
      if (nearbyDirt && nearbyDirt.state !== 'clean') {
        const dirtType = DIRT_TYPES[nearbyDirt.type];
        // 检查工具是否匹配污垢类型
        const isMatch = (this.activeTool.id === 'cloth' && dirtType.operate_type === 'wipe') ||
                       (this.activeTool.id === 'broom' && dirtType.operate_type === 'sweep');
        
        if (isMatch && !this.strokeState.active) {
          // 自动开始划动清洁模式（工具跳到手指上）
          this.isDraggingTool = true;  // 重要：让工具跟随手指
          // 开始划动（不立即更新，等下一次 touchmove 再计算距离）
          this._startStrokeClean(nearbyDirt, x, y);
          return true;
        }
      }
    }
    
    // 处理工具拖动
    if (this.isDraggingTool && this.activeTool) {
      // 限制工具不能拖动到工具槽下方
      const toolSlotTopY = this.screenHeight * 0.88; // 工具槽顶部Y坐标
      const clampedY = Math.min(y, toolSlotTopY); // 限制y不超过工具槽顶部
      
      // 更新工具位置（跟随手指，但有边界限制）
      this.toolPosition = { x, y: clampedY };
      
      // cloth / broom 工具：进入划动清洁模式
      if (this.activeTool.id === 'cloth' || this.activeTool.id === 'broom') {
        // 如果还没有开始清洁，先检查是否在匹配的污垢上
        if (!this.strokeState.active) {
          const nearbyDirt = this._findNearbyDirt(x, y);
          if (nearbyDirt && nearbyDirt.state !== 'clean') {
            const dirtType = DIRT_TYPES[nearbyDirt.type];
            const isMatch = (this.activeTool.id === 'cloth' && dirtType.operate_type === 'wipe') ||
                           (this.activeTool.id === 'broom' && dirtType.operate_type === 'sweep');
            if (isMatch) {
              // 开始划动清洁（不立即更新，等下一次 touchmove）
              this._startStrokeClean(nearbyDirt, x, clampedY);
            }
          }
        } else {
          // 已经在清洁中，继续更新划动进度
          this._updateStrokeClean(x, clampedY);
        }
      } else {
        // 其他工具原有逻辑
        const nearbyDirt = this._findNearbyDirt(x, y);
        if (nearbyDirt) {
          if (!this.selectedDirt || this.selectedDirt !== nearbyDirt) {
            this.selectedDirt = nearbyDirt;
            this.wipeStartAngle = null;
            this.totalWipeAngle = 0;
            this.clockwiseWipes = 0;
          }
          this._updateToolDrag(x, y);
        } else {
          this.selectedDirt = null;
        }
      }
      return true;
    }
    
    return false;
  }

  onTouchEnd(x, y) {
    // 优先检查工具解锁弹窗（最上层，游戏开始时显示）
    if (this.toolUnlockDialog && this.toolUnlockDialog.visible) {
      if (this.toolUnlockDialog.onTouchEnd && this.toolUnlockDialog.onTouchEnd(x, y)) {
        return true;
      }
      return true;
    }
    
    // 检查结算弹窗（游戏结束时显示）
    if (this.settlementDialog && this.settlementDialog.visible) {
      if (this.settlementDialog.onTouchEnd && this.settlementDialog.onTouchEnd(x, y)) {
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
    if (this.winBtn && this.winBtn.onTouchEnd(x, y)) return true;
    if (this.guideBtn && this.guideBtn.onTouchEnd(x, y)) return true;
    
    // 处理 ToolSlot 的触摸结束（用于选中工具）
    if (this.toolSlot && this.toolSlot.onTouchEnd(x, y)) {
      // 工具选择后直接弹出活动工具（由 _selectTool 内部处理）
      return true;
    }
    
    // 结束工具拖动
    if (this.isDraggingTool) {
      this.isDraggingTool = false;
      this.clothInDirt = false; // 重置 cloth 进入污垢状态
      this.broomInDirt = false; // 重置 broom 进入污垢状态
      this.strokeState.active = false; // 重置 Z 字绘制状态
      
      // 重置所有污垢的高亮状态
      this.dirtObjects.forEach(dirt => {
        dirt.isHighlighted = false;
        dirt.highlightScale = 1;
      });
      
      // 如果没有完成清洁，工具回到弹出位置
      if (this.activeTool) {
        this._spawnTool();
      }
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
      if (dirt.state === 'clean') continue;
      
      // 圆圈碰撞检测
      const dx = x - dirt.x;
      const dy = gameY - dirt.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= dirt.size / 2 + 10) { // +10px 容差
        return dirt;
      }
    }
    return null;
  }
  
  /**
   * 查找靠近的污垢圆圈（用于拖动工具时检测）
   * 检测范围比点击范围更大
   */
  _findNearbyDirt(x, y) {
    const gameAreaY = this.screenHeight * 0.08;
    const gameY = y - gameAreaY;
    
    for (let i = this.dirtObjects.length - 1; i >= 0; i--) {
      const dirt = this.dirtObjects[i];
      if (dirt.state === 'clean') continue;
      
      const dx = x - dirt.x;
      const dy = gameY - dirt.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 检测范围更大（圆圈半径 + 50px），方便拖动时涂抹
      if (distance <= dirt.size / 2 + 50) {
        return dirt;
      }
    }
    return null;
  }
  
  /**
   * cloth 工具拖动时的特殊处理
   * 检测附近的 wipe 类型污垢，添加放大高光效果，并处理擦拭进度
   */
  _updateClothDrag(x, y) {
    const gameAreaY = this.screenHeight * 0.08;
    const gameY = y - gameAreaY;
    
    // 先重置所有污垢的高亮状态（但保留擦拭进度）
    this.dirtObjects.forEach(dirt => {
      if (dirt.state !== 'clean') {
        dirt.isHighlighted = false;
        dirt.highlightScale = 1;
      }
    });
    
    // 查找附近的 wipe 类型污垢（40px 范围，擦拭范围比高亮范围大）
    let nearbyDirt = null;
    for (let i = this.dirtObjects.length - 1; i >= 0; i--) {
      const dirt = this.dirtObjects[i];
      if (dirt.state === 'clean') continue;
      
      // 检查是否是 wipe 类型
      const dirtType = DIRT_TYPES[dirt.type];
      if (!dirtType || dirtType.operate_type !== 'wipe') continue;
      
      const dx = x - dirt.x;
      const dy = gameY - dirt.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 40px 范围内可擦拭
      if (distance <= dirt.size / 2 + 40) {
        nearbyDirt = dirt;
        break;
      }
    }
    
    if (nearbyDirt) {
      // 高亮效果（20px 范围内显示白光，40px 范围内可擦拭）
      const dx = x - nearbyDirt.x;
      const dy = gameY - nearbyDirt.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= nearbyDirt.size / 2 + 20) {
        nearbyDirt.isHighlighted = true;
        nearbyDirt.highlightScale = 1; // 不再放大，只显示白光
      }
      
      // 被动引导：用户开始正确擦拭时，立即隐藏 Z 字形提示
      if (this.tutorial.isActive) {
        this.tutorial.showClothDirtHint = false;
      }
      
      // 处理擦拭进度
      this._updateWipeProgress(nearbyDirt);
      this.selectedDirt = nearbyDirt;
    } else {
      // 离开所有污垢，重置擦拭状态
      this.clothInDirt = false;
      this.selectedDirt = null;
    }
  }

  /**
   * 更新擦拭进度
   * 工具经过污垢5次后完成清洁，每次经过裁切1/5
   */
  _updateWipeProgress(dirt) {
    // 初始化擦拭进度
    if (dirt.wipeProgress === undefined) {
      dirt.wipeProgress = 0; // 0-5，5次完成
      dirt.wipeCount = 0;    // 经过次数
    }
    
    // 检测工具是否刚进入或离开污垢区域
    if (!this.clothInDirt) {
      // 工具刚进入污垢区域
      this.clothInDirt = true;
      dirt.wipeCount++;
      dirt.wipeProgress = Math.min(dirt.wipeCount / 5, 1); // 5次完成
      
      console.log(`[GameplayScene] 擦拭进度: ${dirt.wipeCount}/5, ${dirt.name}`);
      
      // 轻微震动反馈（仅在 iOS/Android 平台）
      haptic.light();
      
      // 播放擦拭音效（如果有）
      // this._playWipeSound();
      
      // 5次后完成清洁
      if (dirt.wipeCount >= 5) {
        this._completeWipeClean(dirt);
      }
    }
  }

  /**
   * 完成擦拭清洁
   */
  _completeWipeClean(dirt) {
    dirt.state = 'clean';
    dirt.isHighlighted = false;
    
    // 添加亮晶晶特效
    const s = this.screenWidth / 750;
    const gameAreaY = this.screenHeight * 0.08;
    this._addShineEffect(dirt.x, dirt.y + gameAreaY, s);
    
    // 增加清洁度
    this.cleanProgress = Math.min(this.cleanProgress + 10, 100);
    
    // 更新顶部进度条
    if (this.topBar) {
      this.topBar.updateData({ progress: this.cleanProgress });
    }
    
    console.log(`[GameplayScene] ${dirt.name} 擦拭完成，清洁度 +10`);
    
    // 清理 Z 字绘制状态并弹回工具
    this.isDraggingTool = false;
    this.selectedDirt = null;
    this.strokeState.active = false;
    if (this.activeTool) {
      this._spawnTool();
    }
    
    // 被动引导：标记 cloth 已正确使用
    if (this.tutorial.isActive) {
      this.tutorial.clothUsed = true;
      this.tutorial.showClothDirtHint = false;
      this._checkTutorialComplete();
    }
    
    // 检查是否全部完成
    this._checkAllCleaned();
  }

  /**
   * broom 工具拖动时的特殊处理
   * 检测附近的 sweep 类型污垢，处理清扫进度
   */
  _updateBroomDrag(x, y) {
    const gameAreaY = this.screenHeight * 0.08;
    const gameY = y - gameAreaY;
    
    // 先重置所有污垢的高亮状态
    this.dirtObjects.forEach(dirt => {
      if (dirt.state !== 'clean') {
        dirt.isHighlighted = false;
        dirt.highlightScale = 1;
      }
    });
    
    // 查找附近的 sweep 类型污垢（40px 范围）
    let nearbyDirt = null;
    for (let i = this.dirtObjects.length - 1; i >= 0; i--) {
      const dirt = this.dirtObjects[i];
      if (dirt.state === 'clean') continue;
      
      // 检查是否是 sweep 类型
      const dirtType = DIRT_TYPES[dirt.type];
      if (!dirtType || dirtType.operate_type !== 'sweep') continue;
      
      const dx = x - dirt.x;
      const dy = gameY - dirt.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 40px 范围内可清扫
      if (distance <= dirt.size / 2 + 40) {
        nearbyDirt = dirt;
        break;
      }
    }
    
    if (nearbyDirt) {
      // 高亮效果（20px 范围内显示白光）
      const dx = x - nearbyDirt.x;
      const dy = gameY - nearbyDirt.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= nearbyDirt.size / 2 + 20) {
        nearbyDirt.isHighlighted = true;
        nearbyDirt.highlightScale = 1;
      }
      
      // 处理清扫进度
      this._updateSweepProgress(nearbyDirt);
      this.selectedDirt = nearbyDirt;
    } else {
      // 离开所有污垢，重置清扫状态
      this.broomInDirt = false;
      this.selectedDirt = null;
    }
  }

  /**
   * 更新清扫进度
   * 工具经过污垢5次后完成清洁，每次经过裁切1/5
   */
  _updateSweepProgress(dirt) {
    // 初始化清扫进度
    if (dirt.sweepProgress === undefined) {
      dirt.sweepProgress = 0; // 0-5，5次完成
      dirt.sweepCount = 0;    // 经过次数
    }
    
    // 检测工具是否刚进入或离开污垢区域
    if (!this.broomInDirt) {
      // 工具刚进入污垢区域
      this.broomInDirt = true;
      dirt.sweepCount++;
      dirt.sweepProgress = Math.min(dirt.sweepCount / 5, 1); // 5次完成
      
      console.log(`[GameplayScene] 清扫进度: ${dirt.sweepCount}/5, ${dirt.name}`);
      
      // 轻微震动反馈（仅在 iOS/Android 平台）
      haptic.light();
      
      // 5次后完成清洁
      if (dirt.sweepCount >= 5) {
        this._completeSweepClean(dirt);
      }
    }
  }

  /**
   * 完成清扫清洁
   */
  _completeSweepClean(dirt) {
    dirt.state = 'clean';
    dirt.isHighlighted = false;
    
    // 添加亮晶晶特效
    const s = this.screenWidth / 750;
    const gameAreaY = this.screenHeight * 0.08;
    this._addShineEffect(dirt.x, dirt.y + gameAreaY, s);
    
    // 增加清洁度
    this.cleanProgress = Math.min(this.cleanProgress + 10, 100);
    
    // 更新顶部进度条
    if (this.topBar) {
      this.topBar.updateData({ progress: this.cleanProgress });
    }
    
    console.log(`[GameplayScene] ${dirt.name} 清扫完成，清洁度 +10`);
    
    // 清理 Z 字绘制状态并弹回工具
    this.isDraggingTool = false;
    this.selectedDirt = null;
    this.strokeState.active = false;
    if (this.activeTool) {
      this._spawnTool();
    }
    
    // 检查是否全部完成
    this._checkAllCleaned();
  }

  /**
   * 检查是否全部清洁完成
   */
  _checkAllCleaned() {
    const allCleaned = this.dirtObjects.every(d => d.state === 'clean');
    if (allCleaned && !this._completed) {
      this._completed = true;
      setTimeout(() => this._showSettlement(), 500);
    }
  }

  /**
   * 选中/取消选中污垢圆圈（被动引导核心逻辑 + Z 字绘制入口）
   */
  _selectDirt(dirt, x, y) {
    // 获取污垢类型配置
    const dirtType = DIRT_TYPES[dirt.type];
    if (!dirtType) return;
    
    // ===== 被动新手引导处理 =====
    if (this.tutorial.isActive && dirt.state !== 'clean') {
      const recipes = dirtType.recipes || [];
      const allTools = recipes.flat();
      
      // 1. 点击了需要 rubbish_bin 的污垢
      if (allTools.includes('rubbish_bin')) {
        if (!this.activeTool) {
          // 熄灭其他金边，只保留当前提示
          this.tutorial.showingDcBasketGlow = false;
          this.tutorial.showingClothGlow = false;
          // 没有任何工具选中：rubbish_bin 槽位金色闪烁
          if (!this.tutorial.rubbishBinGlowShown) {
            this.tutorial.showingRubbishBinGlow = true;
            this.tutorial.rubbishBinGlowShown = true;
            console.log('[GameplayScene] 引导：提示选择 rubbish_bin');
          }
        } else if (this.activeTool.id !== 'rubbish_bin') {
          // 有非 rubbish_bin 的工具已弹出：生气 emoji
          this._showAngryEmoji();
        }
      }
      
      // 2. 点击了需要 dc_basket 的污垢
      if (allTools.includes('dc_basket')) {
        if (!this.activeTool) {
          // 熄灭其他金边，只保留当前提示
          this.tutorial.showingRubbishBinGlow = false;
          this.tutorial.showingClothGlow = false;
          // 没有任何工具选中：dc_basket 槽位金色闪烁
          if (!this.tutorial.dcBasketGlowShown) {
            this.tutorial.showingDcBasketGlow = true;
            this.tutorial.dcBasketGlowShown = true;
            console.log('[GameplayScene] 引导：提示选择 dc_basket');
          }
        } else if (this.activeTool.id !== 'dc_basket') {
          // 有非 dc_basket 的工具已弹出：生气 emoji
          this._showAngryEmoji();
        }
      }
      
      // 3. 点击了需要 cloth 的污垢
      if (allTools.includes('cloth')) {
        if (!this.activeTool) {
          // 熄灭其他金边，只保留当前提示
          this.tutorial.showingRubbishBinGlow = false;
          this.tutorial.showingDcBasketGlow = false;
          // 没有任何工具选中：cloth 槽位金色闪烁
          if (!this.tutorial.clothGlowShown) {
            this.tutorial.showingClothGlow = true;
            this.tutorial.clothGlowShown = true;
            console.log('[GameplayScene] 引导：提示选择 cloth');
          }
        } else if (this.activeTool.id !== 'cloth') {
          // 有非 cloth 的工具已弹出：生气 emoji
          this._showAngryEmoji();
        }
      }
    }
    
    // 判断是否是 throw 类型的污垢
    if (dirtType.operate_type === 'throw') {
      const recipes = dirtType.recipes || [];
      const allTools = recipes.flat();
      // 只有当前弹出的工具在污垢的 recipes 中，才触发 throw
      if (this.activeTool && allTools.includes(this.activeTool.id)) {
        this._throwDirtToBin(dirt);
      }
      // 工具不匹配，无反应（不选中）
      return;
    }
    
    // wipe 类型：点击后如果 cloth 已弹出，自动进入 Z 字绘制模式
    if (dirtType.operate_type === 'wipe') {
      if (this.activeTool && this.activeTool.id === 'cloth') {
        this._startStrokeClean(dirt, x, y);
      }
      return;
    }
    
    // sweep 类型：点击后如果 broom 已弹出，自动进入 Z 字绘制模式
    if (dirtType.operate_type === 'sweep') {
      if (this.activeTool && this.activeTool.id === 'broom') {
        this._startStrokeClean(dirt, x, y);
      }
      return;
    }
    
    // 其他类型：原有的选中逻辑
    // 取消之前的选中
    this.dirtObjects.forEach(d => {
      d.selected = false;
      d.cleaning = false;
    });
    
    // 取消当前活动工具
    this.activeTool = null;
    
    if (this.selectedDirt === dirt && dirt.selected) {
      // 再次点击已选中的，取消选中
      dirt.selected = false;
      this.selectedDirt = null;
    } else {
      // 选中新圆圈（只选中，不生成工具，工具在点击工具槽后才生成）
      dirt.selected = true;
      this.selectedDirt = dirt;
    }
  }

  /**
   * 验证工具使用条件
   * @param {Object} tool - 当前弹出的工具
   * @returns {boolean} - 是否允许使用
   */
  _validateToolUsage(tool) {
    // cloth 工具：无需预先选中，拖动时自动检测附近 wipe 类型污垢
    if (tool.id === 'cloth') {
      // 始终允许拖动，在拖动过程中检测附近污垢
      return true;
    }
    
    // 其他工具（如 rubbish_bin 等）无需特殊验证
    return true;
  }

  /**
   * 显示工具使用错误提示
   */
  _showToolError() {
    // 简单的震动效果表示错误
    this.toolShake = 1;
    setTimeout(() => { this.toolShake = 0; }, 300);
    
    // 可以在这里添加更多错误提示，比如文字提示或音效
    console.log('[GameplayScene] 工具使用错误提示');
  }
  
  /**
   * 开始划动清洁模式（用于 sweep 和 wipe）
   * 点击目标污垢后，工具自动跳到手指位置并进入拖动状态
   * 在污垢上随意划动 3 次即可完成清洁
   */
  _startStrokeClean(dirt, x, y) {
    this.isDraggingTool = true;
    this.toolPosition = { x, y };
    this.selectedDirt = dirt;
    
    const gameAreaY = this.screenHeight * 0.08;
    this.strokeState = {
      active: true,
      dirt: dirt,
      strokeCount: 0,
      maxStrokes: 3,
      lastPos: { x, y: y - gameAreaY },
      totalDistance: 0,
      minStrokeDistance: 60 * (this.screenWidth / 750)  // 增加距离阈值，需要划动更多距离才算一次
    };
    
    // 在污垢对象上记录当前划动次数，用于渲染进度条
    dirt.strokeCount = 0;
    dirt.maxStrokes = 3;
    
    // 高亮显示目标污垢
    dirt.isHighlighted = true;
    dirt.highlightScale = 1;
    
    console.log(`[GameplayScene] 开始划动清洁: ${dirt.name}, 需要划动 3 次`);
  }
  
  /**
   * 更新划动清洁进度
   * 检测手指在污垢上的划动，累计距离达到阈值算作一次有效划动
   * 必须保持在污垢范围内划动才有效
   */
  _updateStrokeClean(x, y) {
    if (!this.strokeState.active || !this.strokeState.dirt) return;
    
    const dirt = this.strokeState.dirt;
    const gameAreaY = this.screenHeight * 0.08;
    const relY = y - gameAreaY;
    const state = this.strokeState;
    
    const now = Date.now();
    
    // 防重复：200ms内不重复计数
    if (now - state.lastCountTime < 200) {
      state.lastPos = { x, y: relY };
      return;
    }
    
    // 检查手指是否还在污垢范围内（圆圈半径 + 30px 容差，稍微宽松）
    const dx = x - dirt.x;
    const dy = relY - dirt.y;
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
    const inRange = distanceFromCenter <= dirt.size / 2 + 30;
    
    if (!inRange) {
      // 手指离开污垢范围，重置本次划动进度
      if (state.totalDistance > 0) {
        state.totalDistance = 0;
        console.log('[GameplayScene] 手指离开污垢范围，重置划动进度');
      }
      state.lastPos = { x, y: relY };
      return;
    }
    
    // 计算与上一次位置的距离
    const moveDx = x - state.lastPos.x;
    const moveDy = relY - state.lastPos.y;
    const distance = Math.sqrt(moveDx * moveDx + moveDy * moveDy);
    
    // 累计划动距离
    state.totalDistance += distance;
    
    // 更新上一次位置
    state.lastPos = { x, y: relY };
    
    // 调试日志：每划动一定距离记录一次
    if (state.totalDistance > 0 && Math.floor(state.totalDistance) % 20 === 0) {
      console.log(`[GameplayScene] 划动中... 累计距离: ${Math.round(state.totalDistance)}/${Math.round(state.minStrokeDistance)}px`);
    }
    
    // 检查是否完成有效划动（使用while循环处理可能超过阈值多次的情况）
    while (state.totalDistance >= state.minStrokeDistance && state.strokeCount < state.maxStrokes) {
      state.totalDistance = 0;  // 重置距离计数
      state.lastCountTime = now; // 记录计数时间
      state.strokeCount++;
      dirt.strokeCount = state.strokeCount;
      
      console.log(`[GameplayScene] ✅ 划动计数: ${state.strokeCount}/${state.maxStrokes}`);
      
      // 触发震动反馈（每完成一次划动）
      if (typeof wx !== 'undefined' && wx.vibrateShort) {
        wx.vibrateShort({ type: 'light' });
      }
      
      // 检查是否完成所有划动
      if (state.strokeCount >= state.maxStrokes) {
        console.log('[GameplayScene] 划动完成，清洁完成');
        state.active = false;
        state.totalDistance = 0;
        
        // 根据工具类型完成清洁
        if (this.activeTool && this.activeTool.id === 'cloth') {
          this._completeWipeClean(dirt);
        } else if (this.activeTool && this.activeTool.id === 'broom') {
          this._completeSweepClean(dirt);
        }
        return;
      }
    }
  }

  /**
   * throw 类型污垢飞向垃圾桶的动画
   * @param {Object} dirt - 要处理的污垢
   */
  _throwDirtToBin(dirt) {
    if (dirt.isFlying) return; // 防止重复点击
    dirt.isFlying = true;
    
    // 被动引导：点击目标污垢后，立即隐藏白色光圈和手指提示
    if (this.tutorial.isActive) {
      this.tutorial.showRubbishBinDirtHint = false;
      this.tutorial.showDcBasketDirtHint = false;
    }
    
    const s = this.screenWidth / 750; // 屏幕缩放比例
    const baseSize = 60 * s; // 基础尺寸
    
    // 获取当前弹出工具的位置作为飞行终点
    const targetX = this.toolPosition.x;
    const targetY = this.toolPosition.y;
    
    // 起始位置（转换为屏幕绝对坐标）
    const gameAreaY = this.screenHeight * 0.08;
    const startX = dirt.x;
    const startY = dirt.y + gameAreaY;
    
    // 记录污垢原始位置，用于亮晶晶特效
    const originalX = dirt.x;
    const originalY = dirt.y;
    
    // 动画参数
    const duration = 500; // 动画时长 500ms
    const startTime = Date.now();
    
    // 贝塞尔曲线控制点（中间上方，形成抛物线）
    const controlX = (startX + targetX) / 2;
    const controlY = Math.min(startY, targetY) - 150 * s; // 控制点在上方，随屏幕缩放
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 二次贝塞尔曲线
      const t = progress;
      const invT = 1 - t;
      
      // 贝塞尔公式: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const currentX = invT * invT * startX + 2 * invT * t * controlX + t * t * targetX;
      const currentY = invT * invT * startY + 2 * invT * t * controlY + t * t * targetY;
      
      // 更新污垢位置（存相对坐标）
      dirt.x = currentX;
      dirt.y = currentY - gameAreaY;
      
      // 同时缩小污垢
      const currentSize = baseSize * (1 - progress * 0.5); // 缩小到 50%
      dirt.size = currentSize;
      dirt.width = currentSize;
      dirt.height = currentSize;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画完成，标记为已清理
        dirt.state = 'clean';
        dirt.isFlying = false;
        console.log(`[GameplayScene] ${dirt.name} 已扔进垃圾桶`);
        
        // 添加亮晶晶特效（在污垢原位置）
        const s = this.screenWidth / 750;
        this._addShineEffect(originalX, originalY + gameAreaY, s);
        
        // 触发活动工具摇晃动画（不倒翁效果）
        if (this.activeTool && this.activeTool.id === 'rubbish_bin') {
          this.toolShakeAnim.active = true;
          this.toolShakeAnim.targetToolId = 'rubbish_bin';
          this.toolShakeAnim.angle = 0;
          this.toolShakeAnim.velocity = 0.07; // 初始角速度（更小的幅度）
        }
        
        // 被动引导：标记 throw 工具已正确使用
        if (this.tutorial.isActive) {
          if (this.activeTool && this.activeTool.id === 'rubbish_bin') {
            this.tutorial.rubbishBinUsed = true;
            this.tutorial.showRubbishBinDirtHint = false;
          } else if (this.activeTool && this.activeTool.id === 'dc_basket') {
            this.tutorial.dcBasketUsed = true;
            this.tutorial.showDcBasketDirtHint = false;
          }
          this._checkTutorialComplete();
        }
      }
    };
    
    animate();
  }
  
  /**
   * 生成活动工具（从工具槽弹出到上方）
   * 不再依赖选中的圆圈，点击工具槽直接弹出
   */
  _spawnTool() {
    const tool = this.tools[this.currentToolIndex];
    if (!tool) return;
    
    this.activeTool = tool;
    
    // 获取当前选中的槽位位置
    const slotIndex = this.currentToolIndex;
    const slotPos = this.toolSlot ? this.toolSlot.slotPositions[slotIndex] : null;
    
    // 工具槽区域
    const toolSlotTopY = this.screenHeight * 0.88;
    const toolSlotHeight = this.screenHeight * 0.12;
    const toolSlotBottomY = toolSlotTopY + toolSlotHeight;
    
    // 目标位置：工具槽上方居中（静止时再往上10px）
    const targetY = toolSlotTopY - 50; // 工具槽上方50px
    
    if (slotPos) {
      // 从槽位位置开始动画
      this.toolAnim = {
        active: true,
        progress: 0,
        startX: slotPos.x + slotPos.size / 2,
        startY: toolSlotBottomY - 30, // 槽位内部起始
        targetX: slotPos.x + slotPos.size / 2, // 水平居中于槽位
        targetY: targetY,
        scale: 0.3,
        alpha: 0
      };
    } else {
      // 默认位置（屏幕中央）
      this.toolAnim = {
        active: true,
        progress: 0,
        startX: this.screenWidth / 2,
        startY: toolSlotBottomY - 30,
        targetX: this.screenWidth / 2,
        targetY: targetY,
        scale: 0.3,
        alpha: 0
      };
    }
    
    // 重置涂抹状态（后续拖动到圆圈时再用）
    this.wipeStartAngle = null;
    this.totalWipeAngle = 0;
    this.clockwiseWipes = 0;
  }
  
  /**
   * 温和Q弹缓动函数（微弱回弹）
   */
  _easeOutElastic(t) {
    // 更温和的弹性效果
    if (t === 0) return 0;
    if (t === 1) return 1;
    // 减小振幅和频率，让回弹更微弱
    return Math.pow(2, -6 * t) * Math.sin((t * 4 - 0.3) * ((2 * Math.PI) / 3)) * 0.3 + 1;
  }
  
  /**
   * 选择工具时回调（被动引导）
   */
  _selectTool(index) {
    const tool = this.tools[index];
    this.currentToolIndex = index;
    
    // 同步更新 ToolSlot 组件
    if (this.toolSlot && this.toolSlot.selectedIndex !== index) {
      this.toolSlot.selectedIndex = index;
    }
    
    // 通知工具槽该槽位已空（工具被取出）
    if (this.toolSlot) {
      this.toolSlot.setEmptySlot(index);
    }
    
    // ===== 被动新手引导处理 =====
    if (this.tutorial.isActive && tool) {
      // 2. 点击了 rubbish_bin：显示目标污垢的白色光圈+手指
      if (tool.id === 'rubbish_bin') {
        this.tutorial.showingRubbishBinGlow = false;
        this.tutorial.showRubbishBinDirtHint = true;
        this.tutorial.showDcBasketDirtHint = false;
        this.tutorial.showClothDirtHint = false;
        this.tutorial.showAngryEmoji = false;
        console.log('[GameplayScene] 引导：选中 rubbish_bin，提示目标污垢');
      }
      
      // 3. 点击了 dc_basket：显示目标污垢的白色光圈+手指
      else if (tool.id === 'dc_basket') {
        this.tutorial.showingDcBasketGlow = false;
        this.tutorial.showDcBasketDirtHint = true;
        this.tutorial.showRubbishBinDirtHint = false;
        this.tutorial.showClothDirtHint = false;
        this.tutorial.showAngryEmoji = false;
        console.log('[GameplayScene] 引导：选中 dc_basket，提示目标污垢');
      }
      
      // 4. 点击了 cloth：显示目标污垢的 Z 字形动画
      else if (tool.id === 'cloth') {
        this.tutorial.showingClothGlow = false;
        this.tutorial.showClothDirtHint = true;
        this.tutorial.showRubbishBinDirtHint = false;
        this.tutorial.showDcBasketDirtHint = false;
        this.tutorial.showAngryEmoji = false;
        // 重置 Z 字形动画
        this.tutorial.circularAnim.time = 0;
        this.tutorial.circularAnim.repeatCount = 0;
        console.log('[GameplayScene] 引导：选中 cloth，提示 Z 字形拖地');
      }
      
      // 点击了其他工具：隐藏所有提示
      else {
        this.tutorial.showingRubbishBinGlow = false;
        this.tutorial.showingDcBasketGlow = false;
        this.tutorial.showingClothGlow = false;
        this.tutorial.showRubbishBinDirtHint = false;
        this.tutorial.showDcBasketDirtHint = false;
        this.tutorial.showClothDirtHint = false;
      }
    }
    
    // 点击工具槽直接弹出活动工具
    this._spawnTool();
    
    this.showToolTip = true;
    // 重置提示框定时器
    if (this._toolTipTimer) clearTimeout(this._toolTipTimer);
    this._toolTipTimer = setTimeout(() => {
      this.showToolTip = false;
    }, 2000);
  }
  
  /**
   * 更新工具拖动，检测顺时针涂抹
   */
  _updateToolDrag(x, y) {
    if (!this.isDraggingTool || !this.selectedDirt) return;
    
    const dirt = this.selectedDirt;
    const gameAreaY = this.screenHeight * 0.08;
    
    // 计算工具相对于圆圈中心的角度
    const dx = x - dirt.x;
    const dy = y - (dirt.y + gameAreaY);
    const angle = Math.atan2(dy, dx);
    
    if (this.wipeStartAngle === null) {
      this.wipeStartAngle = angle;
      this.lastDragAngle = angle;
      this.totalWipeAngle = 0;
    } else {
      // 计算角度变化
      let deltaAngle = angle - this.lastDragAngle;
      
      // 处理角度跨越 -PI 到 PI 的边界
      if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
      
      // 只累加顺时针角度（正值）
      if (deltaAngle > 0) {
        this.totalWipeAngle += deltaAngle;
      }
      
      this.lastDragAngle = angle;
      
      // 检查是否完成一圈（2PI）
      if (this.totalWipeAngle >= Math.PI * 2) {
        this.clockwiseWipes++;
        this.totalWipeAngle = 0;
        this.wipeStartAngle = angle;
        
        // 更新圆圈涂抹进度
        dirt.wipeCount = this.clockwiseWipes;
        
        // 完成2次涂抹
        if (this.clockwiseWipes >= 2) {
          this._completeCleanDirt(dirt);
        }
      }
    }
    
    // 更新工具位置
    this.toolPosition = { x, y };
    this.selectedDirt.cleaning = true;
  }
  
  /**
   * 完成清洁污垢
   */
  _completeCleanDirt(dirt) {
    dirt.state = 'clean';
    dirt.selected = false;
    dirt.cleaning = false;
    
    // 清除活动工具
    this.activeTool = null;
    this.isDraggingTool = false;
    this.selectedDirt = null;
    
    // 增加清洁度
    this.cleanProgress += 10;
    
    // 显示 Toast
    this._showToast('清洁完成！清洁度 +10');
    
    // 添加闪光粒子效果
    const s = this.screenWidth / 750;
    for (let i = 0; i < 8; i++) {
      this.sparkles.push({
        x: dirt.x,
        y: dirt.y + this.screenHeight * 0.08,
        vx: (Math.random() - 0.5) * 10 * s,
        vy: (Math.random() - 0.5) * 10 * s,
        life: 1,
        size: (5 + Math.random() * 10) * s
      });
    }
    
    // 被动引导：标记 cloth 已正确使用
    if (this.tutorial.isActive) {
      this.tutorial.clothUsed = true;
      this.tutorial.showClothDirtHint = false;
      this._checkTutorialComplete();
    }
    
    // 检查是否全部清洁完成
    if (this.dirtObjects.every(d => d.state === 'clean')) {
      setTimeout(() => {
        this._showSettlement();
      }, 1000);
    }
  }
  
  /**
   * 显示 Toast 提示
   */
  _showToast(message) {
    // 使用事件系统显示 toast
    const { globalEvent } = require('../core/EventEmitter');
    globalEvent.emit('game:toast', message);
    
    // 同时控制台输出
    console.log(`[GameplayScene] Toast: ${message}`);
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
