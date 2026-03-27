/**
 * ToolManager 工具管理器
 * 负责任务 3.2.1 工具槽UI管理与交互
 * - 3.2.1.1 设计工具槽数据结构
 * - 3.2.1.2 实现工具选择与持有
 * - 3.2.1.3 实现底部工具槽的水平滑动
 * - 3.2.1.4 实现工具提示框显示
 */

import { globalEvent } from '../core/EventEmitter';

class ToolManager {
  constructor() {
    // 3.2.1.1 设计工具槽数据结构
    // 工具槽配置
    this.toolSlots = {
      maxSlots: 8,           // 最大槽位数
      tools: [],             // 当前装备的工具ID列表
      currentToolIndex: -1,  // 当前选中的工具索引
      visibleRange: {        // 可见范围（用于滑动）
        start: 0,
        count: 5            // 一次显示5个工具
      }
    };

    // 工具数据缓存
    this._toolData = new Map();

    // 滑动相关
    this.scroll = {
      x: 0,                 // 当前滚动位置
      targetX: 0,           // 目标滚动位置
      velocity: 0,          // 滚动速度
      isDragging: false,    // 是否正在拖动
      startX: 0,            // 拖动开始位置
      startScrollX: 0,      // 拖动开始时的滚动位置
      slotWidth: 100,       // 槽位宽度
      slotGap: 10           // 槽位间距
    };

    // 3.2.1.4 实现工具提示框显示
    // 提示框状态
    this.tooltip = {
      visible: false,
      text: '',
      timer: null,
      fadeOut: false
    };

    // 触摸追踪
    this._touchId = null;
  }

  /**
   * 初始化工具管理器
   */
  init() {
    console.log('[ToolManager] 初始化工具管理器');
    this._bindEvents();
  }

  /**
   * 绑定事件
   */
  _bindEvents() {
    // 监听触摸事件
    if (typeof wx !== 'undefined') {
      // 这里由上层游戏管理器转发触摸事件
    }
  }

  /**
   * 3.2.1.1 设计工具槽数据结构
   * 注册工具数据
   * @param {string} toolId - 工具ID
   * @param {Object} data - 工具数据
   */
  registerTool(toolId, data) {
    this._toolData.set(toolId, {
      id: toolId,
      name: data.name || '未知工具',
      icon: data.icon || '',
      description: data.description || '',
      operateType: data.operateType || 'wipe', // wipe, spray, tap, etc.
      animations: data.animations || {},
      effects: data.effects || {}
    });
  }

  /**
   * 批量注册工具
   * @param {Object} tools - 工具数据对象
   */
  registerTools(tools) {
    for (const [id, data] of Object.entries(tools)) {
      this.registerTool(id, data);
    }
  }

  /**
   * 获取工具数据
   * @param {string} toolId - 工具ID
   * @returns {Object|undefined}
   */
  getToolData(toolId) {
    return this._toolData.get(toolId);
  }

  /**
   * 3.2.1.1 设计工具槽数据结构
   * 设置工具槽
   * @param {Array<string>} toolIds - 工具ID数组
   */
  setToolSlots(toolIds) {
    // 限制最大数量
    this.toolSlots.tools = toolIds.slice(0, this.toolSlots.maxSlots);
    
    // 如果没有选中工具，默认选中第一个
    if (this.toolSlots.currentToolIndex < 0 && this.toolSlots.tools.length > 0) {
      this.selectTool(0);
    }

    globalEvent.emit('tool:slotsChanged', this.toolSlots.tools);
  }

  /**
   * 添加工具到槽位
   * @param {string} toolId - 工具ID
   * @returns {boolean}
   */
  addTool(toolId) {
    if (this.toolSlots.tools.length >= this.toolSlots.maxSlots) {
      console.warn('[ToolManager] 工具槽已满');
      return false;
    }

    if (this.toolSlots.tools.includes(toolId)) {
      console.warn('[ToolManager] 工具已在槽位中');
      return false;
    }

    this.toolSlots.tools.push(toolId);
    globalEvent.emit('tool:slotsChanged', this.toolSlots.tools);

    // 如果是第一个工具，自动选中
    if (this.toolSlots.tools.length === 1) {
      this.selectTool(0);
    }

    return true;
  }

