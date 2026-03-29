/**
 * LevelCompleteDialog 简易通关弹窗
 * 点击通关按钮后弹出的确认弹窗
 */

import Dialog from './Dialog';
import Button from '../components/Button';
import Text from '../components/Text';
import { globalEvent } from '../../core/EventEmitter';

class LevelCompleteDialog extends Dialog {
  constructor(options = {}) {
    super({
      name: 'LevelCompleteDialog',
      width: options.width || 400,
      height: options.height || 220,
      showCloseButton: false,
      modal: true,
      ...options
    });

    this.levelId = options.levelId || 1;
    this.stage = options.stage || 1;
    this.stars = options.stars || 3;
    this.onConfirm = options.onConfirm || null;

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
      y: this.y + 45,
      text: '关卡通关！',
      fontSize: 28,
      fontWeight: 'bold',
      color: '#4CAF50',
      align: 'center'
    });

    // 星级显示
    this.starText = new Text({
      x: this.x + centerX,
      y: this.y + 95,
      text: '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars),
      fontSize: 36,
      color: '#FFD700',
      align: 'center'
    });

    // 确认按钮
    this.confirmBtn = new Button({
      x: this.x + centerX - 70,
      y: this.y + this.height - 70,
      width: 140,
      height: 50,
      text: '确认',
      fontSize: 24,
      bgColor: '#4CAF50',
      borderRadius: 6,
      shadow: { color: 'rgba(0,0,0,0.2)', blur: 4, offsetX: 0, offsetY: 2 },
      onClick: () => this._onConfirmClick()
    });

    // 添加到子元素
    this.addChild(this.titleText);
    this.addChild(this.starText);
    this.addChild(this.confirmBtn);
  }

  /**
   * 确认按钮点击
   */
  _onConfirmClick() {
    this.close();
    
    if (this.onConfirm) {
      this.onConfirm({
        levelId: this.levelId,
        stage: this.stage,
        stars: this.stars
      });
    }
  }

  /**
   * 更新
   */
  update(deltaTime) {
    super.update(deltaTime);
    if (this.confirmBtn) {
      this.confirmBtn.update(deltaTime);
    }
  }
}

export default LevelCompleteDialog;
