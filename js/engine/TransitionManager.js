/**
 * TransitionManager 场景过渡动画管理器
 * 提供页面切换时的过渡效果
 */

import { globalEvent } from '../core/EventEmitter';

// 缓动函数
const Easing = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => 1 - (1 - t) * (1 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  bounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
};

class TransitionManager {
  constructor() {
    // 当前过渡状态
    this._isTransitioning = false;
    this._progress = 0; // 0 ~ 1
    this._type = 'fade'; // fade, slide, scale, wipe
    this._phase = 'none'; // 'out', 'in', 'none'
    
    // 配置
    this._duration = 300;
    this._easing = 'easeInOut';
    this._direction = 'left'; // 滑动方向: left, right, up, down
    
    // 回调
    this._onComplete = null;
    this._onProgress = null;
    
    // 截图（用于过渡效果）
    this._snapshot = null;
    this._screenWidth = 750;
    this._screenHeight = 1334;
  }

  /**
   * 开始过渡动画
   * @param {string} type - 过渡类型: fade, slide, scale, wipe
   * @param {string} phase - 阶段: 'out' 出场, 'in' 入场
   * @param {Object} options - 选项
   */
  start(type, phase, options = {}) {
    this._type = type;
    this._phase = phase;
    this._duration = options.duration || 300;
    this._easing = options.easing || 'easeInOut';
    this._direction = options.direction || 'left';
    this._screenWidth = options.screenWidth || 750;
    this._screenHeight = options.screenHeight || 1334;
    this._onComplete = options.onComplete || null;
    this._onProgress = options.onProgress || null;
    
    this._isTransitioning = true;
    this._progress = 0;
    this._startTime = Date.now();
    
    // 如果有截图，保存
    if (options.snapshot) {
      this._snapshot = options.snapshot;
    }
    
    globalEvent.emit('transition:start', { type, phase });
    
    console.log(`[TransitionManager] 开始${phase === 'out' ? '出场' : '入场'}动画: ${type}`);
  }

  /**
   * 更新过渡动画
   * @param {number} deltaTime - 时间间隔
   */
  update(deltaTime) {
    if (!this._isTransitioning) return;
    
    const elapsed = Date.now() - this._startTime;
    this._progress = Math.min(1, elapsed / this._duration);
    
    // 应用缓动
    const easedProgress = Easing[this._easing](this._progress);
    
    if (this._onProgress) {
      this._onProgress(easedProgress);
    }
    
    globalEvent.emit('transition:progress', { 
      progress: this._progress, 
      easedProgress,
      phase: this._phase 
    });
    
    if (this._progress >= 1) {
      this._complete();
    }
  }

  /**
   * 渲染过渡效果
   * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
   */
  render(ctx) {
    if (!this._isTransitioning) return;
    
    const easedProgress = Easing[this._easing](this._progress);
    
    switch (this._type) {
      case 'fade':
        this._renderFade(ctx, easedProgress);
        break;
      case 'slide':
        this._renderSlide(ctx, easedProgress);
        break;
      case 'scale':
        this._renderScale(ctx, easedProgress);
        break;
      case 'wipe':
        this._renderWipe(ctx, easedProgress);
        break;
      case 'curtain':
        this._renderCurtain(ctx, easedProgress);
        break;
      default:
        this._renderFade(ctx, easedProgress);
    }
  }

  /**
   * 淡入淡出效果
   */
  _renderFade(ctx, progress) {
    // 出场：从清晰到半透明黑（progress 0 -> 1）
    // 入场：从半透明黑到清晰（progress 0 -> 1）
    const maxAlpha = 0.4; // 最大遮罩透明度
    const alpha = this._phase === 'out' 
      ? progress * maxAlpha 
      : (1 - progress) * maxAlpha;
    
    // 只在有遮罩时绘制
    if (alpha > 0.01) {
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, this._screenWidth, this._screenHeight);
    }
  }

  /**
   * 滑动效果
   */
  _renderSlide(ctx, progress) {
    const offset = this._phase === 'out' 
      ? -progress * this._screenWidth 
      : (1 - progress) * this._screenWidth;
    
    let x = 0, y = 0;
    
    switch (this._direction) {
      case 'left':
        x = offset;
        break;
      case 'right':
        x = -offset;
        break;
      case 'up':
        y = offset;
        break;
      case 'down':
        y = -offset;
        break;
    }
    
    // 绘制阴影
    const shadowWidth = 30;
    const gradient = ctx.createLinearGradient(
      x > 0 ? x - shadowWidth : x + this._screenWidth,
      0,
      x > 0 ? x : x + this._screenWidth + shadowWidth,
      0
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x > 0 ? x - shadowWidth : x + this._screenWidth, 0, shadowWidth, this._screenHeight);
  }

  /**
   * 缩放效果
   */
  _renderScale(ctx, progress) {
    // 缩放效果不绘制遮罩，只通过 SceneManager 对场景应用变换
    // 这里可以绘制一些装饰效果
    const alpha = this._phase === 'out' ? progress : (1 - progress);
    
    if (alpha > 0.01) {
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.3})`;
      ctx.fillRect(0, 0, this._screenWidth, this._screenHeight);
    }
  }

  /**
   * 擦除效果
   */
  _renderWipe(ctx, progress) {
    const wipeWidth = this._screenWidth * progress;
    
    ctx.fillStyle = '#000000';
    
    switch (this._direction) {
      case 'left':
        ctx.fillRect(this._screenWidth - wipeWidth, 0, wipeWidth, this._screenHeight);
        break;
      case 'right':
        ctx.fillRect(0, 0, wipeWidth, this._screenHeight);
        break;
      case 'up':
        ctx.fillRect(0, this._screenHeight - wipeWidth, this._screenWidth, wipeWidth);
        break;
      case 'down':
        ctx.fillRect(0, 0, this._screenWidth, wipeWidth);
        break;
    }
  }

  /**
   * 幕布效果（左右拉开）
   */
  _renderCurtain(ctx, progress) {
    const curtainWidth = (this._screenWidth / 2) * progress;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, curtainWidth, this._screenHeight);
    ctx.fillRect(this._screenWidth - curtainWidth, 0, curtainWidth, this._screenHeight);
  }

  /**
   * 完成过渡
   */
  _complete() {
    this._isTransitioning = false;
    this._progress = 1;
    
    console.log(`[TransitionManager] ${this._phase === 'out' ? '出场' : '入场'}动画完成`);
    
    globalEvent.emit('transition:complete', { phase: this._phase });
    
    if (this._onComplete) {
      this._onComplete();
    }
  }

  /**
   * 跳过当前过渡
   */
  skip() {
    if (this._isTransitioning) {
      this._complete();
    }
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      isTransitioning: this._isTransitioning,
      progress: this._progress,
      type: this._type,
      phase: this._phase
    };
  }

  /**
   * 是否正在过渡中
   */
  get isTransitioning() {
    return this._isTransitioning;
  }

  /**
   * 获取当前阶段
   */
  get phase() {
    return this._phase;
  }
}

export default TransitionManager;
