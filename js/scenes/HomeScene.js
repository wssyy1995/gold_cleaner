/**
 * HomeScene 首页场景
 * 负责任务 5.4.1 ~ 5.4.12
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import Image from '../ui/components/Image';
import LevelPreviewDialog from '../ui/dialogs/LevelPreviewDialog';
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
    
    // 关卡图标图片
    this.iconImages = {
      locked: null,
      unlocked: null,
      pass: null
    };
    this.iconsLoaded = false;
  }

  onLoad() {
    this.generateLevels();
    this._loadIcons();  // 加载关卡图标
    this._loadBackground();
    this._initUI();
  }

  /**
   * 加载关卡图标图片
   */
  _loadIcons() {
    const iconNames = ['locked', 'unlocked', 'pass'];
    let loadedCount = 0;
    
    iconNames.forEach(name => {
      const img = wx.createImage();
      img.onload = () => {
        this.iconImages[name] = img;
        loadedCount++;
        if (loadedCount === 3) {
          this.iconsLoaded = true;
          console.log('[HomeScene] 关卡图标加载完成');
        }
      };
      img.onerror = () => {
        console.warn(`[HomeScene] 图标加载失败: ${name}`);
        loadedCount++;
      };
      img.src = `images/ui/icon/ui-icon-${name}.png`;
    });
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
    // 定义10个关卡的自定义位置（基于750x1334设计稿，从下往上）
    // 图标变大，y间距增大
    const positions = [
      { x: 375, y: 1180 }, // 关卡1（最下方）
      { x: 375, y: 1060 }, // 关卡2（间距120）
      { x: 250, y: 940 },  // 关卡3（向左偏移，间距120）
      { x: 500, y: 940 },  // 关卡4（向右偏移）
      { x: 375, y: 820 },  // 关卡5（间距120）
      { x: 180, y: 720 },  // 关卡6（向左偏移，间距100）
      { x: 570, y: 720 },  // 关卡7（向右偏移）
      { x: 375, y: 620 },  // 关卡8（间距100）
      { x: 250, y: 520 },  // 关卡9（向左偏移，间距100）
      { x: 500, y: 520 },  // 关卡10（最上方，向右偏移）
    ];
    
    for (let i = 1; i <= 10; i++) {
      this.levels.push({ 
        id: i, 
        stage: this.currentStage, 
        name: `关卡 ${i}`, 
        status: i === 1 ? 'unlocked' : 'locked',  // locked, unlocked, pass
        stars: 0,
        x: positions[i-1].x,
        y: positions[i-1].y
      });
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

    // 关卡图标尺寸（变大）
    this.iconSize = 80 * s;
    this.iconHitArea = 100 * s; // 点击检测范围

    // 底部功能栏按钮
    const btnW = 120 * s, btnH = 80 * s;
    const btnY = this.screenHeight - 150 * s;
    this.shopBtn = new Button({ x: 50 * s, y: btnY, width: btnW, height: btnH, text: '商店', fontSize: 24 * s, bgColor: '#FF9500', borderRadius: 8 * s, onClick: () => globalEvent.emit('scene:switch', 'ShopScene') });
    this.toolBtn = new Button({ x: 200 * s, y: btnY, width: btnW, height: btnH, text: '工具包', fontSize: 24 * s, bgColor: '#4CAF50', borderRadius: 8 * s, onClick: () => globalEvent.emit('scene:switch', 'ToolScene') });
    this.settingBtn = new Button({ x: 350 * s, y: btnY, width: btnW, height: btnH, text: '设置', fontSize: 24 * s, bgColor: '#9C27B0', borderRadius: 8 * s, onClick: () => globalEvent.emit('scene:switch', 'SettingScene') });
  }

  _onLevelClick(level) {
    if (level.status === 'locked') {
      console.log(`[HomeScene] 关卡${level.id}未解锁`);
      return;
    }
    console.log(`[HomeScene] 选择关卡: ${level.id}`);
    
    // 显示关卡预览弹窗
    const previewDialog = new LevelPreviewDialog({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      stage: this.currentStage,
      levelId: level.id,
      levelName: level.name,
      stars: level.stars,
      onStart: () => {
        // 点击开始按钮后进入游戏
        globalEvent.emit('scene:switch', 'GameplayScene', { 
          levelId: level.id,
          stage: this.currentStage 
        });
      }
    });
    
    // 注册并显示弹窗
    globalEvent.emit('dialog:show', 'LevelPreviewDialog', previewDialog);
  }
  
  /**
   * 通关后更新关卡状态（由 SettlementDialog 调用）
   * @param {number} levelId - 通关的关卡ID
   * @param {number} stars - 获得的星级
   */
  passLevel(levelId, stars) {
    const level = this.levels.find(l => l.id === levelId);
    if (!level) return;
    
    // 更新当前关卡状态
    level.status = 'pass';
    level.stars = stars;
    
    // 解锁下一关
    const nextLevel = this.levels.find(l => l.id === levelId + 1);
    if (nextLevel && nextLevel.status === 'locked') {
      nextLevel.status = 'unlocked';
      console.log(`[HomeScene] 解锁关卡${nextLevel.id}`);
    }
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

    // 绘制关卡图标
    this._drawLevelIcons(ctx);

    // 底部按钮
    if (this.shopBtn) this.shopBtn.onRender(ctx);
    if (this.toolBtn) this.toolBtn.onRender(ctx);
    if (this.settingBtn) this.settingBtn.onRender(ctx);
  }

  /**
   * 绘制关卡图标
   */
  _drawLevelIcons(ctx) {
    if (!this.iconsLoaded || !this.levels.length) return;
    
    const s = this.screenWidth / 750;
    const iconSize = this.iconSize;
    
    this.levels.forEach(level => {
      // 根据状态选择图标
      let iconImg = this.iconImages[level.status] || this.iconImages.locked;
      if (!iconImg) return;
      
      // 计算屏幕位置
      const x = level.x * s;
      const y = level.y * s;
      
      // 绘制图标（居中）
      ctx.drawImage(iconImg, x - iconSize/2, y - iconSize/2, iconSize, iconSize);
      
      // 绘制关卡编号（字体随图标变大）
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${18 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(level.id.toString(), x, y + iconSize/2 + 16 * s);
    });
  }

  /**
   * 检测点击了哪个关卡
   */
  _getClickedLevel(x, y) {
    const s = this.screenWidth / 750;
    const hitArea = this.iconHitArea;
    
    for (const level of this.levels) {
      const lx = level.x * s;
      const ly = level.y * s;
      
      // 检测点击范围
      if (x >= lx - hitArea/2 && x <= lx + hitArea/2 &&
          y >= ly - hitArea/2 && y <= ly + hitArea/2) {
        return level;
      }
    }
    return null;
  }

  onTouchStart(x, y) {
    this._pressedLevel = this._getClickedLevel(x, y);
    return this._pressedLevel !== null;
  }

  onTouchEnd(x, y) {
    const level = this._getClickedLevel(x, y);
    
    // 只有在同一个关卡上按下和松开才算点击
    if (level && this._pressedLevel && level.id === this._pressedLevel.id) {
      this._onLevelClick(level);
    }
    
    this._pressedLevel = null;
    
    // 检测底部按钮
    if (this.shopBtn && this.shopBtn.onTouchEnd(x, y)) return true;
    if (this.toolBtn && this.toolBtn.onTouchEnd(x, y)) return true;
    if (this.settingBtn && this.settingBtn.onTouchEnd(x, y)) return true;
    
    return level !== null;
  }
}

export default HomeScene;
