/**
 * FoamGenerator.js
 * 泡沫生成器 - 用于 spray_wipe 两阶段清洁的第一阶段
 * 
 * 5秒反应时间线：
 * 0-1.5s: 起泡膨胀 - 轻微抖动，模拟发泡反应
 * 1.5-3.5s: 溶解吸收 - 泡沫收缩，透出污垢色
 * 3.5-5s: 重力破防 - 泡沫水滴向下滑落
 * 5s+: 稳定态 - 显示等待图标
 */

class FoamGenerator {
  constructor(options = {}) {
    this.brushSize = options.brushSize || 35;
    this.bubbles = [];
    this.opacity = 1.0;
    
    // 5秒反应时间线
    this.reactionStartTime = null;
    this.reactionDuration = 5000; // 5秒总时长
    this.phase = 'none'; // none, foaming, dissolving, dripping, stable
    
    // 每个气泡的个体参数（用于动画）
    this.bubbleParams = [];
    
    // 滑落的水滴
    this.drips = [];
    
    // 稳定态回调
    this.onStable = null;
  }

  /**
   * 开始5秒反应时间线
   */
  startReaction(onStableCallback) {
    this.reactionStartTime = Date.now();
    this.phase = 'foaming';
    this.onStable = onStableCallback;
    
    // 为每个气泡生成随机动画参数
    this.bubbleParams = this.bubbles.map(() => ({
      jitterOffset: Math.random() * Math.PI * 2,
      jitterSpeed: 0.5 + Math.random() * 1.5,
      scaleBase: 0.8 + Math.random() * 0.4,
      dissolveDelay: Math.random() * 500 // 0-500ms随机延迟
    }));
    
    console.log('[FoamGenerator] 开始5秒反应时间线');
  }

  /**
   * 获取当前反应进度 (0-1)
   */
  getReactionProgress() {
    if (!this.reactionStartTime) return 0;
    const elapsed = Date.now() - this.reactionStartTime;
    return Math.min(elapsed / this.reactionDuration, 1);
  }

  /**
   * 更新反应阶段
   */
  update() {
    if (!this.reactionStartTime) return;
    
    const progress = this.getReactionProgress();
    const prevPhase = this.phase;
    
    // 划分阶段
    if (progress < 0.3) {
      this.phase = 'foaming'; // 0-1.5s
    } else if (progress < 0.7) {
      this.phase = 'dissolving'; // 1.5-3.5s
    } else if (progress < 1.0) {
      this.phase = 'dripping'; // 3.5-5s
    } else {
      this.phase = 'stable'; // 5s+
    }
    
    // 阶段切换时生成水滴
    if (prevPhase !== 'dripping' && this.phase === 'dripping') {
      this._generateDrips();
    }
    
    // 进入稳定态时回调
    if (prevPhase !== 'stable' && this.phase === 'stable' && this.onStable) {
      console.log('[FoamGenerator] 进入稳定态，显示等待图标');
      this.onStable();
    }
    
    // 更新水滴位置
    this._updateDrips();
  }

  /**
   * 生成向下流动的水滴（只流动10px）
   */
  _generateDrips() {
    // 从大气泡生成流动效果
    const largeBubbles = this.bubbles.filter(b => b.r > 8);
    const dripCount = Math.min(largeBubbles.length, 6);
    
    for (let i = 0; i < dripCount; i++) {
      const sourceBubble = largeBubbles[Math.floor(Math.random() * largeBubbles.length)];
      this.drips.push({
        x: sourceBubble.x + (Math.random() - 0.5) * 8,
        y: sourceBubble.y + sourceBubble.r * 0.5, // 从气泡底部开始
        r: 1.5 + Math.random() * 2,
        startY: sourceBubble.y + sourceBubble.r * 0.5,
        maxDrop: 10, // 最大流动10px
        opacity: 0.6,
        progress: 0 // 流动进度 0-1
      });
    }
  }

  /**
   * 更新水滴位置（只流动10px）
   */
  _updateDrips() {
    this.drips.forEach(drip => {
      // 缓慢向下流动，最大10px
      drip.progress += 0.03; // 流动速度
      if (drip.progress > 1) drip.progress = 1;
      
      // 计算当前位置（只向下移动10px）
      drip.y = drip.startY + drip.maxDrop * drip.progress;
      
      // 到达最大位置后开始淡出
      if (drip.progress >= 1) {
        drip.opacity -= 0.02;
      }
    });
    
    // 移除消失的水滴
    this.drips = this.drips.filter(d => d.opacity > 0);
  }

