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

/**
 * 弹跳放大镜 - 双击提示组件
 * 用于二级背景区域的金圈中心提示
 */
class BouncyMagnifier {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.baseSize = options.size || 40;
    this.color = options.color || '#FFD700'; // 默认黄金主题色
    this.duration = options.duration || 1500; // 动画周期(毫秒)
    
    this.age = 0; // 当前存活时间
    this.isFinished = false;
    this.loop = options.loop !== false; // 是否循环播放，默认true
  }

  // 在游戏主循环中更新状态
  update(deltaTime) {
    if (this.isFinished) return;
    
    this.age += deltaTime;
    if (this.age >= this.duration) {
      if (this.loop) {
        this.age %= this.duration;
      } else {
        this.isFinished = true;
      }
    }
  }

  // 核心动画算法：两次心跳式弹跳
  getBounceScale(progress) {
    // 第一跳(0-15%)、第二跳(15%-30%)、静止等待(30%-100%)
    if (progress < 0.15) {
      // 第1跳 (放大)
      return 1 + Math.sin(progress / 0.15 * Math.PI) * 0.4;
    } else if (progress < 0.3) {
      // 第2跳 (放大)
      let p2 = (progress - 0.15) / 0.15;
      return 1 + Math.sin(p2 * Math.PI) * 0.4;
    }
    return 1; // 休息阶段
  }

  // 获取透明度：优雅的渐入渐出
  getOpacity(progress) {
    if (progress < 0.05) return 0.3 + progress / 0.05 * 0.7;  // 前5%从0.3渐到1
    if (progress > 0.8) return 1 - (progress - 0.8) / 0.2;
    return 1;
  }

  // 在游戏主循环中执行渲染
  draw(ctx) {
    if (this.isFinished) return;

    const progress = this.age / this.duration;
    const scale = this.getBounceScale(progress);
    const opacity = this.getOpacity(progress);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = opacity;

    // 1. 发光环境光晕
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    
    // 2. 绘制放大镜主体参数
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.baseSize * 0.15;
    ctx.lineCap = 'round';
    
    // 3. 镜片外圈
    ctx.beginPath();
    ctx.arc(-this.baseSize * 0.1, -this.baseSize * 0.1, this.baseSize * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    
    // 4. 镜片内部的玻璃高光
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = this.baseSize * 0.08;
    ctx.arc(-this.baseSize * 0.1, -this.baseSize * 0.1, this.baseSize * 0.25, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    // 5. 放大镜把手 (向右下方45度角)
    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.baseSize * 0.18;
    const handleStartX = -this.baseSize * 0.1 + Math.cos(Math.PI / 4) * (this.baseSize * 0.4);
    const handleStartY = -this.baseSize * 0.1 + Math.sin(Math.PI / 4) * (this.baseSize * 0.4);
    ctx.moveTo(handleStartX, handleStartY);
    ctx.lineTo(this.baseSize * 0.4, this.baseSize * 0.4);
    ctx.stroke();
    
    ctx.restore();
  }
}

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
    
    // Toast 组件（波普风）
    this.toast = null;
    
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
      sadAnim: {                      // sad 表情动画状态
        startTime: 0,                 // 动画开始时间
        jumpCount: 0,                 // 已跳跃次数
        maxJumps: 3,                  // 最大跳跃次数
        jumpDuration: 400             // 每次跳跃时长(ms)
      },
      
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
    
    // ========== 二级背景（dirts_deep_area）状态 ==========
    this.deepArea = {
      isActive: false,              // 是否正在二级背景中
      currentAreaId: null,          // 当前二级背景ID
      autoExitScheduled: false,     // 防止自动退出重复触发
      areas: [],                    // 所有二级区域配置
      images: {},                   // 缓存的二级背景图片 { areaId: img }
      originalDirts: [],            // 主关卡原始污垢（用于回退时恢复）
      originalBgImage: null,        // 主关卡原始背景图
      transition: {                 // 淡入淡出动画状态
        active: false,
        progress: 0,                // 0-1
        duration: 300,              // 动画时长ms
        fadingIn: true              // true=淡入, false=淡出
      },
      lastClick: {                  // 双击检测状态
        time: 0,
        areaId: null
      },
      magnifiers: [],               // 放大镜动画实例数组
      hintsVisible: false,          // 金圈提示是否可见（默认不显示）
      firstHintShown: false,        // 第一个金圈是否已显示（用于新人引导）
      hintShowTimer: null,          // 延迟显示金圈的定时器
      visitedAreas: [],             // 已访问过的二级背景区域ID列表
      secondHintShown: false,       // 是否已显示过"再找找别的隐藏垃圾"提示
      secondHintTimer: null,        // 二次提示的定时器
      invalidDoubleClick: {         // 无效双击反馈（双击非二级背景区域）
        show: false,                // 是否显示emoji
        x: 0,                       // 显示位置X
        y: 0,                       // 显示位置Y
        startTime: 0,               // 开始时间
        duration: 800               // 显示时长(ms)
      },
      pendingEnter: {               // 待进入二级背景的过渡状态
        active: false,              // 是否正在过渡
        areaId: null,               // 待进入的区域ID
        x: 0,                       // 放大镜显示位置X
        y: 0,                       // 放大镜显示位置Y
        startTime: 0,               // 开始时间
        duration: 1200,             // 呼吸闪烁时长(ms)
        isFromHint: false           // 是否来自金圈提示
      }
    };
    
    // 回退按钮
    this.backBtnDeepArea = null;
  }

  async onLoad(data = {}) {
    this.levelId = data.levelId || 1;
    this.stage = data.stage || 1;
    this.bgImage = null;
    this.bgLoaded = false;
    this._completed = false; // 重置结算标记
    this._mainLevelCleanLogged = false; // 重置一级背景清洁完成标记
    
    // 清理上一关的定时器和状态
    if (this.deepArea.hintShowTimer) {
      clearTimeout(this.deepArea.hintShowTimer);
      this.deepArea.hintShowTimer = null;
    }
    if (this.deepArea.secondHintTimer) {
      clearTimeout(this.deepArea.secondHintTimer);
      this.deepArea.secondHintTimer = null;
    }
    this.deepArea.hintsVisible = false;
    this.deepArea.firstHintShown = false;
    this.deepArea.isActive = false;
    this.deepArea.currentAreaId = null;
    this.deepArea.areas = [];
    this.deepArea.magnifiers = [];
    this.deepArea.visitedAreas = []; // 重置已访问列表
    this.deepArea.secondHintShown = false; // 重置第二次提示标记
    this.deepArea.invalidDoubleClick = { show: false, x: 0, y: 0, startTime: 0, duration: 800 }; // 重置无效双击反馈
    this.deepArea.pendingEnter = { active: false, areaId: null, x: 0, y: 0, startTime: 0, duration: 1200, isFromHint: false }; // 重置待进入状态
    
    // 重置新手引导状态（每关都重置，只有第一关会根据hasCompletedTutorial决定是否开启）
    this.tutorial.isActive = false;
    this.tutorial.rubbishBinGlowShown = false;
    this.tutorial.dcBasketGlowShown = false;
    this.tutorial.clothGlowShown = false;
    this.tutorial.showingRubbishBinGlow = false;
    this.tutorial.showingDcBasketGlow = false;
    this.tutorial.showingClothGlow = false;
    this.tutorial.showRubbishBinDirtHint = false;
    this.tutorial.showDcBasketDirtHint = false;
    this.tutorial.showClothDirtHint = false;
    this.tutorial.rubbishBinUsed = false;
    this.tutorial.dcBasketUsed = false;
    this.tutorial.clothUsed = false;
    this.tutorial.handAnim.time = 0;
    this.tutorial.handAnim.offset = 0;
    
    // 关闭当前显示的 Toast
    if (this.toast) {
      this.toast.close();
    }
    
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
    
    // 加载二级背景资源（dirts_deep_area）
    await this._loadDeepAreaResources();
    
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
   * 下载图片（从云存储URL）
   */
  _downloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = wx.createImage();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片下载失败'));
      img.src = url;
    });
  }
  
  /**
   * 加载二级背景资源（dirts_deep_area）
   */
  async _loadDeepAreaResources() {
    const deepAreas = this.levelConfig?.dirts_deep_area || [];
    if (deepAreas.length === 0) return;
    
    console.log(`[GameplayScene] 开始加载 ${deepAreas.length} 个二级背景资源`);
    
    // 保存二级区域配置
    this.deepArea.areas = deepAreas.map(area => ({
      ...area,
      cleanedDirts: [] // 记录已清洁的污垢ID
    }));
    
    // 并行加载所有二级背景图片
    const loadTasks = deepAreas.map(async (area) => {
      if (!area.image) return;
      
      try {
        const tempURL = await this.cloudStorage.getTempFileURL(area.image);
        if (tempURL) {
          const img = await this._downloadImage(tempURL);
          this.deepArea.images[area.id] = img;
          console.log(`[GameplayScene] 二级背景加载成功: ${area.id}`);
        }
      } catch (e) {
        console.error(`[GameplayScene] 二级背景加载失败: ${area.id}`, e.message);
      }
    });
    
    await Promise.allSettled(loadTasks);
    
    // 初始化放大镜动画实例
    this._initDeepAreaMagnifiers();
    
    console.log('[GameplayScene] 二级背景资源加载完成');
  }
  
  /**
   * 初始化二级区域的放大镜提示动画
   */
  _initDeepAreaMagnifiers() {
    const s = this.screenWidth / 750;
    const gameAreaY = this.screenHeight * 0.08;
    
    this.deepArea.magnifiers = this.deepArea.areas.map(area => {
      return new BouncyMagnifier({
        x: area.x * s,
        y: area.y * s + gameAreaY,
        size: 35 * s,                    // 根据屏幕比例缩放
        color: '#FFD700',                // 金色主题
        loop: true,                      // 循环播放
        duration: 2000                   // 2秒一个周期，给玩家足够反应时间
      });
    });
    
    console.log(`[GameplayScene] 初始化 ${this.deepArea.magnifiers.length} 个放大镜动画`);
  }

  /**
   * 检查是否需要显示新手引导（被动式）
   * 条件：第一关 + 新玩家 + 未展示过引导
   */
  _checkTutorial() {
    // 只有第一关才显示引导（注意类型转换，levelId可能是字符串）
    if (Number(this.levelId) !== 1) {
      console.log('[GameplayScene] 引导检查: 不是第一关, levelId=', this.levelId);
      return;
    }
    
    const game = getGame();
    const dataManager = game ? game.dataManager : null;
    
    // 检查是否已完成引导
    if (dataManager && dataManager.hasCompletedTutorial) {
      if (dataManager.hasCompletedTutorial()) {
        console.log('[GameplayScene] 引导检查: dataManager显示已完成引导');
        return;
      }
    } else {
      // 降级检查：使用本地存储
      try {
        const hasShown = wx.getStorageSync('tutorial_completed');
        if (hasShown) {
          console.log('[GameplayScene] 引导检查: 本地存储显示已完成引导');
          return;
        }
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
      console.log('[GameplayScene] 污垢类型:', this.dirtObjects.map(d => d.type));
      return;
    }
    
    // 开启引导
    console.log('[GameplayScene] 开启被动式新手引导, 目标污垢:', {
      rubbishBin: rubbishBinDirt?.type,
      dcBasket: dcBasketDirt?.type,
      cloth: clothDirt?.type
    });
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
    
    // 初始化 Toast 组件（波普风）
    const Toast = require('../ui/components/Toast').default;
    this.toast = new Toast({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight
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
      const baseCircleSize = 60 * s;
      // 优先使用 levelConfig 中的 scale，否则使用 DIRT_TYPES 中的默认 scale
      const scale = dirtConfig.scale ?? dirtType?.scale ?? 1;
      const circleSize = baseCircleSize * scale;
      
      this.dirtObjects.push({
        id: i,
        type: dirtConfig.type,
        name: dirtType.name,
        x: x,
        y: y,
        width: circleSize,          // 宽度
        height: circleSize,         // 高度
        size: circleSize,           // 圆圈直径（兼容旧代码）
        scale: scale,               // 缩放比例（用于渲染）
        mirror: dirtConfig.mirror,  // 镜像方向：'horizontal' | 'vertical' | undefined
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
      
      // 后备方案使用 DIRT_TYPES 中的默认 scale
      const dirtType = DIRT_TYPES[dirtConfig.type];
      const scale = dirtType?.scale ?? 1;
      const baseSize = 100 * s;
      
      this.dirtObjects.push({
        id: i,
        type: dirtConfig.type,
        name: dirtConfig.name,
        x: (80 + Math.random() * 590) * s,
        y: relativeY,
        width: baseSize * scale,
        height: baseSize * scale,
        size: baseSize * scale,
        scale: scale,             // 缩放比例（用于渲染）
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
    
    // 打印清洁进度
    const mainTotal = this.dirtObjects.length;
    const mainCleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
    console.log('[GameplayScene] 清洁完成:', dirt.name, 'mainTotal:', mainTotal, 'mainCleaned:', mainCleaned);
    
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
    
    // 检查是否全部清洁完成（包括二级背景）
    if (this._checkAllDirtsCleaned()) {
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
   * 全局可用：任何关卡中选错工具都会触发
   */
  _showAngryEmoji() {
    this.tutorial.showAngryEmoji = true;
    this.tutorial.angryEmojiEndTime = Date.now() + 1500; // 显示 1.5 秒（3次跳跃）
    // 重置 sad 动画状态
    this.tutorial.sadAnim.startTime = Date.now();
    this.tutorial.sadAnim.jumpCount = 0;
  }
  
  /**
   * 更新新手引导动画（被动式）
   */
  _updateTutorial(dt) {
    // 更新生气 emoji 定时器（全局生效，不限于引导）
    if (this.tutorial.showAngryEmoji) {
      if (Date.now() >= this.tutorial.angryEmojiEndTime) {
        this.tutorial.showAngryEmoji = false;
      }
    }
    
    // 以下逻辑只在引导模式下执行
    if (!this.tutorial.isActive) return;
    
    // 更新小手摆动动画（正弦波，周期2秒）
    this.tutorial.handAnim.time += dt;
    this.tutorial.handAnim.offset = Math.sin(this.tutorial.handAnim.time * 0.003) * 10;
    
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
   * 渲染 sad 表情（错误工具提示，在弹出的工具左上角）
   */
  _renderAngryEmoji(ctx, s) {
    if (!this.tutorial.showAngryEmoji || !this.activeTool) return;
    
    const x = this.toolPosition.x - 43 * s;
    const y = this.toolPosition.y - 47 * s;
    
    // 尝试获取 sad 图片
    const sadImg = GlobalToolImageCache.get('ui_icon_sad');
    
    // 计算跳跃动画（只跳 3 次）
    const elapsed = Date.now() - this.tutorial.sadAnim.startTime;
    const maxBounceTime = this.tutorial.sadAnim.maxJumps * this.tutorial.sadAnim.jumpDuration; // 1200ms
    let bounce = 0;
    
    if (elapsed < maxBounceTime) {
      // 还在跳跃次数内，计算弹跳偏移
      const progress = (elapsed % this.tutorial.sadAnim.jumpDuration) / this.tutorial.sadAnim.jumpDuration;
      // 使用正弦波的一个完整周期，但只在波峰部分显示弹跳
      bounce = Math.sin(progress * Math.PI) * 5 * s;
    }
    // 超过 3 次后 bounce = 0，不再弹跳
    
    if (sadImg) {
      // 使用 sad 图片
      const size = 50 * s; // 图片大小（变小）
      
      ctx.save();
      
      // 绘制阴影
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8 * s;
      ctx.shadowOffsetX = 2 * s;
      ctx.shadowOffsetY = 2 * s;
      
      // 绘制图片（居中，带弹跳）
      ctx.drawImage(sadImg, x - size / 2, y + bounce - size / 2, size, size);
      
      ctx.restore();
    } else {
      // 降级：使用 emoji
      ctx.save();
      ctx.font = `bold ${35 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillText('😠', x + 2 * s, y + bounce + 2 * s);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('😠', x, y + bounce);
      
      ctx.restore();
    }
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
    
    // 手指（指尖朝上）- 更靠近光圈，频率适中
    const handOffset = Math.sin(this.tutorial.handAnim.time * 0.008) * 4;  // 频率 0.008
    this._renderHandBig(ctx, s, cx, cy + baseRadius + 32 * s, handOffset, true);  // 距离更近（45 -> 32）
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
    
    // 手指（指尖朝上）- 更靠近光圈，频率适中
    const handOffset = Math.sin(this.tutorial.handAnim.time * 0.008) * 4;  // 频率 0.008
    this._renderHandBig(ctx, s, cx, cy + baseRadius + 32 * s, handOffset, true);  // 距离更近（45 -> 32）
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
    
    // 更新无效双击反馈动画
    this._updateInvalidDoubleClickFeedback();
    
    // 更新待进入状态（放大镜呼吸闪烁）
    this._updatePendingEnter();
    
    // 更新二级区域放大镜动画（只在主关卡显示时更新）
    if (!this.deepArea.isActive && !this.deepArea.transition.active) {
      this.deepArea.magnifiers.forEach(magnifier => magnifier.update(deltaTime));
    }
    
    // 更新按钮
    if (this.backBtn) this.backBtn.update(deltaTime);
    if (this.winBtn) this.winBtn.update(deltaTime);
    if (this.exitZoomBtn) this.exitZoomBtn.update(deltaTime);
    if (this.backBtnDeepArea) this.backBtnDeepArea.update(deltaTime);
    
    // 更新工具槽（滑动惯性）
    if (this.toolSlot) this.toolSlot.update(deltaTime);
    
    // 更新清洁度（包含一级背景和二级背景的所有污垢）
    this._updateCleanProgress();
    
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
    
    // 更新工具弹出/收回动画
    if (this.toolAnim.active) {
      this.toolAnim.progress += deltaTime * 0.003; // 动画速度
      if (this.toolAnim.progress >= 1) {
        this.toolAnim.progress = 1;
        this.toolAnim.active = false;
      }
      
      const t = this.toolAnim.progress;
      
      if (this.toolAnim.isDespawning) {
        // 收回动画：果冻感（弹性回弹）
        const easeT = this._easeOutElastic(t);
        
        // 计算当前位置和大小
        this.toolPosition.x = this.toolAnim.startX + (this.toolAnim.targetX - this.toolAnim.startX) * t;
        this.toolPosition.y = this.toolAnim.startY + (this.toolAnim.targetY - this.toolAnim.startY) * easeT;
        this.toolAnim.scale = 1 - 0.7 * t; // 从1缩小到0.3
        this.toolAnim.alpha = 1 - t; // 淡出
      } else {
        // 弹出动画：弹性效果
        const easeT = this._easeOutElastic(t);
        
        // 计算当前位置和大小
        this.toolPosition.x = this.toolAnim.startX + (this.toolAnim.targetX - this.toolAnim.startX) * t;
        this.toolPosition.y = this.toolAnim.startY + (this.toolAnim.targetY - this.toolAnim.startY) * easeT;
        this.toolAnim.scale = 0.3 + 0.7 * easeT; // 从0.3缩放到1
        this.toolAnim.alpha = Math.min(1, t * 2); // 快速淡入
      }
    }
    
    // 更新二级背景过渡动画
    this._updateTransition(deltaTime);
    
    // 检查二级背景是否全部清洁完成，自动返回主关卡
    if (this.deepArea.isActive && !this.deepArea.transition.active && !this.deepArea.autoExitScheduled) {
      const currentAreaCleaned = this.dirtObjects.every(d => d.state === 'clean');
      if (currentAreaCleaned && this.dirtObjects.length > 0) {
        console.log('[GameplayScene] 二级背景全部清洁完成，自动返回主关卡');
        this.deepArea.autoExitScheduled = true;
        setTimeout(() => {
          this._exitDeepArea();
          this.deepArea.autoExitScheduled = false;
        }, 500);
      }
    }
    
    // 检查是否全部完成（主关卡 + 所有二级背景的污垢）
    if (!this.deepArea.transition.active && !this._completed) {
      const allCleaned = this._checkAllDirtsCleaned();
      if (allCleaned) {
        this._completed = true;
        setTimeout(() => this._showSettlement(), 500);
      }
    }
    
    // 更新工具解锁弹窗
    this._updateToolUnlockDialog(deltaTime);
    
    // 更新结算弹窗
    this._updateSettlementDialog(deltaTime);
    
    // 更新 Toast 动画
    if (this.toast) {
      this.toast.update(deltaTime);
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
    
    // 绘制亮晶晶特效（清洁完成后的闪烁效果）
    this._renderShineEffects(ctx);
    
    // 渲染新手引导
    this._renderTutorial(ctx, s);
    
    // 渲染二级背景金色圆圈提示（只在主关卡显示）
    this._renderDeepAreaHints(ctx, s);
    
    // 渲染工具解锁弹窗
    this._renderToolUnlockDialog(ctx);
    
    // 渲染结算弹窗（在最上层）
    this._renderSettlementDialog(ctx);
    
    // 渲染 Toast（波普风，最顶层）
    if (this.toast) {
      this.toast.render(ctx);
    }
    
    // 渲染过渡动画遮罩
    this._renderTransition(ctx);
    
    // 在最顶层渲染生气 emoji（全局生效）
    this._renderAngryEmoji(ctx, s);
    
    // 渲染无效双击反馈（全局）
    this._renderInvalidDoubleClickFeedback(ctx, s);
    
    // 渲染待进入状态的放大镜呼吸闪烁
    this._renderPendingEnterMagnifier(ctx, s);
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
    
    // 绘制回退按钮（在二级背景中）
    if (this.backBtnDeepArea) this.backBtnDeepArea.onRender(ctx);

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
    // 包括收回动画期间（activeTool 可能为 null，但动画还在进行）
    if (this.activeTool || (this.toolAnim.active && this.toolAnim.isDespawning)) {
      this._renderActiveTool(ctx, s);
    }
  }

  /**
   * 使用图片渲染污垢
   */
  _renderDirtWithImage(ctx, dirt, cx, cy, radius, pulseAlpha, s, img) {
      // 优先使用 dirt 对象的 scale，其次是 DIRT_TYPES 中的默认 scale
      const dirtType = DIRT_TYPES[dirt.type];
      const scale = dirt?.scale ?? dirtType?.scale ?? 1;
      
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
      
      let x = cx - drawWidth / 2;
      let y = cy - drawHeight / 2;
      
      // 处理镜像变换（水平或垂直翻转）
      if (dirt.mirror === 'horizontal' || dirt.mirror === 'vertical') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(dirt.mirror === 'horizontal' ? -1 : 1, dirt.mirror === 'vertical' ? -1 : 1);
        ctx.translate(-cx, -cy);
        // 重新计算 x, y 因为原点变了
        x = cx - drawWidth / 2;
        y = cy - drawHeight / 2;
      }
      
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
      
      // 恢复镜像变换
      if (dirt.mirror === 'horizontal' || dirt.mirror === 'vertical') {
        ctx.restore();
      }
      
      ctx.restore();
      
      // 渲染划动清洁进度条（三格蓝色能量条）
      // 只要有进度就常驻显示，方便玩家切换污垢后继续清洁
      if (dirt.strokeCount > 0 && dirt.strokeCount < dirt.maxStrokes) {
        this._renderStrokeProgress(ctx, cx, cy, radius, dirt.strokeCount, dirt.maxStrokes, s);
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
    const barWidth = radius * 2.6;      // 进度条总宽度（更大）
    const barHeight = 18 * s;           // 进度条高度（更大）
    const gap = 9 * s;                  // 格子之间的间隙（更大）
    const cellWidth = (barWidth - gap * (maxStrokes - 1)) / maxStrokes;  // 每个格子的宽度
    const startX = cx - barWidth / 2;   // 起始X坐标
    const startY = cy - radius - 50 * s; // 在污垢上方显示，距离更大
    const cornerRadius = 6 * s;         // 圆角半径（更大）
    
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
    // 优先使用 dirt 对象的 scale，其次是 DIRT_TYPES 中的默认 scale
    const dirtType = DIRT_TYPES[dirt.type];
    const scale = dirt?.scale ?? dirtType?.scale ?? 1;
    
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
    // 只要有进度就常驻显示
    if (dirt.strokeCount > 0 && dirt.strokeCount < dirt.maxStrokes) {
      this._renderStrokeProgress(ctx, cx, cy, radius, dirt.strokeCount, dirt.maxStrokes, s);
    }
  }

  /**
   * 绘制活动工具（带淡发光效果，无背景圆圈）
   * 优先使用真实图片，如果没有则使用 emoji
   */
  _renderActiveTool(ctx, s) {
    // 获取工具对象（可能是 activeTool，或收回动画中的 toolName）
    let tool = this.activeTool;
    if (!tool && this.toolAnim.isDespawning && this.toolAnim.toolName) {
      // 从工具列表中查找（收回动画期间）
      tool = this.tools.find(t => t.name === this.toolAnim.toolName);
    }
    if (!tool) return;
    
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
    if (this.toolShakeAnim.active && tool && tool.id === this.toolShakeAnim.targetToolId) {
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
    
    // 检查 Toast 点击（点击即消失）
    if (this.toast && this.toast.visible && this.toast.isHit(x, y)) {
      this.toast.hide();
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
    
    // 检查回退按钮点击（在二级背景中）
    if (this.deepArea.isActive && this.backBtnDeepArea && this.backBtnDeepArea.onTouchStart(x, y)) {
      return true;
    }
    
    // 检查二级背景区域双击（只在主关卡且没有弹窗时）
    if (!this.deepArea.isActive && !this.deepArea.transition.active) {
      const doubleClickResult = this._checkDeepAreaDoubleClick(x, y);
      if (doubleClickResult) {
        const { area, isFromHint, x: clickX, y: clickY } = doubleClickResult;
        
        if (isFromHint) {
          // 从金圈提示进来，直接进入二级背景
          this._enterDeepArea(area);
        } else {
          // 用户自己发现的，显示放大镜呼吸闪烁1.2s后再进入
          this._startPendingEnter(area, clickX, clickY);
        }
        return true;
      }
      // 检查是否是双击了非二级背景区域（全局双击反馈）
      // 注意：只有在 _checkDeepAreaDoubleClick 返回 null 且没有记录有效点击时才检查
      const isInvalidDoubleClick = this._checkGlobalDoubleClick(x, y);
      if (isInvalidDoubleClick) {
        return true;
      }
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
    
    // 检查回退按钮点击（在二级背景中）
    if (this.deepArea.isActive && this.backBtnDeepArea && this.backBtnDeepArea.onTouchEnd(x, y)) {
      return true;
    }
    
    // 处理 ToolSlot 的触摸结束（用于选中工具）
    if (this.toolSlot) {
      // 先检查是否点击了空槽位（工具弹出的槽位）
      const clickedEmptySlot = this._checkEmptySlotClick(x, y);
      if (clickedEmptySlot) {
        // 点击空槽位，收回工具
        this._despawnTool();
        return true;
      }
      
      // 处理正常槽位点击
      if (this.toolSlot.onTouchEnd(x, y)) {
        // 工具选择后直接弹出活动工具（由 _selectTool 内部处理）
        return true;
      }
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
      
      // 如果没有完成清洁且不是在收回动画中，工具回到弹出位置
      if (this.activeTool && !this.toolAnim.isDespawning) {
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
    
    // 打印清洁进度
    const mainTotal = this.dirtObjects.length;
    const mainCleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
    console.log('[GameplayScene] 清洁完成:', dirt.name, 'mainTotal:', mainTotal, 'mainCleaned:', mainCleaned);
    
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
    
    // 打印清洁进度
    const mainTotal = this.dirtObjects.length;
    const mainCleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
    console.log('[GameplayScene] 清洁完成:', dirt.name, 'mainTotal:', mainTotal, 'mainCleaned:', mainCleaned);
    
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
   * 检查是否全部清洁完成（包括二级背景）
   */
  _checkAllCleaned() {
    const allCleaned = this._checkAllDirtsCleaned();
    if (allCleaned && !this._completed) {
      this._completed = true;
      setTimeout(() => this._showSettlement(), 500);
    }
  }

  /**
   * 选中/取消选中污垢圆圈（被动引导核心逻辑 + Z 字绘制入口）
   */
  _selectDirt(dirt, x, y) {
    // 触发轻微振感（点击污垢时的全局反馈）
    haptic.light();
    
    // 获取污垢类型配置
    const dirtType = DIRT_TYPES[dirt.type];
    if (!dirtType) return;
    
    // ===== 全局错误工具检测（任何关卡都生效）=====
    // 如果已弹出工具，且工具不匹配该污垢的 recipe，显示生气 emoji
    if (this.activeTool && dirt.state !== 'clean') {
      const recipes = dirtType.recipes || [];
      const allTools = recipes.flat();
      
      // 检查当前弹出的工具是否在该污垢的 recipe 中
      if (!allTools.includes(this.activeTool.id)) {
        // 工具不匹配：显示生气 emoji
        this._showAngryEmoji();
      }
    }
    
    // ===== 被动新手引导处理（仅限第一关）=====
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
          // 有非 rubbish_bin 的工具已弹出：生气 emoji（已在上面全局检测中处理）
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
          // 有非 dc_basket 的工具已弹出：生气 emoji（已在上面全局检测中处理）
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
          // 有非 cloth 的工具已弹出：生气 emoji（已在上面全局检测中处理）
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
        // 只有不在划动清洁中，或点击了不同的污垢时才重新开始
        if (!this.strokeState.active || this.strokeState.dirt !== dirt) {
          this._startStrokeClean(dirt, x, y);
        }
      }
      return;
    }
    
    // sweep 类型：点击后如果 broom 已弹出，自动进入 Z 字绘制模式
    if (dirtType.operate_type === 'sweep') {
      if (this.activeTool && this.activeTool.id === 'broom') {
        // 只有不在划动清洁中，或点击了不同的污垢时才重新开始
        if (!this.strokeState.active || this.strokeState.dirt !== dirt) {
          this._startStrokeClean(dirt, x, y);
        }
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
  
  // ==================== 二级背景（dirts_deep_area）功能 ====================
  
  /**
   * 检查是否双击了二级背景区域
   * 使用 80px * s 半径的圆作为检测范围
   * 双击时间间隔必须在 300ms 内
   */
  _checkDeepAreaDoubleClick(x, y) {
    const gameAreaY = this.screenHeight * 0.08;
    const gameY = y - gameAreaY;
    const s = this.screenWidth / 750;
    const DETECT_RADIUS = 80 * s; // 80px 检测半径
    const DOUBLE_CLICK_TIME = 300; // 双击时间间隔 ms
    
    const now = Date.now();
    let clickedArea = null;
    let clickedAreaIndex = -1;
    
    // 检查是否在某个二级区域内（且未完全清洁）
    for (let i = 0; i < this.deepArea.areas.length; i++) {
      const area = this.deepArea.areas[i];
      // 计算当前区域剩余的污垢数量
      const remainingDirts = area.dirts.filter(d => !area.cleanedDirts.includes(d.id || `${d.x}-${d.y}`)).length;
      if (remainingDirts === 0) continue; // 已清洁完的区域不再可进入
      
      const dx = x - area.x * s;
      const dy = gameY - area.y * s;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= DETECT_RADIUS) {
        clickedArea = area;
        clickedAreaIndex = i;
        break;
      }
    }
    
    if (!clickedArea) {
      // 点击不在任何区域内，返回null
      // 注意：不重置lastClick状态，让全局双击检测来处理
      return null;
    }
    
    // 检查是否是双击（同一区域，300ms内）
    const isDoubleClick = (
      this.deepArea.lastClick.areaId === clickedArea.id &&
      now - this.deepArea.lastClick.time < DOUBLE_CLICK_TIME
    );
    
    if (isDoubleClick) {
      // 双击成功，重置状态
      this.deepArea.lastClick.time = 0;
      this.deepArea.lastClick.areaId = null;
      
      // 判断是否是金圈提示的区域
      // 金圈提示只显示第一个未访问、未清洁的区域
      const firstHintAreaIndex = this._getFirstHintAreaIndex();
      const isFromHint = (clickedAreaIndex === firstHintAreaIndex) && 
                         (this.deepArea.firstHintShown || this.deepArea.hintsVisible);
      
      return {
        area: clickedArea,
        isFromHint: isFromHint,
        x: x,
        y: y
      };
    } else {
      // 第一次点击，记录状态
      this.deepArea.lastClick.time = now;
      this.deepArea.lastClick.areaId = clickedArea.id;
      return null;
    }
  }
  
  /**
   * 获取金圈提示的第一个区域索引
   */
  _getFirstHintAreaIndex() {
    // 只在主关卡且不在过渡动画中
    if (this.deepArea.isActive || this.deepArea.transition.active) return -1;
    
    // 找到第一个未访问、未清洁的区域
    return this.deepArea.areas.findIndex((area) => {
      // 排除已访问过的区域
      if (this.deepArea.visitedAreas.includes(area.id)) return false;
      // 检查是否还有未清洁的污垢
      const remainingDirts = area.dirts.filter(d => !area.cleanedDirts.includes(d.id || `${d.x}-${d.y}`)).length;
      return remainingDirts > 0;
    });
  }
  
  /**
   * 检查全局双击（非二级背景区域）
   * 当用户双击了非二级背景区域时触发反馈
   * @returns {boolean} 是否是有效的无效双击（触发反馈返回true）
   */
  _checkGlobalDoubleClick(x, y) {
    const DOUBLE_CLICK_TIME = 300; // 双击时间间隔 ms
    const now = Date.now();
    
    // 先检查当前点击位置是否在二级背景区域内
    const gameAreaY = this.screenHeight * 0.08;
    const gameY = y - gameAreaY;
    const s = this.screenWidth / 750;
    const DETECT_RADIUS = 80 * s; // 80px 检测半径
    
    let isInDeepArea = false;
    for (const area of this.deepArea.areas) {
      // 只检测未清洁完的区域
      const remainingDirts = area.dirts.filter(d => !area.cleanedDirts.includes(d.id || `${d.x}-${d.y}`)).length;
      if (remainingDirts === 0) continue;
      
      const dx = x - area.x * s;
      const dy = gameY - area.y * s;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= DETECT_RADIUS) {
        isInDeepArea = true;
        break;
      }
    }
    
    // 如果当前点击在二级背景区域内，不处理（留给 _checkDeepAreaDoubleClick 处理）
    if (isInDeepArea) {
      return false;
    }
    
    // 检查是否是双击（300ms内，且第一次点击也在非二级背景区域）
    const isDoubleClick = (
      this.deepArea.lastClick.time > 0 &&
      now - this.deepArea.lastClick.time < DOUBLE_CLICK_TIME &&
      this.deepArea.lastClick.areaId === 'invalid' // 第一次点击也在非二级背景
    );
    
    if (isDoubleClick) {
      // 双击了非二级背景区域，触发反馈
      this._triggerInvalidDoubleClickFeedback(x, y);
      // 重置点击状态
      this.deepArea.lastClick.time = 0;
      this.deepArea.lastClick.areaId = null;
      return true;
    }
    
    // 第一次点击在非二级背景区域，记录状态
    this.deepArea.lastClick.time = now;
    this.deepArea.lastClick.areaId = 'invalid';
    return false;
  }
  
  /**
   * 启动待进入状态（放大镜呼吸闪烁）
   * 用户自己发现隐藏区域时，先显示放大镜呼吸闪烁再进入
   */
  _startPendingEnter(area, x, y) {
    console.log('[GameplayScene] 启动放大镜呼吸闪烁，1.2s后进入二级背景:', area.id);
    
    this.deepArea.pendingEnter = {
      active: true,
      areaId: area.id,
      x: x,
      y: y,
      startTime: Date.now(),
      duration: 1200,
      isFromHint: false
    };
  }
  
  /**
   * 更新待进入状态（放大镜呼吸闪烁动画）
   */
  _updatePendingEnter() {
    const pending = this.deepArea.pendingEnter;
    if (!pending.active) return;
    
    const elapsed = Date.now() - pending.startTime;
    
    if (elapsed >= pending.duration) {
      // 呼吸闪烁结束，进入二级背景
      const area = this.deepArea.areas.find(a => a.id === pending.areaId);
      if (area) {
        this._enterDeepArea(area);
      }
      pending.active = false;
    }
  }
  
  /**
   * 渲染放大镜呼吸闪烁（待进入状态）
   */
  _renderPendingEnterMagnifier(ctx, s) {
    const pending = this.deepArea.pendingEnter;
    if (!pending.active) return;
    
    const elapsed = Date.now() - pending.startTime;
    const progress = elapsed / pending.duration;
    
    // 呼吸动画：缩放 1.0 -> 1.12 -> 1.0，周期 600ms（更平缓）
    const breathCycle = 600;
    const breathProgress = (elapsed % breathCycle) / breathCycle;
    const breathScale = 1 + Math.sin(breathProgress * Math.PI * 2) * 0.12; // 幅度从0.3减小到0.12
    
    // 淡出效果（最后 300ms 开始淡出）
    let alpha = 1;
    if (progress > 0.75) {
      alpha = 1 - (progress - 0.75) / 0.25;
    }
    
    const x = pending.x;
    const y = pending.y;
    const baseSize = 35 * s * breathScale; // 基础尺寸从40减小到35
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(breathScale, breathScale);
    
    // 绘制放大镜图标（简化版）
    ctx.strokeStyle = '#FFD700'; // 金色
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    
    // 镜片外圈
    ctx.beginPath();
    ctx.arc(-baseSize * 0.1, -baseSize * 0.1, baseSize * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    
    // 镜片内部的玻璃高光
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2 * s;
    ctx.arc(-baseSize * 0.1, -baseSize * 0.1, baseSize * 0.25, Math.PI, Math.PI * 1.5);
    ctx.stroke();
    
    // 放大镜把手 (向右下方45度角)
    ctx.beginPath();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3 * s;
    const handleStartX = -baseSize * 0.1 + Math.cos(Math.PI / 4) * (baseSize * 0.4);
    const handleStartY = -baseSize * 0.1 + Math.sin(Math.PI / 4) * (baseSize * 0.4);
    ctx.moveTo(handleStartX, handleStartY);
    ctx.lineTo(baseSize * 0.4, baseSize * 0.4);
    ctx.stroke();
    
    ctx.restore();
  }
  
  /**
   * 触发无效双击反馈（😮‍💨 emoji + 消极振感）
   */
  _triggerInvalidDoubleClickFeedback(x, y) {
    // 设置反馈状态
    this.deepArea.invalidDoubleClick = {
      show: true,
      x: x,
      y: y,
      startTime: Date.now(),
      duration: 800
    };
    
    // 触发消极振感
    haptic.error();
    
    console.log('[GameplayScene] 无效双击反馈：位置', x, y);
  }
  
  /**
   * 更新无效双击反馈动画
   */
  _updateInvalidDoubleClickFeedback() {
    const feedback = this.deepArea.invalidDoubleClick;
    if (!feedback.show) return;
    
    const elapsed = Date.now() - feedback.startTime;
    if (elapsed >= feedback.duration) {
      feedback.show = false;
    }
  }
  
  /**
   * 渲染无效双击反馈（ui_icon_sad 图片）
   */
  _renderInvalidDoubleClickFeedback(ctx, s) {
    const feedback = this.deepArea.invalidDoubleClick;
    if (!feedback.show) return;
    
    const elapsed = Date.now() - feedback.startTime;
    const progress = elapsed / feedback.duration;
    
    // 计算动画：先放大后缩小，同时淡出
    let scale = 1;
    let alpha = 1;
    let offsetY = 0;
    
    if (progress < 0.3) {
      // 前30%：放大弹出
      const p = progress / 0.3;
      scale = 0.5 + p * 0.5; // 0.5 -> 1.0
      alpha = p;
    } else {
      // 后70%：保持并淡出，同时向上飘
      const p = (progress - 0.3) / 0.7;
      scale = 1 - p * 0.2; // 1.0 -> 0.8
      alpha = 1 - p;
      offsetY = -p * 30 * s; // 向上飘30px
    }
    
    const size = 50 * s * scale; // 图片大小
    const x = feedback.x;
    const y = feedback.y + offsetY;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // 尝试获取 sad 图片
    const sadImg = GlobalToolImageCache.get('ui_icon_sad');
    
    if (sadImg) {
      // 使用图片
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8 * s;
      ctx.shadowOffsetX = 2 * s;
      ctx.shadowOffsetY = 2 * s;
      ctx.drawImage(sadImg, x - size / 2, y - size / 2, size, size);
    } else {
      // 降级：使用 emoji
      ctx.font = `bold ${size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText('😮‍💨', x + 2 * s, y + 2 * s);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('😮‍💨', x, y);
    }
    
    ctx.restore();
  }
  
  /**
   * 进入二级背景
   */
  _enterDeepArea(area) {
    console.log(`[GameplayScene] 进入二级背景: ${area.id}, 已清洁: ${area.cleanedDirts.length}/${area.dirts.length}`);
    console.log(`[GameplayScene] cleanedDirts:`, area.cleanedDirts);
    
    // 保存当前主关卡状态
    this.deepArea.originalDirts = [...this.dirtObjects];
    this.deepArea.originalBgImage = this.bgImage;
    
    // 设置当前二级区域
    this.deepArea.isActive = true;
    this.deepArea.currentAreaId = area.id;
    
    // 记录该区域已被访问过（进入后不再显示金圈）
    if (!this.deepArea.visitedAreas.includes(area.id)) {
      this.deepArea.visitedAreas.push(area.id);
    }
    
    // 取消二次提示定时器（如果用户在5秒内进入了隐藏区）
    if (this.deepArea.secondHintTimer) {
      clearTimeout(this.deepArea.secondHintTimer);
      this.deepArea.secondHintTimer = null;
      console.log('[GameplayScene] 用户主动进入隐藏区，取消二次提示定时器');
    }
    
    // 隐藏金圈提示（进入二级背景后立即隐藏）
    this.deepArea.hintsVisible = false;
    
    // 切换背景图
    const newBgImage = this.deepArea.images[area.id];
    if (newBgImage) {
      this.bgImage = newBgImage;
    }
    
    // 生成二级区域的污垢（过滤掉已清洁的）
    this._generateDeepAreaDirts(area);
    
    // 开始淡入动画
    this._startTransition(true);
    
    // 创建回退按钮
    this._createBackButton();
  }
  
  /**
   * 退出二级背景，回到主关卡
   */
  _exitDeepArea() {
    console.log('[GameplayScene] 退出二级背景，返回主关卡');
    
    // 保存当前二级区域的污垢状态到对应区域配置
    const currentArea = this.deepArea.areas.find(a => a.id === this.deepArea.currentAreaId);
    if (currentArea) {
      // 记录已清洁的污垢
      const beforeCount = currentArea.cleanedDirts.length;
      this.dirtObjects.forEach(dirt => {
        if (dirt.state === 'clean') {
          const dirtId = dirt.id || `${dirt.originalX}-${dirt.originalY}`;
          if (!currentArea.cleanedDirts.includes(dirtId)) {
            currentArea.cleanedDirts.push(dirtId);
            console.log(`[GameplayScene] 保存已清洁污垢: ${dirtId} (${dirt.name})`);
          }
        }
      });
      console.log(`[GameplayScene] 二级背景 ${currentArea.id} 清洁状态: ${beforeCount} -> ${currentArea.cleanedDirts.length}`);
    } else {
      console.warn('[GameplayScene] 未找到当前二级背景区域:', this.deepArea.currentAreaId);
    }
    
    // 恢复主关卡状态
    this.deepArea.isActive = false;
    this.deepArea.currentAreaId = null;
    this.bgImage = this.deepArea.originalBgImage;
    this.dirtObjects = this.deepArea.originalDirts;
    
    // 立即更新清洁度（确保包含刚保存的二级背景进度）
    this._updateCleanProgress();
    
    // 开始淡出动画
    this._startTransition(false);
    
    // 移除回退按钮
    this.backBtnDeepArea = null;
    
    // 检查是否还有其他未访问、未清洁的二级背景
    const hasOtherUncleanedArea = this.deepArea.areas.some(area => {
      // 排除已访问过的区域
      if (this.deepArea.visitedAreas.includes(area.id)) return false;
      // 检查是否还有未清洁的污垢
      const remainingDirts = area.dirts.filter(d => !area.cleanedDirts.includes(d.id || `${d.x}-${d.y}`)).length;
      return remainingDirts > 0;
    });
    
    // 第一关且未显示过第二次提示时，设置5秒延迟检测
    if (hasOtherUncleanedArea && Number(this.levelId) === 1 && !this.deepArea.secondHintShown) {
      this.deepArea.secondHintShown = true; // 标记已显示
      // 清除金圈提示状态（不显示金圈）
      this.deepArea.firstHintShown = false;
      this.deepArea.hintsVisible = false;
      // 5秒后如果用户还没进入第二个隐藏区，再弹Toast
      this.deepArea.secondHintTimer = setTimeout(() => {
        this._showToast('还有隐藏污垢，再找找！', 3000, '🔍');
        this.deepArea.secondHintTimer = null;
      }, 5000);
    }
  }
  
  /**
   * 生成二级区域的污垢
   */
  _generateDeepAreaDirts(area) {
    const s = this.screenWidth / 750;
    const gameAreaY = this.screenHeight * 0.08;
    
    const beforeFilter = area.dirts.length;
    this.dirtObjects = area.dirts
      .filter((d, index) => {
        // 过滤掉已清洁的污垢
        const dirtId = d.id || `${d.x}-${d.y}`;
        const isCleaned = area.cleanedDirts.includes(dirtId);
        if (isCleaned) {
          console.log(`[GameplayScene] 过滤掉已清洁污垢: ${dirtId}`);
        }
        return !isCleaned;
      })
      .map((dirtConfig, index) => {
        const dirtType = DIRT_TYPES[dirtConfig.type];
        if (!dirtType) {
          console.warn(`[GameplayScene] 未知污垢类型: ${dirtConfig.type}`);
          return null;
        }
        
        // 优先使用 levelConfig 中的 scale，否则使用 DIRT_TYPES 中的默认 scale
        const scale = dirtConfig.scale ?? dirtType?.scale ?? 1;
        const baseCircleSize = 60 * s;
        const circleSize = baseCircleSize * scale;
        
        return {
          id: dirtConfig.id || `deep_${area.id}_${index}`,
          originalX: dirtConfig.x, // 保存原始坐标用于标识
          originalY: dirtConfig.y,
          type: dirtConfig.type,
          name: dirtType.name,
          x: dirtConfig.x * s,
          y: dirtConfig.y * s,
          width: circleSize,
          height: circleSize,
          size: circleSize,
          scale: scale,             // 缩放比例（用于渲染）
          mirror: dirtConfig.mirror, // 镜像方向：'horizontal' | 'vertical' | undefined
          state: 'dirty',
          selected: false,
          cleaning: false,
          strokeCount: 0,
          maxStrokes: 3,
          currentRecipe: dirtType.recipes[0],
          currentStep: 0,
          recipes: dirtType.recipes,
          score: 10,
          coinReward: 5
        };
      })
      .filter(d => d !== null);
    
    console.log(`[GameplayScene] 二级区域生成 ${this.dirtObjects.length}/${beforeFilter} 个污垢 (过滤了 ${beforeFilter - this.dirtObjects.length} 个已清洁)`);
  }
  
  /**
   * 开始背景切换过渡动画
   * @param {boolean} fadingIn - true=淡入, false=淡出
   */
  _startTransition(fadingIn) {
    this.deepArea.transition.active = true;
    this.deepArea.transition.progress = 0;
    this.deepArea.transition.fadingIn = fadingIn;
    
    // 动画在 update 中处理
  }
  
  /**
   * 更新过渡动画
   */
  _updateTransition(dt) {
    if (!this.deepArea.transition.active) return;
    
    const { duration } = this.deepArea.transition;
    const progressDelta = dt / duration;
    
    if (this.deepArea.transition.fadingIn) {
      // 淡入
      this.deepArea.transition.progress += progressDelta;
      if (this.deepArea.transition.progress >= 1) {
        this.deepArea.transition.progress = 1;
        this.deepArea.transition.active = false;
      }
    } else {
      // 淡出
      this.deepArea.transition.progress += progressDelta;
      if (this.deepArea.transition.progress >= 1) {
        this.deepArea.transition.progress = 1;
        this.deepArea.transition.active = false;
      }
    }
  }
  
  /**
   * 渲染过渡遮罩（淡入淡出效果）
   */
  _renderTransition(ctx) {
    if (!this.deepArea.transition.active) return;
    
    const { progress, fadingIn } = this.deepArea.transition;
    let alpha;
    
    if (fadingIn) {
      // 淡入：从黑到透明
      alpha = 1 - progress;
    } else {
      // 淡出：从透明到黑
      alpha = progress;
    }
    
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    ctx.restore();
  }
  
  /**
   * 渲染二级背景区域的金色圆圈提示
   */
  _renderDeepAreaHints(ctx, s) {
    // 只在主关卡且不在过渡动画中显示
    if (this.deepArea.isActive || this.deepArea.transition.active) return;
    
    // 默认不显示金圈，除非满足条件
    let areasToShow = [];
    
    // 条件1：新人引导首次提示（firstHintShown）
    // 条件2：从二级背景退出后提示其他区域（hintsVisible，仅第一关）
    const shouldShowHint = (Number(this.levelId) === 1) && (this.deepArea.firstHintShown || this.deepArea.hintsVisible);
    
    if (shouldShowHint) {
      // 找到第一个未访问、未清洁的区域
      const firstUncleanedIndex = this.deepArea.areas.findIndex((area, index) => {
        // 排除已访问过的区域
        if (this.deepArea.visitedAreas.includes(area.id)) return false;
        // 检查是否还有未清洁的污垢
        const remainingDirts = area.dirts.filter(d => !area.cleanedDirts.includes(d.id || `${d.x}-${d.y}`)).length;
        return remainingDirts > 0;
      });
      if (firstUncleanedIndex !== -1) {
        areasToShow = [firstUncleanedIndex];
      }
    }
    
    // 如果没有需要显示的区域，直接返回
    if (areasToShow.length === 0) return;
    
    const gameAreaY = this.screenHeight * 0.08;
    const DETECT_RADIUS = 80 * s; // 80px 金圈半径
    
    ctx.save();
    
    areasToShow.forEach(index => {
      const area = this.deepArea.areas[index];
      if (!area) return;
      
      // 检查区域是否已被访问过（进入过二级背景后不再显示金圈）
      if (this.deepArea.visitedAreas.includes(area.id)) return;
      
      // 检查区域是否还有未清洁的污垢
      const remainingDirts = area.dirts.filter(d => !area.cleanedDirts.includes(d.id || `${d.x}-${d.y}`)).length;
      if (remainingDirts === 0) return; // 已清洁完的区域不显示提示
      
      const cx = area.x * s;
      const cy = area.y * s + gameAreaY;
      
      // 呼吸动画
      const breath = (Math.sin(Date.now() * 0.003) + 1) / 2;
      const alpha = 0.3 + breath * 0.4;
      const lineWidth = 2 + breath * 2;
      
      // 绘制白色半透明背景圆
      ctx.beginPath();
      ctx.arc(cx, cy, DETECT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
      
      // 绘制金色实线圆圈
      ctx.beginPath();
      ctx.arc(cx, cy, DETECT_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([]); // 实线
      ctx.stroke();
      
      // 内圈（更淡）
      ctx.beginPath();
      ctx.arc(cx, cy, DETECT_RADIUS - 15 * s, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 绘制弹跳放大镜动画（替代原来的中心圆点）
      let magnifier = this.deepArea.magnifiers[index];
      if (!magnifier) {
        // 如果放大镜未初始化，即时创建一个
        magnifier = new BouncyMagnifier({
          x: cx,
          y: cy,
          size: 35 * s,
          color: '#FFD700',
          loop: true,
          duration: 2000
        });
        this.deepArea.magnifiers[index] = magnifier;
      }
      magnifier.draw(ctx);
    });
    
    ctx.restore();
  }
  
  /**
   * 创建回退按钮
   */
  _createBackButton() {
    const s = this.screenWidth / 750;
    
    const Button = require('../ui/components/Button').default;
    this.backBtnDeepArea = new Button({
      x: 20 * s, 
      y: 100 * s, 
      width: 140 * s, 
      height: 50 * s, 
      text: '← 回到房间', 
      fontSize: 24 * s, 
      bgColor: 'rgba(0,0,0,0.5)', 
      textColor: '#FFFFFF', 
      borderRadius: 8 * s,
      onClick: () => {
        this._exitDeepArea();
      }
    });
  }
  
  /**
   * 检查一级背景是否全部清洁完成，触发新人引导提示二级背景
   * 条件：新人 + 第一关 + 一级背景全部清洁 + 有未清洁的二级背景
   */
  /**
   * 更新清洁度（包含一级背景和二级背景的所有污垢）
   */
  _updateCleanProgress() {
    // 计算主关卡污垢总数和已清洁数
    let mainTotal = 0;
    let mainCleaned = 0;
    
    if (this.deepArea.isActive) {
      // 在二级背景中，使用保存的主关卡原始污垢
      mainTotal = this.deepArea.originalDirts.length;
      mainCleaned = this.deepArea.originalDirts.filter(d => d.state === 'clean').length;
    } else {
      // 在主关卡中，使用当前污垢
      mainTotal = this.dirtObjects.length;
      mainCleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
    }
    
    // 计算二级背景污垢总数和已清洁数
    let deepTotal = 0;
    let deepCleaned = 0;
    
    for (const area of this.deepArea.areas) {
      deepTotal += area.dirts.length;
      deepCleaned += area.cleanedDirts.length;
      
      // 如果当前在这个二级背景中，加上当前清洁的
      if (this.deepArea.isActive && area.id === this.deepArea.currentAreaId) {
        const currentCleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
        deepCleaned += currentCleaned;
      }
    }
    
    // 总清洁度
    const totalDirts = mainTotal + deepTotal;
    const totalCleaned = mainCleaned + deepCleaned;
    
    if (totalDirts > 0) {
      const newProgress = (totalCleaned / totalDirts) * 100;
      // 只在清洁度变化时打印日志
      if (Math.abs(newProgress - this.cleanProgress) > 0.1) {
        console.log(`[GameplayScene] 清洁度更新: ${this.cleanProgress.toFixed(1)}% -> ${newProgress.toFixed(1)}% (主: ${mainCleaned}/${mainTotal}, 二级: ${deepCleaned}/${deepTotal})`);
      }
      this.cleanProgress = newProgress;
      
      // 更新 TopBar 的进度
      if (this.topBar) {
        this.topBar.updateData({ progress: this.cleanProgress });
      }
    }
    
    // 检测一级背景污垢是否全部清理完成（用于新人引导提示二级背景）
    const shouldTrigger = !this.deepArea.isActive && mainTotal > 0 && mainCleaned >= mainTotal;
    if (shouldTrigger && !this._mainLevelCleanLogged) {
      this._mainLevelCleanLogged = true;
      console.log('[GameplayScene] 一级背景清洁完成，准备触发二级背景提示');
      this._checkMainLevelCompleteForDeepAreaHint();
    }
  }
  
  /**
   * 检测一级背景全部清洁完成，触发新人引导提示二级背景
   * 条件：新人 + 第一关 + 一级背景全部清洁 + 有未清洁的二级背景
   */
  _checkMainLevelCompleteForDeepAreaHint() {
    // 只在主关卡且不在过渡动画中检测
    if (this.deepArea.isActive) {
      console.log('[GameplayScene] 二级背景提示: isActive=true, 返回');
      return;
    }
    if (this.deepArea.transition.active) {
      console.log('[GameplayScene] 二级背景提示: transition.active=true, 返回');
      return;
    }
    
    // 必须是第一关
    if (Number(this.levelId) !== 1) {
      console.log('[GameplayScene] 二级背景提示: levelId不是1, 返回');
      return;
    }
    
    // 检查用户之前是否已经看过二级背景提示
    try {
      const hasShownDeepAreaHint = wx.getStorageSync('deep_area_hint_shown');
      if (hasShownDeepAreaHint) {
        console.log('[GameplayScene] 二级背景提示: 用户已看过提示, 返回');
        return;
      }
    } catch (e) {
      // 忽略错误，继续执行
    }
    
    // 必须有二级背景区域
    if (this.deepArea.areas.length === 0) {
      console.log('[GameplayScene] 二级背景提示: areas.length=0, 返回');
      return;
    }
    
    // 检查是否还有未清洁的二级背景
    const hasUncleanedDeepArea = this.deepArea.areas.some(area => {
      const remainingDirts = area.dirts.filter(d => !area.cleanedDirts.includes(d.id || `${d.x}-${d.y}`)).length;
      return remainingDirts > 0;
    });
    if (!hasUncleanedDeepArea) {
      console.log('[GameplayScene] 二级背景提示: 没有未清洁的二级背景, 返回');
      return;
    }
    
    // 避免重复触发
    if (this.deepArea.hintShowTimer) {
      console.log('[GameplayScene] 二级背景提示: hintShowTimer已设置, 返回');
      return;
    }
    if (this.deepArea.firstHintShown) {
      console.log('[GameplayScene] 二级背景提示: firstHintShown=true, 返回');
      return;
    }
    
    // 新顺序：先显示金圈，1秒后再显示 Toast
    const DELAY_BEFORE_HINT = 2000; // 延迟2秒后显示金圈
    const DELAY_BEFORE_TOAST = 1000; // 金圈显示1秒后显示 Toast
    
    this.deepArea.hintShowTimer = setTimeout(() => {
      // 1. 先显示金圈
      this.deepArea.firstHintShown = true;
      this.deepArea.hintsVisible = true;
      console.log('[GameplayScene] 新人引导：显示第一个二级背景金圈');
      
      // 保存标记，表示用户已看过二级背景提示
      try {
        wx.setStorageSync('deep_area_hint_shown', true);
      } catch (e) {
        // 忽略错误
      }
      
      // 2. 1秒后显示 Toast
      setTimeout(() => {
        this._showToast('双击放大，揪出隐藏污垢！', 3000, '👆');
      }, DELAY_BEFORE_TOAST);
    }, DELAY_BEFORE_HINT);
  }
  
  /**
   * 检查所有污垢是否清洁完成（主关卡 + 所有二级背景）
   */
  _checkAllDirtsCleaned() {
    // 1. 检查主关卡污垢是否全部清洁
    // 如果当前在二级背景中，检查保存的原始主关卡污垢状态
    // 如果不在二级背景中，检查当前的 dirtObjects（就是主关卡）
    let mainDirtsCleaned = false;
    if (this.deepArea.isActive) {
      // 在二级背景中，检查保存的主关卡原始污垢
      mainDirtsCleaned = this.deepArea.originalDirts.length === 0 || 
                         this.deepArea.originalDirts.every(d => d.state === 'clean');
    } else {
      // 在主关卡中，检查当前污垢
      mainDirtsCleaned = this.dirtObjects.length === 0 || 
                         this.dirtObjects.every(d => d.state === 'clean');
    }
    if (!mainDirtsCleaned) return false;
    
    // 2. 检查所有二级背景的污垢是否清洁完成
    for (const area of this.deepArea.areas) {
      const totalDirts = area.dirts.length;
      const cleanedDirts = area.cleanedDirts.length;
      
      // 如果当前在二级背景中，需要额外检查当前区域的污垢
      if (this.deepArea.isActive && area.id === this.deepArea.currentAreaId) {
        const currentCleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
        if (cleanedDirts + currentCleaned < totalDirts) {
          return false;
        }
      } else {
        // 不在该区域，只检查已保存的清洁记录
        if (cleanedDirts < totalDirts) {
          return false;
        }
      }
    }
    
    console.log('[GameplayScene] 所有污垢清洁完成（主关卡 + 二级背景）');
    return true;
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
    
    // 保留之前的进度（如果有的话）
    const existingStrokeCount = dirt.strokeCount || 0;
    
    const gameAreaY = this.screenHeight * 0.08;
    this.strokeState = {
      active: true,
      dirt: dirt,
      strokeCount: existingStrokeCount,  // 从之前的进度继续
      maxStrokes: 3,
      lastPos: { x, y: y - gameAreaY },
      totalDistance: 0,
      minStrokeDistance: 60 * (this.screenWidth / 750)
    };
    
    // 在污垢对象上记录当前划动次数，用于渲染进度条
    dirt.strokeCount = existingStrokeCount;  // 保留之前的进度
    dirt.maxStrokes = 3;
    
    // 高亮显示目标污垢
    dirt.isHighlighted = true;
    dirt.highlightScale = 1;
    
    console.log(`[GameplayScene] 开始划动清洁: ${dirt.name}, 已有进度: ${existingStrokeCount}/3`);
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
    while (state.totalDistance >= state.minStrokeDistance && dirt.strokeCount < state.maxStrokes) {
      state.totalDistance = 0;  // 重置距离计数
      state.lastCountTime = now; // 记录计数时间
      state.strokeCount++;
      dirt.strokeCount = state.strokeCount;
      
      console.log(`[GameplayScene] ✅ 划动计数: ${state.strokeCount}/${state.maxStrokes} (dirt.strokeCount: ${dirt.strokeCount})`);
      
      // 触发震动反馈（每完成一次划动）
      if (typeof wx !== 'undefined' && wx.vibrateShort) {
        wx.vibrateShort({ type: 'light' });
      }
      
      // 检查是否完成所有划动（使用 dirt.strokeCount 判断）
      if (dirt.strokeCount >= state.maxStrokes) {
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
        // 打印清洁进度
        const mainTotal = this.dirtObjects.length;
        const mainCleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
        console.log('[GameplayScene] 清洁完成:', dirt.name, 'mainTotal:', mainTotal, 'mainCleaned:', mainCleaned);
        console.log(`[GameplayScene] ${dirt.name} 已扔进垃圾桶`);
        
        // 添加亮晶晶特效（在污垢原位置）
        const s = this.screenWidth / 750;
        this._addShineEffect(originalX, originalY + gameAreaY, s);
        
        // 触发活动工具摇晃动画（不倒翁效果）
        if (this.activeTool && (this.activeTool.id === 'rubbish_bin' || this.activeTool.id === 'dc_basket')) {
          this.toolShakeAnim.active = true;
          this.toolShakeAnim.targetToolId = this.activeTool.id;
          this.toolShakeAnim.angle = 0;
          this.toolShakeAnim.velocity = 0.05; // 初始角速度（轻微的幅度）
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
   * 收回工具（点击空槽位时）
   * 带果冻动效
   */
  _despawnTool() {
    if (!this.activeTool || this.toolAnim.isDespawning) return;
    
    console.log('[GameplayScene] 收回工具:', this.activeTool.name);
    
    const slotIndex = this.currentToolIndex;
    
    // 获取槽位位置
    const slotPos = this.toolSlot ? this.toolSlot.slotPositions[slotIndex] : null;
    const toolSlotTopY = this.screenHeight * 0.88;
    const toolSlotHeight = this.screenHeight * 0.12;
    const toolSlotBottomY = toolSlotTopY + toolSlotHeight;
    
    // 启动收回动画（反向的弹出动画）
    if (slotPos) {
      this.toolAnim = {
        active: true,
        progress: 0,
        startX: this.toolPosition.x,
        startY: this.toolPosition.y,
        targetX: slotPos.x + slotPos.size / 2,
        targetY: toolSlotBottomY - 30, // 回到槽位内部
        scale: 1,
        alpha: 1,
        isDespawning: true, // 标记是收回动画
        toolName: this.activeTool.name // 保存工具名称用于渲染
      };
    }
    
    // 立即重置槽位状态（让用户可以操作其他槽位）
    this.isDraggingTool = false;
    this.currentToolIndex = -1;
    this.strokeState.active = false; // 重置划动清洁状态
    if (this.toolSlot) {
      this.toolSlot.emptySlots.clear();
      this.toolSlot.selectedIndex = -1;
      this.toolSlot.isDragging = false;
      this.toolSlot._pendingSlotIndex = -1;
    }
    
    // 清除新手引导提示
    if (this.tutorial.isActive) {
      this.tutorial.showRubbishBinDirtHint = false;
      this.tutorial.showDcBasketDirtHint = false;
      this.tutorial.showClothDirtHint = false;
    }
    
    // 立即清除活动工具（防止竞态条件：用户在动画期间点击其他位置）
    this.activeTool = null;
    
    // 延迟重置动画状态（等动画完成后）
    setTimeout(() => {
      this.toolAnim.active = false;
      this.toolAnim.isDespawning = false;
    }, 350); // 350ms 动画时长
  }
  
  /**
   * 检查是否点击了空槽位
   * @returns {boolean} 是否点击了空槽位
   */
  _checkEmptySlotClick(x, y) {
    if (!this.toolSlot || !this.activeTool) return false;
    
    // 获取当前空槽位的索引
    const emptySlotIndex = this.currentToolIndex;
    
    // 检查点击位置是否在该槽位内
    const slotIndex = this.toolSlot.getSlotIndexAt(x, y);
    
    // 如果点击的是空槽位，返回 true
    return slotIndex === emptySlotIndex && this.toolSlot.emptySlots.has(slotIndex);
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
    
    // 打印清洁进度
    const mainTotal = this.dirtObjects.length;
    const mainCleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
    console.log('[GameplayScene] 清洁完成:', dirt.name, 'mainTotal:', mainTotal, 'mainCleaned:', mainCleaned);
    
    // 清除活动工具
    this.activeTool = null;
    this.isDraggingTool = false;
    this.selectedDirt = null;
    
    // 增加清洁度
    this.cleanProgress += 10;
    
    // 显示 Toast
    this._showToast('清洁完成！清洁度 +10', 2000, '✨');
    
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
    
    // 检查是否全部清洁完成（包括二级背景）
    if (this._checkAllDirtsCleaned()) {
      setTimeout(() => {
        this._showSettlement();
      }, 1000);
    }
  }
  
  /**
   * 显示 Toast 提示（波普风）
   * @param {string} message - 显示文本
   * @param {number} duration - 显示时长(ms)，默认3000
   * @param {string} icon - 可选的emoji图标，默认💥
   */
  _showToast(message, duration = 3000, icon = '💥') {
    // 使用波普风 Toast 组件
    if (this.toast) {
      this.toast.show(message, duration, icon);
    }
    
    // 控制台输出
    console.log(`[GameplayScene] Toast: ${message}`);
  }

  _cleanDirt(dirt) {
    dirt.cleanProgress += 0.3;
    if (dirt.cleanProgress >= 1) {
      dirt.state = 'clean';
      // 打印清洁进度
      const mainTotal = this.dirtObjects.length;
      const mainCleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
      console.log('[GameplayScene] 清洁完成:', dirt.name, 'mainTotal:', mainTotal, 'mainCleaned:', mainCleaned);
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
