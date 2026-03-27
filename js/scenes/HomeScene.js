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
    const s = this.screenWidth / 750; // 缩放比例
    const cx = this.screenWidth / 2;  // 屏幕中心
    
    // 顶部栏（所有坐标和尺寸乘以 s）
    this.titleText = new Text({ x: cx, y: 60 * s, text: '金牌保洁升职记', fontSize: 36 * s, fontWeight: 'bold', color: '#FFFFFF', align: 'center' });
    this.coinText = new Text({ x: 20 * s, y: 60 * s, text: '💰 100', fontSize: 28 * s, color: '#FFFFFF', align: 'left' });
    
    // 阶段标题
    this.stageText = new Text({ x: cx, y: 160 * s, text: `阶段 ${this.currentStage}`, fontSize: 32 * s, fontWeight: 'bold', color: '#333333', align: 'center' });

    // 关卡按钮
    this.levelButtons = [];
    const startY = 250, gapY = 180;
    const btnSize = 100 * s;
    this.levels.forEach((level, index) => {
      const btn = new Button({
        x: cx - btnSize / 2, 
        y: (startY + index * gapY) * s, 
        width: btnSize, 
        height: btnSize,
        text: level.id.toString(), 
        fontSize: 36 * s, 
        fontWeight: 'bold',
        bgColor: level.unlocked ? '#4A90D9' : '#CCCCCC',
        borderRadius: btnSize / 2,
        onClick: () => this._onLevelClick(level)
      });
      this.levelButtons.push(btn);
    });

    // 底部功能栏按钮
    const btnW = 120 * s, btnH = 80 * s;
    const btnY = this.screenHeight - 150 * s;
    this.shopBtn = new Button({ x: 50 * s, y: btnY, width: btnW, height: btnH, text: '商店', fontSize: 24 * s, bgColor: '#FF9500', borderRadius: 8 * s, onClick: () => globalEvent.emit('scene:switch', 'ShopScene') });
    this.toolBtn = new Button({ x: 200 * s, y: btnY, width: btnW, height: btnH, text: '工具包', fontSize: 24 * s, bgColor: '#4CAF50', borderRadius: 8 * s, onClick: () => globalEvent.emit('scene:switch', 'ToolScene') });
    this.settingBtn = new Button({ x: 350 * s, y: btnY, width: btnW, height: btnH, text: '设置', fontSize: 24 * s, bgColor: '#9C27B0', borderRadius: 8 * s, onClick: () => globalEvent.emit('scene:switch', 'SettingScene') });
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
   * Cover 模式绘制背景图 - 保持比例，填满屏幕，裁剪溢出
   */
  _drawBackgroundCover(ctx, img, sw, sh) {
    // 计算两个方向的缩放比例
    const scaleX = sw / img.width;
    const scaleY = sh / img.height;
    
    // Cover 模式：选择较大的缩放比例，确保填满屏幕
    const scale = Math.max(scaleX, scaleY);
    
    // 计算绘制尺寸（可能超出屏幕）
    const dw = img.width * scale;
    const dh = img.height * scale;
    
    // 居中显示（超出部分自动被裁剪）
    const dx = (sw - dw) / 2;
    const dy = (sh - dh) / 2;
    
    // 绘制图片
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  onRender(ctx) {
    // 使用逻辑像素（ctx.scale(dpr) 会自动处理物理像素）
    const w = this.screenWidth;
    const h = this.screenHeight;
    
    // 绘制背景图 - Cover 模式填满屏幕（保持比例，裁剪溢出）
    if (this.bgImage && this.bgLoaded) {
      this._drawBackgroundCover(ctx, this.bgImage, w, h);
    } else {
      // 备用背景色
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, w, h);
      
      // 顶部栏背景
      ctx.fillStyle = '#4A90D9';
      ctx.fillRect(0, 0, w, 60);
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
