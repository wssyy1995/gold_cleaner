/**
 * 游戏主入口
 * 初始化并启动游戏
 */

import GameManager from './managers/GameManager';
import SceneManager from './engine/SceneManager';
import ResourceLoader from './cloud/ResourceLoader';

// 导入场景
import LoadingScene from './scenes/LoadingScene';
import HomeScene from './scenes/HomeScene';
import GameplayScene from './scenes/GameplayScene';
import ShopScene from './scenes/ShopScene';
import ToolScene from './scenes/ToolScene';
import SettingScene from './scenes/SettingScene';

// 导入弹窗管理器
import DialogManager from './ui/dialogs/DialogManager';
import SettlementDialog from './ui/dialogs/SettlementDialog';

// 导入配置
import LevelManager from './game/LevelManager';
import ToolManager from './game/ToolManager';
import CurrencySystem from './game/CurrencySystem';

class Main {
  constructor() {
    console.log('[Main] 游戏启动');
    
    this.gameManager = null;
    this.sceneManager = null;
    this.dialogManager = null;
    this.resourceLoader = null;
    
    this.init();
  }

  async init() {
    try {
      // 1. 初始化 Canvas
      this._initCanvas();
      
      // 2. 初始化资源加载器
      this.resourceLoader = new ResourceLoader();
      await this.resourceLoader.init();
      
      // 3. 初始化游戏管理器
      this.gameManager = new GameManager();
      this.gameManager.canvas = this.canvas;
      this.gameManager.ctx = this.ctx;
      this.gameManager.init();
      
      // 5. 初始化场景管理器
      this.sceneManager = new SceneManager();
      this.sceneManager.init();
      
      // 设置默认过渡动画配置
      this.sceneManager.setTransitionConfig({
        enabled: false,  // 临时禁用，测试是否是过渡导致的问题
        duration: 300,
        type: 'fade'  // fade, slide, scale, wipe, curtain
      });
      
      // 6. 注册场景
      this._registerScenes();
      
      // 7. 初始化弹窗管理器
      this.dialogManager = new DialogManager();
      this.dialogManager.setScreenSize(this.screenWidth, this.screenHeight);
      this.dialogManager.init();
      
      // 8. 监听场景切换事件
      this._bindEvents();
      
      // 9. 立即启动游戏 - 先进入加载场景（避免黑屏等待）
      console.log('[Main] 切换到LoadingScene');
      this.sceneManager.switchScene('LoadingScene');
      
      // 10. 开始游戏循环
      this._startGameLoop();
      
      // 11. 在加载页显示后，初始化游戏系统（延迟执行，避免阻塞渲染）
      setTimeout(() => {
        this._initGameSystemsDeferred();
      }, 100)
      
    } catch (error) {
      console.error('[Main] 初始化失败:', error);
    }
  }

  /**
   * 初始化 Canvas
   * 使用逻辑像素 + ctx.scale(dpr) 方案
   */
  _initCanvas() {
    if (typeof wx !== 'undefined') {
      const sysInfo = wx.getSystemInfoSync();
      this.dpr = sysInfo.pixelRatio;
      // 使用逻辑像素（设计基准 750x1334 对应逻辑像素）
      this.screenWidth = sysInfo.windowWidth;
      this.screenHeight = sysInfo.windowHeight;
      
      this.canvas = wx.createCanvas();
      this.ctx = this.canvas.getContext('2d');
      
      // Canvas 缓冲区 = 逻辑尺寸 * dpr (物理像素)
      this.canvas.width = this.screenWidth * this.dpr;
      this.canvas.height = this.screenHeight * this.dpr;
      
      // 缩放坐标系，让 drawImage 可以用逻辑单位
      this.ctx.scale(this.dpr, this.dpr);
      
      console.log(`[Main] 逻辑像素: ${this.screenWidth}x${this.screenHeight}, DPR: ${this.dpr}, 缓冲区: ${this.canvas.width}x${this.canvas.height}`);
    } else {
      // 浏览器环境
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.dpr = window.devicePixelRatio || 1;
      this.screenWidth = 375;
      this.screenHeight = 667;
      
      this.canvas.width = this.screenWidth * this.dpr;
      this.canvas.height = this.screenHeight * this.dpr;
      this.canvas.style.width = this.screenWidth + 'px';
      this.canvas.style.height = this.screenHeight + 'px';
      
      this.ctx.scale(this.dpr, this.dpr);
      
      document.body.appendChild(this.canvas);
    }
  }

