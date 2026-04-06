/**
 * FoamGenerator.js
 * 泡沫生成器 - 用于 spray_wipe 两阶段清洁的第一阶段
 * 参考 docs/FoamGenerator.html 实现
 * 
 * 功能：
 * 1. 在指定位置生成逼真的泡沫（气泡群）
 * 2. 支持三阶段气泡大小：微气泡、中等气泡、大气泡
 * 3. 支持透明度控制（用于第二阶段逐渐减少）
 */

class FoamGenerator {
  constructor(options = {}) {
    this.brushSize = options.brushSize || 35;
    this.bubbles = [];
    this.opacity = 1.0;
  }

  /**
   * 在指定位置生成泡沫群
   * @param {number} x - 中心X坐标（屏幕坐标）
   * @param {number} y - 中心Y坐标（屏幕坐标）
   * @param {number} scale - 屏幕缩放比例
   */
  spawnFoamCluster(x, y, scale = 1) {
    const bubbles = [];
    const brushSize = this.brushSize * scale;
    
    // 三类气泡，参考 FoamGenerator.html 的比例
    const microCount = Math.floor(brushSize * 1.2);   // 微气泡
    const mediumCount = Math.floor(brushSize * 0.5);  // 中等气泡
    const macroCount = Math.floor(brushSize * 0.15);  // 大气泡
    
    // 先绘制柔和的白色底层
    this._underlayX = x;
    this._underlayY = y;
    this._underlayRadius = brushSize * 0.9;
    this._hasUnderlay = true;
    
    // 1. 微气泡 - 分散更广
    for (let i = 0; i < microCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusOffset = Math.random() * brushSize * 1.2;
      const bx = x + Math.cos(angle) * radiusOffset;
      const by = y + Math.sin(angle) * radiusOffset;
      const br = (Math.random() * 2.5 + 1) * scale; // 1-3.5px
      
      bubbles.push({ x: bx, y: by, r: br, type: 'micro' });
    }
    
    // 2. 中等气泡
    for (let i = 0; i < mediumCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusOffset = Math.random() * brushSize * 1.1;
      const bx = x + Math.cos(angle) * radiusOffset;
      const by = y + Math.sin(angle) * radiusOffset;
      const br = (Math.random() * 5 + 3) * scale; // 3-8px
      
      bubbles.push({ x: bx, y: by, r: br, type: 'medium' });
    }
    
    // 3. 大气泡 - 在顶部
    for (let i = 0; i < macroCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusOffset = Math.random() * brushSize * 0.9;
      const bx = x + Math.cos(angle) * radiusOffset;
      const by = y + Math.sin(angle) * radiusOffset;
      const br = (Math.random() * 14 + 6) * scale; // 6-20px
      
      bubbles.push({ x: bx, y: by, r: br, type: 'macro' });
    }
    
    // 按半径排序（小的先画，大的在上面）
    bubbles.sort((a, b) => a.r - b.r);
    
    this.bubbles.push(...bubbles);
    
    // 限制总数量
    if (this.bubbles.length > 200) {
      this.bubbles = this.bubbles.slice(-200);
    }
  }

  /**
   * 绘制单个气泡 - 参考 FoamGenerator.html 的实现
   */
  drawBubble(ctx, bubble, scale = 1) {
    const { x, y, r } = bubble;
    const isMicro = r <= 4 * scale;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = this.opacity;
    
    // 1. 气泡主体
    const bodyGrad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
    if (isMicro) {
      // 微气泡：基本实心白色
      bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      bodyGrad.addColorStop(0.8, 'rgba(240, 245, 255, 0.8)');
      bodyGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
    } else {
      // 大泡泡：中间透明，边缘厚实白色
      bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      bodyGrad.addColorStop(0.6, 'rgba(245, 250, 255, 0.2)');
      bodyGrad.addColorStop(0.9, 'rgba(255, 255, 255, 0.6)');
      bodyGrad.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
    }
    
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    
    // 2. 淡淡的冷色调轮廓
    ctx.lineWidth = Math.max(0.4, r * 0.03);
    ctx.strokeStyle = 'rgba(180, 200, 220, 0.15)';
    ctx.stroke();
    
    // 3. 镜面高光（仅对较大的气泡）
    if (r > 3 * scale) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      
      // 主高光（左上角）
      ctx.beginPath();
      ctx.arc(-r * 0.4, -r * 0.4, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      
      // 次高光
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.5, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      
      // 底部弧形反射
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, Math.PI * 0.15, Math.PI * 0.55);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = Math.max(1.5, r * 0.15);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    
    // 4. 大泡泡的微弱彩虹色
    if (r > 12 * scale) {
      const iriGrad = ctx.createLinearGradient(-r, -r, r, r);
      iriGrad.addColorStop(0, 'rgba(255, 200, 255, 0.05)');
      iriGrad.addColorStop(0.5, 'rgba(200, 255, 255, 0.05)');
      iriGrad.addColorStop(1, 'rgba(255, 255, 200, 0.05)');
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = iriGrad;
      ctx.fill();
    }
    
    ctx.restore();
  }

  /**
   * 绘制所有泡沫
   */
  render(ctx, scale = 1) {
    if (this.bubbles.length === 0 || this.opacity <= 0) return;
    
    ctx.save();
    
    // 绘制白色底层
    if (this._hasUnderlay) {
      ctx.save();
      ctx.translate(this._underlayX, this._underlayY);
      ctx.globalAlpha = this.opacity * 0.15;
      ctx.beginPath();
      ctx.arc(0, 0, this._underlayRadius, 0, Math.PI * 2);
      const underlayGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this._underlayRadius);
      underlayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      underlayGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
      underlayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = underlayGrad;
      ctx.fill();
      ctx.restore();
    }
    
    // 按半径排序确保正确的绘制顺序
    const sortedBubbles = [...this.bubbles].sort((a, b) => a.r - b.r);
    sortedBubbles.forEach(bubble => {
      this.drawBubble(ctx, bubble, scale);
    });
    
    ctx.restore();
  }

  /**
   * 根据划动进度减少泡沫
   */
  reduceByStroke(strokeCount, maxStrokes) {
    const progress = strokeCount / maxStrokes;
    this.opacity = 1 - progress;
    
    // 随机移除一些气泡
    const targetCount = Math.floor(this.bubbles.length * (1 - progress * 0.5));
    while (this.bubbles.length > targetCount) {
      const idx = Math.floor(Math.random() * this.bubbles.length * 0.7);
      this.bubbles.splice(idx, 1);
    }
  }

  clear() {
    this.bubbles = [];
    this.opacity = 1.0;
    this._hasUnderlay = false;
  }

  hasFoam() {
    return this.bubbles.length > 0 && this.opacity > 0;
  }

  getBubbleCount() {
    return this.bubbles.length;
  }
}

export default FoamGenerator;
