/**
 * 游戏全局配置
 */

const GameConfig = {
  // 游戏版本
  version: '1.0.0',
  
  // 游戏名称
  gameName: '金牌保洁升职记',

  // 屏幕适配
  screen: {
    // 设计分辨率
    designWidth: 750,
    designHeight: 1334,
    // 适配模式: 'fixedWidth' | 'fixedHeight' | 'fixedAuto'
    adaptMode: 'fixedWidth'
  },

  // 帧率设置
  fps: {
    // 目标帧率
    target: 60,
    // 是否锁定帧率
    lock: false
  },

  // 音频设置
  audio: {
    // 背景音乐音量
    bgmVolume: 0.5,
    // 音效音量
    sfxVolume: 0.8,
    // 最大同时播放音效数
    maxSfxChannels: 8
  },

  // 游戏数据
  game: {
    // 初始金币
    initialCoins: 100,
    // 关卡时间限制（秒）
    levelTimeLimit: 120,
    // 最大工具槽数量
    maxToolSlots: 8,
    // 每日分享奖励次数
    dailyShareLimit: 3,
    // 分享奖励金币
    shareRewardCoins: 50
  },

  // 物理设置
  physics: {
    // 是否开启物理
    enabled: false,
    // 重力
    gravity: 980
  },

  // 调试设置
  debug: {
    // 是否开启调试模式
    enabled: false,
    // 显示FPS
    showFps: false,
    // 显示碰撞框
    showCollider: false,
    // 显示日志
    showLog: false
  }
};

export default GameConfig;