  /**
   * 在指定位置生成泡沫群
   * @param {number} x - 中心X坐标
   * @param {number} y - 中心Y坐标
   * @param {number} scale - 屏幕缩放比例
   * @param {number} dirtWidth - 污垢宽度（可选），用于计算泡沫大小
   */
  spawnFoamCluster(x, y, scale = 1, dirtWidth = null) {
    const bubbles = [];
    // 如果有污垢宽度，泡沫宽度为污垢宽度的 1/2，否则使用默认 brushSize
    const baseSize = dirtWidth ? dirtWidth / 2 : this.brushSize;
    const brushSize = baseSize * scale;
    
    // 三类气泡
    const microCount = Math.floor(brushSize * 1.2);
    const mediumCount = Math.floor(brushSize * 0.5);
    const macroCount = Math.floor(brushSize * 0.15);
    
    // 1. 微气泡
    for (let i = 0; i < microCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusOffset = Math.random() * brushSize * 1.2;
      bubbles.push({
        x: x + Math.cos(angle) * radiusOffset,
        y: y + Math.sin(angle) * radiusOffset,
        r: (Math.random() * 2.5 + 1) * scale,
        type: 'micro',
        baseX: x + Math.cos(angle) * radiusOffset,
        baseY: y + Math.sin(angle) * radiusOffset
      });
    }
    
    // 2. 中等气泡
    for (let i = 0; i < mediumCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusOffset = Math.random() * brushSize * 1.1;
      bubbles.push({
        x: x + Math.cos(angle) * radiusOffset,
        y: y + Math.sin(angle) * radiusOffset,
        r: (Math.random() * 5 + 3) * scale,
        type: 'medium',
        baseX: x + Math.cos(angle) * radiusOffset,
        baseY: y + Math.sin(angle) * radiusOffset
      });
    }
    
    // 3. 大气泡
    for (let i = 0; i < macroCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusOffset = Math.random() * brushSize * 0.9;
      bubbles.push({
        x: x + Math.cos(angle) * radiusOffset,
        y: y + Math.sin(angle) * radiusOffset,
        r: (Math.random() * 9 + 4) * scale,
        type: 'macro',
        baseX: x + Math.cos(angle) * radiusOffset,
        baseY: y + Math.sin(angle) * radiusOffset
      });
    }
    
    // 按半径排序
    bubbles.sort((a, b) => a.r - b.r);
    
    this.bubbles.push(...bubbles);
    
    if (this.bubbles.length > 200) {
      this.bubbles = this.bubbles.slice(-200);
    }
  }

