/**
 * Panel UI组件
 * 负责任务 5.1.5 实现面板组件（Panel）
 */

import Component from '../../core/Component';

class Panel extends Component {
  constructor(options = {}) {
    super(options);

    // 位置尺寸
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 300;
    this.height = options.height || 200;

    // 背景
    this.bgColor = options.bgColor || '#FFFFFF';
    this.bgImage = options.bgImage || null;
    this.bgImageMode = options.bgImageMode || 'stretch'; // stretch, tile, fit

    // 边框
    this.borderWidth = options.borderWidth || 0;
    this.borderColor = options.borderColor || '#CCCCCC';
    this.borderRadius = options.borderRadius || 0;

    // 阴影
    this.shadow = options.shadow || null; // { color, blur, offsetX, offsetY }

    // 内边距
    this.padding = options.padding || { top: 0, right: 0, bottom: 0, left: 0 };
    if (typeof this.padding === 'number') {
      this.padding = { top: this.padding, right: this.padding, bottom: this.padding, left: this.padding };
    }

    // 内容区域
    this.contentX = this.x + this.padding.left;
    this.contentY = this.y + this.padding.top;
    this.contentWidth = this.width - this.padding.left - this.padding.right;
    this.contentHeight = this.height - this.padding.top - this.padding.bottom;

    // 子元素
    this.children = [];

    // 是否可拖拽
    this.draggable = options.draggable || false;
    this._dragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._panelStartX = 0;
    this._panelStartY = 0;

    // 标题栏（用于拖拽）
    this.titleBar = options.titleBar || null; // { height, bgColor, text }
  }

  /**
   * 添加子元素
   */
  addChild(child) {
    child.parent = this;
    this.children.push(child);
  }

