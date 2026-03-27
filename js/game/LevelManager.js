/**
 * LevelManager 关卡管理器
 * 负责任务 3.1.1 ~ 3.1.6
 * - 设计关卡数据结构
 * - 实现关卡加载功能
 * - 实现关卡进度跟踪
 * - 实现关卡胜利/失败判定逻辑
 * - 实现关卡时间管理
 * - 实现关卡评分计算
 */

import { globalEvent } from '../core/EventEmitter';
import MathUtils from '../utils/MathUtils';

class LevelManager {
  constructor() {
    // 3.1.1 设计关卡数据结构
    // 当前关卡数据
    this.currentLevel = null;
    // 当前关卡ID
    this.currentLevelId = 0;
    // 当前阶段
    this.currentStage = 1;

    // 关卡配置缓存
    this._levelConfigs = new Map();
    // 关卡状态缓存
    this._levelStates = new Map();

    // 3.1.3 实现关卡进度跟踪
    // 关卡进度
    this.progress = {
      totalDirt: 0,      // 总污垢数
      cleanedDirt: 0,    // 已清洁污垢数
      totalTools: 0,     // 总工具使用次数
      correctTools: 0,   // 正确使用工具次数
      startTime: 0,      // 开始时间
      elapsedTime: 0,    // 已用时间
      combo: 0,          // 连击数
      maxCombo: 0        // 最大连击
    };

    // 3.1.5 实现关卡时间管理
    // 时间相关
    this.timeLimit = 0;      // 时间限制（秒）
    this.remainingTime = 0;  // 剩余时间（秒）
    this.isTimeUp = false;   // 是否时间到

    // 关卡状态
    this._state = 'idle'; // idle, loading, playing, paused, completed, failed

    // 评分配置
    this.starRatings = {
      3: { timePercent: 0.5, accuracy: 0.9 },  // 3星：50%时间内完成，90%正确率
      2: { timePercent: 0.8, accuracy: 0.7 },  // 2星：80%时间内完成，70%正确率
      1: { timePercent: 1.0, accuracy: 0.5 }   // 1星：完成即可
    };
  }

  /**
   * 初始化关卡管理器
   */
  init() {
    console.log('[LevelManager] 初始化关卡管理器');
  }

  /**
   * 3.1.1 设计关卡数据结构
   * 注册关卡配置
   * @param {number} levelId - 关卡ID
   * @param {Object} config - 关卡配置
   */
  registerLevel(levelId, config) {
    const levelConfig = {
      id: levelId,
      stage: config.stage || 1,
      name: config.name || `关卡 ${levelId}`,
      description: config.description || '',
      // 3.1.2 实现关卡加载功能
      // 关卡资源
      resources: {
        background: config.background || '',
        dirtConfigs: config.dirtConfigs || [],  // 污垢配置数组
        requiredTools: config.requiredTools || [] // 必需工具
      },
      // 3.1.4 实现关卡胜利/失败判定逻辑
      // 胜利条件
      winCondition: {
        type: config.winType || 'cleanAll', // cleanAll, cleanTarget, timeSurvive
        targetDirtIds: config.targetDirtIds || [], // 特定目标污垢
        minCleanPercent: config.minCleanPercent || 1.0 // 最低清洁度
      },
      // 3.1.5 实现关卡时间管理
      // 时间限制
      timeLimit: config.timeLimit || 120, // 秒
      // 3.1.6 实现关卡评分计算
      // 评分目标
      starTargets: config.starTargets || {
        3: { time: 60, mistakes: 0 },
        2: { time: 90, mistakes: 2 },
        1: { time: 120, mistakes: 5 }
      },
      // 奖励
      rewards: {
        coins: config.coinReward || 10,
        exp: config.expReward || 5,
        items: config.itemRewards || []
      },
      // 解锁条件
      unlockCondition: config.unlockCondition || {
        prevLevelCompleted: true,
        minStars: 0
      }
    };

    this._levelConfigs.set(levelId, levelConfig);
    console.log(`[LevelManager] 注册关卡: ${levelId}`);
  }

