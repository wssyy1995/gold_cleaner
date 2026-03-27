/**
 * SceneManager 场景管理器
 * 负责任务 2.2.1 ~ 2.2.5
 * - 设计场景管理器架构
 * - 实现场景加载功能
 * - 实现场景切换与过渡动画
 * - 实现场景卸载与资源释放
 * - 实现场景栈管理
 */

import { globalEvent } from '../core/EventEmitter';

class SceneManager {
  constructor() {
    // 2.2.1 设计场景管理器架构
    // 场景注册表
    this._scenes = new Map();
    
    // 当前场景实例
    this.currentScene = null;
    // 当前场景名称
    this.currentSceneName = null;
    
    // 2.2.5 实现场景栈管理
    // 场景栈（用于实现场景导航）
    this._sceneStack = [];
    // 最大栈深度
    this._maxStackDepth = 10;
    
    // 场景状态
    this._state = 'idle'; // idle, loading, transitioning, running
    
    // 2.2.3 实现场景切换与过渡动画
    // 过渡动画配置
    this.transition = {
      enabled: true,
      duration: 300, // 毫秒
      type: 'fade', // fade, slide, none
      isPlaying: false
    };
    
    // 加载配置
    this.loading = {
      showLoading: true,
      minLoadingTime: 500 // 最小加载时间（毫秒）
    };

    // 事件监听
    this._eventListeners = [];
  }

  /**
   * 初始化场景管理器
   */
  init() {
    console.log('[SceneManager] 初始化场景管理器');
    this._bindEvents();
  }

  /**
   * 绑定全局事件
   */
  _bindEvents() {
    // 监听游戏暂停/恢复
    this._eventListeners.push(
      globalEvent.on('game:pause', () => {
        if (this.currentScene) {
          this.currentScene.pause();
        }
      }),
      globalEvent.on('game:resume', () => {
        if (this.currentScene) {
          this.currentScene.resume();
        }
      })
    );
  }

  /**
   * 2.2.1 设计场景管理器架构
   * 注册场景
   * @param {string} name - 场景名称
   * @param {Class} SceneClass - 场景类
   */
  register(name, SceneClass) {
    if (this._scenes.has(name)) {
      console.warn(`[SceneManager] 场景 "${name}" 已存在，将被覆盖`);
    }
    
    this._scenes.set(name, {
      name,
      class: SceneClass,
      instance: null
    });
    
    console.log(`[SceneManager] 注册场景: ${name}`);
  }

  /**
   * 批量注册场景
   * @param {Object} scenes - 场景映射 { name: SceneClass }
   */
  registerScenes(scenes) {
    for (const [name, SceneClass] of Object.entries(scenes)) {
      this.register(name, SceneClass);
    }
  }

  /**
   * 取消注册场景
   * @param {string} name - 场景名称
   */
  unregister(name) {
    const sceneInfo = this._scenes.get(name);
    if (sceneInfo && sceneInfo.instance) {
      // 2.2.4 实现场景卸载与资源释放
      sceneInfo.instance.destroy();
    }
    this._scenes.delete(name);
  }

  /**
   * 获取场景类
   * @param {string} name - 场景名称
   * @returns {Class|undefined}
   */
  getSceneClass(name) {
    const sceneInfo = this._scenes.get(name);
    return sceneInfo ? sceneInfo.class : undefined;
  }

  /**
   * 获取场景实例
   * @param {string} name - 场景名称
   * @returns {Object|undefined}
   */
  getSceneInstance(name) {
    const sceneInfo = this._scenes.get(name);
    return sceneInfo ? sceneInfo.instance : undefined;
  }

  /**
   * 检查场景是否已注册
   * @param {string} name - 场景名称
   * @returns {boolean}
   */
  hasScene(name) {
    return this._scenes.has(name);
  }

