/**
 * DialogManager 弹窗管理器（轻量级）
 * 只管理单个弹窗的显示/隐藏
 */

class DialogManager {
  constructor() {
    // 当前显示的弹窗
    this.currentDialog = null;
    
    // 屏幕尺寸
    this.screenWidth = 750;
    this.screenHeight = 1334;
  }

  /**
   * 初始化
   */
  init() {
    console.log('[DialogManager] 初始化');
  }

  /**
   * 显示弹窗（简化版）
   * @param {Dialog} dialog - 弹窗实例
   */
  show(dialog) {
    if (!dialog) return;

    // 如果已有弹窗，先关闭
    if (this.currentDialog) {
      this.currentDialog.hide();
    }

    // 不再覆盖弹窗的屏幕尺寸，使用弹窗自身设置的值
    // 如果弹窗没有设置屏幕尺寸，才使用管理器的尺寸
    if (!dialog.screenWidth || !dialog.screenHeight) {
      dialog.setScreenSize(this.screenWidth, this.screenHeight);
    }
    
    // 显示新弹窗
    this.currentDialog = dialog;
    dialog.show();
    
    console.log('[DialogManager] 显示弹窗:', dialog.name);
  }

  /**
   * 隐藏当前弹窗
   */
  hide() {
    if (this.currentDialog) {
      this.currentDialog.hide();
      this.currentDialog = null;
    }
  }

  /**
   * 关闭当前弹窗（同 hide）
   */
  close() {
    this.hide();
  }

  /**
   * 是否有弹窗显示
   */
  hasVisibleDialog() {
    return this.currentDialog && this.currentDialog.isVisible();
  }

  /**
   * 更新
   */
  update(deltaTime) {
    if (this.currentDialog) {
      this.currentDialog.update(deltaTime);
    }
  }

  /**
   * 渲染
   */
  render(ctx) {
    if (this.currentDialog && this.currentDialog.isVisible()) {
      this.currentDialog.render(ctx);
    }
  }

  /**
   * 处理触摸事件
   */
  onTouchStart(x, y) {
    if (this.currentDialog && this.currentDialog.isVisible()) {
      return this.currentDialog.onTouchStart(x, y);
    }
    return false;
  }

  onTouchMove(x, y) {
    if (this.currentDialog && this.currentDialog.isVisible()) {
      return this.currentDialog.onTouchMove(x, y);
    }
    return false;
  }

  onTouchEnd(x, y) {
    if (this.currentDialog && this.currentDialog.isVisible()) {
      return this.currentDialog.onTouchEnd(x, y);
    }
    return false;
  }

  /**
   * 设置屏幕尺寸
   */
  setScreenSize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * 快捷方法：显示确认弹窗
   */
  confirm(title, message, onConfirm, onCancel) {
    const ConfirmDialog = require('./ConfirmDialog').default;
    const dialog = new ConfirmDialog({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      title,
      message,
      onConfirm,
      onCancel
    });
    this.show(dialog);
    return dialog;
  }

  /**
   * 快捷方法：显示提示弹窗
   */
  alert(message, onClose) {
    const ConfirmDialog = require('./ConfirmDialog').default;
    const dialog = new ConfirmDialog({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      title: '提示',
      message,
      showCancel: false,
      onConfirm: onClose
    });
    this.show(dialog);
    return dialog;
  }

  /**
   * 快捷方法：显示加载弹窗
   */
  showLoading(message = '加载中...') {
    const LoadingDialog = require('./LoadingDialog').default;
    const dialog = new LoadingDialog({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      message
    });
    this.show(dialog);
    return dialog;
  }

  /**
   * 销毁
   */
  destroy() {
    this.hide();
  }
}

export default DialogManager;