  /**
   * 绘制单个气泡 - 带时间线动画效果
   */
  drawBubble(ctx, bubble, params, scale = 1) {
    const progress = this.getReactionProgress();
    const time = Date.now() / 1000;
    
    let x = bubble.baseX || bubble.x;
    let y = bubble.baseY || bubble.y;
    let r = bubble.r;
    let alpha = 1;
    let tintColor = null; // 污垢色调
    
    // 根据阶段应用动画 - 使用平滑过渡
    // 定义阶段时间点和过渡曲线
    const foamEnd = 0.35;      // 膨胀结束点 (1.75s)
    const dissolveStart = 0.25; // 收缩开始点 (1.25s) - 重叠过渡
    const dissolveEnd = 0.75;   // 收缩结束点 (3.75s)
    const stableStart = 0.65;   // 稳定开始点 (3.25s) - 重叠过渡
    
    // 计算膨胀系数：0 -> 1.2 -> 1.0 -> 0.85
    let expansion = 1;
    if (progress < dissolveStart) {
      // 纯膨胀阶段 (0-1.25s)
      const t = progress / dissolveStart;
      expansion = 1 + easeOutQuad(t) * 0.2; // 最大膨胀到1.2
    } else if (progress < foamEnd) {
      // 膨胀到收缩的过渡 (1.25s-1.75s)
      const t = (progress - dissolveStart) / (foamEnd - dissolveStart);
      expansion = 1.2 - easeInOutQuad(t) * 0.1; // 1.2 -> 1.1
    } else if (progress < stableStart) {
      // 纯收缩阶段 (1.75s-3.25s)
      const t = (progress - foamEnd) / (stableStart - foamEnd);
      expansion = 1.1 - easeInOutQuad(t) * 0.15; // 1.1 -> 0.95
    } else {
      // 稳定阶段 (3.25s+)
      const t = Math.min((progress - stableStart) / (1 - stableStart), 1);
      expansion = 0.95 - easeOutQuad(t) * 0.1; // 0.95 -> 0.85
    }
    
    // 应用膨胀/收缩
    r *= expansion;
    
    // 抖动效果：只在反应开始后（第一阶段进度条满）才有
    // 在膨胀阶段最明显，逐渐减弱
    if (this.phase !== 'none' && progress < foamEnd + 0.1) {
      const jitterIntensity = Math.max(0, 1 - progress / (foamEnd + 0.1));
      const jitter = Math.sin(time * params.jitterSpeed + params.jitterOffset) * 2 * jitterIntensity;
      x += jitter;
      y += jitter * 0.5;
    }
    
    // 污垢色调：平滑淡入
    if (progress > dissolveStart) {
      let tintStrength;
      if (progress < foamEnd) {
        // 开始淡入
        const t = (progress - dissolveStart) / (foamEnd - dissolveStart);
        tintStrength = easeInQuad(t) * 0.15;
      } else if (progress < stableStart) {
        // 继续加深
        const t = (progress - foamEnd) / (stableStart - foamEnd);
        tintStrength = 0.15 + easeInOutQuad(t) * 0.15;
      } else {
        // 达到最大
        tintStrength = 0.3 + easeOutQuad(Math.min((progress - stableStart) / 0.2, 1)) * 0.1;
      }
      tintColor = `rgba(139, 125, 80, ${tintStrength})`;
    }
    
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = this.opacity * alpha;
    
    const isMicro = r <= 4 * scale;
    
    // 气泡主体
    const bodyGrad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
    if (isMicro) {
      bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      bodyGrad.addColorStop(0.8, 'rgba(240, 245, 255, 0.8)');
      bodyGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
    } else {
      bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      bodyGrad.addColorStop(0.6, 'rgba(245, 250, 255, 0.2)');
      bodyGrad.addColorStop(0.9, 'rgba(255, 255, 255, 0.6)');
      bodyGrad.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
    }
    
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    
    // 如果有污垢色调，叠加颜色
    if (tintColor && !isMicro) {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = tintColor;
      ctx.fill();
    }
    
    // 轮廓
    ctx.lineWidth = Math.max(0.4, r * 0.03);
    ctx.strokeStyle = 'rgba(180, 200, 220, 0.15)';
    ctx.stroke();
    
    // 高光
    if (r > 3 * scale) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(-r * 0.4, -r * 0.4, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.5, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, Math.PI * 0.15, Math.PI * 0.55);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = Math.max(1.5, r * 0.15);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * 绘制水滴
   */
  drawDrips(ctx) {
    this.drips.forEach(drip => {
      ctx.save();
      ctx.globalAlpha = drip.opacity;
      
      // 水滴主体 - 带污垢色
      const grad = ctx.createRadialGradient(drip.x, drip.y, 0, drip.x, drip.y, drip.r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.5, 'rgba(200, 190, 160, 0.6)');
      grad.addColorStop(1, 'rgba(139, 125, 80, 0.4)');
      
      ctx.beginPath();
      ctx.arc(drip.x, drip.y, drip.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      
      // 水滴尾部（拖尾效果）
      ctx.beginPath();
      ctx.moveTo(drip.x - drip.r * 0.5, drip.y);
      ctx.lineTo(drip.x, drip.y - drip.vy * 3);
      ctx.lineTo(drip.x + drip.r * 0.5, drip.y);
      ctx.fillStyle = 'rgba(139, 125, 80, 0.3)';
      ctx.fill();
      
      ctx.restore();
    });
  }

  /**
   * 绘制所有泡沫
   */
  render(ctx, scale = 1) {
    if (this.bubbles.length === 0 || this.opacity <= 0) return;
    
    // 更新动画状态
    this.update();
    
    ctx.save();
    
    // 绘制水滴（在泡沫下方）
    this.drawDrips(ctx);
    
    // 按半径排序绘制气泡
    const sortedBubbles = [...this.bubbles].sort((a, b) => a.r - b.r);
    sortedBubbles.forEach((bubble, i) => {
      const params = this.bubbleParams[i] || {
        jitterOffset: 0, jitterSpeed: 1, scaleBase: 1, dissolveDelay: 0
      };
      this.drawBubble(ctx, bubble, params, scale);
    });
    
    ctx.restore();
  }

  /**
   * 根据划动进度减少泡沫
   */
  reduceByStroke(strokeCount, maxStrokes) {
    const progress = strokeCount / maxStrokes;
    this.opacity = 1 - progress;
    
    const targetCount = Math.floor(this.bubbles.length * (1 - progress * 0.5));
    while (this.bubbles.length > targetCount) {
      const idx = Math.floor(Math.random() * this.bubbles.length * 0.7);
      this.bubbles.splice(idx, 1);
      this.bubbleParams.splice(idx, 1);
    }
  }

  /**
   * 是否已进入稳定态（可以显示等待图标）
   */
  isStable() {
    return this.phase === 'stable';
  }

  /**
   * 获取当前阶段
   */
  getPhase() {
    return this.phase;
  }

  clear() {
    this.bubbles = [];
    this.bubbleParams = [];
    this.drips = [];
    this.opacity = 1.0;
    this.phase = 'none';
    this.reactionStartTime = null;
    this.onStable = null;
  }

  hasFoam() {
    return this.bubbles.length > 0 && this.opacity > 0;
  }

  getBubbleCount() {
    return this.bubbles.length;
  }
}

// 缓动函数 - 用于平滑过渡
function easeInQuad(t) {
  return t * t;
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default FoamGenerator;