  /**
   * 批量注册关卡
   * @param {Object} levels - 关卡配置对象 { levelId: config }
   */
  registerLevels(levels) {
    for (const [levelId, config] of Object.entries(levels)) {
      this.registerLevel(parseInt(levelId), config);
    }
  }

  /**
   * 获取关卡配置
   * @param {number} levelId - 关卡ID
   * @returns {Object|undefined}
   */
  getLevelConfig(levelId) {
    return this._levelConfigs.get(levelId);
  }

  /**
   * 3.1.2 实现关卡加载功能
   * 加载关卡
   * @param {number} levelId - 关卡ID
   * @param {Object} savedState - 保存的状态（用于恢复）
   * @returns {Promise<boolean>}
   */
  async loadLevel(levelId, savedState = null) {
    const config = this._levelConfigs.get(levelId);
    if (!config) {
      console.error(`[LevelManager] 未找到关卡配置: ${levelId}`);
      return false;
    }

    console.log(`[LevelManager] 加载关卡: ${levelId}`);
    this._state = 'loading';

    // 设置当前关卡
    this.currentLevelId = levelId;
    this.currentLevel = { ...config };
    this.currentStage = config.stage;

    // 3.1.5 实现关卡时间管理
    // 初始化时间
    this.timeLimit = config.timeLimit;
    this.remainingTime = config.timeLimit;
    this.isTimeUp = false;

    // 3.1.3 实现关卡进度跟踪
    // 初始化进度
    this.resetProgress();

    // 如果有保存的状态，恢复它
    if (savedState) {
      this.restoreState(savedState);
    }

    // 计算总污垢数
    this.progress.totalDirt = config.resources.dirtConfigs.length;

    this._state = 'loaded';

    globalEvent.emit('level:loaded', levelId, this.currentLevel);

    return true;
  }

  /**
   * 开始关卡
   */
  startLevel() {
    if (!this.currentLevel) {
      console.error('[LevelManager] 没有加载的关卡');
      return false;
    }

    console.log(`[LevelManager] 开始关卡: ${this.currentLevelId}`);
    this._state = 'playing';
    this.progress.startTime = Date.now();

    globalEvent.emit('level:started', this.currentLevelId);

    return true;
  }

  /**
   * 3.1.3 实现关卡进度跟踪
   * 重置进度
   */
  resetProgress() {
    this.progress = {
      totalDirt: 0,
      cleanedDirt: 0,
      totalTools: 0,
      correctTools: 0,
      startTime: 0,
      elapsedTime: 0,
      combo: 0,
      maxCombo: 0
    };
  }

  /**
   * 更新进度
   * @param {Object} updates - 更新数据
   */
  updateProgress(updates) {
    Object.assign(this.progress, updates);

    // 更新最大连击
    if (this.progress.combo > this.progress.maxCombo) {
      this.progress.maxCombo = this.progress.combo;
    }

    globalEvent.emit('level:progress', this.progress);
  }

  /**
   * 记录清洁污垢
   */
  recordDirtCleaned() {
    this.progress.cleanedDirt++;
    this.progress.combo++;

    // 检查胜利条件
    this._checkWinCondition();

    globalEvent.emit('level:dirtCleaned', this.progress.cleanedDirt, this.progress.totalDirt);
  }

  /**
   * 记录工具使用
   * @param {boolean} isCorrect - 是否正确使用
   */
  recordToolUse(isCorrect) {
    this.progress.totalTools++;
    if (isCorrect) {
      this.progress.correctTools++;
      this.progress.combo++;
    } else {
      this.progress.combo = 0; // 打断连击
    }

    globalEvent.emit('level:toolUsed', isCorrect, this.progress);
  }

