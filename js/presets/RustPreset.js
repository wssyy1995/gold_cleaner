/**
 * RustPreset.js
 * 铁锈预制污垢生成器
 * 按照 urine_rust_Generator.html 中的 "生成铁锈" 实现
 * 
 * 特点：
 * - 斑驳纹理（非圆环状，自由分布）
 * - Perlin Noise 噪声
 * - 红橙色系：深红橙 → 亮橙 → 深锈 → 暗棕红
 */

export default class RustPreset {
  // 铁锈颜色配置
  static RUST_COLORS = [
    { stop: 0.0, r: 180, g: 60, b: 0 },   // 深红橙色
    { stop: 0.3, r: 200, g: 80, b: 0 },   // 亮橙色
    { stop: 0.6, r: 150, g: 50, b: 0 },   // 深锈色
    { stop: 1.0, r: 100, g: 30, b: 0 }    // 暗棕红色
  ];

  /**
   * 生成铁锈数据
   * @param {Object} config - 配置 { rect, count }
   * @param {number} s - 屏幕缩放比例
   */
  static generate(config, s) {
    const count = config.count || 1;
    
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
      // 圆形区域
      centerX = config.x * s;
      centerY = config.y * s;
      radius = (config.radius || 80) * s;
    }
    
    // 预计算 Perlin Noise 网格
    const noiseGrid = this._createNoiseGrid(16);
    
    // 生成多个铁锈
    const stains = [];
    for (let i = 0; i < count; i++) {
      let cx = centerX;
      let cy = centerY;
      
      if (regionPoints.length === 4 && count > 1) {
        const r = Math.random();
        let point;
        if (r < 0.5) {
          point = this._randomPointInTriangle(regionPoints[0], regionPoints[1], regionPoints[2]);
        } else {
          point = this._randomPointInTriangle(regionPoints[0], regionPoints[2], regionPoints[3]);
        }
        cx = point.x;
        cy = point.y;
      }
      
      stains.push(this._generateStain(cx, cy, radius, noiseGrid, s));
    }
    
