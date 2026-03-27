/**
 * GameplayScene 游戏进行场景
 * 负责任务 5.5.1 ~ 5.5.11
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import ProgressBar from '../ui/components/ProgressBar';
import { globalEvent } from '../core/EventEmitter';

class GameplayScene extends Scene {
  constructor() {
    super({ name: 'GameplayScene' });
    this.screenWidth = 750;
    this.screenHeight = 1334;
    this.levelId = 0;
    this.cleanProgress = 0;
    this.toolSlots = [];
    this.currentToolIndex = 0;
    this.dirtObjects = [];
  }

  onLoad(data = {}) {
    this.levelId = data.levelId || 1;
    this._initUI();
    this._generateDirts();
  }

  _initUI() {
    // 顶部栏
    this.backBtn = new Button({ x: 20, y: 40, width: 100, height: 50, text: '← 返回', fontSize: 24, bgColor: 'transparent', textColor: '#333333', onClick: () => globalEvent.emit('scene:switch', 'HomeScene') });
    this.levelText = new Text({ x: 375, y: 65, text: `关卡 ${this.levelId}`, fontSize: 32, fontWeight: 'bold', color: '#333333', align: 'center' });
    
    // 清洁度球
    this.cleanlinessText = new Text({ x: 680, y: 65, text: '0%', fontSize: 24, fontWeight: 'bold', color: '#4CAF50', align: 'center' });

    // 工具槽
    this.toolButtons = [];
    const toolNames = ['抹布', '海绵', '刷子', '喷雾'];
    toolNames.forEach((name, index) => {
      const btn = new Button({
        x: 60 + index * 160, y: 1150, width: 120, height: 120,
        text: name, fontSize: 20,
        bgColor: index === 0 ? '#4A90D9' : '#E0E0E0',
        textColor: index === 0 ? '#FFFFFF' : '#333333',
        borderRadius: 12,
        onClick: () => this._selectTool(index)
      });
      this.toolButtons.push(btn);
    });

    // 污垢点击处理
    this._touchStartTime = 0;
    this._lastClickDirt = null;
  }

  _generateDirts() {
    this.dirtObjects = [];
    for (let i = 0; i < 5; i++) {
      this.dirtObjects.push({
        id: i,
        x: 100 + Math.random() * 500,
        y: 250 + Math.random() * 600,
        width: 80, height: 80,
        state: 'dirty',
        cleanProgress: 0
      });
    }
  }

  _selectTool(index) {
    this.currentToolIndex = index;
    this.toolButtons.forEach((btn, i) => {
      btn.bgColor = i === index ? '#4A90D9' : '#E0E0E0';
      btn.textColor = i === index ? '#FFFFFF' : '#333333';
    });
  }

  onUpdate(deltaTime) {
    this.toolButtons.forEach(btn => btn.update(deltaTime));
    
    // 更新清洁度
    const cleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
    this.cleanProgress = cleaned / this.dirtObjects.length;
    this.cleanlinessText.setText(`${Math.floor(this.cleanProgress * 100)}%`);
  }

  onRender(ctx) {
    // 背景
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 房间区域
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(20, 140, 710, 950);

    // 顶部栏
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.screenWidth, 120);

    // 绘制污垢
    this.dirtObjects.forEach(dirt => {
      if (dirt.state !== 'clean') {
        const alpha = 1 - dirt.cleanProgress * 0.5;
        ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
        ctx.fillRect(dirt.x, dirt.y, dirt.width, dirt.height);
        ctx.strokeStyle = 'rgba(160, 82, 45, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(dirt.x, dirt.y, dirt.width, dirt.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('双击', dirt.x + dirt.width / 2, dirt.y + dirt.height / 2 + 5);
      }
    });

    // UI元素
    this.backBtn.onRender(ctx);
    this.levelText.onRender(ctx);
    this.cleanlinessText.onRender(ctx);

    // 绘制清洁度球背景
    ctx.fillStyle = '#E0E0E0';
    ctx.beginPath();
    ctx.arc(680, 65, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(76, 175, 80, ${this.cleanProgress})`;
    ctx.beginPath();
    ctx.arc(680, 65, 40 * this.cleanProgress, 0, Math.PI * 2);
    ctx.fill();

    // 工具栏背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 1100, this.screenWidth, 234);

    // 工具按钮
    this.toolButtons.forEach(btn => btn.onRender(ctx));
  }

  onTouchStart(x, y) {
    this._touchStartTime = Date.now();
    
    if (this.backBtn.onTouchStart(x, y)) return true;
    for (const btn of this.toolButtons) {
      if (btn.onTouchStart(x, y)) return true;
    }

    // 检查污垢点击
    const clickedDirt = this._findDirtAt(x, y);
    if (clickedDirt) {
      const now = Date.now();
      if (this._lastClickDirt === clickedDirt && now - this._lastClickTime < 300) {
        // 双击 - 进入放大视图（简化版）
        this._cleanDirt(clickedDirt);
      }
      this._lastClickTime = now;
      this._lastClickDirt = clickedDirt;
      return true;
    }

    return false;
  }

  onTouchEnd(x, y) {
    if (this.backBtn.onTouchEnd(x, y)) return true;
    for (const btn of this.toolButtons) {
      if (btn.onTouchEnd(x, y)) return true;
    }
    return false;
  }

  _findDirtAt(x, y) {
    for (let i = this.dirtObjects.length - 1; i >= 0; i--) {
      const dirt = this.dirtObjects[i];
      if (dirt.state !== 'clean' && x >= dirt.x && x <= dirt.x + dirt.width && y >= dirt.y && y <= dirt.y + dirt.height) {
        return dirt;
      }
    }
    return null;
  }

  _cleanDirt(dirt) {
    dirt.cleanProgress += 0.3;
    if (dirt.cleanProgress >= 1) {
      dirt.state = 'clean';
      // 检查是否全部清洁完成
      if (this.dirtObjects.every(d => d.state === 'clean')) {
        setTimeout(() => {
          globalEvent.emit('game:levelComplete', { levelId: this.levelId, stars: 3 });
        }, 500);
      }
    }
  }
}

export default GameplayScene;
