/**
 * SettlementDialog 关卡结算弹窗
 * 负责任务 5.9.1 ~ 5.9.5
 */

import Dialog from './Dialog';
import Button from '../components/Button';
import Text from '../components/Text';
import { globalEvent } from '../../core/EventEmitter';

class SettlementDialog extends Dialog {
  constructor(options = {}) {
    super({
      name: 'SettlementDialog',
      width: 640,
      height: 800,
      maskColor: 'rgba(0, 0, 0, 0.7)',
      showCloseButton: false,
      ...options
    });

    this.levelId = options.levelId || 1;
    this.stars = options.stars || 3;
    this.coins = options.coins || 0;
    this.onNext = options.onNext || (() => {});
    this.onReplay = options.onReplay || (() => {});
    this.onHome = options.onHome || (() => {});

    this._initUI();
    this._playEnterAnimation();
  }

  _initUI() {
    const s = this.screenWidth / 750;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;

    // 弹窗背景已在父类中绘制，这里添加内容

    // 标题
    this.titleText = new Text({
      x: cx,
      y: 60,
      text: '关卡完成!',
      fontSize: 48,
      fontWeight: 'bold',
      color: '#4CAF50',
      align: 'center'
    });

    // 关卡信息
    this.levelText = new Text({
      x: cx,
      y: 130,
      text: `关卡 ${this.levelId}`,
      fontSize: 28,
      color: '#666666',
      align: 'center'
    });

    // 星星显示区域
    this.starY = 200;
    this.starSize = 60;
    this.starGap = 20;

    // 获得金币
    this.coinText = new Text({
      x: cx,
      y: 320,
      text: `获得金币: ${this.coins}`,
      fontSize: 32,
      color: '#FF9500',
      align: 'center'
    });

    // 金币图标动画
    this.coinAnimation = 0;
    this.coinScale = 1;

    // 分享提示
    this.shareText = new Text({
      x: cx,
      y: 400,
      text: '分享游戏可额外获得 50 金币!',
      fontSize: 22,
      color: '#999999',
      align: 'center'
    });

    // 按钮区域
    const btnY = 520;
    const btnGap = 20;

    // 重玩按钮
    this.replayBtn = new Button({
      x: 80,
      y: btnY,
      width: 160,
      height: 80,
      text: '↻ 重玩',
      fontSize: 24,
      bgColor: '#E0E0E0',
      textColor: '#333333',
      borderRadius: 12,
      onClick: () => {
        this.hide();
        this.onReplay();
      }
    });

    // 返回首页按钮
    this.homeBtn = new Button({
      x: 80 + 160 + btnGap,
      y: btnY,
      width: 160,
      height: 80,
      text: '⌂ 首页',
      fontSize: 24,
      bgColor: '#E0E0E0',
      textColor: '#333333',
      borderRadius: 12,
      onClick: () => {
        this.hide();
        this.onHome();
      }
    });

    // 下一关按钮
    this.nextBtn = new Button({
      x: 80,
      y: btnY + 100,
      width: 480,
      height: 90,
      text: '下一关 →',
      fontSize: 28,
      fontWeight: 'bold',
      bgColor: '#4CAF50',
      textColor: '#FFFFFF',
      borderRadius: 16,
      onClick: () => {
        this.hide();
        this.onNext();
      }
    });

    // 分享按钮
    this.shareBtn = new Button({
      x: 80,
      y: btnY + 210,
      width: 480,
      height: 70,
      text: '分享好友 +50💰',
      fontSize: 24,
      bgColor: '#4A90D9',
      textColor: '#FFFFFF',
      borderRadius: 12,
      onClick: () => this._onShare()
    });
  }

  _playEnterAnimation() {
    // 星星逐个显示的动画
    this.starAnimationTime = 0;
    this.starsRevealed = 0;
  }

  update(deltaTime) {
    super.update(deltaTime);

    // 更新按钮
    this.replayBtn.update(deltaTime);
    this.homeBtn.update(deltaTime);
    this.nextBtn.update(deltaTime);
    this.shareBtn.update(deltaTime);

    // 星星逐个显示动画
    if (this.starsRevealed < this.stars) {
      this.starAnimationTime += deltaTime;
      if (this.starAnimationTime > 300) {
        this.starsRevealed++;
        this.starAnimationTime = 0;
        // 播放星星出现音效（可选）
      }
    }

    // 金币呼吸动画
    this.coinAnimation += deltaTime * 0.003;
    this.coinScale = 1 + Math.sin(this.coinAnimation) * 0.1;
  }

