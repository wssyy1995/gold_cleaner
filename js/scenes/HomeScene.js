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
    
    // 关卡预览图缓存
    this._previewImages = {};
  }

  onLoad() {
    this.generateLevels();
    this._loadIcons();  // 加载关卡图标
    this._loadBackground();
    this._initUI();
    
    // 预加载当前关卡的预览图
    this._preloadCurrentLevelPreview();
  }

  /**
   * 预加载当前关卡的预览图
   */
  _preloadCurrentLevelPreview() {
    // 延迟一点执行，确保 levels 已生成
    setTimeout(() => {
      const currentLevel = this._getCurrentLevel();
      if (currentLevel) {
        this._loadPreviewImage(this.currentStage, currentLevel.id);
      }
    }, 100);
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
    console.log(`[HomeScene] 创建 LevelPreviewDialog: stage=${this.currentStage}, level=${level.id}`);
    let previewDialog;
    try {
      previewDialog = new LevelPreviewDialog({
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
      console.log(`[HomeScene] LevelPreviewDialog 创建成功:`, previewDialog);
    } catch (err) {
      console.error(`[HomeScene] LevelPreviewDialog 创建失败:`, err);
      return;
    }
    
    // 注册并显示弹窗
    globalEvent.emit('dialog:open', 'LevelPreviewDialog', previewDialog);
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
      
      // 预加载下一关的预览图
      this._loadPreviewImage(this.currentStage, nextLevel.id);
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
   * 获取当前关卡（第一个未解锁或已解锁未通关的关卡）
   */
  _getCurrentLevel() {
    // 优先找已解锁但未通关的关卡
    const unlockedLevel = this.levels.find(l => l.status === 'unlocked');
    if (unlockedLevel) return unlockedLevel;
    
    // 如果没有，找第一个锁定的关卡
    const lockedLevel = this.levels.find(l => l.status === 'locked');
    if (lockedLevel) return lockedLevel;
    
    // 如果都通关了，返回最后一个关卡
    return this.levels[this.levels.length - 1];
  }

  /**
   * 绘制关卡图标
   */
  _drawLevelIcons(ctx) {
    if (!this.iconsLoaded || !this.levels.length) return;
    
    const s = this.screenWidth / 750;
    const iconSize = this.iconSize;
    
    // 获取当前关卡，在其旁边绘制预览卡片
    const currentLevel = this._getCurrentLevel();
    
    this.levels.forEach(level => {
      // 根据状态选择图标
      let iconImg = this.iconImages[level.status] || this.iconImages.locked;
      if (!iconImg) return; // 跳过当前关卡
      
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
      
      // 如果是当前关卡，在旁边绘制预览卡片
      if (currentLevel && level.id === currentLevel.id) {
        this._drawLevelPreviewCard(ctx, level, s);
      }
    });
  }

  /**
   * 绘制关卡预览卡片
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Object} level 关卡数据
   * @param {number} s 缩放比例
   */
  _drawLevelPreviewCard(ctx, level, s) {
    const cardWidth = 140 * s * 2;  // 宽度放大2倍（280*s）
    const cardHeight = 180 * s * 1.8; // 高度放大1.8倍（324*s）
    
    // 卡片位置：在关卡图标右侧
    const iconX = level.x * s;
    const iconY = level.y * s;
    const cardX = iconX + 50 * s; // 图标右侧偏移
    const cardY = iconY - cardHeight / 2; // 垂直居中
    
    // 卡片尺寸参数
    const sphereRadius = cardWidth * 0.18;
    const cardBorderRadius = cardWidth * 0.08;
    const cardBorderWidth = Math.max(2, cardWidth * 0.02);
    
    // 球体中心坐标（在卡片顶部上方）
    const sphereCenterX = cardX + cardWidth / 2;
    const sphereCenterY = cardY + sphereRadius;
    
    // 卡片主体区域
    const cardBodyX = cardX;
    const cardBodyY = cardY + sphereRadius;
    const cardBodyW = cardWidth;
    const cardBodyH = cardHeight - sphereRadius;
    
    // 内容区域内边距
    const contentPadding = cardBodyW * 0.08;
    
    // 预览图片框
    const previewImgX = cardBodyX + contentPadding;
    const previewImgY = cardBodyY + contentPadding;
    const previewImgW = cardBodyW - 2 * contentPadding;
    const levelNameHeight = cardBodyH * 0.18;
    const previewImgH = cardBodyH - 2 * contentPadding - levelNameHeight;
    
    // 关卡名位置
    const nameTextX = cardX + cardWidth / 2;
    const nameTextY = previewImgY + previewImgH + levelNameHeight / 2;
    
    // --- 1. 绘制卡片主体背景 ---
    ctx.save();
    this._drawRoundedRect(ctx, cardBodyX, cardBodyY, cardBodyW, cardBodyH, cardBorderRadius);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
    
    // --- 2. 绘制卡片边框 ---
    ctx.save();
    this._drawRoundedRect(ctx, cardBodyX, cardBodyY, cardBodyW, cardBodyH, cardBorderRadius);
    ctx.strokeStyle = '#FFD700'; // 金色边框
    ctx.lineWidth = cardBorderWidth;
    ctx.stroke();
    ctx.restore();
    
    // --- 3. 绘制预览图片 ---
    const previewImgKey = `preview_${this.currentStage}_${level.id}`;
    let previewImg = this._previewImages && this._previewImages[previewImgKey];
    
    if (previewImg && previewImg.loaded && previewImg.img) {
      const img = previewImg.img;
      const imgRatio = img.width / img.height;
      const frameRatio = previewImgW / previewImgH;
      
      let drawW, drawH, drawX, drawY;
      if (imgRatio > frameRatio) {
        drawH = previewImgH;
        drawW = previewImgH * imgRatio;
        drawX = previewImgX + (previewImgW - drawW) / 2;
        drawY = previewImgY;
      } else {
        drawW = previewImgW;
        drawH = previewImgW / imgRatio;
        drawX = previewImgX;
        drawY = previewImgY + (previewImgH - drawH) / 2;
      }
      
      ctx.save();
      this._drawRoundedRect(ctx, previewImgX, previewImgY, previewImgW, previewImgH, cardBorderRadius * 0.5);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // 图片未加载，显示占位符
      ctx.save();
      ctx.fillStyle = '#E8E8E8';
      this._drawRoundedRect(ctx, previewImgX, previewImgY, previewImgW, previewImgH, cardBorderRadius * 0.5);
      ctx.fill();
      
      // 加载中文字
      ctx.fillStyle = '#999999';
      ctx.font = `${12 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('预览图', previewImgX + previewImgW / 2, previewImgY + previewImgH / 2);
      ctx.restore();
      
      // 异步加载图片
      this._loadPreviewImage(this.currentStage, level.id);
    }
    
    // --- 4. 绘制关卡名称 ---
    ctx.save();
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${Math.max(12, cardWidth * 0.08)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(level.name, nameTextX, nameTextY);
    ctx.restore();
    
    // --- 5. 绘制关卡数字球体 ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(sphereCenterX, sphereCenterY, sphereRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFA500'; // 橙色
    ctx.fill();
    ctx.strokeStyle = '#FFD700'; // 金色边框
    ctx.lineWidth = cardBorderWidth * 1.5;
    ctx.stroke();
    ctx.restore();
    
    // --- 6. 绘制关卡数字 ---
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${sphereRadius * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(level.id.toString(), sphereCenterX, sphereCenterY);
    ctx.restore();
  }

  /**
   * 加载预览图片
   */
  _loadPreviewImage(stage, levelId) {
    if (!this._previewImages) this._previewImages = {};
    
    const key = `preview_${stage}_${levelId}`;
    if (this._previewImages[key]) return; // 已在加载中
    
    this._previewImages[key] = { loaded: false, img: null };
    
    if (typeof wx !== 'undefined') {
      const img = wx.createImage();
      img.onload = () => {
        if (this._previewImages[key]) {
          this._previewImages[key].loaded = true;
          this._previewImages[key].img = img;
        }
      };
      img.onerror = () => {
        console.warn(`[HomeScene] 预览图加载失败: ${key}`);
      };
      img.src = `images/game/game_stage${stage}_l${levelId}_home.png`;
    }
  }

  /**
   * 绘制圆角矩形路径（兼容小程序）
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x 
   * @param {number} y 
   * @param {number} width 
   * @param {number} height 
   * @param {number} radius 
   */
  _drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
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
