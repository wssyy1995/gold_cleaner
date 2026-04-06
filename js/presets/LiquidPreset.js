/**
 * LiquidPreset 液体污渍预制污垢生成器
 * 严格按照 docs/liquid 实现遮罩和混合模式
 */

export default class LiquidPreset {
  static LIQUID_PROFILES = {
    water: {
      shadow: 'rgba(150, 180, 210, 0.25)',
      base: 'rgba(140, 210, 255, 0.2)',
      deep: 'rgba(100, 200, 255, 0.4)',
      highlight: 'rgba(255, 255, 255, 0.9)',
      gloss: 'rgba(255, 255, 255, 0.4)'
    },
    coffee: {
      shadow: 'rgba(60, 40, 30, 0.3)',
      base: 'rgba(90, 50, 30, 0.7)',
      deep: 'rgba(50, 25, 10, 0.85)',
      highlight: 'rgba(255, 255, 255, 0.9)',
      gloss: 'rgba(255, 255, 255, 0.25)'
    }
  };

  static generate(config, s) {
    const liquidType = config.liquid_type || 'water';
    const perspective = config.perspective || 'top-down';
    const count = config.count || 3;
    const scaleY = this._getScaleY(perspective);
    
    let clusters = [];
    if (config.rect && Array.isArray(config.rect) && config.rect.length === 4) {
      clusters = this._generateInQuad(config.rect, count, scaleY, s);
    } else {
      clusters = this._generateInCircle(config, count, scaleY, s);
    }
    
    const xs = clusters.map(c => c.x);
    const ys = clusters.map(c => c.y);
    const centerX = xs.reduce((a, b) => a + b, 0) / clusters.length;
    const centerY = ys.reduce((a, b) => a + b, 0) / clusters.length;
    const radius = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys)
    ) / 2;
    
    return {
      clusters,
      centerX,
      centerY,
      radius,
      liquidType,
      perspective,
      scaleY
    };
  }
  
  static _getScaleY(perspective) {
    if (perspective === 'isometric') return 0.55;
    if (perspective === 'front') return 0.25;
    return 1;
  }
  
  static _generateInQuad(quad, count, scaleY, s) {
    const p0 = { x: quad[0].x * s, y: quad[0].y * s };
    const p1 = { x: quad[1].x * s, y: quad[1].y * s };
    const p2 = { x: quad[2].x * s, y: quad[2].y * s };
    const p3 = { x: quad[3].x * s, y: quad[3].y * s };
    
    const clusters = [];
    
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      let cx, cy;
      
      if (r < 0.5) {
        const pt = this._randomPointInTriangle(p0, p1, p2);
        cx = pt.x;
        cy = pt.y;
      } else {
        const pt = this._randomPointInTriangle(p0, p2, p3);
        cx = pt.x;
        cy = pt.y;
      }
      
      clusters.push({
        x: cx,
        y: cy,
        drops: this._generateDrops(s)
      });
    }
    
    return clusters;
  }
  
  static _generateInCircle(config, count, scaleY, s) {
    const centerX = (config.x || 300) * s;
    const centerY = (config.y || 400) * s;
    const radius = (config.radius || 60) * s;
    
    const clusters = [];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.5) * radius;
      
      clusters.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        drops: this._generateDrops(s)
      });
    }
    
    return clusters;
  }
  
  static _generateDrops(s) {
    const drops = [];
    
    // 大水滴：20-50个，模拟文档中的numDropsInPuddle
    const numLargeDrops = 20 + Math.floor(Math.random() * 30);
    for (let i = 0; i < numLargeDrops; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (Math.random() * 120 * s);
      
      drops.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        r: 15 + Math.random() * 30 * s, // 模拟targetR
        type: 'large'
      });
    }
    
    // 小水滴：5-10个，分散的大范围
    const numSmallDrops = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numSmallDrops; i++) {
      drops.push({
        x: (Math.random() - 0.5) * 250 * s,
        y: (Math.random() - 0.5) * 250 * s,
        r: 3 + Math.random() * 6 * s,
        type: 'small'
      });
    }
    
    return drops;
  }
  
  static _randomPointInTriangle(a, b, c) {
    let r1 = Math.random();
    let r2 = Math.random();
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    return {
      x: a.x + r1 * (b.x - a.x) + r2 * (c.x - a.x),
      y: a.y + r1 * (b.y - a.y) + r2 * (c.y - a.y)
    };
  }
  
  static render(ctx, dirt, s, pulseAlpha = 1, remainingRatio = 1, cx, cy) {
    if (!dirt.presetData?.clusters) return;
    
    const { clusters, centerX, centerY, liquidType, scaleY } = dirt.presetData;
    const profile = this.LIQUID_PROFILES[liquidType] || this.LIQUID_PROFILES.water;
    
    const offsetX = cx - centerX;
    const offsetY = cy - centerY;
    
    // 计算擦拭进度
    let wipeProgress = 0;
    if (dirt.wipeProgress !== undefined) {
      wipeProgress = dirt.wipeProgress;
    } else if (dirt.strokeCount !== undefined && dirt.maxStrokes > 0) {
      wipeProgress = dirt.strokeCount / dirt.maxStrokes;
    } else {
      wipeProgress = 1 - remainingRatio;
    }
    
    const visibilityThreshold = 1 - wipeProgress;
    
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    
    // 为每个水渍团创建遮罩并渲染
    clusters.forEach((cluster, clusterIndex) => {
      const clusterThreshold = ((clusterIndex * 137.5) % 100) / 100;
      if (clusterThreshold > visibilityThreshold) return;
      
      const rx = cluster.x + offsetX;
      const ry = cluster.y + offsetY;
      
      // 计算水渍团的包围盒大小
      let maxR = 0;
      cluster.drops.forEach(d => {
        if (d.r > maxR) maxR = d.r;
      });
      
      const padding = 30;
      const maskWidth = (maxR + padding) * 2;
      const maskHeight = (maxR + padding) * 2;
      const maskX = rx - maxR - padding;
      const maskY = ry - maxR - padding;
      
      // 使用离屏 canvas 创建遮罩（模拟文档的 maskCanvas）
      // 在微信小游戏中使用临时 canvas
      try {
        const maskCanvas = wx.createOffscreenCanvas({
          type: '2d',
          width: Math.ceil(maskWidth),
          height: Math.ceil(maskHeight)
        });
        const maskCtx = maskCanvas.getContext('2d');
        
        const tempCanvas = wx.createOffscreenCanvas({
          type: '2d',
          width: Math.ceil(maskWidth),
          height: Math.ceil(maskHeight)
        });
        const tempCtx = tempCanvas.getContext('2d');
        
        // 清除遮罩
        maskCtx.clearRect(0, 0, maskWidth, maskHeight);
        
        // 在遮罩上绘制水滴形状（白色渐变）
        cluster.drops.forEach(drop => {
          const dx = rx - maskX + drop.x;
          const dy = ry - maskY + drop.y;
          const scaledY = dy / scaleY;
          
          maskCtx.save();
          maskCtx.scale(1, scaleY);
          
          const radGrad = maskCtx.createRadialGradient(dx, scaledY, 0, dx, scaledY, drop.r);
          radGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          radGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.8)');
          radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          maskCtx.fillStyle = radGrad;
          maskCtx.beginPath();
          maskCtx.arc(dx, scaledY, drop.r, 0, Math.PI * 2);
          maskCtx.fill();
          
          maskCtx.restore();
        });
        
        // 阈值处理遮罩（模拟文档的阈值处理）
        // 由于小程序不支持直接操作 pixel data，我们简化处理
        // 直接使用遮罩进行裁剪
        
        ctx.save();
        ctx.beginPath();
        cluster.drops.forEach(drop => {
          const dx = rx + drop.x;
          const dy = ry + drop.y;
          ctx.ellipse(dx, dy, drop.r, drop.r * scaleY, 0, 0, Math.PI * 2);
        });
        ctx.clip();
        
        // 绘制基础颜色
        ctx.fillStyle = profile.base;
        ctx.fill();
        
        ctx.restore();
        
      } catch (e) {
        // 如果离屏 canvas 不支持，使用简化渲染
        this._renderSimple(ctx, rx, ry, cluster.drops, profile, scaleY);
      }
    });
    
    ctx.restore();
  }
  
  // 简化渲染模式（备用）
  static _renderSimple(ctx, rx, ry, drops, profile, scaleY) {
    // 1. 阴影
    ctx.save();
    ctx.shadowColor = profile.shadow;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 10 * scaleY;
    
    drops.forEach(drop => {
      ctx.beginPath();
      ctx.ellipse(rx + drop.x, ry + drop.y, drop.r, drop.r * scaleY, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fill();
    });
    ctx.restore();
    
    // 2. 基础颜色
    ctx.save();
    drops.forEach(drop => {
      const dx = rx + drop.x;
      const dy = ry + drop.y;
      
      const grad = ctx.createRadialGradient(dx, dy, 0, dx, dy, drop.r);
      grad.addColorStop(0, profile.base);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      
      ctx.beginPath();
      ctx.ellipse(dx, dy, drop.r, drop.r * scaleY, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
    ctx.restore();
    
    // 3. 深色主体（偏移）
    drops.forEach(drop => {
      const dx = rx + drop.x - 3;
      const dy = ry + drop.y - 3 * scaleY;
      
      ctx.beginPath();
      ctx.ellipse(dx, dy, drop.r * 0.7, drop.r * 0.7 * scaleY, 0, 0, Math.PI * 2);
      ctx.fillStyle = profile.deep;
      ctx.fill();
    });
    
    // 4. 高光（反向偏移）
    drops.forEach((drop, i) => {
      if (i % 2 !== 0) return;
      const dx = rx + drop.x + 3;
      const dy = ry + drop.y + 4 * scaleY;
      
      ctx.beginPath();
      ctx.ellipse(dx, dy, drop.r * 0.25, drop.r * 0.25 * scaleY, 0, 0, Math.PI * 2);
      ctx.fillStyle = profile.highlight;
      ctx.fill();
    });
  }
}
