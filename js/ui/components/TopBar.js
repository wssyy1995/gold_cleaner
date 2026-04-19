/**
 * TopBar 游戏顶部栏组件
 * 用于 GameplayScene 顶部展示关卡、清洁度进度球、倒计时
 * 
 * 支持两种模式：
 * - 一级背景：显示"退出"图标（返回主页）
 * - 二级背景：显示"返回"图标（返回一级背景）
 */

import { globalEvent } from '../../core/EventEmitter';

class TopBar {
  constructor(options = {}) {
    this.screenWidth = options.screenWidth || 750;
    this.screenHeight = options.screenHeight || 1334;
    
    // 数据绑定
    this.levelText = options.levelText || '1/10';
    this.progress = options.progress || 0;
    this.timeText = options.timeText || '60s';
    this.paused = options.paused || false;
    
    // 模式：是否在二级背景中
    this.inDeepArea = options.inDeepArea || false;
    
    // 回调
    this.onPauseClick = options.onPauseClick || (() => {});
    this.onWinClick = options.onWinClick || (() => {});
    this.onExitClick = options.onExitClick || (() => {});    // 退出按钮（返回主页）
    this.onReturnClick = options.onReturnClick || (() => {}); // 返回按钮（返回一级背景）
    
    // 尺寸计算
    this._calculateDimensions();
  }
  
  /**
   * 计算尺寸
   */
  _calculateDimensions() {
    const W = this.screenWidth;
    const H = this.screenHeight;
    
    this.barH = Math.min(W * 0.2, H * 0.25);
    this.barY = 0;
    this.ballD = W * 0.3;
    this.leftPad = W * 0.025;
    this.rightPad = W * 0.025;
    this.centerX = W * 0.5;
    
    // 左侧按钮（退出/返回）
    this.backBtnSize = this.barH * 0.5;
    this.backBtnX = this.leftPad;
    this.backBtnY = this.barY + (this.barH - this.backBtnSize) / 2;
    
    // 关卡胶囊
    this.leftBoxW = W * 0.2;
    this.leftBoxH = this.barH * 0.65;
    this.leftX = this.backBtnX + this.backBtnSize + W * 0.02;
    this.leftY = this.barY + (this.barH - this.leftBoxH) / 2;
    
    // 进度球
    this.ballCx = this.centerX;
    this.ballCy = this.barY + this.barH * 0.9;
    
    // 倒计时
    this.timerBoxH = this.barH * 0.65;
    this.timerBoxW = W * 0.18;
    this.timerX = W - this.rightPad - this.timerBoxW;
    this.timerY = this.barY + (this.barH - this.timerBoxH) / 2;
  }
  
  /**
   * 更新数据
   */
  updateData(data) {
    if (data.levelText !== undefined) this.levelText = data.levelText;
    if (data.progress !== undefined) this.progress = Math.max(0, Math.min(100, data.progress));
    if (data.timeText !== undefined) this.timeText = data.timeText;
    if (data.paused !== undefined) this.paused = data.paused;
    if (data.inDeepArea !== undefined) this.inDeepArea = data.inDeepArea;
  }
  
  /**
   * 设置模式
   */
  setMode(inDeepArea) {
    this.inDeepArea = inDeepArea;
  }
  
