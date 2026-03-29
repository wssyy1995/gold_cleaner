/**
 * BaseDialog 最基础的弹窗类
 * 不依赖 DialogManager，直接在场景中渲染
 */

class BaseDialog {
  constructor(options = {}) {
    this.screenWidth = options.screenWidth || 750;
    this.screenHeight = options.screenHeight || 1334;
    
    // 弹窗位置和尺寸（相对于屏幕）
    this.width = options.width || 600;
    this.height = options.height || 400;
    this.x = (this.screenWidth - this.width) / 2;
    this.y = (this.screenHeight - this.height) / 2;
    
    // 背景遮罩
    this.maskColor = options.maskColor || 'rgba(0, 0, 0, 0.7)';
    
    // 弹窗背景
    this.bgColor = options.bgColor || '#FFFFFF';
    this.borderRadius = options.borderRadius || 20;
    
    // 动画状态
    this.opacity = 0;
    this.scale = 0.8;
    this.targetOpacity = 1;
    this.targetScale = 1;
    this.animSpeed = 0.15;
    
    // 是否可见
    this.visible = false;
    
    // 回调
    this.onClose = options.onClose || (() => {});
  }
  
  /**
   * 显示弹窗
   */
  show() {
    this.visible = true;
    this.opacity = 0;
    this.scale = 0.8;
  }
  
  /**
   * 隐藏弹窗
   */
  hide() {
    this.visible = false;
  }
  
  /**
   * 更新动画
   */
  update() {
    if (!this.visible) return;
    
    // 简单的线性插值动画
    this.opacity += (this.targetOpacity - this.opacity) * this.animSpeed;
    this.scale += (this.targetScale - this.scale) * this.animSpeed;
    
    // 接近目标时直接设置
    if (Math.abs(this.targetOpacity - this.opacity) < 0.01) {
      this.opacity = this.targetOpacity;
    }
    if (Math.abs(this.targetScale - this.scale) < 0.01) {
      this.scale = this.targetScale;
    }
  }
  
  /**
   * 渲染弹窗框架（遮罩+背景）
   */
  render(ctx) {
    if (!this.visible || this.opacity < 0.01) return;
    
    ctx.save();
    
    // 全局透明度
    ctx.globalAlpha = this.opacity;
    
    // 绘制遮罩
    ctx.fillStyle = this.maskColor;
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    
    // 应用缩放动画（以弹窗中心为基准）
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-centerX, -centerY);
    
    // 绘制弹窗背景
    ctx.fillStyle = this.bgColor;
    this._drawRoundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();
    
    // 子类绘制内容（相对于弹窗左上角）
    ctx.save();
    ctx.translate(this.x, this.y);
    this.renderContent(ctx);
    ctx.restore();
    
    ctx.restore();
  }
  
  /**
   * 子类重写：绘制弹窗内容
   */
  renderContent(ctx) {
    // 子类实现
  }
  
  /**
   * 触摸事件处理
   */
  onTouchStart(x, y) {
    if (!this.visible) return false;
    
    // 检查是否在弹窗内
    if (x >= this.x && x <= this.x + this.width &&
        y >= this.y && y <= this.y + this.height) {
      return this.handleTouchStart(x - this.x, y - this.y);
    }
    return false;
  }
  
  onTouchEnd(x, y) {
    if (!this.visible) return false;
    
    if (x >= this.x && x <= this.x + this.width &&
        y >= this.y && y <= this.y + this.height) {
      return this.handleTouchEnd(x - this.x, y - this.y);
    }
    return false;
  }
  
  /**
   * 子类重写：处理触摸事件（坐标已转换为弹窗内部坐标）
   */
  handleTouchStart(x, y) {
    return false;
  }
  
  handleTouchEnd(x, y) {
    return false;
  }
  
  /**
   * 绘制圆角矩形
   */
  _drawRoundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

export default BaseDialog;
