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
  }

  /**
   * 应用启动时调用
   */
  onLaunch(options) {
    console.log('[GameApp] onLaunch', options);

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

// 创建应用实例
const app = new GameApp();

// 微信小游戏生命周期绑定
if (typeof wx !== 'undefined') {
  App({
    onLaunch: (options) => app.onLaunch(options),
    onShow: (options) => app.onShow(options),
    onHide: () => app.onHide()
  });
}

export default app;