  _drawRoundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arc(x + w - rr, y + rr, rr, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2);
    ctx.lineTo(x + rr, y + h);
    ctx.arc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + rr);
    ctx.arc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }
  
  _drawTextWithStroke(ctx, text, x, y, fillStyle, strokeStyle, font, lineWidth) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  
  render(ctx) {
    this._drawBackground(ctx);
    this._drawLeftButton(ctx);
    this._drawLevelBox(ctx);
    this._drawProgressBall(ctx);
    this._drawTimer(ctx);
  }
  
  _drawBackground(ctx) {
    const W = this.screenWidth;
    
    const barGrad = ctx.createLinearGradient(0, this.barY, 0, this.barY + this.barH);
    barGrad.addColorStop(0, '#f3c06a');
    barGrad.addColorStop(0.5, '#d79a3f');
    barGrad.addColorStop(1, '#b8792f');
    
    this._drawRoundedRect(ctx, 0, this.barY, W, this.barH, this.barH * 0.25);
    ctx.fillStyle = barGrad;
    ctx.fill();
    
    ctx.save();
    ctx.lineWidth = Math.max(2, this.screenHeight * 0.003);
    ctx.strokeStyle = 'rgba(60,30,10,0.35)';
    this._drawRoundedRect(ctx, 0, this.barY, W, this.barH, this.barH * 0.25);
    ctx.stroke();
    ctx.restore();
    
    ctx.save();
    ctx.globalAlpha = 0.35;
    this._drawRoundedRect(ctx, 0, this.barY + this.barH * 0.05, W, this.barH * 0.22, this.barH * 0.25);
    const highlight = ctx.createLinearGradient(0, this.barY, W, this.barY + this.barH);
    highlight.addColorStop(0, 'rgba(255,255,255,0.4)');
    highlight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlight;
    ctx.fill();
    ctx.restore();
  }
  
  /**
   * 绘制左侧按钮
   * - 一级背景：退出图标（X）
   * - 二级背景：返回图标（←）
   */
  _drawLeftButton(ctx) {
    const cx = this.backBtnX + this.backBtnSize / 2;
    const cy = this.backBtnY + this.backBtnSize / 2;
    
    // 圆形背景
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, this.backBtnSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(60, 30, 10, 0.6)';
    ctx.fill();
    ctx.restore();
    
    if (this.inDeepArea) {
      // 二级背景：返回图标（左箭头）
      this._drawReturnIcon(ctx, cx, cy);
    } else {
      // 一级背景：退出图标（X）
      this._drawExitIcon(ctx, cx, cy);
    }
  }
  
  /**
   * 绘制电源关闭图标（参考标准电源按钮）
   */
  _drawExitIcon(ctx, cx, cy) {
    ctx.save();
    ctx.strokeStyle = '#ffe6b8';
    ctx.lineWidth = Math.max(3, this.backBtnSize * 0.1);
    ctx.lineCap = 'round';
    
    const r = this.backBtnSize * 0.22 + 1.5; // 圆环半径（直径+3px）
    const gap = 0.7; // 顶部缺口角度（弧度）
    
    // 绘制圆环（顶部有缺口）
    ctx.beginPath();
    // 从缺口左端开始，顺时针画到缺口右端
    ctx.arc(cx, cy + r * 0.1, r, Math.PI * 1.5 + gap, Math.PI * 1.5 - gap, false);
    ctx.stroke();
    
    // 绘制顶部竖线（整体长度-2px）
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 1.3 + 1); // 起点位置
    ctx.lineTo(cx, cy + r * 0.1 - 4); // 终点上移2px，整体长度-2px
    ctx.stroke();
    
    ctx.restore();
  }
  
  /**
   * 绘制返回图标（左箭头）
   */
  _drawReturnIcon(ctx, cx, cy) {
    ctx.save();
    ctx.strokeStyle = '#ffe6b8';
    ctx.lineWidth = Math.max(3, this.backBtnSize * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const arrowSize = this.backBtnSize * 0.25;
    
    ctx.beginPath();
    ctx.moveTo(cx + arrowSize * 0.3, cy - arrowSize);
    ctx.lineTo(cx - arrowSize * 0.5, cy);
    ctx.lineTo(cx + arrowSize * 0.3, cy + arrowSize);
    ctx.stroke();
    
    ctx.restore();
  }
  
  _drawLevelBox(ctx) {
    const leftGrad = ctx.createLinearGradient(this.leftX, this.leftY, this.leftX, this.leftY + this.leftBoxH);
    leftGrad.addColorStop(0, '#9b5a2b');
    leftGrad.addColorStop(1, '#6f3f1e');
    
    this._drawRoundedRect(ctx, this.leftX, this.leftY, this.leftBoxW, this.leftBoxH, this.leftBoxH * 0.5);
    ctx.fillStyle = leftGrad;
    ctx.fill();
    
    this._drawTextWithStroke(
      ctx,
      this.levelText,
      this.leftX + this.leftBoxW / 2,
      this.leftY + this.leftBoxH / 2,
      '#ffe6b8',
      'rgba(0,0,0,0.45)',
      `bold ${Math.floor(this.leftBoxH * 0.42)}px sans-serif`,
      Math.max(2, this.screenHeight * 0.003)
    );
  }
  
  _drawProgressBall(ctx) {
    const ring = ctx.createRadialGradient(
      this.ballCx - this.ballD * 0.15, this.ballCy - this.ballD * 0.15, this.ballD * 0.05,
      this.ballCx, this.ballCy, this.ballD / 2
    );
    ring.addColorStop(0, '#fff1bf');
    ring.addColorStop(0.4, '#f2c56c');
    ring.addColorStop(1, '#b47a2b');
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.ballCx, this.ballCy, this.ballD / 2, 0, Math.PI * 2);
    ctx.fillStyle = ring;
    ctx.fill();
    
    const innerR = this.ballD * 0.36;
    const greenGrad = ctx.createRadialGradient(
      this.ballCx - this.ballD * 0.12, this.ballCy - this.ballD * 0.15, this.ballD * 0.03,
      this.ballCx, this.ballCy, this.ballD / 2
    );
    greenGrad.addColorStop(0, '#6df39a');
    greenGrad.addColorStop(1, '#1ea55a');
    
    ctx.beginPath();
    ctx.arc(this.ballCx, this.ballCy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = greenGrad;
    ctx.fill();
    
    const pct = Math.max(0, Math.min(1, this.progress / 100));
    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * pct;
    
    ctx.lineWidth = innerR * 0.22;
    ctx.lineCap = 'round';
    
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(this.ballCx, this.ballCy, innerR, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = '#3ef08f';
    ctx.beginPath();
    ctx.arc(this.ballCx, this.ballCy, innerR, start, end);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `bold ${Math.floor(innerR * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(2, this.screenHeight * 0.003);
    ctx.strokeText('清洁度', this.ballCx, this.ballCy - innerR * 0.28);
    ctx.fillText('清洁度', this.ballCx, this.ballCy - innerR * 0.28);
    
    this._drawTextWithStroke(
      ctx,
      `${Math.floor(this.progress)}%`,
      this.ballCx,
      this.ballCy + innerR * 0.18,
      '#ffffff',
      'rgba(0,0,0,0.45)',
      `bold ${Math.floor(innerR * 0.48)}px sans-serif`,
      Math.max(3, this.screenHeight * 0.005)
    );
    
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(
      this.ballCx - this.ballD * 0.16, this.ballCy - this.ballD * 0.18,
      this.ballD * 0.18, this.ballD * 0.10, -0.3, 0, Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.restore();
  }
  
  _drawTimer(ctx) {
    const timerGrad = ctx.createLinearGradient(this.timerX, this.timerY, this.timerX, this.timerY + this.timerBoxH);
    timerGrad.addColorStop(0, '#ff5a5a');
    timerGrad.addColorStop(1, '#b31f1f');
    
    this._drawRoundedRect(ctx, this.timerX, this.timerY, this.timerBoxW, this.timerBoxH, this.timerBoxH * 0.5);
    ctx.fillStyle = timerGrad;
    ctx.fill();
    
    this._drawTextWithStroke(
      ctx,
      this.timeText,
      this.timerX + this.timerBoxW / 2,
      this.timerY + this.timerBoxH / 2,
      '#fff',
      'rgba(0,0,0,0.45)',
      `bold ${Math.floor(this.timerBoxH * 0.45)}px sans-serif`,
      Math.max(2, this.screenHeight * 0.003)
    );
  }
  
  onTouchStart(x, y) {
    // 检查左侧按钮点击
    if (this._isPointInBackButton(x, y)) {
      if (this.inDeepArea) {
        this.onReturnClick(); // 二级背景：返回一级背景
      } else {
        this.onExitClick();   // 一级背景：返回主页
      }
      return true;
    }
    
    // 检查关卡数字点击（调试用：通关）
    if (this._isPointInLevelBox(x, y)) {
      this.onWinClick();
      return true;
    }
    
    return false;
  }
  
  _isPointInBackButton(x, y) {
    const dx = x - (this.backBtnX + this.backBtnSize / 2);
    const dy = y - (this.backBtnY + this.backBtnSize / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.backBtnSize / 2;
  }
  
  _isPointInLevelBox(x, y) {
    return x >= this.leftX && x <= this.leftX + this.leftBoxW &&
           y >= this.leftY && y <= this.leftY + this.leftBoxH;
  }
  
  onTouchEnd(x, y) {
    return false;
  }
}

export default TopBar;
