/**
 * FrameAnimation 帧动画播放器
 * 负责任务 2.4.1 实现帧动画播放器
 * 污垢动画、工具动画
 */

import { globalEvent } from '../core/EventEmitter';

class FrameAnimation {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    // 动画帧数据
    this.frames = options.frames || []; // 帧图片数组
    this.frameData = options.frameData || []; // 帧数据（含持续时间）
    
    // 播放配置
    this.frameRate = options.frameRate || 12; // 默认12fps
    this.loop = options.loop !== undefined ? options.loop : true; // 是否循环
    this.yoyo = options.yoyo || false; // 往返播放
    
    // 2.4.4 实现动画事件回调
    this.onStart = options.onStart || null;
    this.onUpdate = options.onUpdate || null;
    this.onComplete = options.onComplete || null;
    this.onLoop = options.onLoop || null;
    this.onFrameChange = options.onFrameChange || null;

    // 播放状态
    this._isPlaying = false;
    this._isPaused = false;
    this._currentFrame = 0;
    this._elapsedTime = 0;
    this._frameDuration = 1000 / this.frameRate;
    this._loopCount = 0;
    this._reversed = false;
    this._isCompleted = false;

    // 自动播放
    if (options.autoPlay) {
      this.play();
    }
  }

  /**
   * 2.4.1 实现帧动画播放器
   * 从精灵图创建帧动画
   * @param {HTMLImageElement} spriteSheet - 精灵图
   * @param {number} frameWidth - 单帧宽度
   * @param {number} frameHeight - 单帧高度
   * @param {Object} options - 选项
   * @returns {FrameAnimation}
   */
  static fromSpriteSheet(spriteSheet, frameWidth, frameHeight, options = {}) {
    const frames = [];
    const cols = Math.floor(spriteSheet.width / frameWidth);
    const rows = Math.floor(spriteSheet.height / frameHeight);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        frames.push({
          image: spriteSheet,
          x: col * frameWidth,
          y: row * frameHeight,
          width: frameWidth,
          height: frameHeight
        });
      }
    }

    return new FrameAnimation({ ...options, frames });
  }

  /**
   * 从帧数组创建动画
   * @param {Array} frameImages - 帧图片数组
   * @param {Object} options - 选项
   * @returns {FrameAnimation}
   */
  static fromFrames(frameImages, options = {}) {
    const frames = frameImages.map(img => ({
      image: img,
      x: 0,
      y: 0,
      width: img.width,
      height: img.height
    }));

    return new FrameAnimation({ ...options, frames });
  }

  /**
   * 播放动画
   */
  play() {
    if (this._isPlaying) return this;

    this._isPlaying = true;
    this._isPaused = false;
    this._isCompleted = false;

    if (this.onStart) {
      this.onStart(this);
    }
    globalEvent.emit('frameAnimation:start', this);

    return this;
  }

  /**
   * 2.4.3 实现动画的暂停、继续、停止
   * 暂停动画
   */
  pause() {
    if (!this._isPlaying || this._isPaused) return this;

    this._isPaused = true;

    if (this.onPause) {
      this.onPause(this);
    }
    globalEvent.emit('frameAnimation:pause', this);

    return this;
  }

  /**
   * 2.4.3 实现动画的暂停、继续、停止
   * 继续动画
   */
  resume() {
    if (!this._isPlaying || !this._isPaused) return this;

    this._isPaused = false;

    if (this.onResume) {
      this.onResume(this);
    }
    globalEvent.emit('frameAnimation:resume', this);

    return this;
  }

  /**
   * 2.4.3 实现动画的暂停、继续、停止
   * 停止动画
   * @param {boolean} reset - 是否重置到第一帧
   */
  stop(reset = true) {
    if (!this._isPlaying) return this;

    this._isPlaying = false;
    this._isPaused = false;

    if (reset) {
      this._currentFrame = 0;
      this._elapsedTime = 0;
    }

    if (this.onStop) {
      this.onStop(this);
    }
    globalEvent.emit('frameAnimation:stop', this);

    return this;
  }

  /**
   * 跳转到指定帧
   * @param {number} frameIndex - 帧索引
   */
  gotoFrame(frameIndex) {
    this._currentFrame = MathUtils.clamp(frameIndex, 0, this.frames.length - 1);
    this._elapsedTime = 0;
    return this;
  }

  /**
   * 跳转到指定时间
   * @param {number} time - 时间（毫秒）
   */
  gotoTime(time) {
    const totalDuration = this.frames.length * this._frameDuration;
    const normalizedTime = MathUtils.clamp(time, 0, totalDuration);
    this._currentFrame = Math.floor(normalizedTime / this._frameDuration);
    this._elapsedTime = normalizedTime % this._frameDuration;
    return this;
  }

  /**
   * 设置播放速度
   * @param {number} speed - 速度倍数
   */
  setSpeed(speed) {
    this._frameDuration = 1000 / (this.frameRate * speed);
    return this;
  }

  /**
   * 反向播放
   */
  reverse() {
    this._reversed = !this._reversed;
    return this;
  }

  /**
   * 更新动画
   * @param {number} deltaTime - 时间间隔（毫秒）
   */
  update(deltaTime) {
    if (!this._isPlaying || this._isPaused) return;

    this._elapsedTime += deltaTime;

    const currentFrameDuration = this.frameData[this._currentFrame]?.duration || this._frameDuration;

    if (this._elapsedTime >= currentFrameDuration) {
      this._elapsedTime = 0;
      this._advanceFrame();
    }

    // 触发更新事件
    if (this.onUpdate) {
      this.onUpdate(this, this._currentFrame);
    }
  }

  /**
   * 前进到下一帧
   */
  _advanceFrame() {
    const lastFrame = this.frames.length - 1;
    const previousFrame = this._currentFrame;

    if (this._reversed) {
      this._currentFrame--;
      if (this._currentFrame < 0) {
        this._onLoopEnd();
        this._currentFrame = this.yoyo ? Math.min(1, lastFrame) : lastFrame;
      }
    } else {
      this._currentFrame++;
      if (this._currentFrame > lastFrame) {
        this._onLoopEnd();
        this._currentFrame = this.yoyo ? Math.max(0, lastFrame - 1) : 0;
      }
    }

    // 触发帧变化事件
    if (this._currentFrame !== previousFrame && this.onFrameChange) {
      this.onFrameChange(this, this._currentFrame, previousFrame);
    }
  }

  /**
   * 循环结束处理
   */
  _onLoopEnd() {
    if (!this.loop) {
      this._onComplete();
      return;
    }

    this._loopCount++;

    if (this.yoyo) {
      this._reversed = !this._reversed;
    }

    if (this.onLoop) {
      this.onLoop(this, this._loopCount);
    }
    globalEvent.emit('frameAnimation:loop', this, this._loopCount);
  }

  /**
   * 动画完成
   */
  _onComplete() {
    this._isPlaying = false;
    this._isCompleted = true;
    this._currentFrame = this.frames.length - 1;

    if (this.onComplete) {
      this.onComplete(this);
    }
    globalEvent.emit('frameAnimation:complete', this);
  }

  /**
   * 渲染当前帧
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 目标宽度
   * @param {number} height - 目标高度
   */
  render(ctx, x, y, width, height) {
    const frame = this.frames[this._currentFrame];
    if (!frame) return;

    try {
      if (frame.image) {
        ctx.drawImage(
          frame.image,
          frame.x, frame.y, frame.width, frame.height,
          x, y, width || frame.width, height || frame.height
        );
      }
    } catch (e) {
      console.error('[FrameAnimation] 渲染帧失败:', e);
    }
  }

  // Getters
  get isPlaying() { return this._isPlaying; }
  get isPaused() { return this._isPaused; }
  get isCompleted() { return this._isCompleted; }
  get currentFrame() { return this._currentFrame; }
  get totalFrames() { return this.frames.length; }
  get progress() { return this._currentFrame / (this.frames.length - 1); }
  get loopCount() { return this._loopCount; }

  /**
   * 获取当前帧图片
   * @returns {Object|null}
   */
  getCurrentFrameData() {
    return this.frames[this._currentFrame] || null;
  }
}

// 导入MathUtils
import MathUtils from '../utils/MathUtils';

export default FrameAnimation;
