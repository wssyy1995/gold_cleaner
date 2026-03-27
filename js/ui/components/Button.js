/**
 * Button UI组件
 * 负责任务 5.1.1 实现按钮组件（Button）
 */

import Component from '../../core/Component';
import { globalEvent } from '../../core/EventEmitter';

class Button extends Component {
  constructor(options = {}) {
    super(options);

    // 位置和尺寸
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 120;
    this.height = options.height || 50;

    // 外观
    this.bgColor = options.bgColor || '#4A90D9';
    this.bgColorPressed = options.bgColorPressed || '#3A7BC8';
    this.bgColorDisabled = options.bgColorDisabled || '#CCCCCC';
    this.borderRadius = options.borderRadius || 8;
    this.borderWidth = options.borderWidth || 0;
    this.borderColor = options.borderColor || '#FFFFFF';

    // 文字
    this.text = options.text || '按钮';
    this.textColor = options.textColor || '#FFFFFF';
    this.textColorDisabled = options.textColorDisabled || '#888888';
    this.fontSize = options.fontSize || 16;
    this.fontWeight = options.fontWeight || 'normal';

    // 图片
    this.bgImage = options.bgImage || null;
    this.bgImagePressed = options.bgImagePressed || null;
    this.icon = options.icon || null;
    this.iconPosition = options.iconPosition || 'left'; // left, right
    this.iconGap = options.iconGap || 8;

    // 状态
    this._pressed = false;
    this._disabled = options.disabled || false;
    this._visible = options.visible !== false;

    // 回调
    this.onClick = options.onClick || null;
    this.onPress = options.onPress || null;
    this.onRelease = options.onRelease || null;

    // 动画
    this.scale = 1;
    this.targetScale = 1;
  }

  /**
   * 检查点是否在按钮内
   */
  containsPoint(x, y) {
    if (!this._visible) return false;
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  /**
   * 处理触摸开始
   */
  onTouchStart(x, y) {
    if (this._disabled || !this.containsPoint(x, y)) return false;

    this._pressed = true;
    this.targetScale = 0.95;

    if (this.onPress) {
      this.onPress();
    }

    globalEvent.emit('ui:button:press', this);
    return true;
  }

  /**
   * 处理触摸结束
   */
  onTouchEnd(x, y) {
    if (!this._pressed) return false;

    const wasInside = this.containsPoint(x, y);
    this._pressed = false;
    this.targetScale = 1;

    if (this.onRelease) {
      this.onRelease();
    }

    if (wasInside && this.onClick) {
      this.onClick();
      globalEvent.emit('ui:button:click', this);
    }

    globalEvent.emit('ui:button:release', this);
    return true;
  }

  /**
   * 更新
   */
  update(deltaTime) {
    // 缩放动画
    const speed = 0.2;
    this.scale += (this.targetScale - this.scale) * speed;
  }

  /**
   * 渲染
   */
  onRender(ctx) {
    if (!this._visible) return;

    ctx.save();

    // 应用缩放动画
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-centerX, -centerY);

    // 绘制背景
    const currentBgColor = this._disabled ? this.bgColorDisabled : 
                          (this._pressed ? this.bgColorPressed : this.bgColor);

    if (this.bgImage && !this._pressed) {
      // 绘制背景图片
      // 需要ResourceManager支持
    } else if (this.bgImagePressed && this._pressed) {
      // 绘制按下状态的背景图片
    } else {
      // 绘制纯色背景
      ctx.fillStyle = currentBgColor;
      
      if (this.borderRadius > 0) {
        this._drawRoundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }

    // 绘制边框
    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      if (this.borderRadius > 0) {
        this._drawRoundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(this.x, this.y, this.width, this.height);
      }
    }

    // 绘制图标
    let textX = centerX;
    if (this.icon) {
      const iconSize = this.fontSize + 4;
      let iconX = centerX;
      
      // 计算文字和图标的总宽度
      ctx.font = `${this.fontWeight} ${this.fontSize}px sans-serif`;
      const textWidth = ctx.measureText(this.text).width;
      const totalWidth = textWidth + iconSize + this.iconGap;

      if (this.iconPosition === 'left') {
        iconX = centerX - totalWidth / 2 + iconSize / 2;
        textX = iconX + iconSize / 2 + this.iconGap + textWidth / 2;
      } else {
        textX = centerX - totalWidth / 2 + textWidth / 2;
        iconX = textX + textWidth / 2 + this.iconGap + iconSize / 2;
      }

      // 绘制图标（占位）
      ctx.fillStyle = this._disabled ? this.textColorDisabled : this.textColor;
      ctx.fillRect(iconX - iconSize / 2, centerY - iconSize / 2, iconSize, iconSize);
    }

    // 绘制文字
    ctx.fillStyle = this._disabled ? this.textColorDisabled : this.textColor;
    ctx.font = `${this.fontWeight} ${this.fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, textX, centerY);

    ctx.restore();
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

  // Getters & Setters
  get disabled() { return this._disabled; }
  set disabled(value) {
    this._disabled = value;
    if (value) {
      this._pressed = false;
      this.targetScale = 1;
    }
  }

  get visible() { return this._visible; }
  set visible(value) { this._visible = value; }

  /**
   * 设置位置
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * 设置尺寸
   */
  setSize(width, height) {
    this.width = width;
    this.height = height;
  }

  /**
   * 设置文字
   */
  setText(text) {
    this.text = text;
  }
}

export default Button;
