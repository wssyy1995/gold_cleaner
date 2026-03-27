/**
 * ProgressBar UI组件
 * 负责任务 5.1.3 实现进度条组件（ProgressBar）
 */

import Component from '../../core/Component';
import MathUtils from '../../utils/MathUtils';

class ProgressBar extends Component {
  constructor(options = {}) {
    super(options);

    // 位置尺寸
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 200;
    this.height = options.height || 20;

    // 进度 0-1
    this._progress = MathUtils.clamp(options.progress || 0, 0, 1);
    this._targetProgress = this._progress;

    // 动画
    this.animated = options.animated !== false;
    this.animationSpeed = options.animationSpeed || 0.1;

    // 背景样式
    this.bgColor = options.bgColor || '#E0E0E0';
    this.bgImage = options.bgImage || null;
    this.borderRadius = options.borderRadius || this.height / 2;
    this.borderWidth = options.borderWidth || 0;
    this.borderColor = options.borderColor || '#CCCCCC';

    // 进度条样式
    this.fillColor = options.fillColor || '#4CAF50';
    this.fillGradient = options.fillGradient || null; // { start: '#4CAF50', end: '#8BC34A' }
    this.fillImage = options.fillImage || null;

    // 条纹效果
    this.striped = options.striped || false;
    this.stripeColor = options.stripeColor || 'rgba(255,255,255,0.2)';
    this.stripeWidth = options.stripeWidth || 10;
    this.stripeSpeed = options.stripeSpeed || 1;
    this._stripeOffset = 0;

    // 文字显示
    this.showText = options.showText !== false;
    this.textColor = options.textColor || '#333333';
    this.textFormat = options.textFormat || '{percent}%'; // {percent}, {value}
    this.fontSize = options.fontSize || 12;
    this.textInside = options.textInside !== false; // 文字在进度条内部

    // 最小进度显示
    this.minDisplayWidth = options.minDisplayWidth || 4;
  }

  /**
   * 设置进度
   * @param {number} value - 进度值 0-1
   */
  setProgress(value) {
    this._targetProgress = MathUtils.clamp(value, 0, 1);
  }

  /**
   * 获取进度
   */
  getProgress() {
    return this._progress;
  }

  /**
   * 更新
   */
  update(deltaTime) {
    // 进度动画
    if (this.animated && Math.abs(this._progress - this._targetProgress) > 0.001) {
      this._progress += (this._targetProgress - this._progress) * this.animationSpeed;
    } else {
      this._progress = this._targetProgress;
    }

    // 条纹动画
    if (this.striped && this._progress > 0) {
      this._stripeOffset -= this.stripeSpeed;
      if (this._stripeOffset < -this.stripeWidth * 2) {
        this._stripeOffset = 0;
      }
    }
  }

  /**
   * 渲染
   */
  onRender(ctx) {
    ctx.save();

    // 绘制背景
    this._drawBackground(ctx);

    // 绘制进度填充
    if (this._progress > 0) {
      this._drawFill(ctx);
    }

    // 绘制边框
    if (this.borderWidth > 0) {
      this._drawBorder(ctx);
    }

    // 绘制文字
    if (this.showText) {
      this._drawText(ctx);
    }

    ctx.restore();
  }

  /**
   * 绘制背景
   */
  _drawBackground(ctx) {
    if (this.bgImage) {
      // 绘制背景图片
    } else {
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
   * 绘制进度填充
   */
  _drawFill(ctx) {
    const fillWidth = Math.max(
      this.width * this._progress,
      this._progress > 0 ? this.minDisplayWidth : 0
    );

    if (fillWidth <= 0) return;

    ctx.save();

    // 创建裁剪区域
    ctx.beginPath();
    if (this.borderRadius > 0) {
      this._drawRoundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    } else {
      ctx.rect(this.x, this.y, this.width, this.height);
    }
    ctx.clip();

    // 绘制填充
    if (this.fillGradient) {
      const gradient = ctx.createLinearGradient(this.x, this.y, this.x + fillWidth, this.y);
      gradient.addColorStop(0, this.fillGradient.start);
      gradient.addColorStop(1, this.fillGradient.end);
      ctx.fillStyle = gradient;
    } else if (this.fillImage) {
      // 绘制填充图片
      ctx.fillStyle = this.fillColor;
    } else {
      ctx.fillStyle = this.fillColor;
    }

    ctx.fillRect(this.x, this.y, fillWidth, this.height);

    // 绘制条纹
    if (this.striped) {
      this._drawStripes(ctx, fillWidth);
    }

    ctx.restore();
  }

  /**
   * 绘制条纹
   */
  _drawStripes(ctx, fillWidth) {
    ctx.fillStyle = this.stripeColor;
    ctx.beginPath();

    const stripeSpacing = this.stripeWidth * 2;
    const startX = this.x + this._stripeOffset;

    for (let x = startX; x < this.x + fillWidth; x += stripeSpacing) {
      ctx.moveTo(x, this.y);
      ctx.lineTo(x + this.stripeWidth, this.y);
      ctx.lineTo(x + this.stripeWidth - this.height, this.y + this.height);
      ctx.lineTo(x - this.height, this.y + this.height);
      ctx.closePath();
    }

    ctx.fill();
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
   * 绘制文字
   */
  _drawText(ctx) {
    const text = this.textFormat
      .replace('{percent}', Math.round(this._progress * 100))
      .replace('{value}', this._progress.toFixed(2));

    ctx.font = `${this.fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // 判断文字位置的颜色
    const fillWidth = this.width * this._progress;
    const textX = this.textInside ? (this.x + fillWidth / 2) : centerX;
    const textWidth = ctx.measureText(text).width;

    if (this.textInside && fillWidth > textWidth + 10) {
      // 文字在进度条内部
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(text, textX, centerY);
    } else if (!this.textInside) {
      // 文字在进度条外部/上方
      ctx.fillStyle = this.textColor;
      ctx.fillText(text, centerX, centerY);
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
    this.borderRadius = height / 2;
  }
}

export default ProgressBar;
