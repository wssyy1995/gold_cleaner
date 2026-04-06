/**
 * MildewPreset 霉斑预制污垢生成器（流畅版）
 */

export default class MildewPreset {
  static generate(config, s) {
    const centerX = config.x;
    const centerY = config.y;
    const radius = (config.radius || 30) * s;
    const count = config.count || 3;
    
    const colonies = [];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.5) * radius;
      
      const cx = centerX + Math.cos(angle) * dist;
      const cy = centerY + Math.sin(angle) * dist;
      const size = radius * 0.2 + Math.random() * radius * 0.15;
      
      colonies.push({
        x: cx,
        y: cy,
        size: size,
        // 大幅减少粒子数：size * 2
        blobs: this._generateBlobs(size)
      });
    }
    
    return { 
      colonies, 
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
  
  static _generateBlobs(size) {
    const blobs = [];
    // 最小数量保证流畅
    const numBlobs = Math.min(Math.floor(size * 2), 40);
    
    for (let i = 0; i < numBlobs; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.pow(Math.random(), 2) * size;
      
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const radius = (1.5 + Math.random() * 2) * (1 - distance / size * 0.5);
      
      // 简化的灰绿色
      const gray = Math.floor(Math.random() * 20 + 40);
      const alpha = 0.2 + Math.random() * 0.3;
      
      blobs.push({ x, y, radius: Math.max(0.5, radius), gray, alpha });
    }
    
    return blobs;
  }
  
  static render(ctx, dirt, s, pulseAlpha = 1, remainingRatio = 1, cx, cy) {
    if (!dirt.presetData?.colonies) return;
    
    const { colonies, centerX, centerY, radius } = dirt.presetData;
    const offsetX = cx - centerX;
    const offsetY = cy - centerY;
    
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    
    // 简单的裁剪
    if (remainingRatio < 1) {
      const clipHeight = radius * 2 * remainingRatio;
      ctx.beginPath();
      ctx.rect(cx - radius, cy - radius + (radius * 2 - clipHeight), radius * 2, clipHeight);
      ctx.clip();
    }
    
    // 批量渲染，减少 save/restore
    colonies.forEach(colony => {
      const rx = colony.x + offsetX;
      const ry = colony.y + offsetY;
      
      colony.blobs.forEach(blob => {
        ctx.fillStyle = `rgba(${blob.gray}, ${blob.gray + 15}, ${blob.gray}, ${blob.alpha})`;
        ctx.beginPath();
        ctx.arc(rx + blob.x, ry + blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    
    ctx.restore();
  }
}
