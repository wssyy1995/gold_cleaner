/**
 * GameManager 游戏管理器
 * 负责游戏整体逻辑控制
 */

import SceneManager from './SceneManager';
import DataManager from './DataManager';
import ResourceManager from './ResourceManager';
import { globalEvent } from '../core/EventEmitter';

class GameManager {
  constructor() {
    // 是否已初始化
    this._initialized = false;
    // 是否正在运行
    this._running = false;
    // 是否暂停
    this._paused = false;

    // 游戏画布
    this.canvas = null;
    this.ctx = null;

    // 屏幕尺寸
    this.screenWidth = 0;
    this.screenHeight = 0;
    this.dpr = 1;

    // 管理器实例
    this.sceneManager = null;
    this.dataManager = null;
    this.resourceManager = null;

    // 游戏循环相关
    this._lastTime = 0;
    this._gameLoopId = null;
    this._fps = 60;
    this._frameInterval = 1000 / 60;

    // 绑定游戏循环
    this._gameLoop = this._gameLoop.bind(this);
  }

  /**
   * 初始化游戏
   */
  init() {
    if (this._initialized) return;

    console.log('[GameManager] 初始化游戏管理器');

    // 初始化画布
    this._initCanvas();

    // 初始化管理器
    this.sceneManager = new SceneManager();
    this.sceneManager.init();

    this.dataManager = new DataManager();
    this.dataManager.init();

    this.resourceManager = new ResourceManager();
    this.resourceManager.init();

    // 监听全局事件
    this._bindEvents();

    this._initialized = true;

    // 注意：游戏循环由 Main.js 统一管理，这里不启动
    // this.start();

    console.log('[GameManager] 游戏管理器初始化完成');
  }

  /**
   * 初始化画布
   * 注意：如果外部已设置 canvas，则不重新创建
   */
  _initCanvas() {
    // 如果外部已设置画布，跳过初始化
    if (this.canvas && this.ctx) {
      console.log('[GameManager] 使用外部设置的画布');
      return;
    }
    
    if (typeof wx !== 'undefined') {
      // 获取系统信息
      const sysInfo = wx.getSystemInfoSync();
      this.dpr = sysInfo.pixelRatio;
      this.screenWidth = sysInfo.windowWidth;
      this.screenHeight = sysInfo.windowHeight;

      // 创建画布
      this.canvas = wx.createCanvas();
      this.ctx = this.canvas.getContext('2d');

      // 设置画布尺寸
      this.canvas.width = this.screenWidth * this.dpr;
      this.canvas.height = this.screenHeight * this.dpr;
      this.canvas.style.width = this.screenWidth + 'px';
      this.canvas.style.height = this.screenHeight + 'px';

      // 缩放上下文以匹配DPR
      this.ctx.scale(this.dpr, this.dpr);

      console.log(`[GameManager] 画布初始化: ${this.screenWidth}x${this.screenHeight}, DPR: ${this.dpr}`);
    }
  }

  /**
   * 绑定全局事件
   */
  _bindEvents() {
    globalEvent.on('scene:change', (sceneName) => {
      console.log(`[GameManager] 场景切换: ${sceneName}`);
    });

    // 监听触摸事件
    if (typeof wx !== 'undefined') {
      wx.onTouchStart(this._onTouchStart.bind(this));
      wx.onTouchMove(this._onTouchMove.bind(this));
      wx.onTouchEnd(this._onTouchEnd.bind(this));
      wx.onTouchCancel(this._onTouchCancel.bind(this));
    }
  }

  /**
   * 触摸开始处理
   */
  _onTouchStart(e) {
    if (this._paused) return;
    globalEvent.emit('touchstart', e);
  }

  /**
   * 触摸移动处理
   */
  _onTouchMove(e) {
    if (this._paused) return;
    globalEvent.emit('touchmove', e);
  }

  /**
   * 触摸结束处理
   */
  _onTouchEnd(e) {
    if (this._paused) return;
    globalEvent.emit('touchend', e);
  }

  /**
   * 触摸取消处理
   */
  _onTouchCancel(e) {
    globalEvent.emit('touchcancel', e);
  }

  /**
   * 启动游戏
   */
  start() {
    if (this._running) return;

    console.log('[GameManager] 启动游戏');

    this._running = true;
    this._paused = false;
    this._lastTime = Date.now();

    // 开始游戏循环
    this._requestFrame();

    globalEvent.emit('game:start');
  }

  /**
   * 暂停游戏
   */
  pause() {
    if (!this._running || this._paused) return;

    console.log('[GameManager] 暂停游戏');

    this._paused = true;
    globalEvent.emit('game:pause');
  }

  /**
   * 恢复游戏
   */
  resume() {
    if (!this._running || !this._paused) return;

    console.log('[GameManager] 恢复游戏');

    this._paused = false;
    this._lastTime = Date.now();
    globalEvent.emit('game:resume');
  }

  /**
   * 停止游戏
   */
  stop() {
    if (!this._running) return;

    console.log('[GameManager] 停止游戏');

    this._running = false;
    this._paused = false;

    if (this._gameLoopId) {
      cancelAnimationFrame(this._gameLoopId);
      this._gameLoopId = null;
    }

    globalEvent.emit('game:stop');
  }

  /**
   * 游戏循环
   */
  _gameLoop() {
    if (!this._running) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - this._lastTime;
    this._lastTime = currentTime;

    if (!this._paused) {
      this.update(deltaTime);
      this.render();
    }

    this._requestFrame();
  }

  /**
   * 请求下一帧
   */
  _requestFrame() {
    // 使用全局的 requestAnimationFrame（小游戏支持）
    this._gameLoopId = requestAnimationFrame(this._gameLoop);
  }

  /**
   * 更新游戏逻辑
   * @param {number} deltaTime - 距离上一帧的时间间隔
   */
  update(deltaTime) {
    // 更新场景管理器
    if (this.sceneManager) {
      this.sceneManager.update(deltaTime);
    }

    // 更新资源管理器
    if (this.resourceManager) {
      this.resourceManager.update(deltaTime);
    }
  }

  /**
   * 渲染游戏画面
   */
  render() {
    if (!this.ctx) return;

    // 清空画布
    this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

    // 渲染当前场景
    if (this.sceneManager && this.sceneManager.currentScene) {
      this.sceneManager.render(this.ctx);
    }
  }

  /**
   * 切换场景
   * @param {string} sceneName - 场景名称
   * @param {Object} data - 场景数据
   */
  switchScene(sceneName, data = {}) {
    if (this.sceneManager) {
      this.sceneManager.switchScene(sceneName, data);
    }
  }

  /**
   * 获取当前场景
   * @returns {Scene|null}
   */
  getCurrentScene() {
    return this.sceneManager ? this.sceneManager.currentScene : null;
  }
}

export default GameManager;