  /**
   * 获取清洁进度百分比
   * @returns {number}
   */
  getCleanProgress() {
    if (this.progress.totalDirt === 0) return 0;
    return this.progress.cleanedDirt / this.progress.totalDirt;
  }

  /**
   * 获取准确率
   * @returns {number}
   */
  getAccuracy() {
    if (this.progress.totalTools === 0) return 0;
    return this.progress.correctTools / this.progress.totalTools;
  }

  /**
   * 3.1.5 实现关卡时间管理
   * 更新关卡（每帧调用）
   * @param {number} deltaTime - 时间间隔（毫秒）
   */
  update(deltaTime) {
    if (this._state !== 'playing') return;

    // 更新时间
    this.progress.elapsedTime += deltaTime;
    this.remainingTime = Math.max(0, this.timeLimit * 1000 - this.progress.elapsedTime) / 1000;

    // 检查时间到
    if (this.remainingTime <= 0 && !this.isTimeUp) {
      this.isTimeUp = true;
      this._onTimeUp();
    }

    globalEvent.emit('level:timeUpdate', this.remainingTime);
  }

  /**
   * 时间到处理
   */
  _onTimeUp() {
    console.log('[LevelManager] 时间到');
    
    // 检查是否达到最低胜利条件
    if (this._checkWinCondition(true)) {
      this.completeLevel();
    } else {
      this.failLevel('timeUp');
    }
  }

  /**
   * 3.1.4 实现关卡胜利/失败判定逻辑
   * 检查胜利条件
   * @param {boolean} isTimeUp - 是否时间到
   * @returns {boolean}
   */
  _checkWinCondition(isTimeUp = false) {
    if (!this.currentLevel) return false;

    const condition = this.currentLevel.winCondition;
    const cleanPercent = this.getCleanProgress();

    let isWin = false;

    switch (condition.type) {
      case 'cleanAll':
        // 清洁所有污垢
        isWin = cleanPercent >= condition.minCleanPercent;
        break;
      case 'cleanTarget':
        // 清洁特定目标
        // TODO: 检查特定目标是否全部清洁
        isWin = cleanPercent >= condition.minCleanPercent;
        break;
      case 'timeSurvive':
        // 生存模式：坚持到时间结束
        isWin = isTimeUp;
        break;
      default:
        isWin = cleanPercent >= 1;
    }

    if (isWin && !isTimeUp) {
      this.completeLevel();
    }

    return isWin;
  }

  /**
   * 完成关卡
   */
  completeLevel() {
    if (this._state === 'completed') return;

    console.log(`[LevelManager] 关卡完成: ${this.currentLevelId}`);
    this._state = 'completed';

    // 3.1.6 实现关卡评分计算
    const rating = this.calculateRating();
    const rewards = this.currentLevel.rewards;

    const result = {
      levelId: this.currentLevelId,
      stars: rating.stars,
      score: rating.score,
      timeUsed: this.progress.elapsedTime / 1000,
      accuracy: this.getAccuracy(),
      maxCombo: this.progress.maxCombo,
      rewards: rewards
    };

    globalEvent.emit('level:completed', result);

    return result;
  }

  /**
   * 关卡失败
   * @param {string} reason - 失败原因
   */
  failLevel(reason = 'unknown') {
    if (this._state === 'failed') return;

    console.log(`[LevelManager] 关卡失败: ${this.currentLevelId}, 原因: ${reason}`);
    this._state = 'failed';

    const result = {
      levelId: this.currentLevelId,
      reason: reason,
      progress: this.getCleanProgress(),
      timeUsed: this.progress.elapsedTime / 1000
    };

    globalEvent.emit('level:failed', result);

    return result;
  }

