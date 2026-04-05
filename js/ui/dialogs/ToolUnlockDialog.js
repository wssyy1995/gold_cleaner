/**
 * ToolUnlockDialog 新工具解锁弹窗
 * 参考 docs/guide.txt 设计
 * 
 * 功能：
 * - 展示新解锁的工具图片
 * - 星星粒子动画效果
 * - 收取按钮点击交互
 */

import BaseDialog from './BaseDialog';

class ToolUnlockDialog extends BaseDialog {
  constructor(options = {}) {
    // 弹窗宽度为屏幕宽度的 3/4，高度自适应
    const screenWidth = options.screenWidth || 750;
    const dialogWidth = screenWidth * 0.75;
    // 高度根据工具数量自适应：基础高度 + 每个工具占用高度（增加描述区域高度）
    const toolCount = (options.unlockedTools || []).length;
    const baseHeight = 480;  // 增加高度容纳描述
    const toolHeight = toolCount > 1 ? (toolCount - 1) * 100 : 0;
    const dialogHeight = baseHeight + toolHeight;
    
    super({
      screenWidth: screenWidth,
      screenHeight: options.screenHeight || 1334,
      width: dialogWidth,
      height: dialogHeight,
      maskColor: 'rgba(0, 0, 0, 0.85)'
    });
    
    // 解锁的工具列表
    this.unlockedTools = options.unlockedTools || [];
    
    // 收取按钮回调
    this.onCollect = options.onCollect || (() => {});
    
    // 星星粒子数组
    this.stars = [];
    
    // 按钮状态
    this.buttonHover = false;
    this.buttonActive = false;
    
    // 弹窗打开时初始化星星
    this._initStars();
  }
  
  /**
   * 初始化星星粒子
   */
  _initStars() {
    this.stars = [];
    for (let i = 0; i < 30; i++) {
      this._createStar();
    }
  }
  
  /**
   * 创建单个星星粒子
   */
  _createStar() {
    const x = Math.random() * this.width;
    const y = this.height * 0.15 + Math.random() * this.height * 0.3;
    this.stars.push({
      x,
      y,
      size: Math.random() * 4 + 2,
      speedX: (Math.random() - 0.5) * 3,
      speedY: (Math.random() - 0.5) * 2 - 1.5,
      alpha: 1,
      decay: Math.random() * 0.015 + 0.008,
      hue: Math.random() * 60 + 40, // 金黄色调
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1
    });
  }
  
  /**
   * 重写 show 方法
   */
  show() {
    super.show();
    this._initStars();
  }
  
  /**
   * 更新动画
   */
  update() {
    super.update();
    
    if (!this.visible) return;
    
    // 更新星星
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const star = this.stars[i];
      star.x += star.speedX;
      star.y += star.speedY;
      star.alpha -= star.decay;
      star.size *= 0.995;
      star.rotation += star.rotationSpeed;
      
      if (star.alpha <= 0 || star.y < -50) {
        this.stars.splice(i, 1);
      }
    }
    
