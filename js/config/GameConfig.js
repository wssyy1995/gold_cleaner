/**
 * GameConfig 游戏常量与系统配置
 */

export const GAME_INFO = {
  name: '金牌保洁升职记',
  version: '1.0.0',
  company: '金牌保洁工作室',
  copyright: '© 2024 金牌保洁工作室 版权所有'
};

// 游戏常量
export const GAME_CONSTANTS = {
  // 时间相关
  DEFAULT_LEVEL_TIME: 60, // 默认关卡时间（秒）
  MIN_LEVEL_TIME: 30,
  MAX_LEVEL_TIME: 300,
  
  // 评分标准
  STAR_RATINGS: {
    3: { threshold: 0.9, timeBonus: 50 }, // 90%清洁度+时间奖励
    2: { threshold: 0.7, timeBonus: 0 },  // 70%清洁度
    1: { threshold: 0.5, timeBonus: 0 }   // 50%清洁度
  },
  
  // 经济系统
  BASE_COINS_PER_LEVEL: 50,
  COINS_PER_STAR: 30,
  PERFECT_BONUS: 100,
  
  // 分享奖励
  SHARE_REWARD: 50,
  MAX_SHARES_PER_DAY: 3,
  
  // 工具槽
  MAX_TOOL_SLOTS: 8,
  DEFAULT_TOOL_SLOTS: 4,
  
  // 动画
  ANIMATION_DURATION: 300,
  CLEAN_EFFECT_DURATION: 1000,
  
  // 物理
  DRAG_THRESHOLD: 10, // 拖动判定阈值
  DOUBLE_CLICK_TIME: 300, // 双击时间间隔
  
  // 保存
  AUTO_SAVE_INTERVAL: 30000 // 自动保存间隔（30秒）
};

// 本地存储键名
export const STORAGE_KEYS = {
  PLAYER_DATA: 'playerData',
  GAME_SETTINGS: 'gameSettings',
  TOOL_SLOTS: 'toolSlots',
  TOOL_INVENTORY: 'toolInventory',
  OWNED_PRODUCTS: 'ownedProducts',
  OWNED_SKILLS: 'ownedSkills',
  COMPLETED_LEVELS: 'completedLevels',
  CURRENT_STAGE: 'currentStage',
  COINS: 'coins',
  SHARE_COUNT: 'shareCount',
  SHARE_DATE: 'shareDate',
  FIRST_PLAY: 'firstPlay',
  TUTORIAL_COMPLETED: 'tutorialCompleted'
};

// 玩家数据结构
export const DEFAULT_PLAYER_DATA = {
  coins: 0,
  currentStage: 1,
  completedLevels: {}, // { '1-1': { stars: 3, score: 100 }, ... }
  ownedTools: ['cloth', 'sponge'],
  ownedSkills: [],
  toolSlots: ['cloth', 'sponge', null, null, null, null, null, null],
  stats: {
    totalLevelsPlayed: 0,
    totalLevelsCompleted: 0,
    totalStars: 0,
    totalCoinsEarned: 0
  }
};

// 默认游戏设置
export const DEFAULT_SETTINGS = {
  musicVolume: 0.8,
  soundVolume: 1.0,
  vibration: true,
  notification: true,
  highQuality: true
};

// 音频资源清单
export const AUDIO_ASSETS = {
  bgm: {
    menu: 'audio/bgm_menu.mp3',
    gameplay: 'audio/bgm_gameplay.mp3',
    boss: 'audio/bgm_boss.mp3'
  },
  sfx: {
    click: 'audio/sfx_click.mp3',
    clean: 'audio/sfx_clean.mp3',
    complete: 'audio/sfx_complete.mp3',
    error: 'audio/sfx_error.mp3',
    success: 'audio/sfx_success.mp3',
    coin: 'audio/sfx_coin.mp3',
    star: 'audio/sfx_star.mp3',
    unlock: 'audio/sfx_unlock.mp3'
  }
};

// UI资源清单
export const UI_ASSETS = {
  backgrounds: {
    loading: 'images/backgrounds/bg-001-loading.png',
    home: 'images/backgrounds/bg-002-home.png',
    shop: 'images/backgrounds/bg-003-shop.png'
  },
  icons: {
    locked: 'images/ui/icon/ui-icon-locked.png',
    unlocked: 'images/ui/icon/ui-icon-unlocked.png',
    pass: 'images/ui/icon/ui-icon-pass.png',
    coin: 'images/ui/coin.png',
    star: 'images/ui/star.png'
  }
};

// 颜色配置
export const COLORS = {
  primary: '#4A90D9',
  success: '#4CAF50',
  warning: '#FF9500',
  danger: '#EF5350',
  info: '#2196F3',
  
  text: {
    primary: '#333333',
    secondary: '#666666',
    tertiary: '#999999',
    inverse: '#FFFFFF'
  },
  
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#E8E8E8'
  },
  
  stage: {
    1: '#4CAF50', // 绿
    2: '#2196F3', // 蓝
    3: '#FF9800', // 橙
    4: '#9C27B0'  // 紫
  }
};

// 微信分享配置
export const SHARE_CONFIG = {
  title: '金牌保洁升职记 - 来挑战清洁大师吧！',
  imageUrl: 'images/share.png',
  query: '',
  templates: [
    '我在金牌保洁升职记中完成了关卡{level}，获得了{stars}星！',
    '清洁小能手就是我！刚在金牌保洁升职记中获得了{stars}星评价！',
    '这关太难了吧！有人能帮我通关金牌保洁升职记关卡{level}吗？',
    '我又解锁了新工具！金牌保洁升职记真的会上瘾！'
  ]
};

// 调试配置
export const DEBUG = {
  enabled: false,
  showFPS: false,
  showHitBoxes: false,
  unlimitedCoins: false,
  skipTutorial: false
};

export default {
  GAME_INFO,
  GAME_CONSTANTS,
  STORAGE_KEYS,
  DEFAULT_PLAYER_DATA,
  DEFAULT_SETTINGS,
  AUDIO_ASSETS,
  UI_ASSETS,
  COLORS,
  SHARE_CONFIG,
  DEBUG
};
