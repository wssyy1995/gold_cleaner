/**
 * UrinePreset 尿渍预制污垢生成器
 * 模拟尿渍和硬水垢混合效果
 */

export default class UrinePreset {
  /**
   * 生成尿渍数据
   * @param {Object} config - 配置 { rect: [{x,y}, {x,y}, {x,y}, {x,y}], count }
   * @param {number} s - 屏幕缩放比例
   * @returns {Object} 尿渍数据 { clusters, centerX, centerY, radius }
   */
  static generate(config, s) {
    // 如果提供了4个坐标点，使用四边形区域
    if (config.rect && Array.isArray(config.rect) && config.rect.length === 4) {
      return this._generateQuadUrine(config, s);
    }
    
    // 否则使用圆形半径（后备方案）
    return this._generateCircleUrine(config, s);
  }
  
  /**
   * 在四边形区域内生成尿渍
   */
  static _generateQuadUrine(config, s) {
    const quad = config.rect;
    const count = config.count || 3;
    
    // 4个顶点
    const p0 = { x: quad[0].x * s, y: quad[0].y * s };
    const p1 = { x: quad[1].x * s, y: quad[1].y * s };
    const p2 = { x: quad[2].x * s, y: quad[2].y * s };
    const p3 = { x: quad[3].x * s, y: quad[3].y * s };
    
    // 计算中心点
    const centerX = (p0.x + p1.x + p2.x + p3.x) / 4;
    const centerY = (p0.y + p1.y + p2.y + p3.y) / 4;
    
    // 计算包围盒半径
    const xs = [p0.x, p1.x, p2.x, p3.x];
    const ys = [p0.y, p1.y, p2.y, p3.y];
    const radius = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys)
    ) / 2;
    
    // 在四边形内随机位置生成 count 个尿渍团
    const clusters = [];
    
    for (let i = 0; i < count; i++) {
      // 随机选择其中一个三角形
      const r = Math.random();
      let cx, cy;
      
      if (r < 0.5) {
        const point = this._randomPointInTriangle(p0, p1, p2);
        cx = point.x;
        cy = point.y;
      } else {
        const point = this._randomPointInTriangle(p0, p2, p3);
        cx = point.x;
        cy = point.y;
      }
      
      // 每个位置生成一团尿渍（包含多个斑点）
      clusters.push({
        x: cx,
        y: cy,
        splotches: this._generateSplotchCluster(s)
      });
    }
    
    return {
      clusters,
      centerX,
      centerY,
      radius
    };
  }
  
  /**
   * 在圆形区域内生成尿渍（后备方案）
   */
  static _generateCircleUrine(config, s) {
    const centerX = config.x * s;
    const centerY = config.y * s;
    const radius = (config.radius || 60) * s;
    const count = config.count || 3;
    
    const clusters = [];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.5) * radius;
      
      const cx = centerX + Math.cos(angle) * dist;
      const cy = centerY + Math.sin(angle) * dist;
      
      clusters.push({
        x: cx,
        y: cy,
        splotches: this._generateSplotchCluster(s)
      });
    }
    
    return {
      clusters,
      centerX,
      centerY,
      radius
    };
  }
  
  /**
   * 生成一团尿渍（包含8-20个斑点，所有随机数据预生成）
   */
  static _generateSplotchCluster(s) {
    const splotches = [];
    const splotchCount = Math.floor(this._random(8, 16));
    const patchSize = this._random(20, 50) * s;
    
    for (let i = 0; i < splotchCount; i++) {
      const offsetX = this._random(-patchSize / 2, patchSize / 2);
      const offsetY = this._random(-patchSize / 2, patchSize / 2);
      const splotchRadius = this._random(10, patchSize * 0.4);
      
      // 预生成尿渍黄色斑点的所有随机数据（2-4层）
      const numLayers = Math.floor(this._random(2, 4));
      const layers = [];
      
      for (let layer = 0; layer < numLayers; layer++) {
        const layerRadius = splotchRadius * this._random(0.4, 1.2);
        const numPoints = Math.floor(this._random(8, 16));
        const points = [];
        
        for (let p = 0; p < numPoints; p++) {
          const angle = (p / numPoints) * Math.PI * 2;
          const variance = layerRadius * this._random(0.7, 1.3);
          points.push({
            x: Math.cos(angle) * variance,
            y: Math.sin(angle) * variance
          });
        }
        
        // 预生成噪点
        const numSpeckles = Math.min(20, Math.floor(layerRadius * 0.6));
        const speckles = [];
        for (let sp = 0; sp < numSpeckles; sp++) {
          const angle = this._random(0, Math.PI * 2);
          const r = Math.sqrt(this._random(0, 1)) * layerRadius;
          speckles.push({
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r,
            size: this._random(0.5, 2) * s
          });
        }
        
        layers.push({
          points,
          speckles,
          hasTideMark: this._random(0, 1) > 0.85,
          lineWidth: this._random(0.5, 1.5),
          shadowBlur: this._random(5, 20)
        });
      }
      
      // 尿渍黄色斑点
      splotches.push({
        x: offsetX,
        y: offsetY,
        radius: splotchRadius,
        type: 'yellow_scale',
        layers
      });
      
      // 硬水垢（30%概率，减少数量）
      if (Math.random() > 0.7) {
        const hwOffsetX = offsetX + this._random(-10, 10) * s;
        const hwOffsetY = offsetY + this._random(-10, 10) * s;
        const hwRadius = splotchRadius * 0.8;
        
        // 预生成硬水垢数据
        const hwNumLayers = Math.floor(this._random(2, 4));
        const hwLayers = [];
        
        for (let layer = 0; layer < hwNumLayers; layer++) {
          const layerRadius = hwRadius * this._random(0.4, 1.2);
          const numPoints = Math.floor(this._random(8, 16));
          const points = [];
          
          for (let p = 0; p < numPoints; p++) {
            const angle = (p / numPoints) * Math.PI * 2;
            const variance = layerRadius * this._random(0.7, 1.3);
            points.push({
              x: Math.cos(angle) * variance,
              y: Math.sin(angle) * variance
            });
          }
          
          const numSpeckles = Math.min(20, Math.floor(layerRadius * 0.6));
          const speckles = [];
          for (let sp = 0; sp < numSpeckles; sp++) {
            const angle = this._random(0, Math.PI * 2);
            const r = Math.sqrt(this._random(0, 1)) * layerRadius;
            speckles.push({
              x: Math.cos(angle) * r,
              y: Math.sin(angle) * r,
              size: this._random(0.5, 2) * s
            });
          }
          
          hwLayers.push({
            points,
            speckles,
            hasTideMark: this._random(0, 1) > 0.85,
            lineWidth: this._random(0.5, 1.5),
            shadowBlur: this._random(5, 20)
          });
        }
        
        splotches.push({
          x: hwOffsetX,
          y: hwOffsetY,
          radius: hwRadius,
          type: 'hard_water',
          layers: hwLayers
        });
      }
    }
    
    return splotches;
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
    
    const x = a.x + r1 * (b.x - a.x) + r2 * (c.x - a.x);
    const y = a.y + r1 * (b.y - a.y) + r2 * (c.y - a.y);
    
    return { x, y };
  }
  
  /**
   * 随机数辅助函数
   */
  static _random(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  /**
   * 颜色调色板
   */
  static _getColors() {
    return {
      yellow_scale: {
        base: [240, 200, 40],
        edge: [210, 160, 20],
        noise: [255, 230, 120]
      },
      hard_water: {
        base: [240, 235, 220],
        edge: [200, 190, 170],
        noise: [255, 255, 255]
      }
    };
  }
  
  /**
   * 渲染尿渍
   * 严格按照文档实现：multiply混合模式、intensity影响
   */
  static render(ctx, dirt, s, pulseAlpha = 1, remainingRatio = 1, cx, cy) {
    if (!dirt.presetData?.clusters) return;
    
    const { clusters, centerX, centerY } = dirt.presetData;
    const colors = this._getColors();
    const intensity = 0.5; // 默认强度（可扩展为配置参数）
    
    // 计算偏移量
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
    
    // 渲染所有尿渍团
    clusters.forEach((cluster, clusterIndex) => {
      const clusterThreshold = ((clusterIndex * 137.5) % 100) / 100;
      if (clusterThreshold > visibilityThreshold) return;
      
      const rx = cluster.x + offsetX;
      const ry = cluster.y + offsetY;
      
      cluster.splotches.forEach(splotch => {
        const sx = rx + splotch.x;
        const sy = ry + splotch.y;
        
        const palette = colors[splotch.type];
        
        // 性能优化：使用固定混合模式
        
        // 使用预生成的层数据（不再闪烁）
        splotch.layers.forEach(layer => {
          const points = layer.points.map(p => ({
            x: sx + p.x,
            y: sy + p.y
          }));
          
          // 性能优化：简化形状绘制，减少贝塞尔曲线计算
          // 使用简单的多边形近似代替复杂曲线
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.closePath();
          
          // 性能优化：去掉耗性能的shadowBlur，用稍大的半透明填充模拟软边
          const opacity = 0.04;
          ctx.fillStyle = `rgba(${palette.base[0]}, ${palette.base[1]}, ${palette.base[2]}, ${opacity})`;
          ctx.fill();
          
          // 预生成的潮汐痕（简化为低频绘制）
          if (layer.hasTideMark) {
            ctx.lineWidth = layer.lineWidth;
            ctx.strokeStyle = `rgba(${palette.edge[0]}, ${palette.edge[1]}, ${palette.edge[2]}, 0.02)`;
            ctx.stroke();
          }
          
          // 预生成的噪点（批量绘制，减少状态切换）
          ctx.fillStyle = `rgba(${palette.noise[0]}, ${palette.noise[1]}, ${palette.noise[2]}, 0.08)`;
          layer.speckles.forEach(speck => {
            ctx.fillRect(sx + speck.x - speck.size/2, sy + speck.y - speck.size/2, speck.size, speck.size);
          });
        });
      });
    });
    
    ctx.restore();
  }
}
