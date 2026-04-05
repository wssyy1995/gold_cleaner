/**
 * DataManager 数据管理器
 * 负责游戏数据的存储、读取和管理
 */

import { globalEvent } from '../core/EventEmitter';

// 存储键名常量
const STORAGE_KEYS = {
  USER_DATA: 'user_data',
  GAME_PROGRESS: 'game_progress',
  SETTINGS: 'settings',
  TOOLS: 'tools',
  ITEMS: 'items',
  LEVELS: 'levels'
};

class DataManager {
  constructor() {
    // 用户数据
    this.userData = {
      // 金币数量
      coins: 0,
      // 当前等级
      level: 1,
      // 经验值
      exp: 0,
      // 当前阶段（stage）
      currentStage: 1,
      // 解锁的关卡
      unlockedLevels: [1],
      // 完成的关卡
      completedLevels: [],
      // 最高星级记录
      levelStars: {},
      // 是否完成新手引导
      tutorialCompleted: false
    };

    // 游戏设置
    this.settings = {
      // 音乐开关
      musicEnabled: true,
      // 音效开关
      soundEnabled: true,
      // 震动开关
      vibrationEnabled: true,
      // 音量大小 (0-1)
      volume: 1.0,
      // 坐标显示
      showCoordinates: false
    };

    // 拥有的道具
    this.items = {};

    // 工具配置
    this.tools = {
      // 当前装备的工具槽
      equippedTools: [],
      // 拥有的工具
      ownedTools: ['tool_basic_cloth']
    };

    // 关卡数据
    this.levelData = {};

    // 是否已加载数据
    this._dataLoaded = false;
  }

  /**
   * 初始化数据管理器
   */
  init() {
    console.log('[DataManager] 初始化数据管理器');
    this.load();
  }

  /**
   * 从本地存储加载数据
   */
  load() {
    if (typeof wx === 'undefined') {
      console.log('[DataManager] 非微信环境，使用默认数据');
      return;
    }

    try {
      // 加载用户数据
      const userData = wx.getStorageSync(STORAGE_KEYS.USER_DATA);
      if (userData) {
        this.userData = { ...this.userData, ...userData };
      }

      // 加载设置
      const settings = wx.getStorageSync(STORAGE_KEYS.SETTINGS);
      if (settings) {
        this.settings = { ...this.settings, ...settings };
      }

      // 加载道具
      const items = wx.getStorageSync(STORAGE_KEYS.ITEMS);
      if (items) {
        this.items = items;
      }

      // 加载工具
      const tools = wx.getStorageSync(STORAGE_KEYS.TOOLS);
      if (tools) {
        this.tools = { ...this.tools, ...tools };
      }

      // 加载关卡数据
      const levelData = wx.getStorageSync(STORAGE_KEYS.LEVELS);
      if (levelData) {
        this.levelData = levelData;
      }

      this._dataLoaded = true;
      console.log('[DataManager] 数据加载完成');
      globalEvent.emit('data:loaded', this.getAllData());
    } catch (error) {
      console.error('[DataManager] 数据加载失败:', error);
    }
  }

  /**
   * 保存数据到本地存储
   */
  save() {
    if (typeof wx === 'undefined') {
      return;
    }

    try {
      wx.setStorageSync(STORAGE_KEYS.USER_DATA, this.userData);
      wx.setStorageSync(STORAGE_KEYS.SETTINGS, this.settings);
      wx.setStorageSync(STORAGE_KEYS.ITEMS, this.items);
      wx.setStorageSync(STORAGE_KEYS.TOOLS, this.tools);
      wx.setStorageSync(STORAGE_KEYS.LEVELS, this.levelData);

      console.log('[DataManager] 数据保存完成');
      globalEvent.emit('data:saved');
    } catch (error) {
      console.error('[DataManager] 数据保存失败:', error);
    }
  }

  /**
   * 获取所有数据
   * @returns {Object}
   */
  getAllData() {
    return {
      userData: this.userData,
      settings: this.settings,
      items: this.items,
      tools: this.tools,
      levelData: this.levelData
    };
  }

  // ============== 用户数据操作 ==============

  /**
   * 获取金币数量
   * @returns {number}
   */
  getCoins() {
    return this.userData.coins;
  }

  /**
   * 增加金币
   * @param {number} amount - 增加数量
   */
  addCoins(amount) {
    this.userData.coins += amount;
    globalEvent.emit('data:coinsChanged', this.userData.coins, amount);
    this.save();
  }

