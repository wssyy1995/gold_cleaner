/**
 * Camera 相机系统
 * 负责任务 2.5.1 ~ 2.5.3
 * - 实现相机类
 * - 实现视口映射
 * - 实现相机平移与缩放动画
 */

import MathUtils from '../utils/MathUtils';
import Tween from '../animation/Tween';
import Easing from '../animation/Easing';

class Camera {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    // 2.5.1 实现相机类
    // 相机位置（在世界坐标系中）
    this.x = options.x || 0;
    this.y = options.y || 0;

    // 缩放比例
    this.zoom = options.zoom || 1;
    this.minZoom = options.minZoom || 0.5;
    this.maxZoom = options.maxZoom || 3;

    // 旋转角度（弧度）
    this.rotation = options.rotation || 0;

    // 视口尺寸
    this.viewportWidth = options.viewportWidth || 750;
    this.viewportHeight = options.viewportHeight || 1334;

    // 2.5.2 实现视口映射
    // 世界边界（可移动范围）
    this.bounds = options.bounds || null; // { x, y, width, height }

    // 是否限制在边界内
    this.clampToBounds = options.clampToBounds !== false;

    // 平滑移动参数
    this.smoothFollow = options.smoothFollow || false;
    this.smoothSpeed = options.smoothSpeed || 5;

    // 跟随目标
    this.target = null;
    this.offsetX = options.offsetX || 0;
    this.offsetY = options.offsetY || 0;

    // 2.5.3 实现相机平移与缩放动画
    // 动画相关
    this._tween = null;
    this._isShaking = false;
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._shakeElapsed = 0;

    // 变换矩阵（缓存）
    this._transform = {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0
    };

