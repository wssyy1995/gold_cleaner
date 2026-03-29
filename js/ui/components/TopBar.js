/**
 * TopBar 游戏顶部栏组件
 * 用于 GameplayScene 顶部展示关卡、清洁度进度球、倒计时、暂停按钮
 * 
 * 设计参考 docs/guide.txt
 */

import { globalEvent } from '../../core/EventEmitter';

class TopBar {
  constructor(options = {}) {
    this.screenWidth = options.screenWidth || 750;
    this.screenHeight = options.screenHeight || 1334;
    
    // 数据绑定
    this.levelText = options.levelText || '1/10';
    this.progress = options.progress || 0;  // 0-100
    this.timeText = options.timeText || '60s';
    this.paused = options.paused || false;
    
    // 回调
    this.onPauseClick = options.onPauseClick || (() => {});
    
    // 尺寸计算（按屏幕高度比例）
    this._calculateDimensions();
  }
  
  /**
   * 计算尺寸（基于宽度，适配全面屏）
   */
  _calculateDimensions() {
    const W = this.screenWidth;
    const H = this.screenHeight;
    
    // Top bar 高度
    this.barH = Math.min(W * 0.2, H * 0.25);
    this.barY = 0;
    
    // 进度球直径：基于宽度的 14%
    this.ballD = W * 0.3;
    
    // 边距
    this.leftPad = W * 0.025;
    this.rightPad = W * 0.025;
    this.centerX = W * 0.5;
    
    // 左侧关卡胶囊（基于宽度）
    this.leftBoxW = W * 0.2;
    this.leftBoxH = this.barH * 0.65;
    this.leftX = this.leftPad;
    this.leftY = this.barY + (this.barH - this.leftBoxH) / 2;
    
    // 进度球中心（嵌入 top bar 中线）
    this.ballCx = this.centerX;
    this.ballCy = this.barY + this.barH * 0.9;
    
    // 倒计时胶囊（基于宽度）- 暂停按钮已移除，倒计时在右侧
    this.timerBoxH = this.barH * 0.65;
    this.timerBoxW = W * 0.18;
    this.timerX = W - this.rightPad - this.timerBoxW; // 右侧对齐
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
  }
  
  /**
   * 绘制圆角矩形（兼容小程序）
   */
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
  
  /**
   * 绘制带描边的文字
   */
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
  
  /**
   * 绘制 TopBar
   */
  render(ctx) {
    this._drawBackground(ctx);
    this._drawLevelBox(ctx);
    this._drawProgressBall(ctx);
    this._drawTimer(ctx);
    // 暂停按钮已移除
  }
  
  /**
   * 1) 绘制背景
   */
  _drawBackground(ctx) {
    const W = this.screenWidth;
    
    // 渐变背景（金色/铜色）
    const barGrad = ctx.createLinearGradient(0, this.barY, 0, this.barY + this.barH);
    barGrad.addColorStop(0, '#f3c06a');
    barGrad.addColorStop(0.5, '#d79a3f');
    barGrad.addColorStop(1, '#b8792f');
    
    this._drawRoundedRect(ctx, 0, this.barY, W, this.barH, this.barH * 0.25);
    ctx.fillStyle = barGrad;
    ctx.fill();
    
    // 外边框
    ctx.save();
    ctx.lineWidth = Math.max(2, this.screenHeight * 0.003);
    ctx.strokeStyle = 'rgba(60,30,10,0.35)';
    this._drawRoundedRect(ctx, 0, this.barY, W, this.barH, this.barH * 0.25);
    ctx.stroke();
    ctx.restore();
    
    // 高光条
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
   * 2) 绘制左侧关卡胶囊
   */
  _drawLevelBox(ctx) {
    // 胶囊背景（棕红偏暗）
    const leftGrad = ctx.createLinearGradient(this.leftX, this.leftY, this.leftX, this.leftY + this.leftBoxH);
    leftGrad.addColorStop(0, '#9b5a2b');
    leftGrad.addColorStop(1, '#6f3f1e');
    
    this._drawRoundedRect(ctx, this.leftX, this.leftY, this.leftBoxW, this.leftBoxH, this.leftBoxH * 0.5);
    ctx.fillStyle = leftGrad;
    ctx.fill();
    
    // 关卡文字
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
  
  /**
   * 3) 绘制中间进度球
   */
  _drawProgressBall(ctx) {
    // 外圈（金色描边）
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
    
    // 内部绿色底
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
    
    // 进度环
    const pct = Math.max(0, Math.min(1, this.progress / 100));
    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * pct;
    
    ctx.lineWidth = innerR * 0.22;
    ctx.lineCap = 'round';
    
    // 背景环
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(this.ballCx, this.ballCy, innerR, 0, Math.PI * 2);
    ctx.stroke();
    
    // 进度环
    ctx.strokeStyle = '#3ef08f';
    ctx.beginPath();
    ctx.arc(this.ballCx, this.ballCy, innerR, start, end);
    ctx.stroke();
    
    // 上方文字 "清洁度"
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `bold ${Math.floor(innerR * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(2, this.screenHeight * 0.003);
    ctx.strokeText('清洁度', this.ballCx, this.ballCy - innerR * 0.28);
    ctx.fillText('清洁度', this.ballCx, this.ballCy - innerR * 0.28);
    
    // 下方百分比
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
    
    // 球体高光
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
  
  /**
   * 4) 绘制倒计时
   */
  _drawTimer(ctx) {
    // 倒计时背景（红色胶囊）
    const timerGrad = ctx.createLinearGradient(this.timerX, this.timerY, this.timerX, this.timerY + this.timerBoxH);
    timerGrad.addColorStop(0, '#ff5a5a');
    timerGrad.addColorStop(1, '#b31f1f');
    
    this._drawRoundedRect(ctx, this.timerX, this.timerY, this.timerBoxW, this.timerBoxH, this.timerBoxH * 0.5);
    ctx.fillStyle = timerGrad;
    ctx.fill();
    
    // 倒计时文字
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
  
  /**
   * 处理触摸开始
   */
  onTouchStart(x, y) {
    // 暂停按钮已移除
    return false;
  }
  
  /**
   * 处理触摸结束
   */
  onTouchEnd(x, y) {
    // 暂停按钮已移除
    return false;
  }
}

export default TopBar;