  /**
   * 消耗金币
   * @param {number} amount - 消耗数量
   * @returns {boolean} - 是否成功
   */
  spendCoins(amount) {
    if (this.userData.coins < amount) {
      return false;
    }
    this.userData.coins -= amount;
    globalEvent.emit('data:coinsChanged', this.userData.coins, -amount);
    this.save();
    return true;
  }

  /**
   * 获取当前阶段
   * @returns {number}
   */
  getCurrentStage() {
    return this.userData.currentStage || 1;
  }

  /**
   * 设置当前阶段
   * @param {number} stage - 阶段
   */
  setCurrentStage(stage) {
    if (stage > this.userData.currentStage) {
      this.userData.currentStage = stage;
      this.save();
      globalEvent.emit('data:stageChanged', stage);
    }
  }

  /**
   * 解锁关卡
   * @param {number} levelId - 关卡ID
   */
  unlockLevel(levelId) {
    if (!this.userData.unlockedLevels.includes(levelId)) {
      this.userData.unlockedLevels.push(levelId);
      this.save();
    }
  }

  /**
   * 完成关卡
   * @param {number} levelId - 关卡ID
   * @param {number} stars - 获得的星级
   */
  completeLevel(levelId, stars) {
    if (!this.userData.completedLevels.includes(levelId)) {
      this.userData.completedLevels.push(levelId);
    }
    
    // 记录最高星级
    const currentStars = this.userData.levelStars[levelId] || 0;
    if (stars > currentStars) {
      this.userData.levelStars[levelId] = stars;
    }

    this.save();
    globalEvent.emit('data:levelCompleted', levelId, stars);
  }

  /**
   * 检查关卡是否已解锁
   * @param {number} levelId - 关卡ID
   * @returns {boolean}
   */
  isLevelUnlocked(levelId) {
    return this.userData.unlockedLevels.includes(levelId);
  }

  /**
   * 获取关卡最高星级
   * @param {number} levelId - 关卡ID
   * @returns {number}
   */
  getLevelStars(levelId) {
    return this.userData.levelStars[levelId] || 0;
  }

  // ============== 设置操作 ==============

  /**
   * 获取设置
   * @returns {Object}
   */
  getSettings() {
    return this.settings;
  }

  /**
   * 更新设置
   * @param {Object} settings - 设置对象
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.save();
    globalEvent.emit('data:settingsChanged', this.settings);
  }

  // ============== 工具操作 ==============

  /**
   * 获取工具数据
   * @returns {Object}
   */
  getTools() {
    return this.tools;
  }

  /**
   * 装备工具
   * @param {Array<string>} toolIds - 工具ID列表
   */
  equipTools(toolIds) {
    this.tools.equippedTools = toolIds;
    this.save();
    globalEvent.emit('data:toolsChanged', toolIds);
  }

  /**
   * 购买工具
   * @param {string} toolId - 工具ID
   * @param {number} price - 价格
   * @returns {boolean}
   */
  buyTool(toolId, price) {
    if (this.tools.ownedTools.includes(toolId)) {
      return false;
    }

    if (!this.spendCoins(price)) {
      return false;
    }

    this.tools.ownedTools.push(toolId);
    this.save();
    globalEvent.emit('data:toolBought', toolId);
    return true;
  }

  // ============== 道具操作 ==============

  /**
   * 获取道具数量
   * @param {string} itemId - 道具ID
   * @returns {number}
   */
  getItemCount(itemId) {
    return this.items[itemId] || 0;
  }

  /**
   * 添加道具
   * @param {string} itemId - 道具ID
   * @param {number} count - 数量
   */
  addItem(itemId, count = 1) {
    this.items[itemId] = (this.items[itemId] || 0) + count;
    this.save();
    globalEvent.emit('data:itemChanged', itemId, this.items[itemId]);
  }

  /**
   * 消耗道具
   * @param {string} itemId - 道具ID
   * @param {number} count - 数量
   * @returns {boolean}
   */
  consumeItem(itemId, count = 1) {
    if ((this.items[itemId] || 0) < count) {
      return false;
    }

    this.items[itemId] -= count;
    if (this.items[itemId] <= 0) {
      delete this.items[itemId];
    }

    this.save();
    globalEvent.emit('data:itemChanged', itemId, this.items[itemId] || 0);
    return true;
  }

  // ============== 新手引导 ==============

  /**
   * 检查是否已完成新手引导
   * @returns {boolean}
   */
  hasCompletedTutorial() {
    return this.userData.tutorialCompleted || false;
  }

  /**
   * 设置新手引导已完成
   */
  setTutorialCompleted() {
    this.userData.tutorialCompleted = true;
    this.save();
    console.log('[DataManager] 新手引导已完成');
  }
}

export default DataManager;
