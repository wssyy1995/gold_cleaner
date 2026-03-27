/**
 * Renderer 渲染器
 * 负责任务 2.1.1 ~ 2.1.6
 * - 初始化Canvas上下文与DPR自适应
 * - 基础绘制方法封装
 * - 图层系统与Z轴排序
 * - 坐标系适配
 * - 脏矩形优化渲染检测
 * - 帧率控制与主循环
 */

import MathUtils from '../utils/MathUtils';

class Renderer {
  constructor() {
    // Canvas上下文
    this.ctx = null;
    // 离屏Canvas（用于双缓冲优化）
    this.offscreenCanvas = null;
    this.offscreenCtx = null;

    // 屏幕尺寸（逻辑像素）
    this.screenWidth = 0;
    this.screenHeight = 0;
    // 物理像素尺寸
    this.pixelWidth = 0;
    this.pixelHeight = 0;
    // 设备像素比
    this.dpr = 1;

    // 设计分辨率
    this.designWidth = 750;
    this.designHeight = 1334;

    // 缩放比例
    this.scaleX = 1;
    this.scaleY = 1;

    // 图层系统
    this.layers = new Map();
    this.layerOrder = [];
    this.defaultLayer = 'default';

    // 脏矩形系统
    this.enableDirtyRect = true;
    this.dirtyRects = [];
    this.fullScreenDirty = false;

    // 帧率控制
    this.targetFPS = 60;
    this.frameInterval = 1000 / 60;
    this.lastFrameTime = 0;
    this.currentFPS = 0;
    this.frameCount = 0;
    this.lastFPSTime = 0;

    // 渲染统计
    this.stats = {
      drawCalls: 0,
      triangles: 0,
      textures: 0
    };

    // 是否正在渲染
    this.isRendering = false;

    // 全局变换矩阵（用于相机）
    this.globalTransform = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0
    };
  }

  /**
   * 2.1.1 初始化Canvas上下文与获取手机屏幕信息
   * DPR自适应，直接影响清晰度
   */
  init(canvas) {
    console.log('[Renderer] 初始化渲染器');

    // 获取系统信息
    let sysInfo;
    if (typeof wx !== 'undefined') {
      sysInfo = wx.getSystemInfoSync();
    } else {
      sysInfo = {
        windowWidth: 375,
        windowHeight: 667,
        pixelRatio: 2
      };
    }

    this.dpr = sysInfo.pixelRatio;
    this.screenWidth = sysInfo.windowWidth;
    this.screenHeight = sysInfo.windowHeight;
    this.pixelWidth = this.screenWidth * this.dpr;
    this.pixelHeight = this.screenHeight * this.dpr;

    console.log(`[Renderer] 屏幕信息: ${this.screenWidth}x${this.screenHeight}, DPR: ${this.dpr}`);

    // 初始化Canvas
    if (canvas) {
      this.ctx = canvas.getContext('2d');
    } else if (typeof wx !== 'undefined') {
      canvas = wx.createCanvas();
      this.ctx = canvas.getContext('2d');
    }

    if (!this.ctx) {
      throw new Error('无法创建Canvas上下文');
    }

    // 设置Canvas尺寸
    canvas.width = this.pixelWidth;
    canvas.height = this.pixelHeight;

    // 2.1.4 坐标系适配 - 计算缩放比例
    this.scaleX = this.screenWidth / this.designWidth;
    this.scaleY = this.screenHeight / this.designHeight;

    // 初始化离屏Canvas
    if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
      this.offscreenCanvas = wx.createOffscreenCanvas({
        type: '2d',
        width: this.pixelWidth,
        height: this.pixelHeight
      });
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }

    // 初始化默认图层
    this.createLayer(this.defaultLayer, 0);

    console.log(`[Renderer] 渲染器初始化完成: 设计分辨率 ${this.designWidth}x${this.designHeight}, 缩放 ${this.scaleX.toFixed(3)}x${this.scaleY.toFixed(3)}`);
  }

  /**
   * 2.1.2 基础绘制方法
   * 封装Canvas API
   */

  /**
   * 清空画布
   */
  clear(color = null) {
    if (color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.pixelWidth, this.pixelHeight);
    } else {
      this.ctx.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
    }
    this.stats.drawCalls++;
  }

  /**
   * 绘制矩形
   */
  drawRect(x, y, width, height, options = {}) {
    const {
      fillColor = null,
      strokeColor = null,
      lineWidth = 1,
      radius = 0
    } = options;

    this.ctx.save();
    this.applyTransform();

    if (radius > 0) {
      // 圆角矩形
      this.drawRoundRect(x, y, width, height, radius);
      if (fillColor) {
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
      }
      if (strokeColor) {
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();
      }
    } else {
      if (fillColor) {
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, width, height);
      }
      if (strokeColor) {
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(x, y, width, height);
      }
    }

    this.ctx.restore();
    this.stats.drawCalls++;
  }

  /**
   * 绘制圆角矩形路径
   */
  drawRoundRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    this.ctx.lineTo(x, y + radius);
    this.ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    this.ctx.closePath();
  }

  /**
   * 绘制圆形
   */
  drawCircle(x, y, radius, options = {}) {
    const {
      fillColor = null,
      strokeColor = null,
      lineWidth = 1,
      startAngle = 0,
      endAngle = Math.PI * 2
    } = options;

    this.ctx.save();
    this.applyTransform();

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, startAngle, endAngle);

    if (fillColor) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
    }
    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
    }

    this.ctx.restore();
    this.stats.drawCalls++;
  }

  /**
   * 绘制图片
   */
  drawImage(image, x, y, width, height, options = {}) {
    if (!image) return;

    const {
      sourceX = 0,
      sourceY = 0,
      sourceWidth = image.width,
      sourceHeight = image.height,
      alpha = 1
    } = options;

    this.ctx.save();
    this.applyTransform();
    this.ctx.globalAlpha = alpha;

    try {
      if (width !== undefined && height !== undefined) {
        this.ctx.drawImage(
          image,
          sourceX, sourceY, sourceWidth, sourceHeight,
          x, y, width, height
        );
      } else {
        this.ctx.drawImage(image, x, y);
      }
    } catch (e) {
      console.error('[Renderer] 绘制图片失败:', e);
    }

    this.ctx.restore();
    this.stats.drawCalls++;
  }

  /**
   * 绘制文字
   */
  drawText(text, x, y, options = {}) {
    const {
      font = '14px sans-serif',
      color = '#000000',
      align = 'left',
      baseline = 'alphabetic',
      maxWidth = null,
      shadow = null
    } = options;

    this.ctx.save();
    this.applyTransform();

    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;

    if (shadow) {
      this.ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.5)';
      this.ctx.shadowBlur = shadow.blur || 0;
      this.ctx.shadowOffsetX = shadow.offsetX || 0;
      this.ctx.shadowOffsetY = shadow.offsetY || 0;
    }

    if (maxWidth) {
      this.ctx.fillText(text, x, y, maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }

    this.ctx.restore();
    this.stats.drawCalls++;
  }

  /**
   * 绘制线条
   */
  drawLine(x1, y1, x2, y2, options = {}) {
    const {
      color = '#000000',
      lineWidth = 1,
      lineCap = 'butt',
      lineJoin = 'miter',
      dash = null
    } = options;

    this.ctx.save();
    this.applyTransform();

    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = lineCap;
    this.ctx.lineJoin = lineJoin;

    if (dash) {
      this.ctx.setLineDash(dash);
    }

    this.ctx.stroke();
    this.ctx.restore();
    this.stats.drawCalls++;
  }

  /**
   * 绘制多边形
   */
  drawPolygon(points, options = {}) {
    if (!points || points.length < 3) return;

    const {
      fillColor = null,
      strokeColor = null,
      lineWidth = 1
    } = options;

    this.ctx.save();
    this.applyTransform();

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();

    if (fillColor) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
    }
    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
    }

    this.ctx.restore();
    this.stats.drawCalls++;
  }

  /**
   * 2.1.3 图层系统与Z轴排序
   * 2.5D深度感关键
   */

  /**
   * 创建图层
   */
  createLayer(name, zIndex = 0) {
    this.layers.set(name, {
      name,
      zIndex,
      objects: [],
      visible: true,
      alpha: 1
    });
    this.updateLayerOrder();
  }

  /**
   * 更新图层排序
   */
  updateLayerOrder() {
    this.layerOrder = Array.from(this.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex)
      .map(l => l.name);
  }

  /**
   * 设置图层属性
   */
  setLayerProperty(name, property, value) {
    const layer = this.layers.get(name);
    if (layer) {
      layer[property] = value;
    }
  }

  /**
   * 添加对象到图层
   */
  addToLayer(object, layerName = this.defaultLayer) {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.objects.push(object);
      // 按zIndex排序
      layer.objects.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    }
  }

  /**
   * 从图层移除对象
   */
  removeFromLayer(object, layerName = this.defaultLayer) {
    const layer = this.layers.get(layerName);
    if (layer) {
      const index = layer.objects.indexOf(object);
      if (index !== -1) {
        layer.objects.splice(index, 1);
      }
    }
  }

  /**
   * 清空图层
   */
  clearLayer(layerName = this.defaultLayer) {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.objects = [];
    }
  }

  /**
   * 获取图层
   */
  getLayer(name) {
    return this.layers.get(name);
  }

  /**
   * 2.1.4 坐标系适配
   * 适配各种屏幕尺寸
   */

  /**
   * 将设计坐标转换为屏幕坐标
   */
  designToScreen(x, y) {
    return {
      x: x * this.scaleX,
      y: y * this.scaleY
    };
  }

  /**
   * 将屏幕坐标转换为设计坐标
   */
  screenToDesign(x, y) {
    return {
      x: x / this.scaleX,
      y: y / this.scaleY
    };
  }

  /**
   * 应用全局变换
   */
  applyTransform() {
    // 应用DPR缩放
    this.ctx.scale(this.dpr, this.dpr);
    // 应用相机/全局变换
    this.ctx.translate(this.globalTransform.x, this.globalTransform.y);
    this.ctx.scale(this.globalTransform.scaleX, this.globalTransform.scaleY);
    this.ctx.rotate(this.globalTransform.rotation);
  }

  /**
   * 设置全局变换
   */
  setGlobalTransform(x, y, scaleX = 1, scaleY = 1, rotation = 0) {
    this.globalTransform = { x, y, scaleX, scaleY, rotation };
  }

  /**
   * 2.1.5 脏矩形优化渲染检测
   * 可选，性能优化
   */

  /**
   * 标记脏区域
   */
  markDirty(x, y, width, height) {
    if (!this.enableDirtyRect) return;

    // 转换为物理像素坐标
    x *= this.dpr;
    y *= this.dpr;
    width *= this.dpr;
    height *= this.dpr;

    this.dirtyRects.push({ x, y, width, height });

    // 脏区域过多时，改为全屏渲染
    if (this.dirtyRects.length > 10) {
      this.fullScreenDirty = true;
      this.dirtyRects = [];
    }
  }

  /**
   * 标记全屏脏
   */
  markFullScreenDirty() {
    this.fullScreenDirty = true;
    this.dirtyRects = [];
  }

  /**
   * 清除脏区域
   */
  clearDirtyRects() {
    this.dirtyRects = [];
    this.fullScreenDirty = false;
  }

  /**
   * 应用脏矩形裁剪
   */
  applyDirtyRects() {
    if (!this.enableDirtyRect || this.fullScreenDirty) return;

    // 合并重叠的脏矩形
    const merged = this.mergeDirtyRects(this.dirtyRects);

    // 创建裁剪区域
    this.ctx.beginPath();
    for (const rect of merged) {
      this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
    }
    this.ctx.clip();
  }

  /**
   * 合并重叠的脏矩形
   */
  mergeDirtyRects(rects) {
    if (rects.length === 0) return [];
    if (rects.length === 1) return rects;

    // 简化的合并算法：如果矩形重叠或靠近，合并它们
    const merged = [rects[0]];

    for (let i = 1; i < rects.length; i++) {
      const rect = rects[i];
      let hasMerged = false;

      for (const m of merged) {
        if (this.rectsIntersect(m, rect)) {
          // 合并矩形
          const minX = Math.min(m.x, rect.x);
          const minY = Math.min(m.y, rect.y);
          const maxX = Math.max(m.x + m.width, rect.x + rect.width);
          const maxY = Math.max(m.y + m.height, rect.y + rect.height);
          m.x = minX;
          m.y = minY;
          m.width = maxX - minX;
          m.height = maxY - minY;
          hasMerged = true;
          break;
        }
      }

      if (!hasMerged) {
        merged.push(rect);
      }
    }

    return merged;
  }

  /**
   * 检查矩形是否相交
   */
  rectsIntersect(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
  }

  /**
   * 2.1.6 帧率控制与主循环
   * 保证60FPS稳定
   */

  /**
   * 设置目标帧率
   */
  setTargetFPS(fps) {
    this.targetFPS = fps;
    this.frameInterval = 1000 / fps;
  }

  /**
   * 帧率控制检查
   * @returns {boolean} 是否应该渲染这一帧
   */
  shouldRender() {
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = now - (elapsed % this.frameInterval);
      return true;
    }
    return false;
  }

  /**
   * 更新FPS统计
   */
  updateFPS() {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFPSTime >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFPSTime = now;
    }
  }

  /**
   * 开始渲染帧
   */
  beginFrame() {
    if (this.isRendering) return false;
    this.isRendering = true;

    // 重置统计
    this.stats.drawCalls = 0;

    // 应用脏矩形优化
    if (this.enableDirtyRect && !this.fullScreenDirty && this.dirtyRects.length > 0) {
      this.ctx.save();
      this.applyDirtyRects();
    }

    return true;
  }

  /**
   * 结束渲染帧
   */
  endFrame() {
    if (!this.isRendering) return;

    if (this.enableDirtyRect && !this.fullScreenDirty && this.dirtyRects.length > 0) {
      this.ctx.restore();
    }

    // 更新FPS
    this.updateFPS();

    this.isRendering = false;
  }

  /**
   * 渲染所有图层
   */
  render() {
    if (!this.beginFrame()) return;

    // 清空画布
    if (this.fullScreenDirty || !this.enableDirtyRect) {
      this.clear();
    } else {
      // 只清空脏区域
      for (const rect of this.dirtyRects) {
        this.ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      }
    }

    // 渲染各个图层
    for (const layerName of this.layerOrder) {
      const layer = this.layers.get(layerName);
      if (!layer || !layer.visible) continue;

      this.ctx.save();
      this.ctx.globalAlpha = layer.alpha;

      // 渲染图层中的对象
      for (const obj of layer.objects) {
        if (obj.render) {
          obj.render(this);
        } else if (obj.visible !== false) {
          this.renderObject(obj);
        }
      }

      this.ctx.restore();
    }

    this.endFrame();
    this.clearDirtyRects();
  }

  /**
   * 渲染对象（简化版）
   */
  renderObject(obj) {
    // 根据对象类型渲染
    if (obj.type === 'image' && obj.image) {
      this.drawImage(obj.image, obj.x, obj.y, obj.width, obj.height);
    } else if (obj.type === 'rect') {
      this.drawRect(obj.x, obj.y, obj.width, obj.height, obj.options);
    } else if (obj.type === 'circle') {
      this.drawCircle(obj.x, obj.y, obj.radius, obj.options);
    } else if (obj.type === 'text') {
      this.drawText(obj.text, obj.x, obj.y, obj.options);
    }
  }

  /**
   * 获取FPS
   */
  getFPS() {
    return this.currentFPS;
  }

  /**
   * 获取渲染统计
   */
  getStats() {
    return { ...this.stats };
  }
}

export default Renderer;
