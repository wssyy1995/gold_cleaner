/**
 * Component 组件基类
 * ECS风格的组件式架构基础类
 */

class Component {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    // 组件所属的游戏对象
    this.owner = null;
    // 是否激活
    this.active = options.active !== false;
    // 是否可见
    this.visible = options.visible !== false;
    // 组件名称
    this.name = options.name || this.constructor.name;
  }

  /**
   * 设置所属的游戏对象
   * @param {GameObject} owner - 游戏对象
   */
  setOwner(owner) {
    this.owner = owner;
    this.onAttach();
  }

  /**
   * 组件附加到游戏对象时调用（子类重写）
   */
  onAttach() {
    // 子类实现
  }

  /**
   * 初始化
   */
  init() {
    this.onInit();
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
    if (!this.active) return;
    this.onUpdate(deltaTime);
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
    if (!this.visible || !this.active) return;
    this.onRender(ctx);
  }

  /**
   * 渲染回调（子类重写）
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   */
  onRender(ctx) {
    // 子类实现
  }

  /**
   * 组件被移除时调用
   */
  onDetach() {
    // 子类实现
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.onDetach();
    this.owner = null;
  }
}

export default Component;
