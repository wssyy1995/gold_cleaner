/**
 * ConfirmDialog 确认弹窗
 * 确认/取消对话框
 */

import Dialog from './Dialog';
import Button from '../components/Button';
import Text from '../components/Text';

class ConfirmDialog extends Dialog {
  constructor(options = {}) {
    super({
      name: 'ConfirmDialog',
      width: options.width || 560,
      height: options.height || 320,
      ...options
    });

    this.title = options.title || '确认';
    this.message = options.message || '';
    this.confirmText = options.confirmText || '确定';
    this.cancelText = options.cancelText || '取消';
    this.showCancel = options.showCancel !== false;

    this.onConfirm = options.onConfirm || null;
    this.onCancel = options.onCancel || null;

    this._initUI();
  }

  /**
   * 初始化UI
   */
  _initUI() {
    const centerX = this.width / 2;

    // 标题
    this.titleText = new Text({
      x: this.x + centerX,
      y: this.y + 60,
      text: this.title,
      fontSize: 32,
      fontWeight: 'bold',
      color: '#333333',
      align: 'center'
    });

    // 消息
    this.messageText = new Text({
      x: this.x + centerX,
      y: this.y + 130,
      text: this.message,
      fontSize: 28,
      color: '#666666',
      align: 'center',
      maxWidth: this.width - 80,
      lineHeight: 1.5
    });

    // 确定按钮
    this.confirmBtn = new Button({
      x: this.x + (this.showCancel ? 60 : centerX - 120),
      y: this.y + this.height - 100,
      width: 200,
      height: 70,
      text: this.confirmText,
      fontSize: 28,
      bgColor: '#4A90D9',
      borderRadius: 8,
      onClick: () => this._onConfirmClick()
    });

    // 取消按钮
    if (this.showCancel) {
      this.cancelBtn = new Button({
        x: this.x + 300,
        y: this.y + this.height - 100,
        width: 200,
        height: 70,
        text: this.cancelText,
        fontSize: 28,
        bgColor: '#E0E0E0',
        textColor: '#666666',
        borderRadius: 8,
        onClick: () => this._onCancelClick()
      });
    }

    // 添加到子元素
    this.addChild(this.titleText);
    this.addChild(this.messageText);
    this.addChild(this.confirmBtn);
    if (this.cancelBtn) {
      this.addChild(this.cancelBtn);
    }
  }

  /**
   * 确定按钮点击
   */
  _onConfirmClick() {
    if (this.onConfirm) {
      this.onConfirm();
    }
    this.close({ confirmed: true });
  }

  /**
   * 取消按钮点击
   */
  _onCancelClick() {
    if (this.onCancel) {
      this.onCancel();
    }
    this.close({ confirmed: false });
  }

  /**
   * 设置消息
   */
  setMessage(message) {
    this.message = message;
    this.messageText.setText(message);
  }

  /**
   * 设置标题
   */
  setTitle(title) {
    this.title = title;
    this.titleText.setText(title);
  }
}

export default ConfirmDialog;
