/**
 * GameObject 基类
 * 所有游戏对象的基类，提供基础属性和生命周期方法
 */

import EventEmitter from './EventEmitter';

let _idCounter = 0;

/**
 * 生成唯一ID
 * @returns {number}
 */
function generateId() {
  return ++_idCounter;
}

class GameObject extends EventEmitter {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    super();

    // 唯一标识
    this.id = generateId();
    // 对象名称
    this.name = options.name || `GameObject_${this.id}`;
    // 对象标签（用于分类）
    this.tag = options.tag || 'default';
    // 是否激活
    this.active = options.active !== false;
    // 是否可见
    this.visible = options.visible !== false;

    // 变换属性
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.scaleX = options.scaleX || 1;
    this.scaleY = options.scaleY || 1;
    this.rotation = options.rotation || 0;
    this.alpha = options.alpha !== undefined ? options.alpha : 1;

    // 层级（用于渲染排序）
    this.zIndex = options.zIndex || 0;

    // 父对象
    this.parent = null;
    // 子对象列表
    this.children = [];

    // 组件列表
    this.components = new Map();

    // 生命周期状态
    this._initialized = false;
    this._destroyed = false;
  }

  /**
   * 初始化
   * 子类可重写此方法进行自定义初始化
   */
  init() {
    if (this._initialized) return;

    this.onInit();
    this._initialized = true;

    // 初始化所有子对象
    for (const child of this.children) {
      child.init();
    }
  }

  /**
   * 初始化回调（子类重写）
   */
  onInit() {
    // 子类实现
  }

  /**
   * 更新
   * @param {number} deltaTime - 距离上一帧的时间间隔（毫秒）
   */
  update(deltaTime) {
    if (!this.active || this._destroyed) return;

    this.onUpdate(deltaTime);

    // 更新所有组件
    for (const component of this.components.values()) {
      if (component.active) {
        component.update(deltaTime);
      }
    }

    // 更新所有子对象
    for (const child of this.children) {
      child.update(deltaTime);
    }
  }

  /**
   * 更新回调（子类重写）
   * @param {number} deltaTime - 距离上一帧的时间间隔
   */
  onUpdate(deltaTime) {
    // 子类实现
  }

  /**
   * 渲染
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   */
  render(ctx) {
    if (!this.visible || !this.active || this._destroyed) return;

    ctx.save();

    // 应用变换
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.globalAlpha = this.alpha;

    this.onRender(ctx);

    // 渲染所有组件
    for (const component of this.components.values()) {
      if (component.visible) {
        component.render(ctx);
      }
    }

    // 渲染所有子对象
    for (const child of this.children) {
      child.render(ctx);
    }

    ctx.restore();
  }

  /**
   * 渲染回调（子类重写）
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   */
  onRender(ctx) {
    // 子类实现
  }

  /**
   * 添加子对象
   * @param {GameObject} child - 子对象
   * @returns {GameObject}
   */
  addChild(child) {
    if (!(child instanceof GameObject)) {
      throw new TypeError('Child must be a GameObject');
    }

    if (child.parent) {
      child.parent.removeChild(child);
    }

    child.parent = this;
    this.children.push(child);
    child.init();

    return this;
  }

  /**
   * 移除子对象
   * @param {GameObject} child - 子对象
   * @returns {GameObject}
   */
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      child.parent = null;
      this.children.splice(index, 1);
    }
    return this;
  }

  /**
   * 添加组件
   * @param {Component} component - 组件
   * @returns {GameObject}
   */
  addComponent(component) {
    const constructor = component.constructor;
    this.components.set(constructor, component);
    component.setOwner(this);
    return this;
  }

  /**
   * 获取组件
   * @param {Function} componentClass - 组件类
   * @returns {Component|undefined}
   */
  getComponent(componentClass) {
    return this.components.get(componentClass);
  }

  /**
   * 移除组件
   * @param {Function} componentClass - 组件类
   * @returns {GameObject}
   */
  removeComponent(componentClass) {
    const component = this.components.get(componentClass);
    if (component) {
      component.destroy();
      this.components.delete(componentClass);
    }
    return this;
  }

  /**
   * 销毁对象
   */
  destroy() {
    if (this._destroyed) return;

    this.onDestroy();

    // 销毁所有子对象
    for (const child of this.children) {
      child.destroy();
    }
    this.children = [];

    // 销毁所有组件
    for (const component of this.components.values()) {
      component.destroy();
    }
    this.components.clear();

    // 从父对象中移除
    if (this.parent) {
      this.parent.removeChild(this);
    }

    this._destroyed = true;
    this.emit('destroy', this);
    this.removeAllListeners();
  }

  /**
   * 销毁回调（子类重写）
   */
  onDestroy() {
    // 子类实现
  }

  /**
   * 获取全局位置
   * @returns {{x: number, y: number}}
   */
  getGlobalPosition() {
    let x = this.x;
    let y = this.y;
    let parent = this.parent;

    while (parent) {
      x += parent.x;
      y += parent.y;
      parent = parent.parent;
    }

    return { x, y };
  }

  /**
   * 检查点是否在对象范围内
   * @param {number} x - 点X坐标
   * @param {number} y - 点Y坐标
   * @returns {boolean}
   */
  containsPoint(x, y) {
    const globalPos = this.getGlobalPosition();
    return x >= globalPos.x && 
           x <= globalPos.x + this.width * this.scaleX &&
           y >= globalPos.y && 
           y <= globalPos.y + this.height * this.scaleY;
  }
}

export default GameObject;
