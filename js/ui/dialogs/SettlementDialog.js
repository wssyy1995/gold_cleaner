/**
 * SettlementDialog 关卡结算弹窗
 * 使用最基础的独立弹窗方式
 */

import BaseDialog from './BaseDialog';

class SettlementDialog extends BaseDialog {
  constructor(options = {}) {
    // 计算弹窗尺寸：高度为屏幕的 1/3，宽度为 90%
    const screenWidth = options.screenWidth || 750;
    const screenHeight = options.screenHeight || 1334;
    const width = Math.min(640, Math.floor(screenWidth * 0.9));
    const height = Math.floor(screenHeight / 3);
    
    super({
      screenWidth,
      screenHeight,
      width,
      height,
      bgColor: '#FFFFFF',
      borderRadius: 20,
      maskColor: 'rgba(0, 0, 0, 0.7)'
    });
    
    this.levelId = options.levelId || 1;
    this.stars = options.stars || 3;
    this.coins = options.coins || 0;
    this.onNext = options.onNext || (() => {});
    this.onReplay = options.onReplay || (() => {});
    this.onHome = options.onHome || (() => {});
    
    // 动画状态
    this.starRevealCount = 0;
    this.starAnimTimer = 0;
    
    // 计算布局
    this._calcLayout();
  }
  
  /**
   * 计算布局（基于弹窗尺寸）
   */
  _calcLayout() {
    const w = this.width;
    const h = this.height;
    
    // 相对位置计算
    this.titleY = h * 0.15;
    this.levelY = h * 0.28;
    this.starY = h * 0.45;
    this.coinY = h * 0.65;
    
    // 按钮区域
    this.btnY = h * 0.78;
    this.btnHeight = Math.min(50, h * 0.15);
    this.sideMargin = w * 0.08;
    this.btnGap = w * 0.04;
    this.btnWidth = (w - this.sideMargin * 2 - this.btnGap) / 2;
  }
  
  /**
   * 更新动画
   */
  update() {
    super.update();
    
    // 星星逐个显示动画
    if (this.visible && this.starRevealCount < this.stars) {
      this.starAnimTimer++;
      if (this.starAnimTimer > 10) { // 约 166ms (60fps)
        this.starRevealCount++;
        this.starAnimTimer = 0;
      }
    }
  }
  
  /**
   * 渲染弹窗内容
   */
  renderContent(ctx) {
    const cx = this.width / 2;
    
    // 标题
    ctx.fillStyle = '#4CAF50';
    ctx.font = `bold ${Math.min(36, this.height * 0.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('关卡完成!', cx, this.titleY);
    
    // 关卡信息
    ctx.fillStyle = '#666666';
    ctx.font = `${Math.min(24, this.height * 0.06)}px sans-serif`;
    ctx.fillText(`关卡 ${this.levelId}`, cx, this.levelY);
    
    // 绘制星星
    this._renderStars(ctx, cx);
    
    // 金币
    ctx.fillStyle = '#FF9500';
    ctx.font = `bold ${Math.min(28, this.height * 0.07)}px sans-serif`;
    ctx.fillText(`获得金币: ${this.coins}`, cx, this.coinY);
    
    // 绘制按钮
    this._renderButtons(ctx);
  }
  
  /**
   * 绘制星星
   */
  _renderStars(ctx, cx) {
    const starSize = Math.min(40, this.height * 0.12);
    const gap = starSize * 0.5;
    const totalWidth = 3 * starSize + 2 * gap;
    const startX = cx - totalWidth / 2 + starSize / 2;
    
    for (let i = 0; i < 3; i++) {
      const x = startX + i * (starSize + gap);
      const isRevealed = i < this.starRevealCount;
      const isTargetStar = i < this.stars;
      
      if (isRevealed) {
        // 已显示的星星
        ctx.fillStyle = isTargetStar ? '#FFD700' : '#E0E0E0';
        this._drawStar(ctx, x, this.starY, starSize / 2);
      } else {
        // 未显示的星星（灰色轮廓）
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 2;
        this._drawStarOutline(ctx, x, this.starY, starSize / 2);
      }
    }
  }
  
  /**
   * 绘制按钮
   */
  _renderButtons(ctx) {
    const y = this.btnY;
    const h = this.btnHeight;
    
    // 重玩按钮
    this._drawButton(ctx, this.sideMargin, y, this.btnWidth, h, '↻ 重玩', '#E0E0E0', '#333333');
    
    // 首页按钮
    this._drawButton(ctx, this.sideMargin + this.btnWidth + this.btnGap, y, this.btnWidth, h, '⌂ 首页', '#E0E0E0', '#333333');
    
    // 下一关按钮（下方居中）
    this._drawButton(ctx, this.sideMargin, y + h + 10, this.width - this.sideMargin * 2, h, '下一关 →', '#4CAF50', '#FFFFFF');
  }
  
  /**
   * 绘制单个按钮
   */
  _drawButton(ctx, x, y, w, h, text, bgColor, textColor) {
    // 背景
    ctx.fillStyle = bgColor;
    this._drawRoundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    
    // 文字
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.min(20, h * 0.4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
  }
  
  /**
   * 绘制星星（实心）
   */
  _drawStar(ctx, cx, cy, radius) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  /**
   * 绘制星星轮廓
   */
  _drawStarOutline(ctx, cx, cy, radius) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  
  /**
   * 处理触摸开始
   */
  handleTouchStart(x, y) {
    // 弹窗内所有触摸都捕获，阻止事件穿透
    const btnY = this.btnY;
    const h = this.btnHeight;
    
    // 检查是否在任何按钮区域
    const inReplayBtn = x >= this.sideMargin && x <= this.sideMargin + this.btnWidth &&
                        y >= btnY && y <= btnY + h;
    const inHomeBtn = x >= this.sideMargin + this.btnWidth + this.btnGap && 
                      x <= this.sideMargin + this.btnWidth * 2 + this.btnGap &&
                      y >= btnY && y <= btnY + h;
    const inNextBtn = x >= this.sideMargin && x <= this.width - this.sideMargin &&
                      y >= btnY + h + 10 && y <= btnY + h * 2 + 10;
    
    return inReplayBtn || inHomeBtn || inNextBtn;
  }
  
  /**
   * 处理触摸结束
   */
  handleTouchEnd(x, y) {
    const btnY = this.btnY;
    const h = this.btnHeight;
    
    // 检查重玩按钮
    if (x >= this.sideMargin && x <= this.sideMargin + this.btnWidth &&
        y >= btnY && y <= btnY + h) {
      this.hide();
      this.onReplay();
      return true;
    }
    
    // 检查首页按钮
    if (x >= this.sideMargin + this.btnWidth + this.btnGap && 
        x <= this.sideMargin + this.btnWidth * 2 + this.btnGap &&
        y >= btnY && y <= btnY + h) {
      this.hide();
      this.onHome();
      return true;
    }
    
    // 检查下一关按钮
    if (x >= this.sideMargin && x <= this.width - this.sideMargin &&
        y >= btnY + h + 10 && y <= btnY + h * 2 + 10) {
      this.hide();
      this.onNext();
      return true;
    }
    
    return false;
  }
}

export default SettlementDialog;
