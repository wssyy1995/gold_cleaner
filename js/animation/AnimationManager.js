/**
 * AnimationManager 动画管理器
 * 统一管理所有动画的更新
 */

import Tween from './Tween';
import FrameAnimation from './FrameAnimation';
import { globalEvent } from '../core/EventEmitter';

class AnimationManager {
  constructor() {
    // 所有活跃的补间动画
    this._tweens = new Set();
    // 所有活跃的帧动画
    this._frameAnimations = new Set();
    // 对象池
    this._tweenPool = [];
  }

  /**
   * 初始化动画管理器
   */
  init() {
    console.log('[AnimationManager] 初始化动画管理器');
  }

  /**
   * 创建补间动画
   * @param {Object} target - 目标对象
   * @param {Object} to - 目标值
   * @param {Object} options - 选项
   * @returns {Tween}
   */
  tween(target, to, options = {}) {
    const tween = Tween.to(target, to, options);
    this._tweens.add(tween);
    
    // 自动开始
    tween.start();

    // 监听完成事件，自动移除
    const onComplete = () => {
      this._tweens.delete(tween);
      tween.off && tween.off('complete', onComplete);
    };

    // 链式返回
    const originalStop = tween.stop.bind(tween);
    tween.stop = (...args) => {
      this._tweens.delete(tween);
      return originalStop(...args);
    };

    return tween;
  }

  /**
   * 创建帧动画
   * @param {Object} options - 选项
   * @returns {FrameAnimation}
   */
  frameAnimation(options = {}) {
    const anim = new FrameAnimation(options);
    this._frameAnimations.add(anim);

    // 自动开始
    if (options.autoPlay !== false) {
      anim.play();
    }

    // 监听完成事件，自动移除
    const onComplete = () => {
      this._frameAnimations.delete(anim);
    };

    const originalStop = anim.stop.bind(anim);
    anim.stop = (...args) => {
      this._frameAnimations.delete(anim);
      return originalStop(...args);
    };

    return anim;
  }

  /**
   * 从精灵图创建帧动画
   * @param {HTMLImageElement} spriteSheet - 精灵图
   * @param {number} frameWidth - 帧宽度
   * @param {number} frameHeight - 帧高度
   * @param {Object} options - 选项
   * @returns {FrameAnimation}
   */
  spriteAnimation(spriteSheet, frameWidth, frameHeight, options = {}) {
    const anim = FrameAnimation.fromSpriteSheet(spriteSheet, frameWidth, frameHeight, options);
    this._frameAnimations.add(anim);

    if (options.autoPlay !== false) {
      anim.play();
    }

    const originalStop = anim.stop.bind(anim);
    anim.stop = (...args) => {
      this._frameAnimations.delete(anim);
      return originalStop(...args);
    };

    return anim;
  }

  /**
   * 创建序列动画（依次播放多个动画）
   * @param {Array} animations - 动画数组
   * @param {Object} options - 选项
   * @returns {Object}
   */
  sequence(animations, options = {}) {
    let currentIndex = 0;
    let isPlaying = false;

    const playNext = () => {
      if (currentIndex >= animations.length) {
        if (options.onComplete) {
          options.onComplete();
        }
        return;
      }

      const anim = animations[currentIndex];
      currentIndex++;

      const originalOnComplete = anim.onComplete;
      anim.onComplete = (...args) => {
        if (originalOnComplete) {
          originalOnComplete(...args);
        }
        playNext();
      };

      if (anim.start) {
        anim.start();
      } else if (anim.play) {
        anim.play();
      }
    };

    return {
      play() {
        if (isPlaying) return;
        isPlaying = true;
        currentIndex = 0;
        playNext();
      },
      stop() {
        isPlaying = false;
        if (currentIndex > 0 && currentIndex <= animations.length) {
          const anim = animations[currentIndex - 1];
          if (anim.stop) {
            anim.stop();
          }
        }
      }
    };
  }

  /**
   * 创建并行动画（同时播放多个动画）
   * @param {Array} animations - 动画数组
   * @param {Object} options - 选项
   * @returns {Object}
   */
  parallel(animations, options = {}) {
    let completedCount = 0;
    let isPlaying = false;

    const checkComplete = () => {
      completedCount++;
      if (completedCount >= animations.length && options.onComplete) {
        options.onComplete();
      }
    };

    return {
      play() {
        if (isPlaying) return;
        isPlaying = true;
        completedCount = 0;

        animations.forEach(anim => {
          const originalOnComplete = anim.onComplete;
          anim.onComplete = (...args) => {
            if (originalOnComplete) {
              originalOnComplete(...args);
            }
            checkComplete();
          };

          if (anim.start) {
            anim.start();
          } else if (anim.play) {
            anim.play();
          }
        });
      },
      stop() {
        isPlaying = false;
        animations.forEach(anim => {
          if (anim.stop) {
            anim.stop();
          }
        });
      }
    };
  }

  /**
   * 停止所有动画
   * @param {boolean} toEnd - 是否跳到结束
   */
  stopAll(toEnd = false) {
    for (const tween of this._tweens) {
      tween.stop(toEnd);
    }
    this._tweens.clear();

    for (const anim of this._frameAnimations) {
      anim.stop();
    }
    this._frameAnimations.clear();
  }

  /**
   * 暂停所有动画
   */
  pauseAll() {
    for (const tween of this._tweens) {
      tween.pause();
    }
    for (const anim of this._frameAnimations) {
      anim.pause();
    }
  }

  /**
   * 恢复所有动画
   */
  resumeAll() {
    for (const tween of this._tweens) {
      tween.resume();
    }
    for (const anim of this._frameAnimations) {
      anim.resume();
    }
  }

  /**
   * 更新所有动画
   * @param {number} deltaTime - 时间间隔
   */
  update(deltaTime) {
    // 更新补间动画
    for (const tween of this._tweens) {
      if (tween.isPlaying && !tween.isPaused) {
        tween.update(deltaTime);
      }
    }

    // 更新帧动画
    for (const anim of this._frameAnimations) {
      if (anim.isPlaying && !anim.isPaused) {
        anim.update(deltaTime);
      }
    }

    // 清理已完成的动画
    this._cleanupFinishedAnimations();
  }

  /**
   * 清理已完成的动画
   */
  _cleanupFinishedAnimations() {
    for (const tween of this._tweens) {
      if (tween.isCompleted) {
        this._tweens.delete(tween);
      }
    }

    for (const anim of this._frameAnimations) {
      if (anim.isCompleted) {
        this._frameAnimations.delete(anim);
      }
    }
  }

  /**
   * 获取活跃动画数量
   * @returns {Object}
   */
  getStats() {
    return {
      tweens: this._tweens.size,
      frameAnimations: this._frameAnimations.size,
      total: this._tweens.size + this._frameAnimations.size
    };
  }

  /**
   * 销毁动画管理器
   */
  destroy() {
    this.stopAll();
  }
}

export default AnimationManager;
