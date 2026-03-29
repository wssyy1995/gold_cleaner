/**
 * Dialog 弹窗基类
 * 负责任务 5.2.1 ~ 5.2.6
 * - 5.2.1 设计弹窗基类（Dialog Base）
 * - 5.2.3 实现弹窗的淡入淡出动画
 * - 5.2.4 实现弹窗的模态背景遮罩
 * - 5.2.5 实现弹窗的居中显示与适配
 * - 5.2.6 实现弹窗的关闭按钮与事件回调
 */

import { globalEvent } from '../../core/EventEmitter';
import Tween from '../../animation/Tween';
import Easing from '../../animation/Easing';
import Panel from '../components/Panel';

class Dialog extends Panel {
  constructor(options = {}) {
    super({
      ...options,
      x: options.x || 0,
      y: options.y || 0,
      width: options.width || 600,
      height: options.height || 400
    });

    this.name = options.name || 'Dialog';

    // 5.2.2 弹窗管理器引用
    this.manager = options.manager || null;

    // 5.2.4 实现弹窗的模态背景遮罩
    this.modal = options.modal !== false; // 是否模态
    this.maskColor = options.maskColor || 'rgba(0, 0, 0, 0.6)';
    this.maskClickToClose = options.maskClickToClose || false;

    // 5.2.5 实现弹窗的居中显示与适配
    this.centered = options.centered !== false; // 是否居中
    this.screenWidth = options.screenWidth || 750;
    this.screenHeight = options.screenHeight || 1334;

    if (this.centered) {
      this._updateCenterPosition();
    }

    // 5.2.3 实现弹窗的淡入淡出动画
    this.animated = options.animated !== false;
    this.animationDuration = options.animationDuration || 300;
    this._opacity = 0;
    this._scale = 0.8;
    this._targetOpacity = 0;
    this._targetScale = 0.8;
    this._isShowing = false;
    this._isHiding = false;
    this._tween = null;

    // 5.2.6 实现弹窗的关闭按钮与事件回调
    this.showCloseButton = options.showCloseButton !== false;
    this.closeButtonSize = options.closeButtonSize || 40;
    this.closeButtonColor = options.closeButtonColor || '#999999';
    this.closeButtonHoverColor = options.closeButtonHoverColor || '#666666';

    // 回调
    this.onShow = options.onShow || null;
    this.onHide = options.onHide || null;
    this.onClose = options.onClose || null;

    // 内容区域边距（考虑关闭按钮）
    if (this.showCloseButton) {
      this.padding.top = Math.max(this.padding.top, this.closeButtonSize + 10);
    }
  }

  /**
   * 更新居中位置
   */
  _updateCenterPosition() {
    console.log(`[Dialog._updateCenterPosition] screenWidth=${this.screenWidth}, screenHeight=${this.screenHeight}, width=${this.width}, height=${this.height}`);
    this.x = (this.screenWidth - this.width) / 2;
    this.y = (this.screenHeight - this.height) / 2;
    this.contentX = this.x + this.padding.left;
    this.contentY = this.y + this.padding.top;
    console.log(`[Dialog._updateCenterPosition] 计算位置: x=${this.x}, y=${this.y}`);
  }

  /**
   * 5.2.3 实现弹窗的淡入淡出动画
   * 显示弹窗
   */
  show(data = null) {
    if (this._isShowing || this._opacity === 1) return;

    console.log(`[Dialog] 显示弹窗: ${this.name}`);

    this._isShowing = true;
    this._isHiding = false;
    this._targetOpacity = 1;
    this._targetScale = 1;

    // 重新计算居中位置
    if (this.centered) {
      console.log(`[Dialog.show] 显示前重新计算位置: screenWidth=${this.screenWidth}, screenHeight=${this.screenHeight}`);
      this._updateCenterPosition();
    }

    // 发送事件
    globalEvent.emit('dialog:show', this.name, data);

    // 动画进入
    if (this.animated) {
      this._animateIn(data);
    } else {
      this._opacity = 1;
      this._scale = 1;
      this._onShowComplete(data);
    }
  }

  /**
   * 隐藏弹窗
   */
  hide(result = null) {
    if (this._isHiding || this._opacity === 0) return;

    console.log(`[Dialog] 隐藏弹窗: ${this.name}`);

    this._isHiding = true;
    this._isShowing = false;
    this._targetOpacity = 0;
    this._targetScale = 0.8;

    globalEvent.emit('dialog:hide', this.name, result);

    // 动画退出
    if (this.animated) {
      this._animateOut(result);
    } else {
      this._opacity = 0;
      this._scale = 0.8;
      this._onHideComplete(result);
    }
  }

  /**
   * 关闭弹窗（同hide，但会触发onClose）
   */
  close(result = null) {
    if (this.onClose) {
      const canClose = this.onClose(result);
      if (canClose === false) return; // 阻止关闭
    }

    this.hide(result);
  }

