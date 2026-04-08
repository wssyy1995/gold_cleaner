/**
 * LiquidPreset.js
 * 液体污渍预制污垢生成器
 * 参考 docs/liquid 实现
 * 
 * 支持：
 * - 多种液体类型：water, coffee, tea, ketchup, soysauce
 * - 两种视角：top（俯视图）, perspective（透视图）
 * - 不规则边缘形状 + 散落水滴
 * - 3D厚度效果
 */

// 液体配置文件 - 严格按文档
const LIQUID_PROFILES = {
  water: {
    name: '清水',
    bodyColors: ['#d0eef8', '#a5d6e9', '#8fc6dc'],
    bodyOpacities: [0.55, 0.7, 0.82],
    edgeTint: '#6eabc8',
    edgeTintOpacity: 0.45,
    innerGlowColor: 'rgba(255,255,255,0.7)',
    innerSpotColor: 'rgba(255, 255, 255, 0.7)',
    strokeColor: '#3a7595',
    shadowColor: '#d5dde5'
  },
  coffee: {
    name: '咖啡',
    bodyColors: ['#b8845c', '#9b6942', '#7a5030'],
    bodyOpacities: [0.82, 0.88, 0.94],
    edgeTint: '#5a381e',
    edgeTintOpacity: 0.5,
    innerGlowColor: 'rgba(255,230,200,0.55)',
    innerSpotColor: 'rgba(255, 255, 255, 0.7)',
    strokeColor: '#3d2514',
    shadowColor: '#d5dde5'
  },
  tea: {
    name: '茶渍',
    bodyColors: ['#edd88a', '#d4a940', '#b88a25'],
    bodyOpacities: [0.7, 0.78, 0.85],
    edgeTint: '#9a6d15',
    edgeTintOpacity: 0.45,
    innerGlowColor: 'rgba(255,245,210,0.6)',
    innerSpotColor: 'rgba(255, 255, 255, 0.7)',
    strokeColor: '#7a5113',
    shadowColor: '#d5dde5'
  },
  ketchup: {
    name: '番茄酱',
    bodyColors: ['#e04540', '#c2221b', '#9b1612'],
    bodyOpacities: [0.9, 0.95, 1],
    edgeTint: '#6e0c08',
    edgeTintOpacity: 0.55,
    innerGlowColor: 'rgba(255,180,180,0.5)',
    innerSpotColor: 'rgba(255, 255, 255, 0.7)',
    strokeColor: '#470502',
    shadowColor: '#d5dde5'
  },
  soysauce: {
    name: '酱油渍',
    bodyColors: ['#a35a22', '#853e12', '#541f02'],
    bodyOpacities: [0.88, 0.93, 0.98],
    edgeTint: '#2e1000',
    edgeTintOpacity: 0.55,
    innerGlowColor: 'rgba(255,220,180,0.45)',
    innerSpotColor: 'rgba(255, 255, 255, 0.7)',
    strokeColor: '#361502',
    shadowColor: '#d5dde5'
  }
};

export default class LiquidPreset {
  /**
   * 生成液体污渍数据
   * @param {Object} config - 配置 { rect, liquid_type, view, count }
   * @param {number} s - 屏幕缩放比例
   */
  static generate(config, s) {
    const liquidType = config.liquid_type || 'water';
    const viewType = config.view || 'perspective';
    const count = config.count || 1;
    
    const profile = LIQUID_PROFILES[liquidType] || LIQUID_PROFILES.water;
    
    let centerX, centerY, radius;
    let regionPoints = [];
    
    if (config.rect && Array.isArray(config.rect) && config.rect.length === 4) {
      const quad = config.rect;
      const p0 = { x: quad[0].x * s, y: quad[0].y * s };
      const p1 = { x: quad[1].x * s, y: quad[1].y * s };
      const p2 = { x: quad[2].x * s, y: quad[2].y * s };
      const p3 = { x: quad[3].x * s, y: quad[3].y * s };
      
      centerX = (p0.x + p1.x + p2.x + p3.x) / 4;
      centerY = (p0.y + p1.y + p2.y + p3.y) / 4;
      
      const xs = [p0.x, p1.x, p2.x, p3.x];
      const ys = [p0.y, p1.y, p2.y, p3.y];
      radius = Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys)
      ) / 2;
      
