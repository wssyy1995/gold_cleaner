/**
 * SettingScene 设置页面
 * 负责任务 5.8.1 ~ 5.8.5
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import { globalEvent } from '../core/EventEmitter';
import UploadTool from '../cloud/UploadTool';
import DataManager from '../managers/DataManager';
import CoordinateRenderer from '../utils/CoordinateRenderer';
import { getGame } from '../../app';

class SettingScene extends Scene {
  constructor() {
    super({ name: 'SettingScene' });
    this.screenWidth = 750;
    this.screenHeight = 1334;
    
    // 设置项
    this.settings = {
      musicVolume: 0.8,
      soundVolume: 1.0,
      vibration: true,
      showCoordinates: false
    };
    
    // DataManager 实例
    this.dataManager = null;
    
    // 上传工具
    this.uploadTool = null;
    this.isUploading = false;
    this.uploadStatus = ''; // 上传状态提示
    this.uploadProgress = ''; // 上传进度
  }

  onLoad() {
    this._loadSettings();
    this._initUI();
  }

  _loadSettings() {
    // 从 DataManager 加载设置
    const game = getGame();
    if (game && game.dataManager) {
      this.dataManager = game.dataManager;
      const dmSettings = this.dataManager.getSettings();
      this.settings.showCoordinates = dmSettings.showCoordinates || false;
    }
    
    // 兼容旧版本地存储
    if (typeof wx !== 'undefined') {
      try {
        const saved = wx.getStorageSync('gameSettings');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.settings.musicVolume = parsed.musicVolume ?? this.settings.musicVolume;
          this.settings.soundVolume = parsed.soundVolume ?? this.settings.soundVolume;
          this.settings.vibration = parsed.vibration ?? this.settings.vibration;
        }
      } catch (e) {
        console.warn('[SettingScene] 加载旧版设置失败');
      }
    }
  }

  _saveSettings() {
    // 保存到 DataManager
    if (this.dataManager) {
      this.dataManager.updateSettings({
        showCoordinates: this.settings.showCoordinates
      });
    }
    
    // 兼容旧版本地存储
    if (typeof wx !== 'undefined') {
      try {
        wx.setStorageSync('gameSettings', JSON.stringify({
          musicVolume: this.settings.musicVolume,
          soundVolume: this.settings.soundVolume,
          vibration: this.settings.vibration
        }));
      } catch (e) {
        console.warn('[SettingScene] 保存设置失败');
      }
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
    
    // 调试区域 - 上传图片按钮
    this.uploadBtnY = 1000 * s;
    this.uploadBtn = new Button({
      x: 200 * s,
      y: this.uploadBtnY,
      width: 350 * s,
      height: 70 * s,
      text: '☁️ 上传图片到云',
      fontSize: 22 * s,
      bgColor: '#FF6B6B',
      textColor: '#FFFFFF',
      borderRadius: 35 * s,
      onClick: () => this._onUploadClick()
    });
    
    // 上传状态文本
    this.uploadStatusText = new Text({
      x: 375 * s,
      y: this.uploadBtnY + 90 * s,
      text: '',
      fontSize: 18 * s,
      color: '#666666',
      align: 'center'
    });
  }

  update(deltaTime) {
    if (this.backBtn) this.backBtn.update(deltaTime);
    if (this.uploadBtn) this.uploadBtn.update(deltaTime);
  }
  
  /**
   * 点击上传按钮
   */
  async _onUploadClick() {
    // 检查微信环境
    if (typeof wx === 'undefined') {
      this.uploadStatus = '提示: 请在微信开发者工具中使用此功能';
      this.uploadStatusText.setText(this.uploadStatus);
      console.warn('[SettingScene] 非微信环境，无法上传');
      return;
    }
    
    if (this.isUploading) {
      console.log('[SettingScene] 正在上传中...');
      return;
    }
    
    this.isUploading = true;
    this.uploadStatus = '正在初始化...';
    this.uploadStatusText.setText(this.uploadStatus);
    
    try {
      // 初始化上传工具
      if (!this.uploadTool) {
        this.uploadTool = new UploadTool();
        await this.uploadTool.init();
      }
      
      // 开始上传
      const result = await this.uploadTool.startUpload(
        // 进度回调
        (current, total, fileName) => {
          this.uploadStatus = `正在上传: ${current}/${total}`;
          this.uploadProgress = fileName.split('/').pop(); // 只显示文件名
          this.uploadStatusText.setText(`${this.uploadStatus}\n${this.uploadProgress}`);
          console.log(`[SettingScene] 上传进度: ${current}/${total} - ${fileName}`);
        },
        // 完成回调
        (uploaded, failed) => {
          this.isUploading = false;
          if (failed.length === 0) {
            this.uploadStatus = `上传完成! 共 ${uploaded.length} 个文件`;
          } else {
            this.uploadStatus = `上传完成: ${uploaded.length} 成功, ${failed.length} 失败`;
          }
          this.uploadStatusText.setText(this.uploadStatus);
          console.log('[SettingScene] 上传完成:', result);
        }
      );
      
      // 如果上传过程中出错
      if (!result.success) {
        this.isUploading = false;
        this.uploadStatus = `上传失败: ${result.error || '未知错误'}`;
        this.uploadStatusText.setText(this.uploadStatus);
      }
      
    } catch (error) {
      this.isUploading = false;
      this.uploadStatus = `上传出错: ${error.message}`;
      this.uploadStatusText.setText(this.uploadStatus);
      console.error('[SettingScene] 上传出错:', error);
    }
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
    
    // 坐标显示开关（开发者选项）
    this._renderSwitch(ctx, s, 40 * s, startY + itemHeight * 3, 670 * s, '坐标显示', this.settings.showCoordinates, (v) => {
      this.settings.showCoordinates = v;
      this._saveSettings();
      console.log('[SettingScene] 坐标显示:', v ? '开启' : '关闭');
    });
    
    // 关于游戏
    this._renderAbout(ctx, s, startY + itemHeight * 5);
    
    // 调试区域 - 上传按钮
    this._renderDebugSection(ctx, s);
    
    // 绘制坐标网格（调试用）
    if (CoordinateRenderer.isEnabled()) {
      CoordinateRenderer.render(ctx, this.screenWidth, this.screenHeight, 100);
    }
  }
  
  /**
   * 渲染调试区域
   */
  _renderDebugSection(ctx, s) {
    const y = 900 * s;
    
    // 分隔线
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40 * s, y);
    ctx.lineTo(710 * s, y);
    ctx.stroke();
    
    // 调试标签
    ctx.fillStyle = '#999999';
    ctx.font = `${16 * s}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('开发者调试', 40 * s, y + 30 * s);
    
    // 上传按钮
    if (this.uploadBtn) this.uploadBtn.onRender(ctx);
    if (this.uploadStatusText) this.uploadStatusText.onRender(ctx);
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

  _renderSlider(ctx, s, x, y, width, label, value, onChange) {
    const height = 80 * s;
    
    // 背景卡片
    ctx.fillStyle = '#FFFFFF';
    this._drawRoundedRect(ctx, x, y, width, height, 12 * s);
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
    this._drawRoundedRect(ctx, trackStartX, trackY - trackHeight/2, trackWidth, trackHeight, trackHeight/2);
    ctx.fill();
    
    // 滑块进度
    ctx.fillStyle = '#4A90D9';
    this._drawRoundedRect(ctx, trackStartX, trackY - trackHeight/2, trackWidth * value, trackHeight, trackHeight/2);
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
    this._drawRoundedRect(ctx, x, y, width, height, 12 * s);
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
    this._drawRoundedRect(ctx, switchX, switchY, switchWidth, switchHeight, switchHeight / 2);
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
    this._drawRoundedRect(ctx, x, y, width, 200 * s, 12 * s);
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
    
    // 坐标显示开关
    if (this._checkSwitchHit(x, y, s, 40 * s, 450 * s, 670 * s)) {
      this.settings.showCoordinates = !this.settings.showCoordinates;
      this._saveSettings();
      return true;
    }
    
    // 上传按钮
    if (this.uploadBtn && this.uploadBtn.onTouchStart(x, y)) return true;
    
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
    if (this.uploadBtn && this.uploadBtn.onTouchEnd(x, y)) return true;
    return false;
  }
}

export default SettingScene;
