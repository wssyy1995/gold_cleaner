/**
 * SettingScene 设置页面
 * 负责任务 5.8.1 ~ 5.8.5
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import { globalEvent } from '../core/EventEmitter';

class SettingScene extends Scene {
  constructor() {
    super({ name: 'SettingScene' });
    this.screenWidth = 750;
    this.screenHeight = 1334;
    
    // 设置项
    this.settings = {
      musicVolume: 0.8,
      soundVolume: 1.0,
      vibration: true
    };
  }

  onLoad() {
    this._loadSettings();
    this._initUI();
  }

  _loadSettings() {
    try {
      const saved = wx.getStorageSync('gameSettings');
      if (saved) {
        this.settings = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[SettingScene] 加载设置失败');
    }
  }

  _saveSettings() {
    try {
      wx.setStorageSync('gameSettings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[SettingScene] 保存设置失败');
    }
  }

  _initUI() {
    const s = this.screenWidth / 750;
    
    // 顶部栏
    this.backBtn = new Button({ 
      x: 20 * s, y: 40 * s, width: 100 * s, height: 50 * s, 
      text: '← 返回', fontSize: 24 * s, 
      bgColor: 'transparent', textColor: '#333333', 
      onClick: () => globalEvent.emit('scene:switch', 'HomeScene') 
    });
    
    this.titleText = new Text({ 
      x: 375 * s, y: 65 * s, 
      text: '设置', 
      fontSize: 32 * s, fontWeight: 'bold', 
      color: '#333333', align: 'center' 
    });
  }

  update(deltaTime) {
    if (this.backBtn) this.backBtn.update(deltaTime);
  }

  onRender(ctx) {
    const s = this.screenWidth / 750;
    
    // 背景
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 顶部栏
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.screenWidth, 120 * s);

    if (this.backBtn) this.backBtn.onRender(ctx);
    if (this.titleText) this.titleText.onRender(ctx);

    // 设置项区域
    const startY = 150 * s;
    const itemHeight = 100 * s;
    
    // 音乐音量
    this._renderSlider(ctx, s, 40 * s, startY, 670 * s, '背景音乐', this.settings.musicVolume, (v) => {
      this.settings.musicVolume = v;
      this._saveSettings();
    });
    
    // 音效音量
    this._renderSlider(ctx, s, 40 * s, startY + itemHeight, 670 * s, '音效', this.settings.soundVolume, (v) => {
      this.settings.soundVolume = v;
      this._saveSettings();
    });
    
    // 震动开关
    this._renderSwitch(ctx, s, 40 * s, startY + itemHeight * 2, 670 * s, '震动反馈', this.settings.vibration, (v) => {
      this.settings.vibration = v;
      this._saveSettings();
    });
    
    // 关于游戏
    this._renderAbout(ctx, s, startY + itemHeight * 4);
  }

  _renderSlider(ctx, s, x, y, width, label, value, onChange) {
    const height = 80 * s;
    
    // 背景卡片
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 12 * s);
    ctx.fill();
    
    // 标签
    ctx.fillStyle = '#333333';
    ctx.font = `${20 * s}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 20 * s, y + height / 2);
    
    // 滑块轨道
    const trackY = y + height / 2;
    const trackStartX = x + 150 * s;
    const trackWidth = 350 * s;
    const trackHeight = 8 * s;
    
    ctx.fillStyle = '#E0E0E0';
    ctx.beginPath();
    ctx.roundRect(trackStartX, trackY - trackHeight/2, trackWidth, trackHeight, trackHeight/2);
    ctx.fill();
    
    // 滑块进度
    ctx.fillStyle = '#4A90D9';
    ctx.beginPath();
    ctx.roundRect(trackStartX, trackY - trackHeight/2, trackWidth * value, trackHeight, trackHeight/2);
    ctx.fill();
    
    // 滑块按钮
    const thumbX = trackStartX + trackWidth * value;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 4 * s;
    ctx.beginPath();
    ctx.arc(thumbX, trackY, 14 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // 数值显示
    ctx.fillStyle = '#666666';
    ctx.font = `${18 * s}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(value * 100)}%`, x + width - 20 * s, y + height / 2);
  }

  _renderSwitch(ctx, s, x, y, width, label, value, onChange) {
    const height = 80 * s;
    
    // 背景卡片
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 12 * s);
    ctx.fill();
    
    // 标签
    ctx.fillStyle = '#333333';
    ctx.font = `${20 * s}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 20 * s, y + height / 2);
    
    // 开关
    const switchWidth = 60 * s;
    const switchHeight = 32 * s;
    const switchX = x + width - switchWidth - 30 * s;
    const switchY = y + (height - switchHeight) / 2;
    
    // 开关背景
    ctx.fillStyle = value ? '#4CAF50' : '#CCCCCC';
    ctx.beginPath();
    ctx.roundRect(switchX, switchY, switchWidth, switchHeight, switchHeight / 2);
    ctx.fill();
    
    // 开关按钮
    const thumbX = value ? switchX + switchWidth - switchHeight + 2 * s : switchX + 2 * s;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(thumbX + switchHeight/2 - 2*s, switchY + switchHeight/2, switchHeight/2 - 4*s, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderAbout(ctx, s, y) {
    const width = 670 * s;
    const x = 40 * s;
    
    // 背景
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(x, y, width, 200 * s, 12 * s);
    ctx.fill();
    
    // 标题
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${22 * s}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('关于游戏', x + 20 * s, y + 40 * s);
    
    // 游戏名称
    ctx.fillStyle = '#666666';
    ctx.font = `${18 * s}px sans-serif`;
    ctx.fillText('金牌保洁升职记', x + 20 * s, y + 80 * s);
    
    // 版本号
    ctx.fillStyle = '#999999';
    ctx.font = `${16 * s}px sans-serif`;
    ctx.fillText('版本: v1.0.0', x + 20 * s, y + 115 * s);
    
    // 版权信息
    ctx.fillStyle = '#AAAAAA';
    ctx.font = `${14 * s}px sans-serif`;
    ctx.fillText('© 2024 金牌保洁工作室 版权所有', x + 20 * s, y + 155 * s);
  }

  onTouchStart(x, y) {
    if (this.backBtn && this.backBtn.onTouchStart(x, y)) return true;
    
    const s = this.screenWidth / 750;
    
    // 检查滑块点击（简化版，点击即设置位置）
    // 音乐音量滑块
    if (this._checkSliderHit(x, y, s, 40 * s, 150 * s, 670 * s)) {
      const value = this._calculateSliderValue(x, s, 40 * s, 150 * s, 670 * s);
      this.settings.musicVolume = Math.max(0, Math.min(1, value));
      this._saveSettings();
      return true;
    }
    
    // 音效音量滑块
    if (this._checkSliderHit(x, y, s, 40 * s, 250 * s, 670 * s)) {
      const value = this._calculateSliderValue(x, s, 40 * s, 250 * s, 670 * s);
      this.settings.soundVolume = Math.max(0, Math.min(1, value));
      this._saveSettings();
      return true;
    }
    
    // 震动开关
    if (this._checkSwitchHit(x, y, s, 40 * s, 350 * s, 670 * s)) {
      this.settings.vibration = !this.settings.vibration;
      this._saveSettings();
      return true;
    }
    
    return false;
  }

  _checkSliderHit(x, y, s, itemX, itemY, itemWidth) {
    const itemHeight = 80 * s;
    return x >= itemX && x <= itemX + itemWidth && y >= itemY && y <= itemY + itemHeight;
  }

  _calculateSliderValue(x, s, itemX, itemY, itemWidth) {
    const trackStartX = itemX + 150 * s;
    const trackWidth = 350 * s;
    return (x - trackStartX) / trackWidth;
  }

  _checkSwitchHit(x, y, s, itemX, itemY, itemWidth) {
    const itemHeight = 80 * s;
    const switchWidth = 60 * s;
    const switchHeight = 32 * s;
    const switchX = itemX + itemWidth - switchWidth - 30 * s;
    const switchY = itemY + (itemHeight - switchHeight) / 2;
    
    return x >= switchX && x <= switchX + switchWidth && y >= switchY && y <= switchY + switchHeight;
  }

  onTouchEnd(x, y) {
    if (this.backBtn && this.backBtn.onTouchEnd(x, y)) return true;
    return false;
  }
}

export default SettingScene;