  /**
   * 进入动画
   */
  _animateIn(data) {
    // 使用Tween动画
    this._tween = new Tween(this, { _opacity: 1, _scale: 1 }, {
      duration: this.animationDuration,
      easing: Easing.easeOutBack,
      onComplete: () => {
        this._isShowing = false;
        this._tween = null;
        this._onShowComplete(data);
      }
    }).start();
  }

  /**
   * 退出动画
   */
  _animateOut(result) {
    this._tween = new Tween(this, { _opacity: 0, _scale: 0.8 }, {
      duration: this.animationDuration,
      easing: Easing.easeInQuad,
      onComplete: () => {
        this._isHiding = false;
        this._tween = null;
        this._onHideComplete(result);
      }
    }).start();
  }

  /**
   * 显示完成
   */
  _onShowComplete(data) {
    if (this.onShow) {
      this.onShow(data);
    }
    globalEvent.emit('dialog:showComplete', this.name);
  }

  /**
   * 隐藏完成
   */
  _onHideComplete(result) {
    if (this.onHide) {
      this.onHide(result);
    }
    globalEvent.emit('dialog:hideComplete', this.name, result);
  }

  /**
   * 更新
   */
  update(deltaTime) {
    // 更新 Tween 动画（即使不可见也要更新，因为动画可能正在让弹窗显示）
    if (this._tween) {
      this._tween.update(deltaTime);
      if (this._isShowing) {
        console.log(`[Dialog] ${this.name} 动画更新: opacity=${this._opacity.toFixed(2)}, scale=${this._scale.toFixed(2)}`);
      }
    }
    
    if (!this.isVisible()) return;

    super.update(deltaTime);

    // 更新子元素
    for (const child of this.children) {
      if (child.update) {
        child.update(deltaTime);
      }
    }
  }

  /**
   * 渲染
   */
  onRender(ctx) {
    if (this._opacity <= 0.01) return;

    ctx.save();

    // 应用透明度
    ctx.globalAlpha = this._opacity;

    // 5.2.4 实现弹窗的模态背景遮罩
    if (this.modal) {
      ctx.fillStyle = this.maskColor;
      ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    }

    // 调试：直接绘制边框，确认坐标
    if (this.name === 'SettlementDialog') {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      console.log(`[Dialog.onRender] ${this.name}: x=${this.x}, y=${this.y}, width=${this.width}, height=${this.height}, scale=${this._scale}`);
    }

    // 应用缩放动画
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(this._scale, this._scale);
    ctx.translate(-centerX, -centerY);

    // 绘制面板内容
    super.onRender(ctx);

    // 5.2.6 实现弹窗的关闭按钮与事件回调
    if (this.showCloseButton) {
      this._drawCloseButton(ctx);
    }

    ctx.restore();
  }

  /**
   * 绘制关闭按钮
   */
  _drawCloseButton(ctx) {
    const btnX = this.x + this.width - this.closeButtonSize - 10;
    const btnY = this.y + 10;
    const size = this.closeButtonSize;

    ctx.save();

    // 绘制圆形背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(btnX + size / 2, btnY + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // 绘制X
    ctx.strokeStyle = this.closeButtonColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const padding = size * 0.3;
    ctx.beginPath();
    ctx.moveTo(btnX + padding, btnY + padding);
    ctx.lineTo(btnX + size - padding, btnY + size - padding);
    ctx.moveTo(btnX + size - padding, btnY + padding);
    ctx.lineTo(btnX + padding, btnY + size - padding);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 处理触摸开始
   */
  onTouchStart(x, y) {
    if (!this.isVisible()) return false;

    // 检查是否点击关闭按钮
    if (this.showCloseButton && this._isCloseButtonClicked(x, y)) {
      this.close();
      return true;
    }

    // 检查是否点击遮罩
    if (this.modal && this.maskClickToClose) {
      if (!this.containsPoint(x, y)) {
        this.close();
        return true;
      }
    }

    // 转发给父类
    return super.onTouchStart(x, y);
  }

  /**
   * 检查是否点击关闭按钮
   */
  _isCloseButtonClicked(x, y) {
    const btnX = this.x + this.width - this.closeButtonSize - 10;
    const btnY = this.y + 10;
    return x >= btnX && x <= btnX + this.closeButtonSize &&
           y >= btnY && y <= btnY + this.closeButtonSize;
  }

  /**
   * 是否可见
   */
  isVisible() {
    return this._opacity > 0;
  }

  /**
   * 是否正在动画
   */
  isAnimating() {
    return this._isShowing || this._isHiding;
  }

  /**
   * 设置尺寸并重新居中
   */
  setSize(width, height) {
    super.setSize(width, height);
    if (this.centered) {
      this._updateCenterPosition();
    }
  }

  /**
   * 设置屏幕尺寸
   */
  setScreenSize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
    if (this.centered) {
      this._updateCenterPosition();
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this.hide();
    super.destroy();
  }
}

export default Dialog;
