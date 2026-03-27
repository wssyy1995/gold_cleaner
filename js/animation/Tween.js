/**
 * Tween 补间动画系统
 * 负责任务 2.4.2 实现补间动画系统
 * 游戏动效的核心
 */

import Easing from './Easing';
import { globalEvent } from '../core/EventEmitter';

class Tween {
  /**
   * 构造函数
   * @param {Object} target - 目标对象
   * @param {Object} to - 目标值
   * @param {Object} options - 选项
   */
  constructor(target, to = {}, options = {}) {
    this.target = target;
    this.to = { ...to };
    this.from = {};
    
    // 动画选项
    this.duration = options.duration || 1000; // 毫秒
    this.delay = options.delay || 0;
    this.easing = options.easing || Easing.easeOutQuad;
    this.loop = options.loop || 0; // 0 = 不循环, -1 = 无限循环, n = 循环n次
    this.yoyo = options.yoyo || false; // 往返播放
    
    // 2.4.4 实现动画事件回调
    this.onStart = options.onStart || null;
    this.onUpdate = options.onUpdate || null;
    this.onComplete = options.onComplete || null;
    this.onStop = options.onStop || null;
    this.onPause = options.onPause || null;
    this.onResume = options.onResume || null;
    this.onLoop = options.onLoop || null;

    // 动画状态
    this._isPlaying = false;
    this._isPaused = false;
    this._isCompleted = false;
    this._elapsedTime = 0;
    this._delayElapsed = 0;
    this._loopCount = 0;
    this._reversed = false;
    this._startTime = 0;
    this._pausedTime = 0;

    // 存储原始值
    this._saveFromValues();
  }

  /**
   * 保存起始值
   */
  _saveFromValues() {
    for (const key in this.to) {
      if (this.target[key] !== undefined) {
        this.from[key] = this.target[key];
      }
    }
  }

  /**
   * 设置新的起始值
   * @param {Object} from - 起始值
   */
  from(from) {
    this.from = { ...from };
    return this;
  }

  /**
   * 2.4.2 实现补间动画系统
   * 开始动画
   */
  start() {
    if (this._isPlaying) return this;

    this._isPlaying = true;
    this._isPaused = false;
    this._isCompleted = false;
    this._elapsedTime = 0;
    this._delayElapsed = 0;
    this._loopCount = 0;
    this._reversed = false;
    this._startTime = Date.now();

    // 如果没有手动设置起始值，再次保存当前值
    if (Object.keys(this.from).length === 0) {
      this._saveFromValues();
    }

    // 触发开始事件
    if (this.onStart) {
      this.onStart(this.target);
    }
    globalEvent.emit('tween:start', this);

    return this;
  }

  /**
   * 2.4.3 实现动画的暂停、继续、停止
   * 暂停动画
   */
  pause() {
    if (!this._isPlaying || this._isPaused) return this;

    this._isPaused = true;
    this._pausedTime = Date.now();

    if (this.onPause) {
      this.onPause(this.target);
    }
    globalEvent.emit('tween:pause', this);

    return this;
  }

  /**
   * 2.4.3 实现动画的暂停、继续、停止
   * 继续动画
   */
  resume() {
    if (!this._isPlaying || !this._isPaused) return this;

    // 调整开始时间，补偿暂停的时间
    const pauseDuration = Date.now() - this._pausedTime;
    this._startTime += pauseDuration;

    this._isPaused = false;

    if (this.onResume) {
      this.onResume(this.target);
    }
    globalEvent.emit('tween:resume', this);

    return this;
  }

  /**
   * 2.4.3 实现动画的暂停、继续、停止
   * 停止动画
   * @param {boolean} toEnd - 是否跳到结束状态
   */
  stop(toEnd = false) {
    if (!this._isPlaying) return this;

    if (toEnd) {
      this._updateValues(1);
    }

    this._isPlaying = false;
    this._isPaused = false;

    if (this.onStop) {
      this.onStop(this.target);
    }
    globalEvent.emit('tween:stop', this);

    return this;
  }

  /**
   * 反向播放
   */
  reverse() {
    this._reversed = !this._reversed;
    // 交换from和to
    const temp = this.from;
    this.from = this.to;
    this.to = temp;
    return this;
  }

  /**
   * 重新开始
   */
  restart() {
    this.stop();
    this.start();
    return this;
  }

  /**
   * 更新动画
   * @param {number} deltaTime - 时间间隔（毫秒）
   */
  update(deltaTime) {
    if (!this._isPlaying || this._isPaused) return;

    // 处理延迟
    if (this._delayElapsed < this.delay) {
      this._delayElapsed += deltaTime;
      if (this._delayElapsed < this.delay) {
        return; // 还在延迟中
      }
      deltaTime = this._delayElapsed - this.delay; // 补偿延迟后的时间
    }

    // 更新经过的时间
    this._elapsedTime += deltaTime;

    // 计算进度
    let progress = Math.min(this._elapsedTime / this.duration, 1);

    // 应用缓动函数
    const easedProgress = this.easing(progress);

    // 更新目标值
    this._updateValues(easedProgress);

    // 触发更新事件
    if (this.onUpdate) {
      this.onUpdate(this.target, progress);
    }
    globalEvent.emit('tween:update', this, progress);

    // 检查是否完成
    if (progress >= 1) {
      this._onComplete();
    }
  }

  /**
   * 更新目标对象的值
   * @param {number} progress - 进度 (0-1)
   */
  _updateValues(progress) {
    for (const key in this.to) {
      const from = this.from[key];
      const to = this.to[key];
      
      if (typeof from === 'number' && typeof to === 'number') {
        this.target[key] = from + (to - from) * progress;
      }
    }
  }

  /**
   * 动画完成回调
   */
  _onComplete() {
    // 检查是否需要循环
    if (this.loop === -1 || this._loopCount < this.loop) {
      this._loopCount++;

      // yoyo模式：往返播放
      if (this.yoyo) {
        this.reverse();
      }

      // 重置时间
      this._elapsedTime = 0;

      if (this.onLoop) {
        this.onLoop(this.target, this._loopCount);
      }
      globalEvent.emit('tween:loop', this, this._loopCount);
    } else {
      // 真正完成
      this._isPlaying = false;
      this._isCompleted = true;

      if (this.onComplete) {
        this.onComplete(this.target);
      }
      globalEvent.emit('tween:complete', this);
    }
  }

  // Getters
  get isPlaying() { return this._isPlaying; }
  get isPaused() { return this._isPaused; }
  get isCompleted() { return this._isCompleted; }
  get progress() { return Math.min(this._elapsedTime / this.duration, 1); }

  /**
   * 链式API - 静态工厂方法
   */
  static to(target, to, options) {
    return new Tween(target, to, options);
  }

  static from(target, from, options) {
    const tween = new Tween(target, {}, options);
    tween.from(from);
    return tween;
  }

  static fromTo(target, from, to, options) {
    const tween = new Tween(target, to, options);
    tween.from(from);
    return tween;
  }
}

export default Tween;
