/**
 * PauseMenu 暂停菜单
 * 负责任务 5.10.1 ~ 5.10.3
 */

import Dialog from './Dialog';
import Button from '../components/Button';
import Text from '../components/Text';
import { globalEvent } from '../../core/EventEmitter';

class PauseMenu extends Dialog {
  constructor(options = {}) {
    super({
      name: 'PauseMenu',
      width: 500,
      height: 450,
      maskColor: 'rgba(0, 0, 0, 0.5)',
      ...options
    });

    this.onResume = options.onResume || null;
    this.onRestart = options.onRestart || null;
    this.onHome = options.onHome || null;

    this._initUI();
  }

  _initUI() {
    // 标题
    this.titleText = new Text({
      x: this.x + 250,
      y: this.y + 60,
      text: '游戏暂停',
      fontSize: 36,
      fontWeight: 'bold',
      color: '#333333',
      align: 'center'
    });

    // 继续按钮
    this.resumeBtn = new Button({
      x: this.x + 100,
      y: this.y + 130,
      width: 300,
      height: 70,
      text: '继续游戏',
      fontSize: 28,
      bgColor: '#4A90D9',
      borderRadius: 12,
      onClick: () => this._onResumeClick()
    });

    // 重玩按钮
    this.restartBtn = new Button({
      x: this.x + 100,
      y: this.y + 220,
      width: 300,
      height: 70,
      text: '重新开始',
      fontSize: 28,
      bgColor: '#E0E0E0',
      textColor: '#333333',
      borderRadius: 12,
      onClick: () => this._onRestartClick()
    });

    // 返回首页按钮
    this.homeBtn = new Button({
      x: this.x + 100,
      y: this.y + 310,
      width: 300,
      height: 70,
      text: '返回首页',
      fontSize: 28,
      bgColor: '#FF6B6B',
      textColor: '#FFFFFF',
      borderRadius: 12,
      onClick: () => this._onHomeClick()
    });

    this.addChild(this.titleText);
    this.addChild(this.resumeBtn);
    this.addChild(this.restartBtn);
    this.addChild(this.homeBtn);
  }

  _onResumeClick() {
    if (this.onResume) {
      this.onResume();
    }
    this.hide();
    globalEvent.emit('game:resume');
  }

  _onRestartClick() {
    if (this.onRestart) {
      this.onRestart();
    }
    this.hide();
    globalEvent.emit('game:restart');
  }

  _onHomeClick() {
    if (this.onHome) {
      this.onHome();
    }
    this.hide();
    globalEvent.emit('scene:switch', 'HomeScene');
  }

  onUpdate(deltaTime) {
    super.update(deltaTime);
    this.resumeBtn.update(deltaTime);
    this.restartBtn.update(deltaTime);
    this.homeBtn.update(deltaTime);
  }
}

export default PauseMenu;
