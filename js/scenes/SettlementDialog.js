/**
 * SettlementDialog 关卡结算弹窗
 * 负责任务 5.9.1 ~ 5.9.5
 */
import Dialog from '../ui/dialogs/Dialog';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import { globalEvent } from '../core/EventEmitter';

class SettlementDialog extends Dialog {
  constructor(options = {}) {
    super({
      name: 'SettlementDialog',
      width: 600,
      height: 700,
      showCloseButton: false,
      ...options
    });

    this.levelId = options.levelId || 1;
    this.stars = options.stars || 3;
    this.coins = options.coins || 0;
    this.newItems = options.newItems || [];
    
    // 保存回调函数
    this.onReplay = options.onReplay || null;
    this.onNext = options.onNext || null;
    this.onHome = options.onHome || null;

    this._initUI();
  }

  _initUI() {
    // 标题
    this.titleText = new Text({ x: this.x + 300, y: this.y + 60, text: '关卡完成！', fontSize: 40, fontWeight: 'bold', color: '#4CAF50', align: 'center' });

    // 星级
    this.starText = new Text({ x: this.x + 300, y: this.y + 150, text: '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars), fontSize: 60, color: '#FFD700', align: 'center' });

    // 金币奖励
    this.coinText = new Text({ x: this.x + 300, y: this.y + 250, text: `获得金币: ${this.coins}`, fontSize: 32, color: '#FF9500', align: 'center' });

    // 按钮 - 优先使用传入的回调
    this.replayBtn = new Button({ 
      x: this.x + 50, y: this.y + 500, width: 150, height: 70, 
      text: '重玩', fontSize: 24, bgColor: '#E0E0E0', textColor: '#333333', borderRadius: 8, 
      onClick: () => { 
        this.close(); 
        if (this.onReplay) {
          this.onReplay();
        } else {
          globalEvent.emit('game:replay');
        }
      } 
    });
    this.nextBtn = new Button({ 
      x: this.x + 225, y: this.y + 500, width: 150, height: 70, 
      text: '下一关', fontSize: 24, bgColor: '#4CAF50', borderRadius: 8, 
      onClick: () => { 
        this.close(); 
        if (this.onNext) {
          this.onNext();
        } else {
          globalEvent.emit('game:nextLevel');
        }
      } 
    });
    this.homeBtn = new Button({ 
      x: this.x + 400, y: this.y + 500, width: 150, height: 70, 
      text: '首页', fontSize: 24, bgColor: '#4A90D9', borderRadius: 8, 
      onClick: () => { 
        this.close(); 
        if (this.onHome) {
          this.onHome();
        } else {
          globalEvent.emit('scene:switch', 'HomeScene');
        }
      } 
    });

    this.addChild(this.titleText);
    this.addChild(this.starText);
    this.addChild(this.coinText);
    this.addChild(this.replayBtn);
    this.addChild(this.nextBtn);
    this.addChild(this.homeBtn);
  }

  onUpdate(deltaTime) {
    super.update(deltaTime);
    this.replayBtn.update(deltaTime);
    this.nextBtn.update(deltaTime);
    this.homeBtn.update(deltaTime);
  }
}

export default SettlementDialog;
