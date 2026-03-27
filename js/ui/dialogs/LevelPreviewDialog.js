/**
 * LevelPreviewDialog 关卡预览弹窗
 * 显示关卡大图和开始按钮
 */

import Dialog from './Dialog';
import Button from '../components/Button';
import Text from '../components/Text';
import { globalEvent } from '../../core/EventEmitter';

class LevelPreviewDialog extends Dialog {
  constructor(options = {}) {
    super({
      name: 'LevelPreviewDialog',
      width: 700,
      height: 1100,
      maskColor: 'rgba(0, 0, 0, 0.8)',
      showCloseButton: false,
      ...options
    });

    this.stage = options.stage || 1;
    this.levelId = options.levelId || 1;
    this.levelName = options.levelName || `关卡 ${this.levelId}`;
    this.stars = options.stars || 0;
    this.onStart = options.onStart || (() => {});
    
    // 加载关卡大图
    this.bgImage = null;
    this.bgLoaded = false;
    this._loadBackground();
    
    this._initUI();
  }

  _loadBackground() {
    const imgPath = `images/game/game_stage${this.stage}_l${this.levelId}_home.png`;
    console.log(`[LevelPreviewDialog] 加载图片: ${imgPath}`);
    
    if (typeof wx !== 'undefined') {
      const img = wx.createImage();
      img.onload = () => {
        console.log(`[LevelPreviewDialog] 关卡图加载完成`);
        this.bgImage = img;
        this.bgLoaded = true;
      };
      img.onerror = (err) => {
        console.warn(`[LevelPreviewDialog] 关卡图加载失败: ${imgPath}`, err);
      };
      img.src = imgPath;
    }
  }

  _initUI() {
    const s = this.screenWidth / 750;
    const w = this.width;
    
    // 关闭按钮（右上角）
    this.closeBtn = new Button({
      x: w - 80,
      y: 20,
      width: 60,
      height: 60,
      text: '✕',
      fontSize: 32,
      bgColor: 'rgba(0,0,0,0.5)',
      textColor: '#FFFFFF',
      borderRadius: 30,
      onClick: () => this.hide()
    });
    this.addChild(this.closeBtn);

    // 关卡标题
    this.titleText = new Text({
      x: w / 2,
      y: 60,
      text: this.levelName,
      fontSize: 36,
      fontWeight: 'bold',
      color: '#FFFFFF',
      align: 'center',
      shadow: { color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 2, offsetY: 2 }
    });
    this.addChild(this.titleText);

    // 星级显示
    this.starText = new Text({
      x: w / 2,
      y: 110,
      text: '⭐'.repeat(this.stars) + '☆'.repeat(3 - this.stars),
      fontSize: 28,
      color: '#FFD700',
      align: 'center'
    });
    if (this.stars > 0) {
      this.addChild(this.starText);
    }

    // 开始按钮（底部）
    this.startBtn = new Button({
      x: w / 2 - 150,
      y: this.height - 140,
      width: 300,
      height: 80,
      text: '开始打扫',
      fontSize: 32,
      fontWeight: 'bold',
      bgColor: '#4CAF50',
      textColor: '#FFFFFF',
      borderRadius: 16,
      shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 0, offsetY: 4 },
      onClick: () => {
        this.hide();
        this.onStart();
      }
    });
    this.addChild(this.startBtn);
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (this.closeBtn) this.closeBtn.update(deltaTime);
    if (this.startBtn) this.startBtn.update(deltaTime);
  }

  render(ctx) {
    ctx.save();
    
    // 绘制遮罩
    ctx.fillStyle = this.maskColor;
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 计算弹窗位置（居中）
    const x = (this.screenWidth - this.width) / 2;
    const y = (this.screenHeight - this.height) / 2;
    
    ctx.translate(x, y);

    // 绘制背景图（如果已加载）
    if (this.bgImage && this.bgLoaded) {
      // 绘制图片填充整个弹窗背景
      ctx.drawImage(this.bgImage, 0, 0, this.width, this.height);
      
      // 底部渐变遮罩（让按钮更清晰）
      const gradient = ctx.createLinearGradient(0, this.height - 200, 0, this.height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, this.height - 200, this.width, 200);
    } else {
      // 未加载时显示灰色背景
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, 0, this.width, this.height);
      
      // 加载提示
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('加载中...', this.width / 2, this.height / 2);
    }

    // 绘制内容
    this._renderContent(ctx);

    ctx.restore();
  }

  _renderContent(ctx) {
    // 绘制子元素（按钮、文本等）
    for (const child of this.children) {
      if (child && child.onRender) {
        child.onRender(ctx);
      }
    }
  }

  onTouchStart(x, y) {
    // 转换坐标到弹窗内部
    const dialogX = x - (this.screenWidth - this.width) / 2;
    const dialogY = y - (this.screenHeight - this.height) / 2;

    if (this.closeBtn && this.closeBtn.onTouchStart(dialogX, dialogY)) return true;
    if (this.startBtn && this.startBtn.onTouchStart(dialogX, dialogY)) return true;

    return true; // 拦截所有触摸
  }

  onTouchEnd(x, y) {
    const dialogX = x - (this.screenWidth - this.width) / 2;
    const dialogY = y - (this.screenHeight - this.height) / 2;

    if (this.closeBtn && this.closeBtn.onTouchEnd(dialogX, dialogY)) return true;
    if (this.startBtn && this.startBtn.onTouchEnd(dialogX, dialogY)) return true;

    return true;
  }
}

export default LevelPreviewDialog;