  /**
   * 绘制圆角矩形（兼容小程序）
   */
  _drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    ctx.lineTo(x + radius, y + height);
    ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + radius);
    ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }

  /**
   * 绘制只有顶部圆角的矩形
   */
  _drawRoundedRectTop(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }

  render(ctx) {
    // 绘制弹窗背景
    ctx.save();
    
    // 应用动画变换
    if (this.animated) {
      ctx.globalAlpha = this._opacity;
    }

    // 绘制遮罩
    if (this.modal) {
      ctx.fillStyle = this.maskColor;
      ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    }

    // 绘制弹窗主体
    const x = this.x + (this.screenWidth - this.width) / 2;
    const y = this.y + (this.screenHeight - this.height) / 2;
    
    ctx.translate(x + this.width/2, y + this.height/2);
    if (this.animated) {
      ctx.scale(this._scale, this._scale);
    }
    ctx.translate(-this.width/2, -this.height/2);

    // 弹窗背景
    ctx.fillStyle = '#FFFFFF';
    this._drawRoundedRect(ctx, 0, 0, this.width, this.height, 24);
    ctx.fill();

    // 装饰顶部条（只有顶部圆角）
    ctx.fillStyle = '#4CAF50';
    this._drawRoundedRectTop(ctx, 0, 0, this.width, 8, 24);
    ctx.fill();

    // 绘制内容
    this._renderContent(ctx);

    ctx.restore();
  }

  _renderContent(ctx) {
    // 标题
    this.titleText.onRender(ctx);
    this.levelText.onRender(ctx);

    // 绘制星星
    this._renderStars(ctx);

    // 金币（带动画）
    ctx.save();
    const cx = this.width / 2;
    ctx.translate(cx - 100, 320);
    ctx.scale(this.coinScale, this.coinScale);
    ctx.fillStyle = '#FF9500';
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💰', 0, 0);
    ctx.restore();

    this.coinText.onRender(ctx);
    this.shareText.onRender(ctx);

    // 按钮
    this.replayBtn.onRender(ctx);
    this.homeBtn.onRender(ctx);
    this.nextBtn.onRender(ctx);
    this.shareBtn.onRender(ctx);
  }

  _renderStars(ctx) {
    const cx = this.width / 2;
    const totalWidth = this.stars * this.starSize + (this.stars - 1) * this.starGap;
    const startX = cx - totalWidth / 2 + this.starSize / 2;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (this.starSize + this.starGap);
      const y = this.starY + this.starSize / 2;

      if (i < this.starsRevealed) {
        // 已显示的星星（金色，带动画缩放）
        const scale = i === this.starsRevealed - 1 && this.starAnimationTime < 200
          ? 0.5 + (this.starAnimationTime / 200) * 0.5
          : 1;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        
        // 星星光晕
        ctx.fillStyle = 'rgba(255, 193, 7, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, this.starSize * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // 星星
        ctx.fillStyle = '#FFC107';
        this._drawStar(ctx, 0, 0, 5, this.starSize / 2, this.starSize / 4);
        ctx.restore();
      } else {
        // 未获得的星星（灰色）
        ctx.fillStyle = '#E0E0E0';
        this._drawStar(ctx, x, y, 5, this.starSize / 2, this.starSize / 4);
      }
    }
  }

  _drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  _onShare() {
    // 调用微信分享
    if (typeof wx !== 'undefined') {
      wx.shareAppMessage({
        title: `我在金牌保洁升职记中完成了关卡${this.levelId}，获得了${this.stars}星！`,
        imageUrl: 'images/share.png'
      });
    }
    
    // 添加分享奖励
    this.coins += 50;
    this.coinText.setText(`获得金币: ${this.coins}`);
    this.shareText.setText('分享成功! 已额外获得 50 金币');
    
    // 禁用分享按钮
    this.shareBtn.setEnabled(false);
    this.shareBtn.text = '已分享 ✓';
  }

  onTouchStart(x, y) {
    // 转换坐标到弹窗内部
    const dialogX = x - (this.screenWidth - this.width) / 2;
    const dialogY = y - (this.screenHeight - this.height) / 2;

    if (this.replayBtn.onTouchStart(dialogX, dialogY)) return true;
    if (this.homeBtn.onTouchStart(dialogX, dialogY)) return true;
    if (this.nextBtn.onTouchStart(dialogX, dialogY)) return true;
    if (this.shareBtn.onTouchStart(dialogX, dialogY)) return true;

    return true; // 模态弹窗拦截所有触摸
  }

  onTouchEnd(x, y) {
    const dialogX = x - (this.screenWidth - this.width) / 2;
    const dialogY = y - (this.screenHeight - this.height) / 2;

    if (this.replayBtn.onTouchEnd(dialogX, dialogY)) return true;
    if (this.homeBtn.onTouchEnd(dialogX, dialogY)) return true;
    if (this.nextBtn.onTouchEnd(dialogX, dialogY)) return true;
    if (this.shareBtn.onTouchEnd(dialogX, dialogY)) return true;

    return true;
  }
}

export default SettlementDialog;