    // 边界内边距
    this.deadzone = options.deadzone || null; // { x, y, width, height }
  }

  /**
   * 2.5.1 实现相机类
   * 更新相机
   * @param {number} deltaTime - 时间间隔（毫秒）
   */
  update(deltaTime) {
    // 更新跟随目标
    if (this.target) {
      this._updateFollow(deltaTime);
    }

    // 限制在边界内
    if (this.clampToBounds && this.bounds) {
      this._clampToBounds();
    }

    // 更新震动效果
    if (this._isShaking) {
      this._updateShake(deltaTime);
    }

    // 更新变换矩阵
    this._updateTransform();
  }

  /**
   * 更新跟随目标
   * @param {number} deltaTime - 时间间隔
   */
  _updateFollow(deltaTime) {
    const targetX = this.target.x + this.offsetX;
    const targetY = this.target.y + this.offsetY;

    if (this.smoothFollow) {
      // 平滑跟随
      const t = Math.min(1, this.smoothSpeed * deltaTime / 1000);
      this.x = MathUtils.lerp(this.x, targetX, t);
      this.y = MathUtils.lerp(this.y, targetY, t);
    } else {
      // 直接跟随（考虑deadzone）
      if (this.deadzone) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;

        if (Math.abs(dx) > this.deadzone.width / 2) {
          this.x = targetX - Math.sign(dx) * this.deadzone.width / 2;
        }
        if (Math.abs(dy) > this.deadzone.height / 2) {
          this.y = targetY - Math.sign(dy) * this.deadzone.height / 2;
        }
      } else {
        this.x = targetX;
        this.y = targetY;
      }
    }
  }

  /**
   * 限制相机在边界内
   */
  _clampToBounds() {
    if (!this.bounds) return;

    // 计算视口在世界坐标系中的半尺寸
    const halfViewWidth = (this.viewportWidth / 2) / this.zoom;
    const halfViewHeight = (this.viewportHeight / 2) / this.zoom;

    // 计算可移动范围
    const minX = this.bounds.x + halfViewWidth;
    const maxX = this.bounds.x + this.bounds.width - halfViewWidth;
    const minY = this.bounds.y + halfViewHeight;
    const maxY = this.bounds.y + this.bounds.height - halfViewHeight;

    // 如果世界比视口小，居中显示
    if (minX > maxX) {
      this.x = this.bounds.x + this.bounds.width / 2;
    } else {
      this.x = MathUtils.clamp(this.x, minX, maxX);
    }

    if (minY > maxY) {
      this.y = this.bounds.y + this.bounds.height / 2;
    } else {
      this.y = MathUtils.clamp(this.y, minY, maxY);
    }
  }

  /**
   * 更新震动效果
   * @param {number} deltaTime - 时间间隔
   */
  _updateShake(deltaTime) {
    this._shakeElapsed += deltaTime;

    if (this._shakeElapsed >= this._shakeDuration) {
      this._isShaking = false;
      this._shakeIntensity = 0;
    }
  }

  /**
   * 更新变换矩阵
   */
  _updateTransform() {
    this._transform.x = -this.x + this.viewportWidth / 2;
    this._transform.y = -this.y + this.viewportHeight / 2;
    this._transform.scale = this.zoom;
    this._transform.rotation = this.rotation;
  }

  /**
   * 2.5.1 实现相机类
   * 设置位置
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * 设置缩放
   * @param {number} zoom - 缩放比例
   */
  setZoom(zoom) {
    this.zoom = MathUtils.clamp(zoom, this.minZoom, this.maxZoom);
    return this;
  }

  /**
   * 设置旋转
   * @param {number} rotation - 旋转角度（弧度）
   */
  setRotation(rotation) {
    this.rotation = rotation;
    return this;
  }

  /**
   * 设置跟随目标
   * @param {Object} target - 目标对象（需要有x, y属性）
   * @param {number} offsetX - X偏移
   * @param {number} offsetY - Y偏移
   */
  follow(target, offsetX = 0, offsetY = 0) {
    this.target = target;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    return this;
  }

  /**
   * 停止跟随
   */
  unfollow() {
    this.target = null;
    return this;
  }

  /**
   * 2.5.3 实现相机平移与缩放动画
   * 移动到指定位置（带动画）
   * @param {number} x - 目标X
   * @param {number} y - 目标Y
   * @param {Object} options - 动画选项
   */
  moveTo(x, y, options = {}) {
    const {
      duration = 500,
      easing = Easing.easeOutQuad,
      onComplete = null
    } = options;

    // 停止之前的动画
    if (this._tween) {
      this._tween.stop();
    }

    // 创建新动画
    this._tween = new Tween(this, { x, y }, {
      duration,
      easing,
      onComplete: () => {
        this._tween = null;
        if (onComplete) onComplete();
      }
    }).start();

    return this;
  }

  /**
   * 缩放到指定比例（带动画）
   * @param {number} zoom - 目标缩放
   * @param {Object} options - 动画选项
   */
  zoomTo(zoom, options = {}) {
    const {
      duration = 500,
      easing = Easing.easeOutQuad,
      onComplete = null
    } = options;

    // 限制缩放范围
    zoom = MathUtils.clamp(zoom, this.minZoom, this.maxZoom);

    // 停止之前的动画
    if (this._tween) {
      this._tween.stop();
    }

    // 创建新动画
    this._tween = new Tween(this, { zoom }, {
      duration,
      easing,
      onComplete: () => {
        this._tween = null;
        if (onComplete) onComplete();
      }
    }).start();

    return this;
  }

  /**
   * 平移和缩放动画（同时）
   * @param {number} x - 目标X
   * @param {number} y - 目标Y
   * @param {number} zoom - 目标缩放
   * @param {Object} options - 动画选项
   */
  animateTo(x, y, zoom, options = {}) {
    const {
      duration = 500,
      easing = Easing.easeOutQuad,
      onComplete = null
    } = options;

    // 限制缩放范围
    zoom = MathUtils.clamp(zoom, this.minZoom, this.maxZoom);

    // 停止之前的动画
    if (this._tween) {
      this._tween.stop();
    }

    // 创建新动画
    this._tween = new Tween(this, { x, y, zoom }, {
      duration,
      easing,
      onComplete: () => {
        this._tween = null;
        if (onComplete) onComplete();
      }
    }).start();

    return this;
  }

  /**
   * 屏幕震动效果
   * @param {number} intensity - 震动强度
   * @param {number} duration - 持续时间（毫秒）
   */
  shake(intensity = 10, duration = 300) {
    this._isShaking = true;
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeElapsed = 0;
    return this;
  }

  /**
   * 停止震动
   */
  stopShake() {
    this._isShaking = false;
    this._shakeIntensity = 0;
    return this;
  }

  /**
   * 2.5.2 实现视口映射
   * 世界坐标转屏幕坐标
   * @param {number} worldX - 世界X坐标
   * @param {number} worldY - 世界Y坐标
   * @returns {Object}
   */
  worldToScreen(worldX, worldY) {
    const dx = worldX - this.x;
    const dy = worldY - this.y;

    // 应用旋转
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;

    // 应用缩放和平移
    return {
      x: rx * this.zoom + this.viewportWidth / 2,
      y: ry * this.zoom + this.viewportHeight / 2
    };
  }

  /**
   * 2.5.2 实现视口映射
   * 屏幕坐标转世界坐标
   * @param {number} screenX - 屏幕X坐标
   * @param {number} screenY - 屏幕Y坐标
   * @returns {Object}
   */
  screenToWorld(screenX, screenY) {
    // 逆向平移和缩放
    const dx = (screenX - this.viewportWidth / 2) / this.zoom;
    const dy = (screenY - this.viewportHeight / 2) / this.zoom;

    // 应用旋转（逆向）
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;

    return {
      x: rx + this.x,
      y: ry + this.y
    };
  }

  /**
   * 检查点是否在视口内
   * @param {number} x - 世界X坐标
   * @param {number} y - 世界Y坐标
   * @param {number} margin - 边距
   * @returns {boolean}
   */
  isInViewport(x, y, margin = 0) {
    const screen = this.worldToScreen(x, y);
    return screen.x >= -margin && 
           screen.x <= this.viewportWidth + margin &&
           screen.y >= -margin && 
           screen.y <= this.viewportHeight + margin;
  }

  /**
   * 检查矩形是否在视口内（或相交）
   * @param {number} x - 世界X坐标
   * @param {number} y - 世界Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @returns {boolean}
   */
  isRectInViewport(x, y, width, height) {
    // 简单包围盒检测
    const halfWidth = (width / 2) * this.zoom;
    const halfHeight = (height / 2) * this.zoom;
    const screen = this.worldToScreen(x + width / 2, y + height / 2);

    return Math.abs(screen.x - this.viewportWidth / 2) < (this.viewportWidth / 2 + halfWidth) &&
           Math.abs(screen.y - this.viewportHeight / 2) < (this.viewportHeight / 2 + halfHeight);
  }

  /**
   * 应用相机变换到上下文
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  applyTransform(ctx) {
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.rotate(this.rotation);
    ctx.translate(-this.x, -this.y);

    // 应用震动偏移
    if (this._isShaking && this._shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this._shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this._shakeIntensity;
      ctx.translate(shakeX, shakeY);
    }
  }

  /**
   * 重置变换
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  resetTransform(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * 获取视口在世界坐标系中的矩形
   * @returns {Object}
   */
  getWorldViewRect() {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.viewportWidth, this.viewportHeight);

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
  }

  /**
   * 设置视口尺寸
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  setViewportSize(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    return this;
  }

  /**
   * 设置世界边界
   * @param {Object} bounds - 边界 { x, y, width, height }
   */
  setBounds(bounds) {
    this.bounds = bounds;
    return this;
  }

  /**
   * 销毁相机
   */
  destroy() {
    if (this._tween) {
      this._tween.stop();
      this._tween = null;
    }
    this.target = null;
  }
}

export default Camera;