  /**
   * 移除子元素
   */
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      child.parent = null;
      this.children.splice(index, 1);
    }
  }

  /**
   * 清空子元素
   */
  clearChildren() {
    for (const child of this.children) {
      child.parent = null;
    }
    this.children = [];
  }

  /**
   * 处理触摸开始
   */
  onTouchStart(x, y) {
    // 检查是否在标题栏（用于拖拽）
    if (this.draggable && this.titleBar) {
      const titleBarHeight = this.titleBar.height || 40;
      if (y >= this.y && y <= this.y + titleBarHeight &&
          x >= this.x && x <= this.x + this.width) {
        this._dragging = true;
        this._dragStartX = x;
        this._dragStartY = y;
        this._panelStartX = this.x;
        this._panelStartY = this.y;
        return true;
      }
    }

    // 转发给子元素
    for (const child of this.children) {
      if (child.onTouchStart && child.containsPoint && child.containsPoint(x, y)) {
        return child.onTouchStart(x, y);
      }
    }

    return this.containsPoint(x, y);
  }

  /**
   * 处理触摸移动
   */
  onTouchMove(x, y) {
    if (this._dragging) {
      const dx = x - this._dragStartX;
      const dy = y - this._dragStartY;
      this.setPosition(this._panelStartX + dx, this._panelStartY + dy);
      return true;
    }

    // 转发给子元素
    for (const child of this.children) {
      if (child.onTouchMove) {
        return child.onTouchMove(x, y);
      }
    }

    return false;
  }

  /**
   * 处理触摸结束
   */
  onTouchEnd(x, y) {
    if (this._dragging) {
      this._dragging = false;
      return true;
    }

    // 转发给子元素
    for (const child of this.children) {
      if (child.onTouchEnd) {
        return child.onTouchEnd(x, y);
      }
    }

    return false;
  }

  /**
   * 更新
   */
  update(deltaTime) {
    // 更新子元素
    for (const child of this.children) {
      if (child.update) {
        child.update(deltaTime);
      }
    }
  }

  /**
   * 渲染
   */
  onRender(ctx) {
    ctx.save();

    // 绘制阴影
    if (this.shadow) {
      ctx.shadowColor = this.shadow.color || 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = this.shadow.blur || 10;
      ctx.shadowOffsetX = this.shadow.offsetX || 0;
      ctx.shadowOffsetY = this.shadow.offsetY || 4;
    }

    // 绘制背景
    this._drawBackground(ctx);

    // 绘制边框
    if (this.borderWidth > 0) {
      this._drawBorder(ctx);
    }

    // 绘制标题栏
    if (this.titleBar) {
      this._drawTitleBar(ctx);
    }

    ctx.restore();

    // 绘制子元素
    for (const child of this.children) {
      if (child.render) {
        child.render(ctx);
      } else if (child.onRender) {
        child.onRender(ctx);
      }
    }
  }

  /**
   * 绘制背景
   */
  _drawBackground(ctx) {
    if (this.bgImage) {
      // 绘制背景图片
      switch (this.bgImageMode) {
        case 'stretch':
          ctx.drawImage(this.bgImage, this.x, this.y, this.width, this.height);
          break;
        case 'tile':
          // 平铺模式
          ctx.fillStyle = ctx.createPattern(this.bgImage, 'repeat');
          ctx.fillRect(this.x, this.y, this.width, this.height);
          break;
        case 'fit':
          // 适应模式
          // 计算居中绘制
          const scale = Math.min(this.width / this.bgImage.width, this.height / this.bgImage.height);
          const w = this.bgImage.width * scale;
          const h = this.bgImage.height * scale;
          const x = this.x + (this.width - w) / 2;
          const y = this.y + (this.height - h) / 2;
          ctx.drawImage(this.bgImage, x, y, w, h);
          break;
      }
    } else {
      // 绘制纯色背景
      ctx.fillStyle = this.bgColor;
      
      if (this.borderRadius > 0) {
        this._drawRoundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }
  }

  /**
   * 绘制边框
   */
  _drawBorder(ctx) {
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = this.borderWidth;

    if (this.borderRadius > 0) {
      this._drawRoundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }

  /**
   * 绘制标题栏
   */
  _drawTitleBar(ctx) {
    const height = this.titleBar.height || 40;
    
    ctx.fillStyle = this.titleBar.bgColor || '#4A90D9';
    
    // 绘制标题栏背景（顶部圆角）
    if (this.borderRadius > 0) {
      ctx.beginPath();
      ctx.moveTo(this.x + this.borderRadius, this.y);
      ctx.lineTo(this.x + this.width - this.borderRadius, this.y);
      ctx.arc(this.x + this.width - this.borderRadius, this.y + this.borderRadius, this.borderRadius, -Math.PI / 2, 0);
      ctx.lineTo(this.x + this.width, this.y + height);
      ctx.lineTo(this.x, this.y + height);
      ctx.lineTo(this.x, this.y + this.borderRadius);
      ctx.arc(this.x + this.borderRadius, this.y + this.borderRadius, this.borderRadius, Math.PI, Math.PI * 1.5);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(this.x, this.y, this.width, height);
    }

    // 绘制标题文字
    if (this.titleBar.text) {
      ctx.fillStyle = this.titleBar.textColor || '#FFFFFF';
      ctx.font = `${this.titleBar.fontSize || 16}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.titleBar.text, this.x + this.width / 2, this.y + height / 2);
    }
  }

  /**
   * 绘制圆角矩形
   */
  _drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    ctx.lineTo(x + radius, y + height);
    ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + radius);
    ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }

  /**
   * 检查点是否在面板内
   */
  containsPoint(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  /**
   * 设置位置
   */
  setPosition(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;

    this.x = x;
    this.y = y;
    this.contentX = this.x + this.padding.left;
    this.contentY = this.y + this.padding.top;

    // 移动子元素
    for (const child of this.children) {
      if (child.x !== undefined && child.y !== undefined) {
        child.x += dx;
        child.y += dy;
      }
    }
  }

  /**
   * 设置尺寸
   */
  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.contentWidth = this.width - this.padding.left - this.padding.right;
    this.contentHeight = this.height - this.padding.top - this.padding.bottom;
  }

  /**
   * 设置内边距
   */
  setPadding(padding) {
    if (typeof padding === 'number') {
      this.padding = { top: padding, right: padding, bottom: padding, left: padding };
    } else {
      this.padding = { ...this.padding, ...padding };
    }
    this.contentX = this.x + this.padding.left;
    this.contentY = this.y + this.padding.top;
    this.contentWidth = this.width - this.padding.left - this.padding.right;
    this.contentHeight = this.height - this.padding.top - this.padding.bottom;
  }
}

export default Panel;
