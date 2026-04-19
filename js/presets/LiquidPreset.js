/**
 * LiquidPreset.js
 * 液体污渍预制污垢生成器
 * 严格按照 docs/liquid (LiquidPuddle_0408.html) 实现
 * 
 * 支持：
 * - 多种液体类型：water, coffee, tea, ketchup, soysauce
 * - 两种视角：top（俯视图）, perspective（透视图）
 * - 不规则边缘形状 + 散落水滴
 * - 7层 2.5D 渲染效果
 */

// 液体配置文件 - 完全按文档
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
    const scale = config.scale || 1; // 读取 scale 字段，默认 1
    
    const profile = LIQUID_PROFILES[liquidType] || LIQUID_PROFILES.water;
    
    // 计算区域中心和半径
    let centerX, centerY, radius;
    let regionPoints = [];
    
    if (config.rect && Array.isArray(config.rect) && config.rect.length === 4) {
      // 四边形区域
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
      // 圆形区域（后备）
      centerX = config.x * s;
      centerY = config.y * s;
      radius = (config.radius || 60) * s;
    }
    
    // 生成多个水洼，避免重叠
    const puddles = [];
    const minDistance = radius * 0.8; // 最小间距
    const maxAttempts = 2; // 最大尝试次数（快速失败）
    
    for (let i = 0; i < count; i++) {
      let px, py;
      let validPosition = false;
      let attempts = 0;
      
      // 尝试找到不重叠的位置
      while (!validPosition && attempts < maxAttempts) {
        attempts++;
        
        if (regionPoints.length === 4) {
          // 在四边形内随机生成
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
          // 在圆形内随机生成
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.sqrt(Math.random()) * radius * 0.8;
          px = centerX + Math.cos(angle) * dist;
          py = centerY + Math.sin(angle) * dist;
        }
        
        // 检查与已有水洼的距离
        validPosition = true;
        for (const existing of puddles) {
          const dx = px - existing.cx;
          const dy = py - existing.cy;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minDistance) {
            validPosition = false;
            break;
          }
        }
      }
      
      // 如果找不到合适位置，跳过这个水洼
      if (!validPosition) {
        console.log(`[LiquidPreset] 警告: 无法找到不重叠的位置，跳过第 ${i + 1} 个水洼`);
        continue;
      }
      
      puddles.push(this._generatePuddle(px, py, radius * 1.2 * scale, viewType, s));
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
  
  /**
   * 生成单个水洼 - 完全按文档算法
   */
  static _generatePuddle(cx, cy, size, viewType, s) {
    // 视角压扁因子：top=1, perspective=0.38
    const squashFactor = viewType === 'top' ? 1 : 0.38;
    
    // 随机相位
    const phase1 = Math.random() * Math.PI * 2;
    const phase2 = Math.random() * Math.PI * 2;
    const phase3 = Math.random() * Math.PI * 2;
    const phase4 = Math.random() * Math.PI * 2;
    
    // 30个点的不规则边缘
    const numPoints = 30;
    const angleStep = (Math.PI * 2) / numPoints;
    const basePoints = [];
    
    for (let i = 0; i < numPoints; i++) {
      const angle = i * angleStep;
      const wave = 
        Math.sin(angle * 2 + phase1) * 0.4 + 
        Math.cos(angle * 3 + phase2) * 0.3 + 
        Math.sin(angle * 4 + phase3) * 0.2 +
        Math.cos(angle * 6 + phase4) * 0.15;
      
      const r = size * 0.32 + wave * size * 0.12;
      
      basePoints.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r * squashFactor
      });
    }
    
    // 生成平滑路径
    const mainPath = this._getPath(basePoints);
    
    // 生成散落水滴
    const droplets = [];
    const numDroplets = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numDroplets; i++) {
      const dropAngle = Math.random() * Math.PI * 2;
      const dist = size * 0.45 + Math.random() * size * 0.1;
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
        path: this._getPath(dropPoints),
        cx: dropCx,
        cy: dropCy,
        size: dropSize
      });
    }
    
    // 生成内部高光点
    const innerHighlights = [];
    const numSpots = 1;
    for (let i = 0; i < numSpots; i++) {
      const spotAngle = Math.PI * 1.15 + (i * 0.15) + (Math.random() * 0.1);
      const spotDist = size * 0.22 + (i * size * 0.04) + (Math.random() * size * 0.03);
      const spotCx = cx + Math.cos(spotAngle) * spotDist;
      const spotCy = cy + Math.sin(spotAngle) * spotDist * squashFactor;
      
      const rx = (12 + Math.random() * 4) * s;
      const ry = (4.5 + Math.random() * 2) * s;
      
      innerHighlights.push({ cx: spotCx, cy: spotCy, rx, ry });
    }
    
    return { cx, cy, size, mainPath, droplets, innerHighlights };
  }
  
  /**
   * Catmull-Rom 样条曲线生成路径 - 完全按文档
   */
  static _getPath(points) {
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
  
  /**
   * 绘制路径 - 兼容小程序（不使用 Path2D）
   */
  static _drawPath(ctx, pathStr) {
    if (!pathStr) return;
    
    const parts = pathStr.match(/[MLC][^MLC]*/g);
    if (!parts) return;
    
    ctx.beginPath();
    
    for (const part of parts) {
      const cmd = part[0];
      const coords = part.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
      
      if (cmd === 'M' && coords.length >= 2) {
        ctx.moveTo(coords[0], coords[1]);
      } else if (cmd === 'L' && coords.length >= 2) {
        ctx.lineTo(coords[0], coords[1]);
      } else if (cmd === 'C' && coords.length >= 6) {
        ctx.bezierCurveTo(coords[0], coords[1], coords[2], coords[3], coords[4], coords[5]);
      }
    }
    
    ctx.closePath();
  }
  
  /**
   * 在三角形内生成随机点
   */
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
  
  /**
   * 渲染液体污渍
   */
  static render(ctx, dirt, s, pulseAlpha = 1, remainingRatio = 1, cx, cy) {
    try {
      if (!dirt.presetData?.puddles) return;
      
      const { puddles, profile, viewType } = dirt.presetData;
      const offsetX = cx - dirt.presetData.centerX;
      const offsetY = cy - dirt.presetData.centerY;
      
      ctx.save();
      ctx.globalAlpha = pulseAlpha;
      
      // 裁剪（清洁进度）
      if (remainingRatio < 1) {
        const clipHeight = dirt.presetData.radius * 2 * remainingRatio;
        ctx.beginPath();
        ctx.rect(
          cx - dirt.presetData.radius,
          cy - dirt.presetData.radius + (dirt.presetData.radius * 2 - clipHeight),
          dirt.presetData.radius * 2,
          clipHeight
        );
        ctx.clip();
      }
      
      // 渲染每个水洼
      puddles.forEach(puddle => {
        this._renderPuddle(ctx, puddle, profile, viewType, offsetX, offsetY, s);
      });
      
      ctx.restore();
    } catch (e) {
      console.error('[LiquidPreset.render] 渲染失败:', e);
    }
  }
  
  /**
   * 渲染单个水洼 - 完全按文档 7 层结构
   */
  static _renderPuddle(ctx, puddle, profile, viewType, offsetX, offsetY, s) {
    const { mainPath, droplets, innerHighlights, cx, cy } = puddle;
    const pcx = cx + offsetX;
    const pcy = cy + offsetY;
    
    // 阴影参数
    const shadowDx = viewType === 'perspective' ? 3 * s : 1 * s;
    const shadowDy = viewType === 'perspective' ? 5 * s : 2 * s;
    const shadowBlur = viewType === 'perspective' ? 2 * s : 1 * s;
    
    ctx.save();
    
    // 应用阴影
    ctx.shadowColor = profile.shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowDx;
    ctx.shadowOffsetY = shadowDy;
    
    // ===== MAIN PUDDLE GROUP =====
    
    // Layer 1: Base fill (water-body gradient)
    ctx.fillStyle = this._createWaterBodyGradient(ctx, pcx, pcy, profile);
    this._drawPath(ctx, mainPath);
    ctx.fill();
    
    // 关闭阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // 创建 clipPath
    ctx.save();
    this._drawPath(ctx, mainPath);
    ctx.clip();
    
    // Layer 2: Edge tint - thicker stroke clipped inside
    const edgeTintGrad = ctx.createLinearGradient(pcx - puddle.size, pcy - puddle.size, pcx + puddle.size, pcy + puddle.size);
    edgeTintGrad.addColorStop(0, this._hexToRgba(profile.edgeTint, 0.1));
    edgeTintGrad.addColorStop(0.5, this._hexToRgba(profile.edgeTint, profile.edgeTintOpacity * 0.6));
    edgeTintGrad.addColorStop(1, this._hexToRgba(profile.edgeTint, profile.edgeTintOpacity));
    ctx.strokeStyle = edgeTintGrad;
    ctx.lineWidth = 10 * s;
    this._drawPath(ctx, mainPath);
    ctx.stroke();
    
    // Layer 3: Top-left inner shadow (Surface tension / Edge thickness)
    const innerDarkGrad = ctx.createLinearGradient(pcx - puddle.size, pcy - puddle.size, pcx + puddle.size, pcy + puddle.size);
    innerDarkGrad.addColorStop(0, this._hexToRgba(profile.strokeColor, 0.35));
    innerDarkGrad.addColorStop(0.25, this._hexToRgba(profile.strokeColor, 0.1));
    innerDarkGrad.addColorStop(0.5, 'transparent');
    innerDarkGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = innerDarkGrad;
    ctx.lineWidth = 12 * s;
    // 模拟 soft-blur: 通过透明度实现
    ctx.globalAlpha = 0.8;
    this._drawPath(ctx, mainPath);
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    // Layer 4: Bottom-right rim light (Caustic reflection)
    const rimLightGrad = ctx.createLinearGradient(pcx - puddle.size, pcy - puddle.size, pcx + puddle.size, pcy + puddle.size);
    rimLightGrad.addColorStop(0, 'transparent');
    rimLightGrad.addColorStop(0.6, 'transparent');
    rimLightGrad.addColorStop(0.85, 'rgba(255,255,255,0.4)');
    rimLightGrad.addColorStop(1, 'rgba(255,255,255,0.7)');
    ctx.strokeStyle = rimLightGrad;
    ctx.lineWidth = 8 * s;
    ctx.globalAlpha = 0.8;
    this._drawPath(ctx, mainPath);
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    // Layer 5: Inner white glow - wide blurred stroke
    ctx.strokeStyle = profile.innerGlowColor;
    ctx.lineWidth = 14 * s;
    // 模拟 inner-glow-blur
    ctx.globalAlpha = 0.6;
    this._drawPath(ctx, mainPath);
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    // Layer 6: Inner Reflection Spots
    innerHighlights.forEach(spot => {
      const sx = spot.cx + offsetX;
      const sy = spot.cy + offsetY;
      
      // Main Highlight
      ctx.fillStyle = profile.innerSpotColor;
      ctx.beginPath();
      ctx.ellipse(sx, sy, spot.rx, spot.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Small Secondary Highlight (to the right)
      ctx.beginPath();
      ctx.ellipse(sx + spot.rx * 1.5, sy, spot.rx * 0.3, spot.ry * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
    
    // Layer 7: Outer stroke (volumetric natural edge)
    const outlineGrad = ctx.createLinearGradient(pcx - puddle.size, pcy - puddle.size, pcx + puddle.size, pcy + puddle.size);
    outlineGrad.addColorStop(0, this._hexToRgba(profile.strokeColor, 0.3));
    outlineGrad.addColorStop(0.5, this._hexToRgba(profile.strokeColor, 0.7));
    outlineGrad.addColorStop(1, this._hexToRgba(profile.strokeColor, 1));
    ctx.strokeStyle = outlineGrad;
    ctx.lineWidth = 2 * s;
    this._drawPath(ctx, mainPath);
    ctx.stroke();
    
    ctx.restore();
    
    // ===== SCATTERED DROPLETS =====
    droplets.forEach(drop => {
      this._renderDroplet(ctx, drop, profile, offsetX, offsetY, s);
    });
  }
  
  /**
   * 渲染水滴
   */
  static _renderDroplet(ctx, drop, profile, offsetX, offsetY, s) {
    const { path, cx, cy, size } = drop;
    const dx = cx + offsetX;
    const dy = cy + offsetY;
    
    ctx.save();
    
    // Droplet body
    ctx.fillStyle = this._createWaterBodyGradient(ctx, dx, dy, profile);
    this._drawPath(ctx, path);
    ctx.fill();
    
    // Clip path for droplet
    ctx.save();
    this._drawPath(ctx, path);
    ctx.clip();
    
    // Top-left dark tension
    const innerDarkGrad = ctx.createLinearGradient(dx - size, dy - size, dx + size, dy + size);
    innerDarkGrad.addColorStop(0, this._hexToRgba(profile.strokeColor, 0.35));
    innerDarkGrad.addColorStop(0.25, this._hexToRgba(profile.strokeColor, 0.1));
    innerDarkGrad.addColorStop(0.5, 'transparent');
    ctx.strokeStyle = innerDarkGrad;
    ctx.lineWidth = 4 * s;
    this._drawPath(ctx, path);
    ctx.stroke();
    
    // Bottom-right rim light
    const rimGrad = ctx.createLinearGradient(dx - size, dy - size, dx + size, dy + size);
    rimGrad.addColorStop(0, 'transparent');
    rimGrad.addColorStop(0.6, 'transparent');
    rimGrad.addColorStop(0.85, 'rgba(255,255,255,0.4)');
    rimGrad.addColorStop(1, 'rgba(255,255,255,0.7)');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 3 * s;
    this._drawPath(ctx, path);
    ctx.stroke();
    
    // Soft inner glow
    ctx.strokeStyle = profile.innerGlowColor;
    ctx.lineWidth = 6 * s;
    ctx.globalAlpha = 0.6;
    this._drawPath(ctx, path);
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    ctx.restore();
    
    // Outer stroke
    const outlineGrad = ctx.createLinearGradient(dx - size, dy - size, dx + size, dy + size);
    outlineGrad.addColorStop(0, this._hexToRgba(profile.strokeColor, 0.3));
    outlineGrad.addColorStop(0.5, this._hexToRgba(profile.strokeColor, 0.7));
    outlineGrad.addColorStop(1, this._hexToRgba(profile.strokeColor, 1));
    ctx.strokeStyle = outlineGrad;
    ctx.lineWidth = 1.2 * s;
    this._drawPath(ctx, path);
    ctx.stroke();
    
    // Dual highlights
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
  
  /**
   * 创建 water-body 渐变
   */
  static _createWaterBodyGradient(ctx, cx, cy, profile) {
    const grad = ctx.createLinearGradient(cx - 50, cy - 50, cx + 50, cy + 50);
    grad.addColorStop(0, this._hexToRgba(profile.bodyColors[0], profile.bodyOpacities[0]));
    grad.addColorStop(0.5, this._hexToRgba(profile.bodyColors[1], profile.bodyOpacities[1]));
    grad.addColorStop(1, this._hexToRgba(profile.bodyColors[2], profile.bodyOpacities[2]));
    return grad;
  }
  
  /**
   * hex 转 rgba
   */
  static _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
