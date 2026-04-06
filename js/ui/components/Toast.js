/**
 * Toast 组件 - 波普风 (Playful Pop)
 * 样式：黄色背景 #FBBF24 + 3px黑色边框 + 硬阴影 4px 4px 0px #000
 * 
 * 使用示例：
 * const toast = new Toast({ screenWidth: 750, screenHeight: 1334 });
 * toast.show('干得漂亮！发现隐藏垃圾', 3000);
 */

class Toast {
  constructor(options = {}) {
    this.screenWidth = options.screenWidth || 750;
    this.screenHeight = options.screenHeight || 1334;
    this.s = this.screenWidth / 750; // 缩放比例
    
    // 基础 Y 位置（在清洁度球体底部下方 5px + 额外 35px）
    // 清洁度球体: cy=65*s, radius=40*s, 底部=105*s, +40px padding = 145*s
    this.baseY = options.baseY !== undefined ? options.baseY : (220 * this.s);
    
    // 动画状态
    this.visible = false;
    this.text = '';
    this.duration = 4000;
    this.startTime = 0;
    
    // 动画阶段: 'enter' | 'stay' | 'leave'
    this.phase = 'enter';
    
    // 波普风样式配置
    this.style = {
      bgColor: '#FBBF24',      // 黄色背景
      borderColor: '#000000',   // 黑色边框
      borderWidth: 4,           // 边框宽度（加粗）
      shadowOffset: 5,          // 阴影偏移（加大）
      shadowColor: '#000000',   // 阴影颜色
      textColor: '#000000',     // 文字颜色
      fontWeight: 'bold',
      borderRadius: 9999        // 胶囊形（实际用半高）
    };
    
    // 尺寸配置
    this.padding = {
      x: 30 * this.s,           // 左右内边距增大
      y: 18 * this.s            // 上下内边距增大
    };
    this.gap = 16 * this.s;      // 图标与文字间距增大
    this.iconSize = 40 * this.s; // 图标尺寸增大（32->40）
    
    // 动画配置
    this.animConfig = {
      enterDuration: 400,   // 进入动画时长(ms)
      leaveDuration: 300,   // 离开动画时长(ms)
      offsetY: 30 * this.s  // 进入时从上方偏移的距离
    };
    
    // 当前动画值
    this.animValues = {
      y: 0,           // 当前Y位置
      scale: 1,       // 当前缩放
      alpha: 0,       // 当前透明度
      shadowOffset: 4 // 当前阴影偏移（用于点击效果）
    };
  }
  
  /**
   * 显示 Toast
   * @param {string} text - 显示文本
   * @param {number} duration - 显示时长(ms)，默认3000
   * @param {string} icon - 可选的emoji图标，默认💥
   */
  show(text, duration = 3000, icon = '💥') {
    this.text = text;
    this.duration = duration;
    this.icon = icon;
    this.visible = true;
    this.phase = 'enter';
    this.startTime = Date.now();
    
    // 重置动画值
    this.animValues = {
      y: -this.animConfig.offsetY,
      scale: 0.8,
      alpha: 0,
      shadowOffset: this.style.shadowOffset
    };
    
    console.log(`[Toast] 显示: "${text}"，时长: ${duration}ms`);
  }
  
  /**
   * 隐藏 Toast（触发离开动画）
   */
  hide() {
    if (this.phase !== 'leave') {
      this.phase = 'leave';
      this.startTime = Date.now();
      console.log('[Toast] 开始离开动画');
    }
  }
  
  /**
   * 立即关闭（无动画）
   */
  close() {
    this.visible = false;
    this.phase = 'enter';
  }
  
  /**
   * 更新动画
   */
  update(deltaTime) {
    if (!this.visible) return;
    
    const now = Date.now();
    const elapsed = now - this.startTime;
    
    switch (this.phase) {
      case 'enter':
        // 进入动画：从上方弹入 + 弹性效果
        const enterProgress = Math.min(elapsed / this.animConfig.enterDuration, 1);
        this._updateEnterAnimation(enterProgress);
        
        if (enterProgress >= 1) {
          this.phase = 'stay';
          this.startTime = now;
        }
        break;
        
      case 'stay':
        // 停留阶段
        this.animValues.y = 0;
        this.animValues.scale = 1;
        this.animValues.alpha = 1;
        
        if (elapsed >= this.duration) {
          this.phase = 'leave';
          this.startTime = now;
        }
        break;
        
      case 'leave':
        // 离开动画：向上飘出 + 缩小 + 淡出
        const leaveProgress = Math.min(elapsed / this.animConfig.leaveDuration, 1);
        this._updateLeaveAnimation(leaveProgress);
        
        if (leaveProgress >= 1) {
          this.visible = false;
          this.phase = 'enter';
        }
        break;
    }
  }
  
