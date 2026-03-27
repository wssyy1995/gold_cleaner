/**
 * LoadingDialog 加载弹窗
 * 显示加载中提示
 */

import Dialog from './Dialog';
import Text from '../components/Text';

class LoadingDialog extends Dialog {
  constructor(options = {}) {
    super({
      name: 'LoadingDialog',
      width: options.width || 300,
      height: options.height || 200,
      modal: true,
      maskColor: 'rgba(0, 0, 0, 0.3)',
      showCloseButton: false,
      ...options
    });

    this.message = options.message || '加载中...';

    this._initUI();
    this._rotation = 0;
  }

  /**
   * 初始化UI
   */
  _initUI() {
    // 加载图标绘制在render中

    // 消息文字
    this.messageText = new Text({
      x: this.x + this.width / 2,
      y: this.y + this.height - 50,
      text: this.message,
      fontSize: 24,
      color: '#666666',
      align: 'center'
    });

    this.addChild(this.messageText);
  }

  /**
   * 设置消息
   */
  setMessage(message) {
    this.message = message;
    this.messageText.setText(message);
  }

  /**
   * 更新
   */
  update(deltaTime) {
    super.update(deltaTime);

    // 旋转动画
    this._rotation += deltaTime * 0.005;
    if (this._rotation > Math.PI * 2) {
      this._rotation -= Math.PI * 2;
    }
  }

  /**
   * 渲染
   */
  onRender(ctx) {
    // 先调用父类渲染（遮罩等）
    ctx.save();

    // 应用透明度
    ctx.globalAlpha = this._opacity;

    // 绘制遮罩
    if (this.modal) {
      ctx.fillStyle = this.maskColor;
      ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    }

    // 绘制背景面板
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // 绘制加载图标
    this._drawLoadingIcon(ctx);

    // 绘制文字
    this.messageText.onRender(ctx);

    ctx.restore();
  }

  /**
   * 绘制加载图标
   */
  _drawLoadingIcon(ctx) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2 - 20;
    const radius = 30;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this._rotation);

    // 绘制旋转的圆点
    const dotCount = 8;
    const dotRadius = 4;

    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const alpha = 0.3 + (i / dotCount) * 0.7;

      ctx.fillStyle = `rgba(74, 144, 217, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export default LoadingDialog;