  /**
   * 2.2.2 实现场景加载功能
   * 加载场景（不切换，仅预加载）
   * @param {string} name - 场景名称
   * @param {Object} data - 场景数据
   * @returns {Promise<Object>}
   */
  async preload(name, data = {}) {
    const sceneInfo = this._scenes.get(name);
    if (!sceneInfo) {
      console.error(`[SceneManager] 未找到场景: ${name}`);
      return null;
    }

    // 如果已有实例，直接返回
    if (sceneInfo.instance) {
      return sceneInfo.instance;
    }

    console.log(`[SceneManager] 预加载场景: ${name}`);
    this._state = 'loading';

    const startTime = Date.now();

    try {
      // 创建场景实例
      const scene = new sceneInfo.class();
      
      // 调用预加载方法
      if (scene.preload) {
        await scene.preload(data);
      }

      sceneInfo.instance = scene;

      // 确保最小加载时间
      const elapsed = Date.now() - startTime;
      const remaining = this.loading.minLoadingTime - elapsed;
      if (remaining > 0) {
        await this._delay(remaining);
      }

      globalEvent.emit('scene:preload', name, scene);
      this._state = 'idle';

      return scene;
    } catch (error) {
      console.error(`[SceneManager] 预加载场景失败: ${name}`, error);
      this._state = 'idle';
      throw error;
    }
  }

  /**
   * 2.2.3 实现场景切换与过渡动画
   * 切换场景
   * @param {string} name - 场景名称
   * @param {Object} data - 传递给场景的数据
   * @param {Object} options - 切换选项
   */
  async switchScene(name, data = {}, options = {}) {
    const {
      transition = this.transition.type,
      duration = this.transition.duration,
      pushToStack = false
    } = options;

    // 检查状态
    if (this._state === 'transitioning') {
      console.warn('[SceneManager] 正在切换场景中，请稍候');
      return;
    }

    // 检查场景是否存在
    const sceneInfo = this._scenes.get(name);
    if (!sceneInfo) {
      console.error(`[SceneManager] 未找到场景: ${name}`);
      return;
    }

    // 如果是同一场景，不切换
    if (this.currentSceneName === name) {
      console.log(`[SceneManager] 已经在场景 "${name}"，不切换`);
      return;
    }

    console.log(`[SceneManager] 切换场景: ${this.currentSceneName} -> ${name}`);
    this._state = 'transitioning';

    // 2.2.5 实现场景栈管理
    // 将当前场景压入栈
    if (pushToStack && this.currentScene) {
      this._pushToStack(this.currentSceneName, this.currentScene);
    }

    // 执行过渡动画 - 出场
    if (this.transition.enabled && transition !== 'none') {
      await this._playTransitionOut(transition, duration);
    }

    // 退出当前场景
    await this._exitCurrentScene();

    // 加载新场景
    const newScene = await this._enterNewScene(name, data);

    // 执行过渡动画 - 入场
    if (this.transition.enabled && transition !== 'none') {
      await this._playTransitionIn(transition, duration);
    }

    // 更新当前场景
    this.currentScene = newScene;
    this.currentSceneName = name;
    this._state = 'running';

    globalEvent.emit('scene:switched', name, data);

    return newScene;
  }

  /**
   * 2.2.5 实现场景栈管理
   * 推入场景（保留当前场景状态，用于弹窗等）
   * @param {string} name - 场景名称
   * @param {Object} data - 场景数据
   * @param {Object} options - 选项
   */
  async pushScene(name, data = {}, options = {}) {
    return this.switchScene(name, data, { ...options, pushToStack: true });
  }

  /**
   * 2.2.5 实现场景栈管理
   * 弹出场景（返回上一个场景）
   * @param {Object} data - 传递给场景的数据
   */
  async popScene(data = {}) {
    if (this._sceneStack.length === 0) {
      console.warn('[SceneManager] 场景栈为空，无法返回');
      return;
    }

    if (this._state === 'transitioning') {
      console.warn('[SceneManager] 正在切换场景中，请稍候');
      return;
    }

    const { name, scene } = this._sceneStack.pop();
    console.log(`[SceneManager] 弹出场景，返回: ${name}`);

    this._state = 'transitioning';

    // 过渡动画出场
    if (this.transition.enabled) {
      await this._playTransitionOut(this.transition.type, this.transition.duration);
    }

    // 退出当前场景
    await this._exitCurrentScene();

    // 恢复上一个场景
    this.currentScene = scene;
    this.currentSceneName = name;

    // 恢复场景
    scene.resume();
    if (scene.onResumeFromStack) {
      scene.onResumeFromStack(data);
    }

    // 过渡动画入场
    if (this.transition.enabled) {
      await this._playTransitionIn(this.transition.type, this.transition.duration);
    }

    this._state = 'running';
    globalEvent.emit('scene:popped', name, data);

    return scene;
  }

  /**
   * 返回栈顶场景名称（不弹出）
   * @returns {string|null}
   */
  peekStack() {
    if (this._sceneStack.length === 0) return null;
    return this._sceneStack[this._sceneStack.length - 1].name;
  }

