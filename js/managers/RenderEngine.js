/**
 * RenderEngine 渲染引擎
 * 负责Canvas渲染的核心功能
 */

class RenderEngine {
  constructor() {
    // Canvas上下文
    this.ctx = null;
    // 屏幕尺寸
    this.screenWidth = 0;
    this.screenHeight = 0;
    // 设备像素比
    this.dpr = 1;
    // 图层列表
    this.layers = [];
    // 是否启用脏矩形优化
    this.enableDirtyRect = false;
    // 脏矩形区域
    this.dirtyRects = [];
  }

  /**
   * 初始化渲染引擎
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   * @param {number} width - 屏幕宽度
   * @param {number} height - 屏幕高度
   * @param {number} dpr - 设备像素比
   */
  init(ctx, width, height, dpr = 1) {
    this.ctx = ctx;
    this.screenWidth = width;
    this.screenHeight = height;
    this.dpr = dpr;

    console.log(`[RenderEngine] 初始化渲染引擎: ${width}x${height}, DPR: ${dpr}`);
  }

  /**
   * 清空画布
   */
  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);
  }

  /**
   * 清空画布为指定颜色
   * @param {string} color - 颜色值
   */
  clearWithColor(color) {
    if (!this.ctx) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
  }

  /**
   * 保存上下文状态
   */
  save() {
    if (this.ctx) {
      this.ctx.save();
    }
  }

  /**
   * 恢复上下文状态
   */
  restore() {
    if (this.ctx) {
      this.ctx.restore();
    }
  }

  /**
   * 设置变换矩阵
   * @param {number} x - X偏移
   * @param {number} y - Y偏移
   * @param {number} scaleX - X缩放
   * @param {number} scaleY - Y缩放
   * @param {number} rotation - 旋转角度（弧度）
   */
  setTransform(x = 0, y = 0, scaleX = 1, scaleY = 1, rotation = 0) {
    if (!this.ctx) return;
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.scale(scaleX, scaleY);
  }

  /**
   * 绘制矩形
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {string} color - 填充颜色
   * @param {boolean} stroke - 是否描边
   * @param {string} strokeColor - 描边颜色
   * @param {number} lineWidth - 线宽
   */
  drawRect(x, y, width, height, color, stroke = false, strokeColor = '#000', lineWidth = 1) {
    if (!this.ctx) return;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);

    if (stroke) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  /**
   * 绘制圆形
   * @param {number} x - 圆心X坐标
   * @param {number} y - 圆心Y坐标
   * @param {number} radius - 半径
   * @param {string} color - 填充颜色
   * @param {boolean} stroke - 是否描边
   * @param {string} strokeColor - 描边颜色
   * @param {number} lineWidth - 线宽
   */
  drawCircle(x, y, radius, color, stroke = false, strokeColor = '#000', lineWidth = 1) {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    if (stroke) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
    }
  }

  /**
   * 绘制图片
   * @param {HTMLImageElement} image - 图片对象
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 目标宽度
   * @param {number} height - 目标高度
   * @param {number} sx - 源X坐标
   * @param {number} sy - 源Y坐标
   * @param {number} sw - 源宽度
   * @param {number} sh - 源高度
   */
  drawImage(image, x, y, width, height, sx = 0, sy = 0, sw = image.width, sh = image.height) {
    if (!this.ctx || !image) return;

    try {
      if (width !== undefined && height !== undefined) {
        this.ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
      } else {
        this.ctx.drawImage(image, x, y);
      }
    } catch (error) {
      console.error('[RenderEngine] 绘制图片失败:', error);
    }
  }

  /**
   * 绘制文字
   * @param {string} text - 文本内容
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {Object} options - 选项
   */
  drawText(text, x, y, options = {}) {
    if (!this.ctx) return;

    const {
      font = '14px sans-serif',
      color = '#000',
      align = 'left',
      baseline = 'alphabetic',
      maxWidth = null
    } = options;

    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;

    if (maxWidth) {
      this.ctx.fillText(text, x, y, maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
  }

  /**
   * 绘制线条
   * @param {number} x1 - 起点X
   * @param {number} y1 - 起点Y
   * @param {number} x2 - 终点X
   * @param {number} y2 - 终点Y
   * @param {string} color - 颜色
   * @param {number} lineWidth - 线宽
   */
  drawLine(x1, y1, x2, y2, color = '#000', lineWidth = 1) {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.stroke();
  }

  /**
   * 设置全局透明度
   * @param {number} alpha - 透明度 (0-1)
   */
  setGlobalAlpha(alpha) {
    if (this.ctx) {
      this.ctx.globalAlpha = alpha;
    }
  }

  /**
   * 设置混合模式
   * @param {string} mode - 混合模式
   */
  setBlendMode(mode) {
    if (this.ctx) {
      this.ctx.globalCompositeOperation = mode;
    }
  }

  /**
   * 重置混合模式
   */
  resetBlendMode() {
    if (this.ctx) {
      this.ctx.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * 裁剪矩形区域
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  clipRect(x, y, width, height) {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
  }

  /**
   * 标记脏矩形区域
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  markDirty(x, y, width, height) {
    if (!this.enableDirtyRect) return;

    this.dirtyRects.push({ x, y, width, height });
  }

  /**
   * 清除脏矩形标记
   */
  clearDirtyRects() {
    this.dirtyRects = [];
  }
}

export default RenderEngine;