  /**
   * 注册场景
   */
  _registerScenes() {
    // 先设置 SceneManager 的屏幕尺寸，创建实例时会自动注入
    this.sceneManager.screenWidth = this.screenWidth;
    this.sceneManager.screenHeight = this.screenHeight;
    this.sceneManager.dpr = this.dpr;
    
    // 注册到场景管理器（SceneManager 会创建实例并注入屏幕尺寸）
    this.sceneManager.register('LoadingScene', LoadingScene);
    this.sceneManager.register('HomeScene', HomeScene);
    this.sceneManager.register('GameplayScene', GameplayScene);
    this.sceneManager.register('ShopScene', ShopScene);
    this.sceneManager.register('ToolScene', ToolScene);
    this.sceneManager.register('SettingScene', SettingScene);
    
    console.log('[Main] 场景注册完成，屏幕尺寸:', this.screenWidth, 'x', this.screenHeight);
  }

  /**
   * 初始化游戏系统
   */
  /**
   * 初始化游戏系统
   * 在加载页显示后执行，避免启动黑屏
   */
  _initGameSystems() {
    // 游戏系统初始化延迟到 _initGameSystemsDeferred 执行
    // 这样加载页可以先显示，避免用户看到黑屏等待
    console.log('[Main] 游戏系统初始化将延迟执行');
  }
  
  /**
   * 延迟初始化游戏系统（在加载页显示后执行）
   */
  _initGameSystemsDeferred() {
    console.log('[Main] 开始初始化游戏系统...');
    
    try {
      // 关卡管理器
      this.levelManager = new LevelManager();
      this.levelManager.init();
      
      // 工具管理器
      this.toolManager = new ToolManager();
      this.toolManager.init();
      
      // 金币系统
      this.currencySystem = new CurrencySystem();
      this.currencySystem.init();
      this.currencySystem.addCoins(100, 'init');
      
      console.log('[Main] 游戏系统初始化完成');
    } catch (e) {
      console.error('[Main] 游戏系统初始化失败:', e);
    }
  }

  /**
   * 绑定全局事件
   */
  _bindEvents() {
    const { globalEvent } = require('./core/EventEmitter');
    
    // 场景切换事件
    globalEvent.on('scene:switch', (sceneName, data) => {
      console.log(`[Main] 切换场景: ${sceneName}`, data);
      
      // 构建切换选项
      const options = {};
      if (data) {
        // 支持自定义过渡类型
        if (data.transition) {
          options.transition = data.transition;
        }
        if (data.direction) {
          options.direction = data.direction;
        }
      }
      
      this.sceneManager.switchScene(sceneName, data, options);
    });
    
    // 游戏事件
    globalEvent.on('game:levelComplete', (result) => {
      console.log('[Main] 关卡完成:', result);
      
      // 保存关卡进度到 DataManager
      const dataManager = this.gameManager ? this.gameManager.dataManager : null;
      if (dataManager) {
        // 1. 记录关卡完成和星级
        dataManager.completeLevel(result.levelId, result.stars);
        
        // 2. 解锁下一关（如果不是当前 stage 的最后一关）
        const isLastLevelOfStage = result.levelId % 10 === 0;
        if (!isLastLevelOfStage) {
          dataManager.unlockLevel(result.levelId + 1);
        } else {
          // 是当前 stage 的最后一关，解锁下一个 stage
          const currentStage = Math.ceil(result.levelId / 10);
          dataManager.setCurrentStage(currentStage + 1);
          // 解锁下一 stage 的第一关
          dataManager.unlockLevel(result.levelId + 1);
        }
      }
      
      // 显示结算弹窗
      const dialog = new SettlementDialog({
        screenWidth: this.screenWidth,
        screenHeight: this.screenHeight,
        levelId: result.levelId,
        stars: result.stars,
        coins: result.rewards ? result.rewards.coins : 50,
        onNext: () => {
          // 进入下一关
          const isLastLevelOfStage = result.levelId % 10 === 0;
          const nextLevelId = result.levelId + 1;
          const nextStage = Math.ceil(nextLevelId / 10);
          globalEvent.emit('scene:switch', 'GameplayScene', { 
            levelId: isLastLevelOfStage ? 1 : nextLevelId,
            stage: nextStage
          });
        },
        onReplay: () => {
          // 重玩当前关
          globalEvent.emit('scene:switch', 'GameplayScene', { 
            levelId: result.levelId,
            stage: Math.ceil(result.levelId / 10)
          });
        },
        onHome: () => {
          // 返回首页
          globalEvent.emit('scene:switch', 'HomeScene');
        }
      });
      this.dialogManager.register('settlement', dialog);
      this.dialogManager.show('settlement');
    });
    
    // 弹窗显示事件（使用 dialog:open 避免与 Dialog.show() 内部事件冲突）
    globalEvent.on('dialog:open', (dialogName, dialogInstance) => {
      console.log(`[Main] 显示弹窗: ${dialogName}`);
      if (!dialogInstance) {
        console.error(`[Main] 弹窗实例为 null: ${dialogName}`);
        return;
      }
      this.dialogManager.register(dialogName, dialogInstance);
      this.dialogManager.show(dialogName);
    });
    
    // 绑定触摸事件 - 只需要绑定一次
    if (typeof wx !== 'undefined') {
      wx.onTouchStart((e) => {
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        
        this._handleTouchStart(x, y);
      });
      
      wx.onTouchMove((e) => {
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        
        this._handleTouchMove(x, y);
      });
      
      wx.onTouchEnd((e) => {
        const touch = e.changedTouches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        
        this._handleTouchEnd(x, y);
      });
    }
  }

