/**
 * DirtSystem 污垢系统
 * 负责任务 3.2.2 污垢系统与清洁交互（核心）
 * - 3.2.2.1 设计污垢对象数据结构
 * - 3.2.2.2 实现污垢的渲染与进度展示
 * - 3.2.2.3 实现污垢双击放大操作
 * - 3.2.2.4 实现放大区域的退出按钮与逻辑
 * - 3.2.2.5 实现工具拖动操作与视觉效果
 * - 3.2.2.6 实现工具与污垢的交互匹配逻辑
 * - 3.2.2.7 实现错误工具提示与动效
 * - 3.2.2.8 实现污垢清洁完成的动效
 */

import { globalEvent } from '../core/EventEmitter';
import Tween from '../animation/Tween';
import Easing from '../animation/Easing';
import MathUtils from '../utils/MathUtils';

/**
 * 污垢对象类
 */
class DirtObject {
  /**
   * 构造函数
   * @param {Object} config - 配置
   */
  constructor(config = {}) {
    // 3.2.2.1 设计污垢对象数据结构
    this.id = config.id || 0;
    this.type = config.type || 'dust'; // 污垢类型
    this.name = config.name || '污垢';
    
    // 位置和尺寸
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.width = config.width || 80;
    this.height = config.height || 80;
    
    // 清洁相关
    this.cleanProgress = 0; // 清洁进度 0-1
    this.cleanRecipes = config.cleanRecipes || []; // 清洁配方 [[toolId1, toolId2], ...]
    this.currentStep = 0; // 当前清洁步骤
    
    // 状态
    this.state = 'dirty'; // dirty, cleaning, clean
    
    // 视觉效果
    this.images = config.images || {}; // { dirty: '', cleaning1: '', clean: '' }
    this.opacity = 1;
    this.scale = 1;
    
    // 动画
    this._tween = null;
    this._shakeOffset = { x: 0, y: 0 };
    this._isShaking = false;
    
    // 标记
    this.tag = config.tag || 'dirt';
  }

  /**
   * 获取当前需要的工具
   * @returns {Array<string>|null}
   */
  getRequiredTools() {
    if (this.currentStep >= this.cleanRecipes.length) return null;
    return this.cleanRecipes[this.currentStep];
  }

  /**
   * 检查工具是否匹配
   * @param {string} toolId - 工具ID
   * @returns {boolean}
   */
  checkToolMatch(toolId) {
    const required = this.getRequiredTools();
    if (!required) return false;
    return required.includes(toolId);
  }

  /**
   * 应用工具清洁
   * @param {string} toolId - 工具ID
   * @param {number} amount - 清洁量
   * @returns {boolean} 是否正确工具
   */
  applyCleaning(toolId, amount = 0.2) {
    const isCorrect = this.checkToolMatch(toolId);
    
    if (isCorrect) {
      // 正确工具，增加进度
      this.cleanProgress += amount;
      this.currentStep++;
      
      if (this.cleanProgress >= 1) {
        this.cleanProgress = 1;
        this.state = 'clean';
      } else {
        this.state = 'cleaning';
      }
    }
    
    return isCorrect;
  }

  /**
   * 震动效果
   */
  shake() {
    if (this._isShaking) return;
    
    this._isShaking = true;
    let elapsed = 0;
    const duration = 500;
    const intensity = 5;
    
    const shakeFrame = () => {
      if (elapsed >= duration) {
        this._isShaking = false;
        this._shakeOffset = { x: 0, y: 0 };
        return;
      }
      
      this._shakeOffset.x = (Math.random() - 0.5) * intensity;
      this._shakeOffset.y = (Math.random() - 0.5) * intensity;
      elapsed += 16;
      requestAnimationFrame(shakeFrame);
    };
    
    shakeFrame();
  }

  /**
   * 淡出消失
   * @param {Function} onComplete - 完成回调
   */
  fadeOut(onComplete) {
    if (this._tween) this._tween.stop();
    
    this._tween = new Tween(this, { opacity: 0, scale: 1.2 }, {
      duration: 1000,
      easing: Easing.easeOutQuad,
      onComplete: () => {
        if (onComplete) onComplete();
      }
    }).start();
  }

  /**
   * 获取当前应显示的图片
   * @returns {string}
   */
  getCurrentImage() {
    if (this.state === 'clean') {
      return this.images.clean || '';
    } else if (this.state === 'cleaning' && this.images.cleaning) {
      // 根据进度选择清洁阶段图片
      const progress = this.cleanProgress;
      const keys = Object.keys(this.images).filter(k => k.startsWith('cleaning'));
      if (keys.length > 0) {
        const index = Math.floor(progress * keys.length);
        return this.images[keys[Math.min(index, keys.length - 1)]];
      }
    }
    return this.images.dirty || '';
  }