  /**
   * 清空场景栈
   */
  clearStack() {
    // 2.2.4 实现场景卸载与资源释放
    for (const { scene } of this._sceneStack) {
      if (scene && scene.destroy) {
        scene.destroy();
      }
    }
    this._sceneStack = [];
  }

  /**
   * 获取场景栈深度
   * @returns {number}
   */
  getStackDepth() {
    return this._sceneStack.length;
  }

  /**
   * 退出当前场景
   */
  async _exitCurrentScene() {
    if (!this.currentScene) return;

    // 暂停场景
    this.currentScene.pause();

    // 调用退出回调
    if (this.currentScene.onExit) {
      await this.currentScene.onExit();
    }

    // 2.2.4 实现场景卸载与资源释放
    // 如果不需要保留实例，销毁它
    const sceneInfo = this._scenes.get(this.currentSceneName);
    if (sceneInfo && sceneInfo.instance && !this._isSceneInStack(this.currentSceneName)) {
      if (this.currentScene.destroy) {
        this.currentScene.destroy();
      }
      sceneInfo.instance = null;
    }

    globalEvent.emit('scene:exit', this.currentSceneName, this.currentScene);
  }

  /**
   * 进入新场景
   */
  async _enterNewScene(name, data) {
    // 2.2.2 实现场景加载功能
    // 预加载场景
    let scene = await this.preload(name, data);

    // 调用进入回调
    if (scene.onEnter) {
      await scene.onEnter(data);
    }

    // 启动场景
    if (scene.start) {
      scene.start();
    }

    globalEvent.emit('scene:enter', name, scene);

    return scene;
  }

  /**
   * 压入场景栈
   */
  _pushToStack(name, scene) {
    if (this._sceneStack.length >= this._maxStackDepth) {
      // 移除栈底的场景
      const removed = this._sceneStack.shift();
      if (removed.scene && removed.scene.destroy) {
        removed.scene.destroy();
      }
    }

    this._sceneStack.push({ name, scene });
    scene.pause();

    if (scene.onPauseToStack) {
      scene.onPauseToStack();
    }

    globalEvent.emit('scene:pushed', name, scene);
  }

  /**
   * 检查场景是否在栈中
   */
  _isSceneInStack(name) {
    return this._sceneStack.some(item => item.name === name);
  }

  /**
   * 播放过渡动画 - 出场
   */
  async _playTransitionOut(type, duration) {
    return new Promise(resolve => {
      globalEvent.emit('scene:transition:out', type, duration);

      // 这里可以添加实际的动画效果
      // 例如淡出、滑动等

      setTimeout(resolve, duration / 2);
    });
  }

  /**
   * 播放过渡动画 - 入场
   */
  async _playTransitionIn(type, duration) {
    return new Promise(resolve => {
      globalEvent.emit('scene:transition:in', type, duration);

      // 这里可以添加实际的动画效果

      setTimeout(resolve, duration / 2);
    });
  }

  /**
   * 更新当前场景
   * @param {number} deltaTime - 距离上一帧的时间间隔
   */
  update(deltaTime) {
    if (this.currentScene && this._state === 'running') {
      if (this.currentScene.update) {
        this.currentScene.update(deltaTime);
      }
    }
  }

  /**
   * 渲染当前场景
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   */
  render(ctx) {
    if (this.currentScene && this._state !== 'transitioning') {
      if (this.currentScene.render) {
        this.currentScene.render(ctx);
      }
    }
  }

  /**
   * 设置过渡动画配置
   * @param {Object} config - 配置
   */
  setTransitionConfig(config) {
    this.transition = { ...this.transition, ...config };
  }

  /**
   * 设置加载配置
   * @param {Object} config - 配置
   */
  setLoadingConfig(config) {
    this.loading = { ...this.loading, ...config };
  }

  /**
   * 获取当前状态
   * @returns {string}
   */
  getState() {
    return this._state;
  }

  /**
   * 延迟辅助函数
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 销毁场景管理器
   */
  destroy() {
    // 清理事件监听
    this._eventListeners.forEach(off => off && off());
    this._eventListeners = [];

    // 清空场景栈
    this.clearStack();

    // 销毁所有场景实例
    for (const [name, sceneInfo] of this._scenes) {
      if (sceneInfo.instance && sceneInfo.instance.destroy) {
        sceneInfo.instance.destroy();
      }
    }
    this._scenes.clear();

    this.currentScene = null;
    this.currentSceneName = null;
  }
}

export default SceneManager;