  /**
   * 处理触摸开始
   */
  _handleTouchStart(x, y) {
    // 先检查弹窗
    if (this.dialogManager.hasVisibleDialog()) {
      this.dialogManager.onTouchStart(x, y);
      return;
    }
    
    // 再检查当前场景
    const currentScene = this.sceneManager.currentScene;
    if (currentScene && currentScene.onTouchStart) {
      currentScene.onTouchStart(x, y);
    }
  }

  /**
   * 处理触摸移动
   */
  _handleTouchMove(x, y) {
    if (this.dialogManager.hasVisibleDialog()) {
      this.dialogManager.onTouchMove(x, y);
      return;
    }
    
    const currentScene = this.sceneManager.currentScene;
    if (currentScene && currentScene.onTouchMove) {
      currentScene.onTouchMove(x, y);
    }
  }

  /**
   * 处理触摸结束
   */
  _handleTouchEnd(x, y) {
    if (this.dialogManager.hasVisibleDialog()) {
      this.dialogManager.onTouchEnd(x, y);
      return;
    }
    
    const currentScene = this.sceneManager.currentScene;
    if (currentScene && currentScene.onTouchEnd) {
      currentScene.onTouchEnd(x, y);
    }
  }

  /**
   * 游戏主循环
   */
  _startGameLoop() {
    let lastTime = Date.now();
    
    const loop = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // 更新
      this._update(deltaTime);
      
      // 渲染
      this._render();
      
      // 下一帧
      if (typeof wx !== 'undefined') {
        requestAnimationFrame(loop);
      } else {
        requestAnimationFrame(loop);
      }
    };
    
    loop();
  }

  /**
   * 更新
   */
  _update(deltaTime) {
    // 更新场景
    if (this.sceneManager.currentScene) {
      this.sceneManager.update(deltaTime);
    }
    
    // 更新弹窗
    if (this.dialogManager) {
      this.dialogManager.update(deltaTime);
    }
  }

  /**
   * 渲染
   */
  _render() {
    // 检查是否有可渲染的场景（包括过渡期间的上一场景）
    const hasRenderableScene = this.sceneManager.currentScene || 
      (this.sceneManager._previousScene);
    
    // 只在有场景可渲染时才清空和渲染，避免场景切换时的白色闪烁
    if (hasRenderableScene) {
      // 清空画布
      this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);
      
      // 渲染当前场景（SceneManager 会处理过渡期间的场景选择）
      this.sceneManager.render(this.ctx);
      
      // 渲染弹窗
      if (this.dialogManager) {
        this.dialogManager.render(this.ctx);
      }
    }
    // 如果没有可渲染的场景，保持上一帧画面，不填充白色
  }
}

export default Main;
