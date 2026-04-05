/**
 * WaterIncrustationPreset 水渍预制污垢生成器
 * 基于 Canvas 绘制水垢/水渍效果
 */

export default class WaterIncrustationPreset {
  /**
   * 生成水渍数据
   * @param {Object} config - 配置 { x, y, radius, count }
   * @param {number} s - 屏幕缩放比例
   * @returns {Object} 水渍数据 { clusters, centerX, centerY, radius }
   */
  static generate(config, s) {
    const centerX = config.x;
    const centerY = config.y;
    const radius = (config.radius || 60) * s;
    const count = config.count || 10;
    
    const clusters = [];
    
    // 水渍参数
    const density = 20;      // 每簇斑点数量~20
    const hardness = 0.9;    // 硬度系数
    const opacity = 0.8;     // 透明度基数（增加，让水渍更明显）
    
    // 防重叠参数（宽松）
    const minDistance = 10 * s; // 簇之间的最小距离（10像素）
    const maxAttempts = 1;      // 只尝试1次，找不到就重叠
    
    for (let i = 0; i < count; i++) {
      let cx, cy, clusterRadius;
      let attempts = 0;
      let validPosition = false;
      
      // 尝试找到不重叠的位置
      while (attempts < maxAttempts && !validPosition) {
        // 在半径范围内随机生成水渍簇位置
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.pow(Math.random(), 0.5) * radius;
        
        cx = centerX + Math.cos(angle) * dist;
        cy = centerY + Math.sin(angle) * dist;
        clusterRadius = (12 + Math.random() * 10) * s;
        
        // 检查是否与已有簇重叠
        validPosition = true;
        for (const existing of clusters) {
          const dx = cx - existing.x;
          const dy = cy - existing.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 如果距离太小，视为重叠
          if (distance < minDistance) {
            validPosition = false;
            break;
          }
        }
        
        attempts++;
      }
      
      // 不管是否重叠，都添加这个簇（尝试1次，重叠也接受）
      clusters.push({
        x: cx,
        y: cy,
        radius: clusterRadius,
        spots: this._generateSpots(clusterRadius, density, hardness, opacity, s)
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
   * 生成水渍斑点
   */
  static _generateSpots(clusterRadius, density, hardness, opacity, s) {
    const spots = [];
    const numSpots = Math.floor(density * (0.8 + Math.random() * 0.4));
    
    for (let i = 0; i < numSpots; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * clusterRadius;
      
      // 位置随机（去除方向压缩，更自然）
      const x = Math.cos(angle) * dist * (0.7 + Math.random() * 0.6);
      const y = Math.sin(angle) * dist * (0.7 + Math.random() * 0.6);
      
      // 大小：0.3-2.5px
      const sizeRandom = Math.pow(Math.random(), 3);
      const baseSize = 0.3 + (sizeRandom * 2.2 + Math.random() * 0.5) * hardness;
      const spotSize = baseSize * s;
      
      // 透明度
      const spotOpacity = 0.15 + (Math.random() * 0.45 * opacity);
      
      // 形状类型：在缩放前判断，避免缩放影响形状分布
      const isRect = baseSize < 1.5 && sizeRandom < 0.1;
      
      // 如果是多边形，生成顶点
      let points = null;
      if (!isRect) {
        points = [];
        const numPoints = 6 + Math.floor(Math.random() * 4); // 6-9个点
        for (let p = 0; p < numPoints; p++) {
          const pAngle = (p / numPoints) * Math.PI * 2;
          let pRadiusX = spotSize * (0.7 + Math.random() * 0.5);
          let pRadiusY = spotSize * (0.7 + Math.random() * 0.5);
          
          // 较大的斑点受重力影响，y方向拉伸
          if (sizeRandom > 0.1 && (pAngle > Math.PI * 0.1 && pAngle < Math.PI * 0.9)) {
            const gravityStretch = 1 + (sizeRandom * 3) + Math.random();
            pRadiusY = pRadiusY * gravityStretch;
          }
          
          points.push({
            x: Math.cos(pAngle) * pRadiusX,
            y: Math.sin(pAngle) * pRadiusY
          });
        }
      }
      
      // 边缘高亮透明度
      const edgeOpacity = spotOpacity * (1.5 + sizeRandom) * hardness;
      
      spots.push({
        x, y,
        size: spotSize,
        opacity: spotOpacity,
        edgeOpacity: Math.min(edgeOpacity, 0.95),
        isRect,
        points
      });
    }
    
    return spots;
  }
  
  /**
   * 渲染水渍
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} dirt - 污垢对象
   * @param {number} s - 屏幕缩放比例
   * @param {number} pulseAlpha - 脉冲透明度
   * @param {number} remainingRatio - 剩余显示比例
   * @param {number} cx - 实际渲染中心X
   * @param {number} cy - 实际渲染中心Y
   */
  static render(ctx, dirt, s, pulseAlpha = 1, remainingRatio = 1, cx, cy) {
    if (!dirt.presetData?.clusters) return;
    
    const { clusters, centerX, centerY, radius } = dirt.presetData;
    
    // 计算偏移量
    const offsetX = cx - centerX;
    const offsetY = cy - centerY;
    
    // 注意：尺寸已在 generate 阶段缩放
    
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    
    // 裁剪区域
    if (remainingRatio < 1) {
      const clipHeight = radius * 2 * remainingRatio;
      const clipY = cy - radius + (radius * 2 - clipHeight);
      ctx.beginPath();
      ctx.rect(cx - radius - 20, clipY, (radius + 20) * 2, clipHeight + 20);
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(cx - radius - 30, cy - radius - 30, (radius + 30) * 2, (radius + 30) * 2);
      ctx.clip();
    }
    
    // 渲染所有水渍簇
    clusters.forEach(cluster => {
      const rx = cluster.x + offsetX;
      const ry = cluster.y + offsetY;
      
      cluster.spots.forEach(spot => {
        const sx = rx + spot.x;
        const sy = ry + spot.y;
        
        // 填充颜色：浅灰白色水渍（水垢颜色）
        ctx.fillStyle = `rgba(200, 195, 185, ${Math.min(1, spot.opacity * 1.5)})`;
        
        if (spot.isRect) {
          // 小斑点画矩形（浅灰色）
          ctx.fillStyle = `rgba(180, 175, 165, ${Math.min(1, spot.opacity * 2)})`;
          ctx.fillRect(sx, sy, spot.size * 2, spot.size * 2);
        } else {
          // 大斑点画多边形
          ctx.beginPath();
          spot.points.forEach((p, idx) => {
            if (idx === 0) {
              ctx.moveTo(sx + p.x, sy + p.y);
            } else {
              ctx.lineTo(sx + p.x, sy + p.y);
            }
          });
          ctx.closePath();
          ctx.fill();
          
          // 边缘描边（浅白色边缘，模拟水垢反光）
          ctx.lineWidth = 1 + (Math.pow(spot.size / 7, 2) * 0.5);
          ctx.strokeStyle = `rgba(220, 215, 205, ${Math.min(0.8, spot.edgeOpacity * 0.8)})`;
          ctx.stroke();
        }
      });
    });
    
    ctx.restore();
  }
}
