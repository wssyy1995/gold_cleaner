/**
 * SceneManager 场景管理器
 * 管理场景的切换、加载和生命周期
 */

import { globalEvent } from '../core/EventEmitter';

class SceneManager {
  constructor() {
    // 场景注册表
    this._scenes = new Map();
    // 当前场景
    this.currentScene = null;
    // 场景栈（用于导航）
    this._sceneStack = [];
    // 过渡动画持续时间（毫秒）
    this.transitionDuration = 300;
    // 是否正在切换场景
    this._isTransitioning = false;
  }

  /**
   * 初始化场景管理器
   */
  init() {
    console.log('[SceneManager] 初始化场景管理器');
  }

  /**
   * 注册场景
   * @param {string} name - 场景名称
   * @param {Scene} sceneClass - 场景类
   */
  register(name, sceneClass) {
    this._scenes.set(name, sceneClass);
    console.log(`[SceneManager] 注册场景: ${name}`);
  }

  /**
   * 获取场景类
   * @param {string} name - 场景名称
   * @returns {Scene|undefined}
   */
  getSceneClass(name) {
    return this._scenes.get(name);
  }

  /**
   * 切换场景
   * @param {string} name - 场景名称
   * @param {Object} data - 传递给场景的数据
   * @param {boolean} pushToStack - 是否将当前场景压入栈
   */
  switchScene(name, data = {}, pushToStack = false) {
    if (this._isTransitioning) {
      console.warn('[SceneManager] 正在切换场景中，请稍候');
      return;
    }

    const SceneClass = this._scenes.get(name);
    if (!SceneClass) {
      console.error(`[SceneManager] 未找到场景: ${name}`);
      return;
    }

    this._isTransitioning = true;

    console.log(`[SceneManager] 切换到场景: ${name}`);

    // 将当前场景压入栈
    if (pushToStack && this.currentScene) {
      this._sceneStack.push(this.currentScene);
    }

    // 退出当前场景
    if (this.currentScene) {
      this.currentScene.exit();
      this.currentScene.unload();
    }

    // 创建并加载新场景
    const newScene = new SceneClass();
    newScene.load(data);
    newScene.enter();

    this.currentScene = newScene;

    globalEvent.emit('scene:change', name, data);

    this._isTransitioning = false;
  }

  /**
   * 推入场景（保留当前场景状态）
   * @param {string} name - 场景名称
   * @param {Object} data - 传递给场景的数据
   */
  pushScene(name, data = {}) {
    this.switchScene(name, data, true);
  }

  /**
   * 弹出场景（返回上一个场景）
   * @param {Object} data - 传递给场景的数据
   */
  popScene(data = {}) {
    if (this._sceneStack.length === 0) {
      console.warn('[SceneManager] 场景栈为空，无法返回');
      return;
    }

    if (this._isTransitioning) {
      console.warn('[SceneManager] 正在切换场景中，请稍候');
      return;
    }

    this._isTransitioning = true;

    // 获取栈顶场景
    const previousScene = this._sceneStack.pop();

    // 退出当前场景
    if (this.currentScene) {
      this.currentScene.exit();
      this.currentScene.unload();
    }

    // 恢复上一个场景
    previousScene.resume();
    this.currentScene = previousScene;

    globalEvent.emit('scene:change', previousScene.sceneName, data);

    this._isTransitioning = false;
  }

  /**
   * 更新当前场景
   * @param {number} deltaTime - 距离上一帧的时间间隔
   */
  update(deltaTime) {
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }

  /**
   * 渲染当前场景
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   */
  render(ctx) {
    if (this.currentScene) {
      this.currentScene.render(ctx);
    }
  }

  /**
   * 清空场景栈
   */
  clearStack() {
    this._sceneStack = [];
  }

  /**
   * 获取场景栈深度
   * @returns {number}
   */
  getStackDepth() {
    return this._sceneStack.length;
  }
}

export default SceneManager;