  /**
   * 3.1.6 实现关卡评分计算
   * 计算评分
   * @returns {Object}
   */
  calculateRating() {
    if (!this.currentLevel) return { stars: 0, score: 0 };

    const targets = this.currentLevel.starTargets;
    const timeUsed = this.progress.elapsedTime / 1000;
    const mistakes = this.progress.totalTools - this.progress.correctTools;

    let stars = 1; // 默认1星

    // 检查3星条件
    if (timeUsed <= targets[3].time && mistakes <= targets[3].mistakes) {
      stars = 3;
    } else if (timeUsed <= targets[2].time && mistakes <= targets[2].mistakes) {
      // 检查2星条件
      stars = 2;
    }

    // 计算分数（0-10000）
    let score = 0;
    
    // 清洁度分数（6000分）
    score += this.getCleanProgress() * 6000;
    
    // 准确率分数（2000分）
    score += this.getAccuracy() * 2000;
    
    // 时间奖励分数（2000分）
    if (this.timeLimit > 0) {
      const timeBonus = Math.max(0, 1 - timeUsed / this.timeLimit) * 2000;
      score += timeBonus;
    }

    // 连击奖励
    score += this.progress.maxCombo * 100;

    return {
      stars: stars,
      score: Math.round(score)
    };
  }

  /**
   * 暂停关卡
   */
  pause() {
    if (this._state !== 'playing') return;
    this._state = 'paused';
    globalEvent.emit('level:paused');
  }

  /**
   * 恢复关卡
   */
  resume() {
    if (this._state !== 'paused') return;
    this._state = 'playing';
    globalEvent.emit('level:resumed');
  }

  /**
   * 退出关卡
   */
  exit() {
    console.log(`[LevelManager] 退出关卡: ${this.currentLevelId}`);
    this._state = 'idle';
    this.currentLevel = null;
    this.currentLevelId = 0;
    globalEvent.emit('level:exited');
  }

  /**
   * 获取当前状态
   * @returns {string}
   */
  getState() {
    return this._state;
  }

  /**
   * 是否正在游戏中
   * @returns {boolean}
   */
  isPlaying() {
    return this._state === 'playing';
  }

  /**
   * 保存当前状态
   * @returns {Object}
   */
  saveState() {
    return {
      levelId: this.currentLevelId,
      progress: { ...this.progress },
      remainingTime: this.remainingTime,
      state: this._state
    };
  }

  /**
   * 恢复状态
   * @param {Object} state - 状态对象
   */
  restoreState(state) {
    if (state.progress) {
      this.progress = { ...this.progress, ...state.progress };
    }
    if (state.remainingTime !== undefined) {
      this.remainingTime = state.remainingTime;
    }
  }

  /**
   * 检查关卡是否解锁
   * @param {number} levelId - 关卡ID
   * @param {Object} playerData - 玩家数据
   * @returns {boolean}
   */
  isLevelUnlocked(levelId, playerData) {
    // 第一关默认解锁
    if (levelId === 1) return true;

    const config = this._levelConfigs.get(levelId);
    if (!config) return false;

    const condition = config.unlockCondition;

    // 检查前置关卡
    if (condition.prevLevelCompleted) {
      const prevLevelCompleted = playerData.completedLevels?.includes(levelId - 1);
      if (!prevLevelCompleted) return false;
    }

    // 检查星级要求
    if (condition.minStars > 0) {
      const prevLevelStars = playerData.levelStars?.[levelId - 1] || 0;
      if (prevLevelStars < condition.minStars) return false;
    }

    return true;
  }

  /**
   * 获取关卡列表
   * @param {number} stage - 阶段
   * @returns {Array}
   */
  getLevelsByStage(stage) {
    const levels = [];
    for (const [id, config] of this._levelConfigs) {
      if (config.stage === stage) {
        levels.push(config);
      }
    }
    return levels.sort((a, b) => a.id - b.id);
  }

  /**
   * 销毁
   */
  destroy() {
    this.exit();
    this._levelConfigs.clear();
    this._levelStates.clear();
  }
}

export default LevelManager;
