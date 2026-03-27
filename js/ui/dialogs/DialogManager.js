/**
 * DialogManager 弹窗管理器
 * 负责任务 5.2.2 实现弹窗管理器（DialogManager）
 */

import { globalEvent } from '../../core/EventEmitter';

class DialogManager {
  constructor() {
    // 已注册的弹窗
    this._dialogs = new Map();

    // 弹窗栈（用于管理多层弹窗）
    this._dialogStack = [];

    // 当前显示的弹窗
    this._currentDialog = null;

    // 遮罩层透明度
    this._maskOpacity = 0;
    this._targetMaskOpacity = 0;

    // 屏幕尺寸
    this.screenWidth = 750;
    this.screenHeight = 1334;

    // 触摸事件处理
    this._touchHandler = null;
  }

  /**
   * 初始化弹窗管理器
   */
  init() {
    console.log('[DialogManager] 初始化弹窗管理器');
    this._bindTouchEvents();
  }

  /**
   * 绑定触摸事件
   */
  _bindTouchEvents() {
    if (typeof wx !== 'undefined') {
      // 触摸开始
      wx.onTouchStart((e) => {
        const touch = e.touches[0];
        this.onTouchStart(touch.clientX, touch.clientY);
      });

      // 触摸移动
      wx.onTouchMove((e) => {
        const touch = e.touches[0];
        this.onTouchMove(touch.clientX, touch.clientY);
      });

      // 触摸结束
      wx.onTouchEnd((e) => {
        const touch = e.changedTouches[0];
        this.onTouchEnd(touch.clientX, touch.clientY);
      });
    }
  }

  /**
   * 5.2.2 实现弹窗管理器（DialogManager）
   * 注册弹窗
   * @param {string} name - 弹窗名称
   * @param {Dialog} dialog - 弹窗实例
   */
  register(name, dialog) {
    dialog.manager = this;
    dialog.setScreenSize(this.screenWidth, this.screenHeight);
    this._dialogs.set(name, dialog);
    console.log(`[DialogManager] 注册弹窗: ${name}`);
  }

  /**
   * 取消注册弹窗
   * @param {string} name - 弹窗名称
   */
  unregister(name) {
    const dialog = this._dialogs.get(name);
    if (dialog) {
      dialog.manager = null;
      if (dialog.isVisible()) {
        dialog.hide();
      }
      this._dialogs.delete(name);
    }
  }

  /**
   * 显示弹窗
   * @param {string} name - 弹窗名称
   * @param {Object} data - 传递给弹窗的数据
   * @param {Object} options - 选项
   */
  show(name, data = null, options = {}) {
    const dialog = this._dialogs.get(name);
    if (!dialog) {
      console.error(`[DialogManager] 未找到弹窗: ${name}`);
      return false;
    }

    const { pushToStack = true, closeOthers = false } = options;

    // 关闭其他弹窗
    if (closeOthers) {
      this.closeAll();
    }

    // 如果当前有弹窗，压入栈
    if (this._currentDialog && pushToStack) {
      this._dialogStack.push(this._currentDialog);
      this._currentDialog._opacity = 0.3; // 淡化底层弹窗
    }

    // 显示新弹窗
    this._currentDialog = dialog;
    dialog.show(data);

    globalEvent.emit('dialogmanager:show', name, data);

    return true;
  }

  /**
   * 隐藏弹窗
   * @param {string} name - 弹窗名称
   * @param {any} result - 返回结果
   */
  hide(name, result = null) {
    const dialog = this._dialogs.get(name);
    if (!dialog) return false;

    dialog.hide(result);

    // 如果隐藏的是当前弹窗
    if (this._currentDialog === dialog) {
      // 从栈中恢复上一个弹窗
      if (this._dialogStack.length > 0) {
        this._currentDialog = this._dialogStack.pop();
        this._currentDialog._opacity = 1; // 恢复不透明度
      } else {
        this._currentDialog = null;
      }
    } else {
      // 从栈中移除
      const index = this._dialogStack.indexOf(dialog);
      if (index !== -1) {
        this._dialogStack.splice(index, 1);
      }
    }

    globalEvent.emit('dialogmanager:hide', name, result);

    return true;
  }

  /**
   * 关闭当前弹窗
   * @param {any} result - 返回结果
   */
  closeCurrent(result = null) {
    if (this._currentDialog) {
      this._currentDialog.close(result);
    }
  }

  /**
   * 关闭所有弹窗
   */
  closeAll() {
    // 关闭当前弹窗
    if (this._currentDialog) {
      this._currentDialog.hide();
    }

    // 关闭栈中所有弹窗
    for (const dialog of this._dialogStack) {
      dialog.hide();
    }

    this._dialogStack = [];
    this._currentDialog = null;
  }

