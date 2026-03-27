/**
 * Scene 场景基类
 * 管理场景的生命周期
 */

import GameObject from './GameObject';
import { globalEvent } from './EventEmitter';

class Scene extends GameObject {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    super(options);

    // 场景名称
    this.sceneName = options.name || 'Scene';
    // 场景是否已加载
    this._loaded = false;
    // 场景是否暂停
    this._paused = false;
    // 场景数据
    this.data = options.data || {};
  }

  /**
   * 加载场景
   * @param {Object} data - 场景数据
   */
  load(data = {}) {
    if (this._loaded) return;

    console.log(`[Scene] 加载场景: ${this.sceneName}`);

    this.data = { ...this.data, ...data };

    this.onLoad();

    this._loaded = true;

    // 发送场景加载事件
    globalEvent.emit('scene:loaded', this);

    // 初始化场景
    this.init();
  }

  /**
   * 加载回调（子类重写）
   */
  onLoad() {
    // 子类实现
  }

  /**
   * 初始化回调（重写父类方法）
   */
  onInit() {
    // 子类实现
  }

  /**
   * 进入场景
   */
  enter() {
    console.log(`[Scene] 进入场景: ${this.sceneName}`);

    this.onEnter();

    // 发送场景进入事件
    globalEvent.emit('scene:enter', this);
  }

  /**
   * 进入场景回调（子类重写）
   */
  onEnter() {
    // 子类实现
  }

  /**
   * 更新回调（重写父类方法）
   * @param {number} deltaTime - 距离上一帧的时间间隔
   */
  onUpdate(deltaTime) {
    if (this._paused) return;
    // 子类实现
  }

  /**
   * 暂停场景
   */
  pause() {
    if (this._paused) return;

    this._paused = true;
    this.onPause();

    globalEvent.emit('scene:pause', this);
  }

  /**
   * 暂停回调（子类重写）
   */
  onPause() {
    // 子类实现
  }

  /**
   * 恢复场景
   */
  resume() {
    if (!this._paused) return;

    this._paused = false;
    this.onResume();

    globalEvent.emit('scene:resume', this);
  }

  /**
   * 恢复回调（子类重写）
   */
  onResume() {
    // 子类实现
  }

  /**
   * 退出场景
   */
  exit() {
    console.log(`[Scene] 退出场景: ${this.sceneName}`);

    this.onExit();

    // 发送场景退出事件
    globalEvent.emit('scene:exit', this);
  }

  /**
   * 退出场景回调（子类重写）
   */
  onExit() {
    // 子类实现
  }

  /**
   * 卸载场景
   */
  unload() {
    if (!this._loaded) return;

    console.log(`[Scene] 卸载场景: ${this.sceneName}`);

    this.onUnload();

    // 销毁场景内所有对象
    for (const child of this.children) {
      child.destroy();
    }
    this.children = [];

    this._loaded = false;

    globalEvent.emit('scene:unload', this);
  }

  /**
   * 卸载回调（子类重写）
   */
  onUnload() {
    // 子类实现
  }

  /**
   * 查找场景中的对象
   * @param {string} name - 对象名称
   * @returns {GameObject|null}
   */
  findObject(name) {
    for (const child of this.children) {
      if (child.name === name) {
        return child;
      }
      // 递归查找
      if (child.children.length > 0) {
        const found = this._findInChildren(child, name);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 在子对象中递归查找
   * @param {GameObject} parent - 父对象
   * @param {string} name - 对象名称
   * @returns {GameObject|null}
   */
  _findInChildren(parent, name) {
    for (const child of parent.children) {
      if (child.name === name) {
        return child;
      }
      if (child.children.length > 0) {
        const found = this._findInChildren(child, name);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 查找带有指定标签的所有对象
   * @param {string} tag - 标签
   * @returns {GameObject[]}
   */
  findObjectsWithTag(tag) {
    const results = [];
    for (const child of this.children) {
      if (child.tag === tag) {
        results.push(child);
      }
    }
    return results;
  }
}

export default Scene;
