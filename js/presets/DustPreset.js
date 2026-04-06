/**
 * DustPreset 灰尘预制污垢生成器
 * 模拟真实灰尘效果：微尘、砂砾、絮状物和纤维
 */

export default class DustPreset {
  /**
   * 生成灰尘数据
   * @param {Object} config - 配置 { x, y, radius, count, rect: [{x,y}, {x,y}, {x,y}, {x,y}] }
   * @param {number} s - 屏幕缩放比例
   * @returns {Object} 灰尘数据 { clusters, centerX, centerY, radius }
   */
  static generate(config, s) {
    // 如果提供了4个坐标点，使用四边形区域
    if (config.rect && Array.isArray(config.rect) && config.rect.length === 4) {
      return this._generateQuadDust(config, s);
    }
    
    // 否则使用圆形区域（原有逻辑）
    const centerX = config.x;
    const centerY = config.y;
    const radius = (config.radius || 30) * s;
    const count = config.count || 3;
    
    const clusters = [];
    const baseDensity = 150;
    const spreadRadius = 80 * s;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.5) * radius;
      
      const cx = centerX + Math.cos(angle) * dist;
      const cy = centerY + Math.sin(angle) * dist;
      
      clusters.push({
        x: cx,
        y: cy,
        particles: this._generateParticles(spreadRadius, baseDensity, s)
      });
    }
    
    return {
      clusters,
      centerX,
      centerY,
      radius,
      region: {
        type: 'circle',
        cx: centerX,
        cy: centerY,
        radius: radius
      }
    };
  }
  
  /**
   * 在4个坐标点形成的四边形区域内生成灰尘（支持不规则四边形）
   * @param {Object} config - 配置 { rect: [{x,y}, {x,y}, {x,y}, {x,y}], density }
   * @param {number} s - 屏幕缩放比例
   */
  static _generateQuadDust(config, s) {
    const quad = config.rect;
    
    // 4个顶点（按顺序：左上、右上、右下、左下 或任意顺序）
    const p0 = { x: quad[0].x * s, y: quad[0].y * s };
    const p1 = { x: quad[1].x * s, y: quad[1].y * s };
    const p2 = { x: quad[2].x * s, y: quad[2].y * s };
    const p3 = { x: quad[3].x * s, y: quad[3].y * s };
    
    // 计算中心点
    const centerX = (p0.x + p1.x + p2.x + p3.x) / 4;
    const centerY = (p0.y + p1.y + p2.y + p3.y) / 4;
    
    // 估算面积（使用鞋带公式）
    const area = 0.5 * Math.abs(
      p0.x * p1.y + p1.x * p2.y + p2.x * p3.y + p3.x * p0.y -
      p1.x * p0.y - p2.x * p1.y - p3.x * p2.y - p0.x * p3.y
    );
    
    // 根据面积计算粒子数量
    const baseDensity = config.density || 150;
    const numParticles = Math.max(50, Math.floor(baseDensity * (area / (100 * 100))));
    
    // 扩散范围（像素）- 可以稍微超出四边形边界
    const spreadRange = 15 * s;
    
    // 将四边形分成两个三角形：(p0, p1, p2) 和 (p0, p2, p3)
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      // 随机选择其中一个三角形（根据面积比例）
      const r = Math.random();
      let px, py;
      
      if (r < 0.5) {
        // 三角形1: p0, p1, p2
        const point = this._randomPointInTriangle(p0, p1, p2);
        px = point.x;
        py = point.y;
      } else {
        // 三角形2: p0, p2, p3
        const point = this._randomPointInTriangle(p0, p2, p3);
        px = point.x;
        py = point.y;
      }
      
      // 向外扩散一点点（随机方向和距离）
      const spreadAngle = Math.random() * Math.PI * 2;
      const spreadDist = Math.pow(Math.random(), 2) * spreadRange; // 平方分布，大部分靠近内部
      px += Math.cos(spreadAngle) * spreadDist;
      py += Math.sin(spreadAngle) * spreadDist;
      
      // 相对于中心的位置
      const relX = px - centerX;
      const relY = py - centerY;
      
      particles.push(...this._generateParticleAt(relX, relY, s));
    }
    
    // 计算包围盒半径
    const xs = [p0.x, p1.x, p2.x, p3.x];
    const ys = [p0.y, p1.y, p2.y, p3.y];
    const radius = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys)
    ) / 2;
    
    return {
      clusters: [{
        x: centerX,
        y: centerY,
        particles
      }],
      centerX,
      centerY,
      radius,
      region: {
        type: 'quad',
        points: [p0, p1, p2, p3]
      }
    };
  }
  
  /**
   * 在三角形内生成随机点（均匀分布）
   * @param {Object} a - 顶点A
   * @param {Object} b - 顶点B
   * @param {Object} c - 顶点C
   */
  static _randomPointInTriangle(a, b, c) {
    let r1 = Math.random();
    let r2 = Math.random();
    
    // 确保点在三角形内
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    
    // 重心坐标
    const x = a.x + r1 * (b.x - a.x) + r2 * (c.x - a.x);
    const y = a.y + r1 * (b.y - a.y) + r2 * (c.y - a.y);
    
    return { x, y };
  }
  
  /**
   * 在指定位置生成一个粒子（用于方形区域）
   */
  static _generateParticleAt(x, y, s) {
    const particleType = Math.random();
    const rBase = Math.floor(Math.random() * 30 + 130);
    const gBase = Math.floor(Math.random() * 30 + 130);
    const bBase = Math.floor(Math.random() * 30 + 120);
    
    let type, size, opacity, color, rotation, width, height;
    
    if (particleType < 0.65) {
      type = 'base';
      opacity = Math.random() * 0.35 + 0.15;
      size = (Math.random() * 0.8 + 0.2) * 2 * s;
      color = `rgba(${rBase}, ${gBase}, ${bBase}, ${opacity})`;
      rotation = 0;
      width = size;
      height = size;
    } else if (particleType < 0.85) {
      type = 'grit';
      opacity = Math.random() * 0.4 + 0.5;
      size = (Math.random() * 1.5 + 0.5) * 2 * s;
      const darkR = rBase - 40;
      const darkG = gBase - 40;
      const darkB = bBase - 40;
      color = `rgba(${darkR}, ${darkG}, ${darkB}, ${opacity})`;
      rotation = Math.random() * Math.PI;
      width = size;
      height = size * (Math.random() * 0.5 + 0.5);
    } else if (particleType < 0.95) {
      type = 'fluff';
      opacity = (Math.random() * 0.35 + 0.15) * 0.4;
      size = (Math.random() * 1.5 + 0.5) * 2 * s;
      color = `rgba(${rBase}, ${gBase}, ${bBase}, ${opacity})`;
      rotation = 0;
      width = size;
      height = size;
    } else {
      type = 'fiber';
      opacity = Math.random() * 0.35 + 0.45;
      size = (Math.random() * 8 + 2) * 2 * s;
      const fiberR = rBase - 20;
      const fiberG = gBase - 20;
      const fiberB = bBase - 20;
      color = `rgba(${fiberR}, ${fiberG}, ${fiberB}, ${opacity})`;
      rotation = Math.random() * Math.PI * 2;
      width = size;
      height = Math.random() * 0.3 + 0.2;
    }
    
    return [{ x, y, type, size, color, rotation, width, height }];
  }
  
  /**
   * 生成灰尘粒子
   */
  static _generateParticles(spreadRadius, baseDensity, s) {
    const particles = [];
    const numParticles = baseDensity; // 严格按文档：150个粒子
    
    for (let i = 0; i < numParticles; i++) {
      // 在扩散半径内均匀分布
      const r = spreadRadius * Math.random();
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      
      // 粒子类型概率分布
      const particleType = Math.random();
      
      // 基础颜色：灰褐色
      const rBase = Math.floor(Math.random() * 30 + 130);
      const gBase = Math.floor(Math.random() * 30 + 130);
      const bBase = Math.floor(Math.random() * 30 + 120);
      
      let type, size, opacity, color, rotation, width, height;
      
      if (particleType < 0.65) {
        // 1. 最细碎的底灰 (65%概率) - 0.2-1.0px
        type = 'base';
        opacity = Math.random() * 0.35 + 0.15;
        size = (Math.random() * 0.8 + 0.2) * 2 * s;
        color = `rgba(${rBase}, ${gBase}, ${bBase}, ${opacity})`;
        rotation = 0;
        width = size;
        height = size;
        
      } else if (particleType < 0.85) {
        // 2. 砂砾/硬质灰尘 (20%概率) - 0.5-2.0px
        type = 'grit';
        opacity = Math.random() * 0.4 + 0.5;
        size = (Math.random() * 1.5 + 0.5) * 2 * s;
        const darkR = rBase - 40;
        const darkG = gBase - 40;
        const darkB = bBase - 40;
        color = `rgba(${darkR}, ${darkG}, ${darkB}, ${opacity})`;
        rotation = Math.random() * Math.PI;
        width = size;
        height = size * (Math.random() * 0.5 + 0.5);
        
      } else if (particleType < 0.95) {
        // 3. 灰尘团/絮状绒毛 (10%概率) - 0.5-2.0px
        type = 'fluff';
        opacity = (Math.random() * 0.35 + 0.15) * 0.4;
        size = (Math.random() * 1.5 + 0.5) * 2 * s;
        color = `rgba(${rBase}, ${gBase}, ${bBase}, ${opacity})`;
        rotation = 0;
        width = size;
        height = size;
        
      } else {
        // 4. 细微纤维/毛发 (5%概率) - 2-10px
        type = 'fiber';
        opacity = Math.random() * 0.35 + 0.45;
        size = (Math.random() * 8 + 2) * 2 * s;
        const fiberR = rBase - 20;
        const fiberG = gBase - 20;
        const fiberB = bBase - 20;
        color = `rgba(${fiberR}, ${fiberG}, ${fiberB}, ${opacity})`;
        rotation = Math.random() * Math.PI * 2;
        width = size;
        height = Math.random() * 0.3 + 0.2;
      }
      
      particles.push({
        x, y, type, size, color, rotation, width, height
      });
    }
    
    return particles;
  }
  
  /**
   * 渲染灰尘
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} dirt - 污垢对象
   * @param {number} s - 屏幕缩放比例
   * @param {number} pulseAlpha - 脉冲透明度
   * @param {number} remainingRatio - 剩余显示比例（兼容旧逻辑）
   * @param {number} cx - 实际渲染中心X
   * @param {number} cy - 实际渲染中心Y
   */
  static render(ctx, dirt, s, pulseAlpha = 1, remainingRatio = 1, cx, cy) {
    if (!dirt.presetData?.clusters) return;
    
    const { clusters, centerX, centerY, radius } = dirt.presetData;
    
    // 计算偏移量
    const offsetX = cx - centerX;
    const offsetY = cy - centerY;
    
    // 计算擦拭进度（自然的灰尘擦拭效果）
    // 优先使用 wipeProgress，其次使用 strokeCount/maxStrokes，最后使用 remainingRatio
    let wipeProgress = 0;
    if (dirt.wipeProgress !== undefined) {
      wipeProgress = dirt.wipeProgress;
    } else if (dirt.strokeCount !== undefined && dirt.maxStrokes > 0) {
      wipeProgress = dirt.strokeCount / dirt.maxStrokes;
    } else {
      wipeProgress = 1 - remainingRatio;
    }
    
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    
    // 自然的灰尘擦拭效果：根据进度随机显示粒子
    // 进度越高，显示的粒子越少（随机消失）
    const visibilityThreshold = 1 - wipeProgress;
    
    // 渲染所有灰尘簇
    clusters.forEach(cluster => {
      const rx = cluster.x + offsetX;
      const ry = cluster.y + offsetY;
      
      cluster.particles.forEach((p, index) => {
        // 使用粒子索引作为稳定的随机种子，确保同一粒子在进度增加时稳定消失
        // 每个粒子有一个随机的"存活阈值"，当 visibilityThreshold 低于该值时消失
        const particleThreshold = ((index * 137.5) % 100) / 100; // 伪随机 0-1
        
        // 如果粒子阈值大于可见性阈值，则不显示（已被擦拭掉）
        if (particleThreshold > visibilityThreshold) {
          return;
        }
        
        // 计算粒子实际渲染位置
        const px = rx + p.x;
        const py = ry + p.y;
        
        ctx.fillStyle = p.color;
        
        if (p.type === 'fluff') {
          // 絮状绒毛 - 圆形
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
          
        } else if (p.type === 'fiber') {
          // 纤维/毛发 - 曲线
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.height;
          ctx.beginPath();
          ctx.moveTo(px, py);
          const cpX = px + Math.cos(p.rotation) * p.width;
          const cpY = py + Math.sin(p.rotation) * p.width;
          const endX = px + Math.cos(p.rotation + 0.5) * p.width * 0.5;
          const endY = py + Math.sin(p.rotation + 0.5) * p.width * 0.5;
          ctx.quadraticCurveTo(cpX, cpY, endX, endY);
          ctx.stroke();
          
        } else if (p.type === 'grit') {
          // 砂砾 - 旋转的长方形
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(p.rotation);
          ctx.fillRect(0, 0, p.width, p.height);
          ctx.restore();
          
        } else {
          // 底灰 - 小矩形
          ctx.fillRect(px, py, p.width, p.height);
        }
      });
    });
    
    ctx.restore();
  }
}