    // 随机创建新星星
    if (Math.random() > 0.85) {
      this._createStar();
    }
  }
  
  /**
   * 绘制弹窗内容
   */
  renderContent(ctx) {
    const s = this.screenWidth / 750;
    const padding = 30 * s;
    
    // 1. 弹窗背景（白色）
    ctx.fillStyle = '#FFFFFF';
    this._drawRoundRect(ctx, padding, padding, this.width - padding * 2, this.height - padding * 2, 24 * s);
    ctx.fill();
    
    // 2. 顶部装饰区域（渐变背景）
    const headerHeight = this.height * 0.28;
    const headerY = padding;
    
    const headerGrad = ctx.createLinearGradient(0, headerY, 0, headerY + headerHeight);
    headerGrad.addColorStop(0, '#ff9a9e');
    headerGrad.addColorStop(0.5, '#fad0c4');
    headerGrad.addColorStop(1, '#fbc2eb');
    
    ctx.fillStyle = headerGrad;
    this._drawRoundRect(ctx, padding, headerY, this.width - padding * 2, headerHeight, 24 * s);
    ctx.fill();
    
    // 3. 标题
    ctx.fillStyle = '#8b4513';
    ctx.font = `bold ${Math.floor(42 * s)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉 获得新工具！', this.width / 2, headerY + headerHeight / 2);
    
    // 4. 工具卡片区域
    const cardWidth = (this.width - padding * 2) * 0.75;
    const cardHeight = this.height * 0.38;
    const cardX = (this.width - cardWidth) / 2;
    const cardY = headerY + headerHeight + 15 * s;
    
    // 卡片背景
    ctx.fillStyle = '#fff8dc';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3 * s;
    this._drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 16 * s);
    ctx.fill();
    ctx.stroke();
    
    // 5. 绘制解锁的工具图片和描述
    const toolCount = this.unlockedTools.length;
    const toolSize = Math.min(cardWidth * 0.35, cardHeight * 0.5);
    const spacing = toolSize * 1.2;
    const startX = this.width / 2 - (toolCount - 1) * spacing / 2;
    
    this.unlockedTools.forEach((tool, index) => {
      const toolX = startX + index * spacing;
      const toolY = cardY + cardHeight * 0.35;  // 图片位置偏上
      
      // 工具图片
      if (tool.image) {
        const imgSize = toolSize;
        ctx.drawImage(tool.image, toolX - imgSize / 2, toolY - imgSize / 2, imgSize, imgSize);
      } else {
        // 备用：绘制工具图标
        ctx.fillStyle = tool.color || '#FFD700';
        ctx.beginPath();
        ctx.arc(toolX, toolY, toolSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 工具名称（图片下方）
      ctx.fillStyle = '#8b4513';
      ctx.font = `bold ${Math.floor(22 * s)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(tool.name || '?', toolX, toolY + toolSize / 2 + 28 * s);
      
      // 工具描述（名称下方）
      if (tool.description) {
        ctx.fillStyle = '#666666';
        ctx.font = `${Math.floor(16 * s)}px Arial`;
        
        // 描述文字自动换行
        const maxWidth = cardWidth * 0.9;
        const lineHeight = 20 * s;
        const descY = toolY + toolSize / 2 + 50 * s;
        this._wrapText(ctx, tool.description, toolX, descY, maxWidth, lineHeight);
      }
    });
    
    // 6. 收取按钮
    const buttonWidth = (this.width - padding * 2) * 0.85;
    const buttonHeight = this.height * 0.13;
    const buttonX = (this.width - buttonWidth) / 2;
    const buttonY = this.height - padding - buttonHeight - 10 * s;
    
    // 按钮颜色根据状态变化
    let buttonColor;
    if (this.buttonActive) {
      buttonColor = '#e0b34a';
    } else if (this.buttonHover) {
      buttonColor = '#f5c542';
    } else {
      buttonColor = '#ffd700';
    }
    
    // 按钮阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 15 * s;
    ctx.shadowOffsetY = this.buttonActive ? 2 * s : 4 * s;
    
    // 按钮背景
    ctx.fillStyle = buttonColor;
    this._drawRoundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 18 * s);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // 按钮边框
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3 * s;
    this._drawRoundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 18 * s);
    ctx.stroke();
    
    // 按钮文字
    ctx.fillStyle = '#8b4513';
    ctx.font = `bold ${Math.floor(32 * s)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ 收 取 ✨', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
    
    // 7. 绘制星星粒子
    this.stars.forEach(star => {
      this._drawStar(ctx, star);
    });
  }
  
  /**
   * 自动换行绘制文字
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text - 要绘制的文字
   * @param {number} x - 中心X坐标
   * @param {number} y - 起始Y坐标
   * @param {number} maxWidth - 最大宽度
   * @param {number} lineHeight - 行高
   */
  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = text.split('');
    let line = '';
    let currentY = y;
    
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = chars[i];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY;  // 返回最后一行的Y坐标
  }
  
  /**
   * 绘制单个星星
   */
   _drawStar(ctx, star) {
    ctx.save();
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = `hsl(${star.hue}, 100%, 70%)`;
    ctx.translate(star.x, star.y);
    ctx.rotate(star.rotation);
    
    // 绘制五角星
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const radius = star.size;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      
      const innerAngle = angle + Math.PI / 5;
      const innerX = Math.cos(innerAngle) * (radius * 0.4);
      const innerY = Math.sin(innerAngle) * (radius * 0.4);
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
  
  /**
   * 处理触摸事件 - 检测按钮点击
   */
  handleTouchStart(x, y) {
    const s = this.screenWidth / 750;
    const padding = 30 * s;
    const buttonWidth = (this.width - padding * 2) * 0.85;
    const buttonHeight = this.height * 0.13;
    const buttonX = (this.width - buttonWidth) / 2;
    const buttonY = this.height - padding - buttonHeight - 10 * s;
    
    // 检测是否在按钮上
    if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= buttonY && y <= buttonY + buttonHeight) {
      this.buttonActive = true;
      return true;
    }
    
    return false;
  }
  
  handleTouchEnd(x, y) {
    if (!this.buttonActive) return false;
    
    this.buttonActive = false;
    
    const s = this.screenWidth / 750;
    const padding = 30 * s;
    const buttonWidth = (this.width - padding * 2) * 0.85;
    const buttonHeight = this.height * 0.13;
    const buttonX = (this.width - buttonWidth) / 2;
    const buttonY = this.height - padding - buttonHeight - 10 * s;
    
    // 检测是否在按钮上释放
    if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= buttonY && y <= buttonY + buttonHeight) {
      // 触发收取回调
      this.onCollect();
      this.hide();
      return true;
    }
    
    return false;
  }
}

export default ToolUnlockDialog;