  /**
   * 3.2.2.2 实现污垢的渲染与进度展示
   * 渲染污垢
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {Object} resources - 资源管理器
   */
  render(ctx, resources) {
    const renderX = this.x + this._shakeOffset.x;
    const renderY = this.y + this._shakeOffset.y;
    
    ctx.save();
    
    // 应用变换
    ctx.translate(renderX + this.width / 2, renderY + this.height / 2);
    ctx.scale(this.scale, this.scale);
    ctx.globalAlpha = this.opacity;
    ctx.translate(-this.width / 2, -this.height / 2);
    
    // 绘制污垢图片
    const imageKey = this.getCurrentImage();
    if (imageKey && resources) {
      const img = resources.getImage(imageKey);
      if (img) {
        ctx.drawImage(img, 0, 0, this.width, this.height);
      } else {
        // 占位绘制
        this._drawPlaceholder(ctx);
      }
    } else {
      this._drawPlaceholder(ctx);
    }
    
    // 绘制清洁进度（如果是清洁中）
    if (this.state === 'cleaning') {
      this._drawProgress(ctx);
    }
    
    ctx.restore();
  }

  /**
   * 绘制占位符
   */
  _drawPlaceholder(ctx) {
    const alpha = 1 - this.cleanProgress * 0.5;
    ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // 边框
    ctx.strokeStyle = 'rgba(160, 82, 45, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.width, this.height);
    
    // 提示文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('双击', this.width / 2, this.height / 2 + 5);
  }

  /**
   * 绘制进度条
   */
  _drawProgress(ctx) {
    const barHeight = 6;
    const barY = -10;
    
    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, barY, this.width, barHeight);
    
    // 进度
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, barY, this.width * this.cleanProgress, barHeight);
  }

  /**
   * 检查点是否在范围内
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {boolean}
   */
  containsPoint(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  /**
   * 销毁
   */
  destroy() {
    if (this._tween) {
      this._tween.stop();
      this._tween = null;
    }
  }
}

/**
 * 污垢系统类
 */
class DirtSystem {
  constructor() {
    // 污垢列表
    this.dirts = new Map();
    this.dirtIdCounter = 0;
    
    // 3.2.2.3 实现污垢双击放大操作
    // 放大视图状态
    this.zoomView = {
      active: false,
      targetDirt: null,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      animating: false
    };
    
    // 3.2.2.5 实现工具拖动操作与视觉效果
    // 拖动状态
    this.dragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      trail: [] // 拖动轨迹
    };
    
    // 3.2.2.7 实现错误工具提示与动效
    // 错误提示状态
    this.errorFeedback = {
      active: false,
      timer: null,
      dirtId: null
    };
    
    // 3.2.2.8 实现污垢清洁完成的动效
    // 完成效果
    this.completeEffects = [];
    
