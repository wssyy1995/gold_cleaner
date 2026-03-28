/**
 * 游戏主入口文件
 * 负责应用启动、初始化全局变量
 */

import GameManager from './js/managers/GameManager';
import DataManager from './js/managers/DataManager';

// 全局游戏实例
let gameInstance = null;

/**
 * 获取游戏全局实例
 * @returns {GameManager}
 */
export function getGame() {
  return gameInstance;
}

/**
 * 游戏应用主类
 */
class GameApp {
  constructor() {
    // 初始化全局状态
    this.globalData = {
      // 用户数据
      userInfo: null,
      // 系统信息
      systemInfo: null,
      // 游戏配置
      config: null,
      // 游戏版本
      version: '1.0.0',
      // 是否首次启动
      isFirstLaunch: false
    };

    // 初始化游戏管理器
    this.gameManager = null;
    // 数据管理器
    this.dataManager = null;

    // 绑定生命周期
    this._bindLifecycle();
  }

  /**
   * 绑定微信生命周期
   */
  _bindLifecycle() {
    if (typeof wx !== 'undefined') {
      // 小游戏使用 wx.onShow / wx.onHide
      wx.onShow((options) => this.onShow(options));
      wx.onHide(() => this.onHide());
    }
  }

  /**
   * 启动游戏
   */
  launch(options = {}) {
    console.log('[GameApp] launch', options);
    
    // 设置启动背景色，避免初始化黑屏
    this._setLaunchBackground();

    // 获取系统信息
    this.getSystemInfo();

    // 检查是否首次启动
    this.checkFirstLaunch();

    // 初始化数据管理器
    this.dataManager = new DataManager();
    this.dataManager.init();

    // 初始化游戏管理器
    this.gameManager = new GameManager();
    gameInstance = this.gameManager;

    // 初始化游戏
    this.gameManager.init();

    // 记录启动场景
    if (options && options.scene) {
      console.log('[GameApp] 启动场景:', options.scene);
    }
  }

  /**
   * 应用显示时调用
   */
  onShow(options) {
    console.log('[GameApp] onShow', options);

    // 恢复游戏运行
    if (this.gameManager) {
      this.gameManager.resume();
    }

    // 恢复音频播放
    this.resumeAudio();
  }

  /**
   * 应用隐藏时调用
   */
  onHide() {
    console.log('[GameApp] onHide');

    // 暂停游戏
    if (this.gameManager) {
      this.gameManager.pause();
    }

    // 暂停音频播放
    this.pauseAudio();

    // 保存游戏数据
    if (this.dataManager) {
      this.dataManager.save();
    }
  }

  /**
   * 设置启动背景色，避免初始化黑屏
   */
  _setLaunchBackground() {
    if (typeof wx !== 'undefined') {
      try {
        // 设置窗口背景色为浅灰色（与游戏加载页背景一致）
        wx.setBackgroundColor({
          backgroundColor: '#F5F5F5',
          backgroundColorBottom: '#F5F5F5'
        });
        console.log('[GameApp] 设置启动背景色');
      } catch (e) {
        console.warn('[GameApp] 设置背景色失败:', e);
      }
    }
  }

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    if (typeof wx !== 'undefined') {
      this.globalData.systemInfo = wx.getSystemInfoSync();
      console.log('[GameApp] 系统信息:', this.globalData.systemInfo);
    }
  }

  /**
   * 检查是否首次启动
   */
  checkFirstLaunch() {
    if (typeof wx !== 'undefined') {
      const hasLaunched = wx.getStorageSync('hasLaunched');
      this.globalData.isFirstLaunch = !hasLaunched;
      if (!hasLaunched) {
        wx.setStorageSync('hasLaunched', true);
      }
    }
  }

  /**
   * 暂停音频
   */
  pauseAudio() {
    if (typeof wx !== 'undefined' && wx.getBackgroundAudioManager) {
      const bgm = wx.getBackgroundAudioManager();
      if (bgm && bgm.pause) {
        bgm.pause();
      }
    }
  }

  /**
   * 恢复音频
   */
  resumeAudio() {
    if (typeof wx !== 'undefined' && wx.getBackgroundAudioManager) {
      const bgm = wx.getBackgroundAudioManager();
      if (bgm && bgm.play) {
        bgm.play();
      }
    }
  }
}

// 创建应用实例并导出
const app = new GameApp();
export default app;

// 在小游戏环境中自动启动
if (typeof wx !== 'undefined') {
  // 延迟启动，等待微信环境准备就绪
  setTimeout(() => {
    app.launch();
  }, 0);
}