      regionPoints = [p0, p1, p2, p3];
    } else {
      centerX = config.x * s;
      centerY = config.y * s;
      radius = (config.radius || 60) * s;
    }
    
    const puddles = [];
    for (let i = 0; i < count; i++) {
      let px, py;
      
      if (regionPoints.length === 4) {
        const r = Math.random();
        if (r < 0.5) {
          const point = this._randomPointInTriangle(regionPoints[0], regionPoints[1], regionPoints[2]);
          px = point.x;
          py = point.y;
        } else {
          const point = this._randomPointInTriangle(regionPoints[0], regionPoints[2], regionPoints[3]);
          px = point.x;
          py = point.y;
        }
      } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * radius * 0.8;
        px = centerX + Math.cos(angle) * dist;
        py = centerY + Math.sin(angle) * dist;
      }
      
      puddles.push(this._generatePuddle(px, py, radius * 0.4, viewType, s));
    }
    
    return {
      puddles,
      profile,
      liquidType,
      viewType,
      centerX,
      centerY,
      radius,
      region: regionPoints.length === 4 ? {
        type: 'quad',
        points: regionPoints
      } : {
        type: 'circle',
        cx: centerX,
        cy: centerY,
        radius
      }
    };
  }
  
  static _generatePuddle(cx, cy, size, viewType, s) {
    const squashFactor = viewType === 'top' ? 1 : 0.38;
    
    const phase1 = Math.random() * Math.PI * 2;
    const phase2 = Math.random() * Math.PI * 2;
    const phase3 = Math.random() * Math.PI * 2;
    const phase4 = Math.random() * Math.PI * 2;
    
    const numPoints = 30;
    const angleStep = (Math.PI * 2) / numPoints;
    const points = [];
    
    for (let i = 0; i < numPoints; i++) {
      const angle = i * angleStep;
      const wave = 
        Math.sin(angle * 2 + phase1) * 0.4 + 
        Math.cos(angle * 3 + phase2) * 0.3 + 
        Math.sin(angle * 4 + phase3) * 0.2 +
        Math.cos(angle * 6 + phase4) * 0.15;
      
      const r = size + wave * size * 0.37;
      
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r * squashFactor
      });
    }
    
    const path = this._getSmoothPath(points);
    
    const droplets = [];
    const numDroplets = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numDroplets; i++) {
      const dropAngle = Math.random() * Math.PI * 2;
      const dist = size * 1.4 + Math.random() * size * 0.3;
      const dropCx = cx + Math.cos(dropAngle) * dist;
      const dropCy = cy + Math.sin(dropAngle) * dist * squashFactor;
      const dropSize = (5 + Math.random() * 12) * s;
      
      const dropPoints = [];
      for (let j = 0; j < 6; j++) {
        const a = j * (Math.PI * 2) / 6;
        const r = dropSize * 0.8 + Math.random() * dropSize * 0.4;
        dropPoints.push({
          x: dropCx + Math.cos(a) * r,
          y: dropCy + Math.sin(a) * r * squashFactor
        });
      }
      
      droplets.push({
        path: this._getSmoothPath(dropPoints),
        cx: dropCx,
        cy: dropCy,
        size: dropSize
      });
    }
    
    const innerHighlights = [];
    const numSpots = 1;
    for (let i = 0; i < numSpots; i++) {
      const spotAngle = Math.PI * 1.15 + (i * 0.15) + (Math.random() * 0.1);
      const spotDist = size * 0.55 + (i * size * 0.1) + (Math.random() * size * 0.08);
      const spotCx = cx + Math.cos(spotAngle) * spotDist;
      const spotCy = cy + Math.sin(spotAngle) * spotDist * squashFactor;
      
      const rx = (12 + Math.random() * 4) * s;
      const ry = (4.5 + Math.random() * 2) * s;
      
      innerHighlights.push({ cx: spotCx, cy: spotCy, rx, ry });
    }
    
    return { cx, cy, size, path, droplets, innerHighlights };
  }
  
  static _getSmoothPath(points) {
    const tension = 0.25;
    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    
    for (let i = 0; i < points.length; i++) {
      const p0 = points[(i - 1 + points.length) % points.length];
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const p3 = points[(i + 2) % points.length];
      
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      
      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    
    return path;
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
    if (!dirt.presetData?.puddles) return;
    
    const { puddles, profile, viewType } = dirt.presetData;
    const offsetX = cx - dirt.presetData.centerX;
    const offsetY = cy - dirt.presetData.centerY;
    
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    
    if (remainingRatio < 1) {
      const clipHeight = dirt.presetData.radius * 2 * remainingRatio;
      ctx.beginPath();
      ctx.rect(cx - dirt.presetData.radius, cy - dirt.presetData.radius + (dirt.presetData.radius * 2 - clipHeight), dirt.presetData.radius * 2, clipHeight);
      ctx.clip();
    }
    
    puddles.forEach(puddle => {
      this._renderPuddle(ctx, puddle, profile, viewType, offsetX, offsetY, s);
    });
    
    ctx.restore();
  }
  
  static _renderPuddle(ctx, puddle, profile, viewType, offsetX, offsetY, s) {
    const { path, droplets, innerHighlights, cx, cy } = puddle;
    const pcx = cx + offsetX;
    const pcy = cy + offsetY;
    
    const shadowDx = viewType === 'perspective' ? 3 * s : 1 * s;
    const shadowDy = viewType === 'perspective' ? 5 * s : 2 * s;
    const shadowBlur = viewType === 'perspective' ? 2 * s : 1 * s;
    
    ctx.save();
    
    // 阴影
    ctx.shadowColor = profile.shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowDx;
    ctx.shadowOffsetY = shadowDy;
    
    // Layer 1: 基础填充
    ctx.fillStyle = this._createBodyGradient(ctx, pcx, pcy, profile);
    ctx.fill(new Path2D(path));
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // 创建裁剪路径
    ctx.save();
    ctx.clip(new Path2D(path));
    
    // Layer 2: 边缘色调 - 增强3D感
    const edgeTintGrad = ctx.createLinearGradient(pcx - puddle.size, pcy - puddle.size, pcx + puddle.size, pcy + puddle.size);
    edgeTintGrad.addColorStop(0, this._hexToRgba(profile.edgeTint, 0.15));
    edgeTintGrad.addColorStop(0.5, this._hexToRgba(profile.edgeTint, profile.edgeTintOpacity * 0.7));
    edgeTintGrad.addColorStop(1, this._hexToRgba(profile.edgeTint, profile.edgeTintOpacity));
    ctx.strokeStyle = edgeTintGrad;
    ctx.lineWidth = 12 * s;
    ctx.stroke(new Path2D(path));
    
    // Layer 3: 左上内阴影（3D厚度）
    const innerDarkGrad = ctx.createLinearGradient(pcx - puddle.size, pcy - puddle.size, pcx + puddle.size, pcy + puddle.size);
    innerDarkGrad.addColorStop(0, this._hexToRgba(profile.strokeColor, 0.5));
    innerDarkGrad.addColorStop(0.2, this._hexToRgba(profile.strokeColor, 0.3));
    innerDarkGrad.addColorStop(0.4, this._hexToRgba(profile.strokeColor, 0.1));
    innerDarkGrad.addColorStop(0.6, 'transparent');
    innerDarkGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = innerDarkGrad;
    ctx.lineWidth = 15 * s;
    ctx.stroke(new Path2D(path));
    
    // Layer 4: 右下边缘光（3D光泽）
    const rimGrad = ctx.createLinearGradient(pcx - puddle.size, pcy - puddle.size, pcx + puddle.size, pcy + puddle.size);
    rimGrad.addColorStop(0, 'transparent');
    rimGrad.addColorStop(0.55, 'transparent');
    rimGrad.addColorStop(0.8, 'rgba(255,255,255,0.5)');
    rimGrad.addColorStop(0.95, 'rgba(255,255,255,0.85)');
    rimGrad.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 10 * s;
    ctx.stroke(new Path2D(path));
    
    // Layer 5: 柔和内发光 - 使用填充而不是描边
    const glowGrad = ctx.createRadialGradient(pcx, pcy, puddle.size * 0.4, pcx, pcy, puddle.size * 0.85);
    glowGrad.addColorStop(0, 'transparent');
    glowGrad.addColorStop(0.7, profile.innerGlowColor);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fill(new Path2D(path));
    
    // Layer 6: 内部高光点
    innerHighlights.forEach(spot => {
      ctx.fillStyle = profile.innerSpotColor;
      ctx.beginPath();
      ctx.ellipse(spot.cx + offsetX, spot.cy + offsetY, spot.rx, spot.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.ellipse(spot.cx + offsetX + spot.rx * 1.5, spot.cy + offsetY, spot.rx * 0.3, spot.ry * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
    
    // Layer 7: 外轮廓
    const outlineGrad = ctx.createLinearGradient(pcx - puddle.size, pcy - puddle.size, pcx + puddle.size, pcy + puddle.size);
    outlineGrad.addColorStop(0, this._hexToRgba(profile.strokeColor, 0.35));
    outlineGrad.addColorStop(0.5, this._hexToRgba(profile.strokeColor, 0.65));
    outlineGrad.addColorStop(1, this._hexToRgba(profile.strokeColor, 0.95));
    ctx.strokeStyle = outlineGrad;
    ctx.lineWidth = 2 * s;
    ctx.stroke(new Path2D(path));
    
    ctx.restore();
    
    droplets.forEach(drop => {
      this._renderDroplet(ctx, drop, profile, offsetX, offsetY, s);
    });
  }
  
  static _renderDroplet(ctx, drop, profile, offsetX, offsetY, s) {
    const { path, cx, cy, size } = drop;
    const dx = cx + offsetX;
    const dy = cy + offsetY;
    
    ctx.save();
    
    ctx.fillStyle = this._createBodyGradient(ctx, dx, dy, profile);
    ctx.fill(new Path2D(path));
    
    ctx.save();
    ctx.clip(new Path2D(path));
    
    ctx.strokeStyle = this._hexToRgba(profile.strokeColor, 0.35);
    ctx.lineWidth = 4 * s;
    ctx.stroke(new Path2D(path));
    
    const rimGrad = ctx.createLinearGradient(dx - size, dy - size, dx + size, dy + size);
    rimGrad.addColorStop(0, 'transparent');
    rimGrad.addColorStop(0.6, 'transparent');
    rimGrad.addColorStop(0.85, 'rgba(255,255,255,0.45)');
    rimGrad.addColorStop(1, 'rgba(255,255,255,0.75)');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 3 * s;
    ctx.stroke(new Path2D(path));
    
    ctx.strokeStyle = profile.innerGlowColor;
    ctx.lineWidth = 6 * s;
    ctx.stroke(new Path2D(path));
    
    ctx.restore();
    
    ctx.strokeStyle = profile.strokeColor;
    ctx.lineWidth = 1.2 * s;
    ctx.stroke(new Path2D(path));
    
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.ellipse(dx - size * 0.2, dy - size * 0.2, size * 0.28, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(dx + size * 0.15, dy - size * 0.3, size * 0.1, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  static _createBodyGradient(ctx, cx, cy, profile) {
    const grad = ctx.createLinearGradient(cx - 50, cy - 50, cx + 50, cy + 50);
    grad.addColorStop(0, this._hexToRgba(profile.bodyColors[0], profile.bodyOpacities[0]));
    grad.addColorStop(0.5, this._hexToRgba(profile.bodyColors[1], profile.bodyOpacities[1]));
    grad.addColorStop(1, this._hexToRgba(profile.bodyColors[2], profile.bodyOpacities[2]));
    return grad;
  }
  
  static _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
