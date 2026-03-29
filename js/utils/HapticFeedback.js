/**
 * HapticFeedback 振动反馈工具
 * 提供点击、成功、失败等场景的振动反馈
 * 仅 iOS 和 Android 平台有效
 */

class HapticFeedback {
  constructor() {
    this.platform = '';
    this.supported = false;
    this._init();
  }

  /**
   * 初始化，获取平台信息
   */
  _init() {
    try {
      if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
        const systemInfo = wx.getSystemInfoSync();
        this.platform = systemInfo.platform || '';
        // 支持 iOS 和 Android
        this.supported = this.platform === 'ios' || this.platform === 'android';
        console.log(`[HapticFeedback] 平台: ${this.platform}, 支持振动: ${this.supported}`);
      }
    } catch (e) {
      console.log('[HapticFeedback] 获取平台信息失败:', e);
      this.supported = false;
    }
  }

  /**
   * 轻触反馈（点击按钮、选择等）
   */
  light() {
    if (!this.supported) return;
    
    try {
      if (wx.vibrateShort) {
        wx.vibrateShort({
          type: 'light'
        });
      }
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 中等强度反馈（确认操作、切换等）
   */
  medium() {
    if (!this.supported) return;
    
    try {
      if (wx.vibrateShort) {
        wx.vibrateShort({
          type: 'medium'
        });
      }
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 重度反馈（重要操作、警告等）
   */
  heavy() {
    if (!this.supported) return;
    
    try {
      if (wx.vibrateShort) {
        wx.vibrateShort({
          type: 'heavy'
        });
      }
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 成功反馈（完成关卡、获得奖励等）
   */
  success() {
    if (!this.supported) return;
    
    try {
      // 先重后轻的双击感
      if (wx.vibrateLong) {
        wx.vibrateLong();
      }
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 失败/错误反馈
   */
  error() {
    if (!this.supported) return;
    
    try {
      // 连续轻震表示错误
      if (wx.vibrateShort) {
        wx.vibrateShort({ type: 'light' });
        setTimeout(() => {
          wx.vibrateShort({ type: 'light' });
        }, 50);
      }
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 选择/切换反馈（切换工具、选择关卡等）
   */
  selection() {
    if (!this.supported) return;
    
    try {
      if (wx.vibrateShort) {
        wx.vibrateShort({
          type: 'light'
        });
      }
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 判断当前是否支持振动
   */
  isSupported() {
    return this.supported;
  }

  /**
   * 获取当前平台
   */
  getPlatform() {
    return this.platform;
  }
}

// 创建单例
const haptic = new HapticFeedback();

export default haptic;
export { HapticFeedback };