  /**
   * 进入动画 - 弹性效果
   * 使用 easeOutBack 缓动函数
   */
  _updateEnterAnimation(progress) {
    // easeOutBack: 1 + c3 * (t - 1)^3 + c1 * (t - 1)^2
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const eased = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
    
    this.animValues.y = -this.animConfig.offsetY * (1 - eased);
    this.animValues.scale = 0.8 + 0.2 * eased;
    this.animValues.alpha = Math.min(progress * 2, 1); // 快速淡入
  }
  
  /**
   * 离开动画
   */
  _updateLeaveAnimation(progress) {
    // easeIn: t^2
    const eased = progress * progress;
    
    this.animValues.y = -20 * this.s * eased; // 向上飘
    this.animValues.scale = 1 - 0.1 * eased; // 缩小到0.9
    this.animValues.alpha = 1 - progress; // 淡出
  }
  
  /**
   * 渲染 Toast
   */
  render(ctx) {
    if (!this.visible) return;
    
    const s = this.s;
    ctx.save();
    
    // 应用透明度和变换
    ctx.globalAlpha = this.animValues.alpha;
    
    // 计算位置（顶部居中）
    const textWidth = this._measureText(ctx, this.text);
    const iconWidth = this.iconSize + this.gap;
    const totalWidth = textWidth + iconWidth + this.padding.x * 2;
    const height = this.iconSize + this.padding.y * 2;
    
    const x = (this.screenWidth - totalWidth) / 2;
    const y = this.baseY + this.animValues.y; // 基础Y位置 + 动画偏移
    
    // 应用缩放（以中心为锚点）
    const centerX = x + totalWidth / 2;
    const centerY = y + height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(this.animValues.scale, this.animValues.scale);
    ctx.translate(-centerX, -centerY);
    
    // ===== 绘制阴影（波普风硬阴影）=====
    const shadowOffset = this.animValues.shadowOffset * s;
    this._drawCapsule(
      ctx,
      x + shadowOffset,
      y + shadowOffset,
      totalWidth,
      height,
      height / 2, // 圆角半径 = 高度一半 = 胶囊形
      this.style.shadowColor
    );
    ctx.fillStyle = this.style.shadowColor;
    ctx.fill();
    
    // ===== 绘制背景（黄色）=====
    this._drawCapsule(
      ctx,
      x,
      y,
      totalWidth,
      height,
      height / 2,
      this.style.bgColor
    );
    ctx.fillStyle = this.style.bgColor;
    ctx.fill();
    
    // ===== 绘制边框（黑色粗边框）=====
    this._drawCapsule(
      ctx,
      x,
      y,
      totalWidth,
      height,
      height / 2,
      this.style.borderColor
    );
    ctx.lineWidth = this.style.borderWidth * s;
    ctx.strokeStyle = this.style.borderColor;
    ctx.stroke();
    
    // ===== 绘制图标（白色圆形背景）=====
    const iconCenterX = x + this.padding.x + this.iconSize / 2;
    const iconCenterY = y + height / 2;
    
    // 图标白色背景圆
    ctx.beginPath();
    ctx.arc(iconCenterX, iconCenterY, this.iconSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    // 图标边框（黑色）
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
    
    // 图标emoji
    ctx.font = `${this.iconSize * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(this.icon, iconCenterX, iconCenterY + 2 * s); // 微调垂直居中
    
    // ===== 绘制文字 =====
    ctx.font = `bold ${23 * s}px sans-serif`; // 字体增大
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.style.textColor;
    ctx.fillText(
      this.text,
      x + this.padding.x + this.iconSize + this.gap,
      y + height / 2 + 1 * s // 微调垂直居中
    );
    
    ctx.restore();
  }
  
  /**
   * 绘制胶囊形路径
   */
  _drawCapsule(ctx, x, y, width, height, radius, color) {
    const r = Math.min(radius, height / 2);
    
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  
  /**
   * 测量文字宽度
   */
  _measureText(ctx, text) {
    ctx.font = `bold ${20 * this.s}px sans-serif`; // 字体增大（16->20）
    const metrics = ctx.measureText(text);
    return metrics.width;
  }
  
  /**
   * 检查点击位置是否在 Toast 上（用于点击消失）
   */
  isHit(x, y) {
    if (!this.visible || this.phase === 'leave') return false;
    
    const s = this.s;
    // 创建临时 canvas context 来测量文字
    const tempCanvas = typeof wx !== 'undefined' ? wx.createCanvas() : document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const textWidth = this._measureText(tempCtx, this.text);
    const iconWidth = this.iconSize + this.gap;
    const totalWidth = textWidth + iconWidth + this.padding.x * 2;
    const height = this.iconSize + this.padding.y * 2;
    
    const toastX = (this.screenWidth - totalWidth) / 2;
    const toastY = this.baseY + this.animValues.y;
    
    return x >= toastX && x <= toastX + totalWidth &&
           y >= toastY && y <= toastY + height;
  }
}

export default Toast;