    // 双击检测
    this.lastClickTime = 0;
    this.lastClickDirt = null;
    this.doubleClickDelay = 300; // 毫秒
  }

  /**
   * 初始化
   */
  init() {
    console.log('[DirtSystem] 初始化污垢系统');
  }

  /**
   * 3.2.2.1 设计污垢对象数据结构
   * 创建污垢
   * @param {Object} config - 配置
   * @returns {DirtObject}
   */
  createDirt(config) {
    this.dirtIdCounter++;
    const dirt = new DirtObject({
      ...config,
      id: this.dirtIdCounter
    });
    
    this.dirts.set(dirt.id, dirt);
    
    globalEvent.emit('dirt:created', dirt);
    
    return dirt;
  }

  /**
   * 批量创建污垢
   * @param {Array<Object>} configs - 配置数组
   * @returns {Array<DirtObject>}
   */
  createDirts(configs) {
    return configs.map(config => this.createDirt(config));
  }

  /**
   * 获取污垢
   * @param {number} id - 污垢ID
   * @returns {DirtObject|undefined}
   */
  getDirt(id) {
    return this.dirts.get(id);
  }

  /**
   * 获取所有污垢
   * @returns {Array<DirtObject>}
   */
  getAllDirts() {
    return Array.from(this.dirts.values());
  }

  /**
   * 获取未完成清洁的污垢
   * @returns {Array<DirtObject>}
   */
  getUncleanedDirts() {
    return this.getAllDirts().filter(d => d.state !== 'clean');
  }

  /**
   * 3.2.2.3 实现污垢双击放大操作
   * 处理点击/双击
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {boolean} 是否处理了点击
   */
  onTap(x, y) {
    // 如果在放大视图中，检查是否点击退出按钮
    if (this.zoomView.active) {
      return this._handleZoomViewTap(x, y);
    }

    // 查找点击的污垢
    const clickedDirt = this._findDirtAt(x, y);
    if (!clickedDirt) return false;

    const now = Date.now();
    
    // 检测双击
    if (this.lastClickDirt === clickedDirt && 
        now - this.lastClickTime < this.doubleClickDelay) {
      // 双击
      this.enterZoomView(clickedDirt);
      this.lastClickTime = 0;
      this.lastClickDirt = null;
    } else {
      // 单击
      this.lastClickTime = now;
      this.lastClickDirt = clickedDirt;
    }
    
    return true;
  }

  /**
   * 进入放大视图
   * @param {DirtObject} dirt - 目标污垢
   */
  enterZoomView(dirt) {
    if (dirt.state === 'clean') return;
    
    console.log(`[DirtSystem] 进入放大视图: 污垢 ${dirt.id}`);
    
    this.zoomView.active = true;
    this.zoomView.targetDirt = dirt;
    this.zoomView.animating = true;
    
    // 计算放大动画参数
    const screenCenterX = 375; // 屏幕中心
    const screenCenterY = 600;
    
    // 目标缩放比例
    const targetScale = Math.min(3, 700 / dirt.width, 800 / dirt.height);
    
    // 动画进入放大视图
    const startScale = 1;
    const startX = dirt.x;
    const startY = dirt.y;
    
    let progress = 0;
    const duration = 300;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(1, elapsed / duration);
      const eased = Easing.easeOutQuad(progress);
      
      this.zoomView.scale = startScale + (targetScale - startScale) * eased;
      this.zoomView.offsetX = (screenCenterX - dirt.x - dirt.width / 2) * eased;
      this.zoomView.offsetY = (screenCenterY - dirt.y - dirt.height / 2) * eased;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.zoomView.animating = false;
      }
    };
    
    animate();
    
    globalEvent.emit('dirt:zoomIn', dirt);
  }

  /**
   * 3.2.2.4 实现放大区域的退出按钮与逻辑
   * 退出放大视图
   */
  exitZoomView() {
    if (!this.zoomView.active) return;
    
    console.log('[DirtSystem] 退出放大视图');
    
    const dirt = this.zoomView.targetDirt;
    this.zoomView.animating = true;
    
    // 动画退出
    const startScale = this.zoomView.scale;
    const startX = this.zoomView.offsetX;
    const startY = this.zoomView.offsetY;
    
    let progress = 0;
    const duration = 300;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(1, elapsed / duration);
      const eased = Easing.easeInQuad(progress);
      
      this.zoomView.scale = startScale + (1 - startScale) * eased;
      this.zoomView.offsetX = startX * (1 - eased);
      this.zoomView.offsetY = startY * (1 - eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.zoomView.active = false;
        this.zoomView.targetDirt = null;
        this.zoomView.animating = false;
        this.zoomView.scale = 1;
        this.zoomView.offsetX = 0;
        this.zoomView.offsetY = 0;
      }
    };
    
    animate();
    
    globalEvent.emit('dirt:zoomOut', dirt);
  }

  /**
   * 处理放大视图中的点击
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {boolean}
   */
  _handleZoomViewTap(x, y) {
    // 检查是否点击退出按钮（左上角）
    if (x >= 20 && x <= 100 && y >= 150 && y <= 190) {
      this.exitZoomView();
      return true;
    }
    return false;
  }

  /**
   * 3.2.2.5 实现工具拖动操作与视觉效果
   * 处理拖动开始
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  onDragStart(x, y) {
    if (!this.zoomView.active) return false;
    
    this.dragState.isDragging = true;
    this.dragState.startX = x;
    this.dragState.startY = y;
    this.dragState.currentX = x;
    this.dragState.currentY = y;
    this.dragState.trail = [{ x, y, time: Date.now() }];
    
    return true;
  }

  /**
   * 处理拖动移动
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  onDragMove(x, y) {
    if (!this.dragState.isDragging) return false;
    
    this.dragState.currentX = x;
    this.dragState.currentY = y;
    
    // 记录轨迹
    this.dragState.trail.push({ x, y, time: Date.now() });
    
    // 限制轨迹长度
    if (this.dragState.trail.length > 20) {
      this.dragState.trail.shift();
    }
    
    return true;
  }

  /**
   * 3.2.2.6 实现工具与污垢的交互匹配逻辑
   * 处理拖动结束
   * @param {string} toolId - 当前使用的工具ID
   */
  onDragEnd(toolId) {
    if (!this.dragState.isDragging) return { success: false };
    
    this.dragState.isDragging = false;
    
    // 检查是否在放大视图
    if (!this.zoomView.active || !this.zoomView.targetDirt) {
      this.dragState.trail = [];
      return { success: false };
    }
    
    const dirt = this.zoomView.targetDirt;
    
    // 检查工具是否匹配
    const isCorrect = dirt.checkToolMatch(toolId);
    
    if (isCorrect) {
      // 正确工具，应用清洁
      dirt.applyCleaning(toolId);
      
      // 3.2.2.8 实现污垢清洁完成的动效
      if (dirt.state === 'clean') {
        this._playCleanCompleteEffect(dirt);
      }
      
      this.dragState.trail = [];
      
      return {
        success: true,
        dirtId: dirt.id,
        isComplete: dirt.state === 'clean',
        progress: dirt.cleanProgress
      };
    } else {
      // 3.2.2.7 实现错误工具提示与动效
      this._playErrorFeedback(dirt);
      
      this.dragState.trail = [];
      
      return {
        success: false,
        dirtId: dirt.id,
        error: true
      };
    }
  }

  /**
   * 3.2.2.7 实现错误工具提示与动效
   * 播放错误反馈
   * @param {DirtObject} dirt - 污垢对象
   */
  _playErrorFeedback(dirt) {
    // 震动效果
    dirt.shake();
    
    // 显示错误标记
    this.errorFeedback.active = true;
    this.errorFeedback.dirtId = dirt.id;
    
    // 2秒后清除
    if (this.errorFeedback.timer) {
      clearTimeout(this.errorFeedback.timer);
    }
    
    this.errorFeedback.timer = setTimeout(() => {
      this.errorFeedback.active = false;
      this.errorFeedback.dirtId = null;
    }, 1500);
    
    globalEvent.emit('dirt:wrongTool', dirt);
  }

  /**
   * 3.2.2.8 实现污垢清洁完成的动效
   * 播放清洁完成效果
   * @param {DirtObject} dirt - 污垢对象
   */
  _playCleanCompleteEffect(dirt) {
    // 淡出动画
    dirt.fadeOut(() => {
      // 自动退出放大视图
      if (this.zoomView.targetDirt === dirt) {
        this.exitZoomView();
      }
    });
    
    // 添加闪光效果
    this.completeEffects.push({
      x: dirt.x + dirt.width / 2,
      y: dirt.y + dirt.height / 2,
      time: Date.now(),
      duration: 1000
    });
    
    globalEvent.emit('dirt:cleaned', dirt);
  }

  /**
   * 查找坐标处的污垢
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {DirtObject|null}
   */
  _findDirtAt(x, y) {
    // 如果在放大视图，只检查当前目标
    if (this.zoomView.active && this.zoomView.targetDirt) {
      return this.zoomView.targetDirt;
    }
    
    // 反向遍历（从上层到下层）
    const dirts = this.getAllDirts();
    for (let i = dirts.length - 1; i >= 0; i--) {
      const dirt = dirts[i];
      if (dirt.state !== 'clean' && dirt.containsPoint(x, y)) {
        return dirt;
      }
    }
    return null;
  }

  /**
   * 渲染污垢
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {Object} resources - 资源管理器
   */
  render(ctx, resources) {
    ctx.save();
    
    // 应用放大视图变换
    if (this.zoomView.active) {
      ctx.translate(this.zoomView.offsetX, this.zoomView.offsetY);
      ctx.scale(this.zoomView.scale, this.zoomView.scale);
    }
    
    // 渲染所有污垢
    for (const dirt of this.dirts.values()) {
      // 在放大视图时，只渲染目标污垢（或者渲染其他但变暗）
      if (this.zoomView.active) {
        if (dirt === this.zoomView.targetDirt) {
          dirt.render(ctx, resources);
        } else {
          // 其他污垢变暗
          ctx.save();
          ctx.globalAlpha = 0.3;
          dirt.render(ctx, resources);
          ctx.restore();
        }
      } else {
        if (dirt.state !== 'clean' || dirt.opacity > 0) {
          dirt.render(ctx, resources);
        }
      }
    }
    
    ctx.restore();
    
    // 渲染拖动轨迹
    if (this.dragState.isDragging && this.dragState.trail.length > 1) {
      this._renderDragTrail(ctx);
    }
    
    // 渲染错误反馈
    if (this.errorFeedback.active && this.errorFeedback.dirtId) {
      this._renderErrorFeedback(ctx);
    }
    
    // 渲染完成效果
    this._renderCompleteEffects(ctx);
    
    // 渲染退出按钮（如果在放大视图）
    if (this.zoomView.active) {
      this._renderExitButton(ctx);
    }
  }

  /**
   * 渲染拖动轨迹
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  _renderDragTrail(ctx) {
    if (this.dragState.trail.length < 2) return;
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let i = 1; i < this.dragState.trail.length; i++) {
      const prev = this.dragState.trail[i - 1];
      const curr = this.dragState.trail[i];
      
      const progress = i / this.dragState.trail.length;
      ctx.strokeStyle = `rgba(74, 144, 217, ${progress * 0.8})`;
      ctx.lineWidth = 8 * progress;
      
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * 渲染错误反馈
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  _renderErrorFeedback(ctx) {
    const dirt = this.dirts.get(this.errorFeedback.dirtId);
    if (!dirt) return;
    
    const x = dirt.x + dirt.width / 2;
    const y = dirt.y - 20;
    
    ctx.save();
    
    // 绘制红色禁止符号
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 4;
    
    // 圆圈
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.stroke();
    
    // 叉号
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 8);
    ctx.lineTo(x + 8, y + 8);
    ctx.moveTo(x + 8, y - 8);
    ctx.lineTo(x - 8, y + 8);
    ctx.stroke();
    
    // 虚线边框闪烁
    const time = Date.now() / 200;
    if (Math.floor(time) % 2 === 0) {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
      ctx.strokeRect(dirt.x - 5, dirt.y - 5, dirt.width + 10, dirt.height + 10);
    }
    
    ctx.restore();
  }

  /**
   * 渲染完成效果
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  _renderCompleteEffects(ctx) {
    const now = Date.now();
    
    for (let i = this.completeEffects.length - 1; i >= 0; i--) {
      const effect = this.completeEffects[i];
      const elapsed = now - effect.time;
      const progress = elapsed / effect.duration;
      
      if (progress >= 1) {
        this.completeEffects.splice(i, 1);
        continue;
      }
      
      ctx.save();
      ctx.translate(effect.x, effect.y);
      
      // 闪光效果
      const alpha = 1 - progress;
      const scale = 1 + progress * 0.5;
      
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      
      // 绘制星星
      ctx.fillStyle = '#FFD700';
      this._drawStar(ctx, 0, 0, 5, 15, 7);
      
      ctx.restore();
    }
  }

  /**
   * 绘制星星
   */
  _drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * 渲染退出按钮
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  _renderExitButton(ctx) {
    const x = 20;
    const y = 150;
    const width = 80;
    const height = 40;
    
    ctx.save();
    
    // 按钮背景
    ctx.fillStyle = 'rgba(74, 144, 217, 0.9)';
    ctx.fillRect(x, y, width, height);
    
    // 边框
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // 文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('退出', x + width / 2, y + height / 2);
    
    ctx.restore();
  }

  /**
   * 清理已完成的污垢
   */
  cleanCompletedDirts() {
    for (const [id, dirt] of this.dirts) {
      if (dirt.state === 'clean' && dirt.opacity <= 0) {
        dirt.destroy();
        this.dirts.delete(id);
      }
    }
  }

  /**
   * 重置系统
   */
  reset() {
    for (const dirt of this.dirts.values()) {
      dirt.destroy();
    }
    this.dirts.clear();
    this.dirtIdCounter = 0;
    
    this.exitZoomView();
    this.dragState.isDragging = false;
    this.dragState.trail = [];
    this.errorFeedback.active = false;
    this.completeEffects = [];
  }

  /**
   * 获取清洁进度
   * @returns {number}
   */
  getCleanProgress() {
    const dirts = this.getAllDirts();
    if (dirts.length === 0) return 0;
    
    const cleaned = dirts.filter(d => d.state === 'clean').length;
    return cleaned / dirts.length;
  }

  /**
   * 是否全部清洁完成
   * @returns {boolean}
   */
  isAllCleaned() {
    const dirts = this.getAllDirts();
    if (dirts.length === 0) return false;
    return dirts.every(d => d.state === 'clean');
  }

  /**
   * 销毁
   */
  destroy() {
    this.reset();
  }
}

export { DirtObject };
export default DirtSystem;
