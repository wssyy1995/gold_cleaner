/**
 * HomeScene 首页场景
 * 负责任务 5.4.1 ~ 5.4.12
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import Image from '../ui/components/Image';
import { globalEvent } from '../core/EventEmitter';

class HomeScene extends Scene {
  constructor() {
    super({ name: 'HomeScene' });
    this.screenWidth = 750;
    this.screenHeight = 1334;
    this.currentStage = 1;
    this.levels = [];
    this.uiElements = [];
    
    // 背景图
    this.bgImage = null;
    this.bgLoaded = false;
  }

  onLoad() {
    this.generateLevels();
    this._loadBackground();
    this._initUI();
  }

  /**
   * 加载背景图
   */
  _loadBackground() {
    if (typeof wx !== 'undefined') {
      const img = wx.createImage();
      img.onload = () => {
        console.log('[HomeScene] 背景图加载完成');
        this.bgImage = img;
        this.bgLoaded = true;
      };
      img.onerror = () => {
        console.warn('[HomeScene] 背景图加载失败');
      };
      img.src = 'images/backgrounds/bg-002-home.png';
    }
  }

  generateLevels() {
    for (let i = 1; i <= 12; i++) {
      this.levels.push({ id: i, stage: this.currentStage, name: `关卡 ${i}`, unlocked: i === 1, stars: 0 });
    }
  }

  _initUI() {
    // 顶部栏
    this.titleText = new Text({ x: 375, y: 60, text: '金牌保洁升职记', fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', align: 'center' });
    this.coinText = new Text({ x: 20, y: 60, text: '💰 100', fontSize: 28, color: '#FFFFFF', align: 'left' });
    
    // 阶段标题
    this.stageText = new Text({ x: 375, y: 160, text: `阶段 ${this.currentStage}`, fontSize: 32, fontWeight: 'bold', color: '#333333', align: 'center' });

    // 关卡按钮
    this.levelButtons = [];
    const startY = 250, gapY = 180;
    this.levels.forEach((level, index) => {
      const btn = new Button({
        x: 325, y: startY + index * gapY, width: 100, height: 100,
        text: level.id.toString(), fontSize: 36, fontWeight: 'bold',
        bgColor: level.unlocked ? '#4A90D9' : '#CCCCCC',
        borderRadius: 50,
        onClick: () => this._onLevelClick(level)
      });
      this.levelButtons.push(btn);
    });

    // 底部功能栏按钮
    this.shopBtn = new Button({ x: 50, y: 1200, width: 120, height: 80, text: '商店', fontSize: 24, bgColor: '#FF9500', borderRadius: 8, onClick: () => globalEvent.emit('scene:switch', 'ShopScene') });
    this.toolBtn = new Button({ x: 200, y: 1200, width: 120, height: 80, text: '工具包', fontSize: 24, bgColor: '#4CAF50', borderRadius: 8, onClick: () => globalEvent.emit('scene:switch', 'ToolScene') });
    this.settingBtn = new Button({ x: 350, y: 1200, width: 120, height: 80, text: '设置', fontSize: 24, bgColor: '#9C27B0', borderRadius: 8, onClick: () => globalEvent.emit('scene:switch', 'SettingScene') });
  }

  _onLevelClick(level) {
    if (!level.unlocked) return;
    console.log(`[HomeScene] 选择关卡: ${level.id}`);
    globalEvent.emit('scene:switch', 'GameplayScene', { levelId: level.id });
  }

  onUpdate(deltaTime) {
    if (this.levelButtons) {
      this.levelButtons.forEach(btn => btn.update(deltaTime));
    }
    if (this.shopBtn) this.shopBtn.update(deltaTime);
    if (this.toolBtn) this.toolBtn.update(deltaTime);
    if (this.settingBtn) this.settingBtn.update(deltaTime);
  }

  /**
   * 绘制背景图 - cover模式保持比例填满屏幕
   */
  _drawBackground(ctx, img, sw, sh) {
    const imgRatio = img.width / img.height;
    const screenRatio = sw / sh;
    
    let dw, dh, dx, dy;
    if (imgRatio > screenRatio) {
      // 图片更宽，以高度为基准
      dh = sh;
      dw = sh * imgRatio;
      dx = (sw - dw) / 2;
      dy = 0;
    } else {
      // 图片更高，以宽度为基准
      dw = sw;
      dh = sw / imgRatio;
      dx = 0;
      dy = (sh - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  onRender(ctx) {
    // 使用物理像素
    
    // 绘制背景图 - cover模式保持比例填满屏幕
    if (this.bgImage && this.bgLoaded) {
      this._drawBackground(ctx, this.bgImage, this.screenWidth, this.screenHeight);
    } else {
      // 备用背景色
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
      
      // 顶部栏背景
      ctx.fillStyle = '#4A90D9';
      ctx.fillRect(0, 0, this.screenWidth, 120);
    }

    // 检查UI是否已初始化
    if (!this.titleText) return;

    // 标题
    this.titleText.onRender(ctx);
    if (this.coinText) this.coinText.onRender(ctx);
    if (this.stageText) this.stageText.onRender(ctx);

    // 关卡按钮
    if (this.levelButtons) {
      this.levelButtons.forEach(btn => btn.onRender(ctx));
    }

    // 底部按钮
    if (this.shopBtn) this.shopBtn.onRender(ctx);
    if (this.toolBtn) this.toolBtn.onRender(ctx);
    if (this.settingBtn) this.settingBtn.onRender(ctx);
  }

  onTouchStart(x, y) {
    if (!this.levelButtons) return false;
    
    for (const btn of this.levelButtons) {
      if (btn.onTouchStart(x, y)) return true;
    }
    if (this.shopBtn && this.shopBtn.onTouchStart(x, y)) return true;
    if (this.toolBtn && this.toolBtn.onTouchStart(x, y)) return true;
    if (this.settingBtn && this.settingBtn.onTouchStart(x, y)) return true;
    return false;
  }

  onTouchEnd(x, y) {
    if (!this.levelButtons) return false;
    
    for (const btn of this.levelButtons) {
      if (btn.onTouchEnd(x, y)) return true;
    }
    if (this.shopBtn && this.shopBtn.onTouchEnd(x, y)) return true;
    if (this.toolBtn && this.toolBtn.onTouchEnd(x, y)) return true;
    if (this.settingBtn && this.settingBtn.onTouchEnd(x, y)) return true;
    return false;
  }
}

export default HomeScene;