    return {
      stains,
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
   * 生成单个铁锈
   */
  static _generateStain(cx, cy, baseRadius, noiseGrid, s) {
    // 铁锈参数：20个斑点，半径60-180，最大透明度0.8
    const numPatches = 20;
    const minRadius = baseRadius * 0.3;
    const maxRadius = baseRadius * 0.9;
    const maxAlpha = 0.8;
    
    // 生成铁锈斑点
    const patches = [];
    
    for (let i = 0; i < numPatches; i++) {
      // 在区域内随机生成斑点中心
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * baseRadius * 0.8;
      const pcx = cx + Math.cos(angle) * dist;
      const pcy = cy + Math.sin(angle) * dist;
      
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const rotation = Math.random() * Math.PI * 2;
      
      // 预计算圆环边缘渐变的采样权重
      const samplePoints = [];
      const samples = 16;
      
      for (let j = 0; j < samples; j++) {
        const a = (j / samples) * Math.PI * 2;
        const sx = Math.cos(a) * radius;
        const sy = Math.sin(a) * radius;
        
        // 旋转到世界坐标
        const wx = pcx + sx * Math.cos(rotation) - sy * Math.sin(rotation);
        const wy = pcy + sx * Math.sin(rotation) + sy * Math.cos(rotation);
        
        // 计算到中心的距离（用于边缘淡出）
        const distFromCenter = Math.sqrt(Math.pow(wx - cx, 2) + Math.pow(wy - cy, 2));
        const fade = Math.max(0, 1 - distFromCenter / (baseRadius * 1.2));
        
        samplePoints.push({ angle: a, fade });
      }
      
      // 预计算颜色（基于中心点的噪声值）
      const centerNoise = this._getPerlinNoise(noiseGrid, pcx, pcy);
      const color = this._getColorFromStops(this.RUST_COLORS, centerNoise);
      
      patches.push({
        cx: pcx,
        cy: pcy,
        radius,
        rotation,
        color,
        samplePoints,
        maxAlpha
      });
    }
    
    return {
      cx,
      cy,
      patches
    };
  }
  
  /**
   * 创建 Perlin Noise 网格
   */
  static _createNoiseGrid(gridSize) {
    const grid = [];
    for (let y = 0; y <= gridSize; y++) {
      grid[y] = [];
      for (let x = 0; x <= gridSize; x++) {
        const angle = Math.random() * Math.PI * 2;
        grid[y][x] = {
          x: Math.cos(angle),
          y: Math.sin(angle)
        };
      }
    }
    return { grid, size: gridSize };
  }
  
  /**
   * 获取 Perlin Noise 值
   */
  static _getPerlinNoise(noiseGrid, x, y, scale = 1, octaves = 6, persistence = 0.5) {
    x *= scale * 0.05;
    y *= scale * 0.05;
    
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxVal = 0;
    
    const { grid, size } = noiseGrid;
    
    for (let i = 0; i < octaves; i++) {
      const scaledX = x * frequency;
      const scaledY = y * frequency;
      
      const x0 = Math.floor(scaledX) % size;
      const y0 = Math.floor(scaledY) % size;
      const x1 = (x0 + 1) % size;
      const y1 = (y0 + 1) % size;
      
      const sx = scaledX - Math.floor(scaledX);
      const sy = scaledY - Math.floor(scaledY);
      
      const n00 = grid[y0][x0].x * sx + grid[y0][x0].y * sy;
      const n01 = grid[y1][x0].x * sx + grid[y1][x0].y * (sy - 1);
      const n10 = grid[y0][x1].x * (sx - 1) + grid[y0][x1].y * sy;
      const n11 = grid[y1][x1].x * (sx - 1) + grid[y1][x1].y * (sy - 1);
      
      const u = sx * sx * (3 - 2 * sx);
      const v = sy * sy * (3 - 2 * sy);
      
      const ix0 = n00 + u * (n10 - n00);
      const ix1 = n01 + u * (n11 - n01);
      
      total += (ix0 + v * (ix1 - ix0)) * amplitude;
      maxVal += amplitude;
      
      amplitude *= persistence;
      frequency *= 2;
    }
    
    return (total / maxVal + 1) / 2;
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
   * 渲染铁锈
   */
  static render(ctx, dirt, s, pulseAlpha = 1, remainingRatio = 1, cx, cy) {
    if (!dirt.presetData?.stains) return;
    
    const { stains } = dirt.presetData;
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
    
    // 预计算噪声网格（用于渲染时获取噪声值）
    const noiseGrid = this._createNoiseGrid(16);
    
    stains.forEach(stain => {
      this._renderStain(ctx, stain, offsetX, offsetY, noiseGrid, s);
    });
    
    ctx.restore();
  }
  
  /**
   * 渲染单个铁锈
   */
  static _renderStain(ctx, stain, offsetX, offsetY, noiseGrid, s) {
    const { cx, cy, patches } = stain;
    const pcx = cx + offsetX;
    const pcy = cy + offsetY;
    
    ctx.save();
    
    // 渲染每个斑点
    patches.forEach(patch => {
      this._renderPatch(ctx, patch, pcx, pcy, noiseGrid, s);
    });
    
    ctx.restore();
  }
  
  /**
   * 渲染单个斑点
   */
  static _renderPatch(ctx, patch, centerX, centerY, noiseGrid, s) {
    const { cx, cy, radius, rotation, color, samplePoints, maxAlpha } = patch;
    
    // 构建径向渐变
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    
    // 根据采样点构建渐变
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = t * radius;
      
      // 计算该半径处的平均边缘渐变
      let avgFade = 0;
      let validSamples = 0;
      
      samplePoints.forEach(sp => {
        if (Math.abs(sp.angle - (i / steps) * Math.PI * 2) < Math.PI / 4) {
          avgFade += sp.fade;
          validSamples++;
        }
      });
      
      if (validSamples > 0) {
        avgFade /= validSamples;
      }
      
      // 边缘淡出
      const edgeFade = 1 - t;
      const intensity = edgeFade * edgeFade;
      
      let alpha = intensity * maxAlpha * avgFade;
      if (alpha > 0.8 * maxAlpha) {
        alpha = maxAlpha * avgFade;
      } else if (alpha < 0.2 * maxAlpha) {
        alpha *= 0.5;
      }
      
      gradient.addColorStop(t, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
    }
    
    // 绘制斑点
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  /**
   * 根据 stop 值获取颜色
   */
  static _getColorFromStops(colorStops, value) {
    if (value <= colorStops[0].stop) return colorStops[0];
    if (value >= colorStops[colorStops.length - 1].stop) return colorStops[colorStops.length - 1];
    
    for (let i = 0; i < colorStops.length - 1; i++) {
      const s1 = colorStops[i];
      const s2 = colorStops[i + 1];
      if (value >= s1.stop && value < s2.stop) {
        const t = (value - s1.stop) / (s2.stop - s1.stop);
        return {
          r: Math.round(s1.r + t * (s2.r - s1.r)),
          g: Math.round(s1.g + t * (s2.g - s1.g)),
          b: Math.round(s1.b + t * (s2.b - s1.b))
        };
      }
    }
    return colorStops[0];
  }
}
