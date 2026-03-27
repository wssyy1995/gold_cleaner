/**
 * Image UI组件
 * 负责任务 5.1.4 实现图片组件（Image）
 */

import Component from '../../core/Component';

class Image extends Component {
  constructor(options = {}) {
    super(options);

    // 位置尺寸
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 100;
    this.height = options.height || 100;

    // 图片源
    this.src = options.src || null; // 图片路径或Image对象
    this._image = null; // 加载后的Image对象

    // 填充模式
    this.fit = options.fit || 'fill'; // fill, contain, cover, none, scale-down

    // 对齐（用于contain和cover模式）
    this.alignX = options.alignX || 'center'; // left, center, right
    this.alignY = options.alignY || 'center'; // top, center, bottom

    // 圆角
    this.borderRadius = options.borderRadius || 0;

    // 边框
    this.borderWidth = options.borderWidth || 0;
    this.borderColor = options.borderColor || '#000000';

    // 透明度
    this.alpha = options.alpha !== undefined ? options.alpha : 1;

    // 灰度模式
    this.grayscale = options.grayscale || false;

    // 点击区域
    this._hitArea = options.hitArea || null; // 自定义点击区域
  }

  /**
   * 设置图片源
   */
  setSrc(src) {
    this.src = src;
    this._image = null;

    if (typeof src === 'string') {
      // 加载图片
      this._loadImage(src);
    } else if (src && src.width && src.height) {
      // 已经是Image对象
      this._image = src;
    }
  }

  /**
   * 加载图片
   */
  _loadImage(src) {
    if (typeof wx !== 'undefined') {
      const img = wx.createImage();
      img.onload = () => {
        this._image = img;
      };
      img.src = src;
    } else {
      const img = new window.Image();
      img.onload = () => {
        this._image = img;
      };
      img.src = src;
    }
  }

  /**
   * 渲染
   */
  onRender(ctx) {
    if (!this._image) {
      // 绘制占位符
      this._drawPlaceholder(ctx);
      return;
    }

    ctx.save();

    // 应用透明度
    ctx.globalAlpha = this.alpha;

    // 应用灰度
    if (this.grayscale) {
      // 使用滤镜实现灰度
      ctx.filter = 'grayscale(100%)';
    }

    // 创建圆角裁剪区域
    if (this.borderRadius > 0) {
      ctx.beginPath();
      this._drawRoundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.clip();
    }

    // 根据fit模式绘制图片
    switch (this.fit) {
      case 'fill':
        this._drawFill(ctx);
        break;
      case 'contain':
        this._drawContain(ctx);
        break;
      case 'cover':
        this._drawCover(ctx);
        break;
      case 'none':
        this._drawNone(ctx);
        break;
      case 'scale-down':
        this._drawScaleDown(ctx);
        break;
      default:
        this._drawFill(ctx);
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

    ctx.restore();
  }

  /**
   * 填充模式 - 拉伸填满
   */
  _drawFill(ctx) {
    ctx.drawImage(this._image, this.x, this.y, this.width, this.height);
  }

  /**
   * 包含模式 - 完整显示，可能有留白
   */
  _drawContain(ctx) {
    const imgRatio = this._image.width / this._image.height;
    const boxRatio = this.width / this.height;

    let drawWidth, drawHeight, drawX, drawY;

    if (imgRatio > boxRatio) {
      // 图片更宽，以宽度为准
      drawWidth = this.width;
      drawHeight = this.width / imgRatio;
    } else {
      // 图片更高，以高度为准
      drawHeight = this.height;
      drawWidth = this.height * imgRatio;
    }

    // 计算X位置
    switch (this.alignX) {
      case 'left':
        drawX = this.x;
        break;
      case 'right':
        drawX = this.x + this.width - drawWidth;
        break;
      case 'center':
      default:
        drawX = this.x + (this.width - drawWidth) / 2;
    }

    // 计算Y位置
    switch (this.alignY) {
      case 'top':
        drawY = this.y;
        break;
      case 'bottom':
        drawY = this.y + this.height - drawHeight;
        break;
      case 'center':
      default:
        drawY = this.y + (this.height - drawHeight) / 2;
    }

    ctx.drawImage(this._image, drawX, drawY, drawWidth, drawHeight);
  }

  /**
   * 覆盖模式 - 填满容器，可能裁剪
   */
  _drawCover(ctx) {
    const imgRatio = this._image.width / this._image.height;
    const boxRatio = this.width / this.height;

    let sx, sy, sWidth, sHeight;

    if (imgRatio > boxRatio) {
      // 图片更宽，裁剪宽度
      sHeight = this._image.height;
      sWidth = sHeight * boxRatio;
      sy = 0;
      sx = (this._image.width - sWidth) / 2;
    } else {
      // 图片更高，裁剪高度
      sWidth = this._image.width;
      sHeight = sWidth / boxRatio;
      sx = 0;
      sy = (this._image.height - sHeight) / 2;
    }

    ctx.drawImage(this._image, sx, sy, sWidth, sHeight, this.x, this.y, this.width, this.height);
  }

  /**
   * 原始尺寸模式
   */
  _drawNone(ctx) {
    let drawX = this.x;
    let drawY = this.y;

    // 根据对齐调整位置
    switch (this.alignX) {
      case 'center':
        drawX = this.x + (this.width - this._image.width) / 2;
        break;
      case 'right':
        drawX = this.x + this.width - this._image.width;
        break;
    }

    switch (this.alignY) {
      case 'center':
        drawY = this.y + (this.height - this._image.height) / 2;
        break;
      case 'bottom':
        drawY = this.y + this.height - this._image.height;
        break;
    }

    ctx.drawImage(this._image, drawX, drawY);
  }

  /**
   * 缩小模式 - 类似contain，但不放大
   */
  _drawScaleDown(ctx) {
    if (this._image.width <= this.width && this._image.height <= this.height) {
      // 图片比容器小，使用none模式
      this._drawNone(ctx);
    } else {
      // 图片比容器大，使用contain模式
      this._drawContain(ctx);
    }
  }

  /**
   * 绘制占位符
   */
  _drawPlaceholder(ctx) {
    // 背景
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // 边框
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    ctx.setLineDash([]);

    // 图标占位
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖼️', this.x + this.width / 2, this.y + this.height / 2);
  }

  /**
   * 绘制圆角矩形（用于裁剪）
   */
  _drawRoundRect(ctx, x, y, width, height, radius) {
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
   * 检查点是否在图片内
   */
  containsPoint(x, y) {
    if (this._hitArea) {
      // 使用自定义点击区域
      return x >= this._hitArea.x && x <= this._hitArea.x + this._hitArea.width &&
             y >= this._hitArea.y && y <= this._hitArea.y + this._hitArea.height;
    }
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
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
  }

  /**
   * 获取原始图片尺寸
   */
  getOriginalSize() {
    if (!this._image) return { width: 0, height: 0 };
    return { width: this._image.width, height: this._image.height };
  }
}

export default Image;