  /**
   * 移除工具从槽位
   * @param {number} index - 槽位索引
   */
  removeTool(index) {
    if (index < 0 || index >= this.toolSlots.tools.length) return false;

    const removed = this.toolSlots.tools.splice(index, 1)[0];

    // 调整当前选中索引
    if (this.toolSlots.currentToolIndex === index) {
      this.toolSlots.currentToolIndex = -1;
    } else if (this.toolSlots.currentToolIndex > index) {
      this.toolSlots.currentToolIndex--;
    }

    globalEvent.emit('tool:slotsChanged', this.toolSlots.tools);
    globalEvent.emit('tool:removed', removed, index);

    return true;
  }

  /**
   * 3.2.1.2 实现工具选择与持有
   * 选择工具
   * @param {number} index - 工具索引
   */
  selectTool(index) {
    if (index < 0 || index >= this.toolSlots.tools.length) {
      this.toolSlots.currentToolIndex = -1;
      globalEvent.emit('tool:unselected');
      return false;
    }

    this.toolSlots.currentToolIndex = index;
    const toolId = this.toolSlots.tools[index];
    const toolData = this.getToolData(toolId);

    console.log(`[ToolManager] 选择工具: ${toolId}`);

    // 显示提示
    this.showTooltip('点击拖动清洁');

    globalEvent.emit('tool:selected', toolId, toolData, index);

    return true;
  }

  /**
   * 获取当前选中的工具
   * @returns {Object|null}
   */
  getCurrentTool() {
    if (this.toolSlots.currentToolIndex < 0) return null;
    
    const toolId = this.toolSlots.tools[this.toolSlots.currentToolIndex];
    return {
      id: toolId,
      index: this.toolSlots.currentToolIndex,
      data: this.getToolData(toolId)
    };
  }

  /**
   * 获取当前选中的工具ID
   * @returns {string|null}
   */
  getCurrentToolId() {
    if (this.toolSlots.currentToolIndex < 0) return null;
    return this.toolSlots.tools[this.toolSlots.currentToolIndex];
  }

  /**
   * 切换到下一个工具
   */
  selectNext() {
    const nextIndex = (this.toolSlots.currentToolIndex + 1) % this.toolSlots.tools.length;
    this.selectTool(nextIndex);
  }

  /**
   * 切换到上一个工具
   */
  selectPrev() {
    const prevIndex = this.toolSlots.currentToolIndex <= 0 
      ? this.toolSlots.tools.length - 1 
      : this.toolSlots.currentToolIndex - 1;
    this.selectTool(prevIndex);
  }

  /**
   * 3.2.1.3 实现底部工具槽的水平滑动
   * 处理触摸开始
   * @param {number} x - 触摸X坐标
   * @param {number} y - 触摸Y坐标
   */
  onTouchStart(x, y, touchId) {
    // 检查是否在工具槽区域（底部区域）
    if (y < 1100) return false; // 假设工具槽在底部

    this._touchId = touchId;
    this.scroll.isDragging = true;
    this.scroll.startX = x;
    this.scroll.startScrollX = this.scroll.x;
    this.scroll.velocity = 0;

    return true;
  }

  /**
   * 处理触摸移动
   * @param {number} x - 触摸X坐标
   * @param {number} y - 触摸Y坐标
   */
  onTouchMove(x, y) {
    if (!this.scroll.isDragging) return false;

    const deltaX = x - this.scroll.startX;
    let newX = this.scroll.startScrollX + deltaX;

    // 限制滚动范围
    newX = this._clampScrollX(newX);

    // 计算速度
    this.scroll.velocity = newX - this.scroll.x;
    this.scroll.x = newX;

    return true;
  }

  /**
   * 处理触摸结束
   * @param {number} x - 触摸X坐标
   * @param {number} y - 触摸Y坐标
   */
  onTouchEnd(x, y) {
    if (!this.scroll.isDragging) return false;

    this.scroll.isDragging = false;
    this._touchId = null;

    // 检查是否是点击（移动距离很小）
    const deltaX = Math.abs(x - this.scroll.startX);
    const deltaY = Math.abs(y - 1150); // 假设点击位置

    if (deltaX < 10) {
      // 是点击，处理工具选择
      this._handleToolTap(x);
    } else {
      // 是滑动，应用惯性
      this._applyInertia();
    }

    return true;
  }

  /**
   * 处理工具点击
   * @param {number} x - X坐标
   */
  _handleToolTap(x) {
    // 考虑滚动位置计算点击的工具索引
    const adjustedX = x - this.scroll.x;
    const slotTotalWidth = this.scroll.slotWidth + this.scroll.slotGap;
    
    // 假设工具槽从屏幕左侧40px开始
    const startX = 40;
    const index = Math.floor((adjustedX - startX) / slotTotalWidth);

    if (index >= 0 && index < this.toolSlots.tools.length) {
      this.selectTool(index);
    }
  }