  /**
   * 获取弹窗
   * @param {string} name - 弹窗名称
   * @returns {Dialog|undefined}
   */
  getDialog(name) {
    return this._dialogs.get(name);
  }

  /**
   * 获取当前弹窗
   * @returns {Dialog|null}
   */
  getCurrentDialog() {
    return this._currentDialog;
  }

  /**
   * 是否有弹窗显示
   * @returns {boolean}
   */
  hasVisibleDialog() {
    if (this._currentDialog && this._currentDialog.isVisible()) {
      return true;
    }
    return this._dialogStack.some(d => d.isVisible());
  }

  /**
   * 获取弹窗栈深度
   * @returns {number}
   */
  getStackDepth() {
    return this._dialogStack.length + (this._currentDialog ? 1 : 0);
  }

  /**
   * 更新
   * @param {number} deltaTime - 时间间隔
   */
  update(deltaTime) {
    // 更新当前弹窗
    if (this._currentDialog) {
      this._currentDialog.update(deltaTime);
    }

    // 更新栈中弹窗
    for (const dialog of this._dialogStack) {
      dialog.update(deltaTime);
    }
  }

  /**
   * 渲染
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  render(ctx) {
    // 先渲染栈中的弹窗（底层）
    for (const dialog of this._dialogStack) {
      if (dialog.isVisible()) {
        dialog.render(ctx);
      }
    }

    // 渲染当前弹窗（顶层）
    if (this._currentDialog && this._currentDialog.isVisible()) {
      this._currentDialog.render(ctx);
    }
  }

  /**
   * 处理触摸开始
   */
  onTouchStart(x, y) {
    // 只传递给当前弹窗
    if (this._currentDialog && this._currentDialog.isVisible()) {
      return this._currentDialog.onTouchStart(x, y);
    }
    return false;
  }

  /**
   * 处理触摸移动
   */
  onTouchMove(x, y) {
    if (this._currentDialog && this._currentDialog.isVisible()) {
      return this._currentDialog.onTouchMove(x, y);
    }
    return false;
  }

  /**
   * 处理触摸结束
   */
  onTouchEnd(x, y) {
    if (this._currentDialog && this._currentDialog.isVisible()) {
      return this._currentDialog.onTouchEnd(x, y);
    }
    return false;
  }

  /**
   * 设置屏幕尺寸
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  setScreenSize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;

    // 更新所有弹窗
    for (const dialog of this._dialogs.values()) {
      dialog.setScreenSize(width, height);
    }
  }

  /**
   * 创建确认弹窗（快捷方法）
   * @param {Object} options - 选项
   * @returns {Dialog}
   */
  createConfirmDialog(options = {}) {
    const ConfirmDialog = require('./ConfirmDialog').default;
    const dialog = new ConfirmDialog({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      ...options
    });
    return dialog;
  }

  /**
   * 显示确认弹窗（快捷方法）
   * @param {string} title - 标题
   * @param {string} message - 消息
   * @param {Object} options - 选项
   */
  confirm(title, message, options = {}) {
    const name = options.name || 'confirm_' + Date.now();
    const dialog = this.createConfirmDialog({
      title,
      message,
      ...options
    });

    this.register(name, dialog);
    this.show(name, null, { pushToStack: false });

    // 自动取消注册
    dialog.onHide = () => {
      this.unregister(name);
    };

    return dialog;
  }

  /**
   * 显示提示弹窗（快捷方法）
   * @param {string} message - 消息
   * @param {Object} options - 选项
   */
  alert(message, options = {}) {
    return this.confirm(options.title || '提示', message, {
      showCancel: false,
      ...options
    });
  }

  /**
   * 显示加载弹窗（快捷方法）
   * @param {string} message - 消息
   */
  showLoading(message = '加载中...') {
    const name = 'loading_dialog';
    const LoadingDialog = require('./LoadingDialog').default;

    let dialog = this._dialogs.get(name);
    if (!dialog) {
      dialog = new LoadingDialog({
        screenWidth: this.screenWidth,
        screenHeight: this.screenHeight,
        message
      });
      this.register(name, dialog);
    }

    dialog.setMessage(message);
    this.show(name, null, { pushToStack: false, closeOthers: true });

    return dialog;
  }

  /**
   * 隐藏加载弹窗
   */
  hideLoading() {
    this.hide('loading_dialog');
  }

  /**
   * 销毁
   */
  destroy() {
    this.closeAll();
    this._dialogs.clear();
  }
}

// 单例
let instance = null;

export function getDialogManager() {
  if (!instance) {
    instance = new DialogManager();
  }
  return instance;
}

export default DialogManager;
