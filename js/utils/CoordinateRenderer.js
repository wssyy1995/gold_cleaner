/**
 * CoordinateRenderer 坐标渲染器
 * 在屏幕上绘制坐标网格和点，方便调试
 */

class CoordinateRenderer {
  /**
   * 渲染坐标网格
   * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
   * @param {number} screenWidth - 屏幕宽度
   * @param {number} screenHeight - 屏幕高度
   * @param {number} gridSize - 网格大小（默认100）
   */
  static render(ctx, screenWidth, screenHeight, gridSize = 100) {
    const s = screenWidth / 750; // 缩放比例
    const actualGridSize = gridSize * s;
    
    ctx.save();
    
    // 绘制网格线
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.15)';
    ctx.lineWidth = 1;
    
    // 垂直线
    for (let x = 0; x <= screenWidth; x += actualGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, screenHeight);
      ctx.stroke();
    }
    
    // 水平线
    for (let y = 0; y <= screenHeight; y += actualGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(screenWidth, y);
      ctx.stroke();
    }
    
    // 绘制坐标点标记和数值
    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.font = `${10 * s}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    for (let x = 0; x <= screenWidth; x += actualGridSize) {
      for (let y = 0; y <= screenHeight; y += actualGridSize) {
        const designX = Math.round(x / s);
        const designY = Math.round(y / s);
        
        // 绘制小红点
        ctx.beginPath();
        ctx.arc(x, y, 3 * s, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制坐标文字
        ctx.fillStyle = 'rgba(200, 0, 0, 0.8)';
        ctx.fillText(`${designX},${designY}`, x + 4 * s, y + 4 * s);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
      }
    }
    
    ctx.restore();
  }
  
  /**
   * 检查是否启用坐标显示
   * @returns {boolean}
   */
  static isEnabled() {
    try {
      // 尝试从 globalThis 获取 game 实例
      const game = (typeof globalThis !== 'undefined' && globalThis._gameInstance) || 
                   (typeof global !== 'undefined' && global._gameInstance);
      if (game && game.dataManager) {
        return game.dataManager.getSettings().showCoordinates || false;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

export default CoordinateRenderer;