  /**
   * 限制滚动范围
   * @param {number} x - 目标位置
   * @returns {number}
   */
  _clampScrollX(x) {
    const slotTotalWidth = this.scroll.slotWidth + this.scroll.slotGap;
    const maxScroll = Math.max(0, 
      this.toolSlots.tools.length * slotTotalWidth - 5 * slotTotalWidth
    );
    return Math.max(-maxScroll, Math.min(0, x));
  }

  /**
   * 应用惯性滚动
   */
  _applyInertia() {
    // 简单的惯性处理
    const slotTotalWidth = this.scroll.slotWidth + this.scroll.slotGap;
    const targetIndex = Math.round(-this.scroll.x / slotTotalWidth);
    
    this.scroll.targetX = -targetIndex * slotTotalWidth;
    this.scroll.targetX = this._clampScrollX(this.scroll.targetX);
  }

  /**
   * 更新（用于惯性动画）
   * @param {number} deltaTime - 时间间隔
   */
  update(deltaTime) {
    if (this.scroll.isDragging) return;

    // 平滑滚动到目标位置
    if (Math.abs(this.scroll.x - this.scroll.targetX) > 0.5) {
      const t = Math.min(1, deltaTime * 0.01);
      this.scroll.x += (this.scroll.targetX - this.scroll.x) * t;
    } else {
      this.scroll.x = this.scroll.targetX;
    }
  }

  /**
   * 3.2.1.4 实现工具提示框显示
   * 显示提示
   * @param {string} text - 提示文字
   * @param {number} duration - 显示时长（毫秒）
   */
  showTooltip(text, duration = 2000) {
    this.tooltip.text = text;
    this.tooltip.visible = true;
    this.tooltip.fadeOut = false;

    // 清除之前的定时器
    if (this.tooltip.timer) {
      clearTimeout(this.tooltip.timer);
    }

    // 设置自动隐藏
    this.tooltip.timer = setTimeout(() => {
      this.hideTooltip();
    }, duration);

    globalEvent.emit('tool:tooltipShow', text);
  }

  /**
   * 隐藏提示
   */
  hideTooltip() {
    this.tooltip.fadeOut = true;
    
    setTimeout(() => {
      this.tooltip.visible = false;
      this.tooltip.fadeOut = false;
      globalEvent.emit('tool:tooltipHide');
    }, 300);
  }

  /**
   * 获取工具槽渲染数据
   * @returns {Object}
   */
  getRenderData() {
    const slotTotalWidth = this.scroll.slotWidth + this.scroll.slotGap;
    
    return {
      tools: this.toolSlots.tools.map((toolId, index) => ({
        id: toolId,
        data: this.getToolData(toolId),
        index: index,
        x: 40 + index * slotTotalWidth + this.scroll.x,
        selected: index === this.toolSlots.currentToolIndex
      })),
      scrollX: this.scroll.x,
      tooltip: this.tooltip,
      pageIndicator: {
        current: Math.floor(-this.scroll.x / (slotTotalWidth * 5)),
        total: Math.ceil(this.toolSlots.tools.length / 5)
      }
    };
  }

  /**
   * 交换槽位
   * @param {number} fromIndex - 源索引
   * @param {number} toIndex - 目标索引
   */
  swapSlots(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.toolSlots.tools.length) return;
    if (toIndex < 0 || toIndex >= this.toolSlots.tools.length) return;

    const temp = this.toolSlots.tools[fromIndex];
    this.toolSlots.tools[fromIndex] = this.toolSlots.tools[toIndex];
    this.toolSlots.tools[toIndex] = temp;

    // 更新当前选中索引
    if (this.toolSlots.currentToolIndex === fromIndex) {
      this.toolSlots.currentToolIndex = toIndex;
    } else if (this.toolSlots.currentToolIndex === toIndex) {
      this.toolSlots.currentToolIndex = fromIndex;
    }

    globalEvent.emit('tool:slotsChanged', this.toolSlots.tools);
  }

  /**
   * 重置
   */
  reset() {
    this.toolSlots.tools = [];
    this.toolSlots.currentToolIndex = -1;
    this.scroll.x = 0;
    this.scroll.targetX = 0;
    this.scroll.velocity = 0;
    this.hideTooltip();
  }

  /**
   * 销毁
   */
  destroy() {
    this.reset();
    if (this.tooltip.timer) {
      clearTimeout(this.tooltip.timer);
    }
  }
}

export default ToolManager;
