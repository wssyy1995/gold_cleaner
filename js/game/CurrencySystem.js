/**
 * CurrencySystem 金币与评分系统
 * 负责任务 3.4.1 ~ 3.4.5
 * - 3.4.1 设计评分计算逻辑
 * - 3.4.2 实现星级评价系统
 * - 3.4.3 实现金币奖励计算
 * - 3.4.4 实现金币的加减操作
 * - 3.4.5 实现清洁度球UI更新与光效动画
 */

import { globalEvent } from '../core/EventEmitter';
import Tween from '../animation/Tween';
import Easing from '../animation/Easing';

class CurrencySystem {
  constructor() {
    // 金币
    this.coins = 0;
    
    // 钻石/宝石（高级货币）
    this.gems = 0;
    
    // 3.4.1 设计评分计算逻辑
    // 评分配置
    this.scoringConfig = {
      // 基础分数
      baseScore: 1000,
      // 清洁度权重
      cleanlinessWeight: 0.6,
      // 准确率权重
      accuracyWeight: 0.2,
      // 时间奖励权重
      timeWeight: 0.2,
      // 连击奖励倍数
      comboMultiplier: 0.01 // 每个连击增加1%
    };

    // 3.4.2 实现星级评价系统
    // 星级阈值
    this.starThresholds = {
      3: { minScore: 9000, minAccuracy: 0.9 },
      2: { minScore: 7000, minAccuracy: 0.7 },
      1: { minScore: 5000, minAccuracy: 0.5 }
    };

    // 3.4.3 实现金币奖励计算
    // 金币奖励配置
    this.coinRewards = {
      // 基础通关奖励
      baseClear: 10,
      // 星级奖励
      starBonus: { 1: 5, 2: 10, 3: 20 },
      // 清洁度奖励
      cleanlinessBonus: 15, // 100%清洁度奖励
      // 准确率奖励
      accuracyBonus: { 0.9: 10, 0.8: 5, 0.7: 3 },
      // 时间奖励（剩余时间每秒）
      timeBonus: 2,
      // 连击奖励（每个最大连击）
      comboBonus: 5
    };

    // 3.4.5 实现清洁度球UI更新与光效动画
    // 清洁度球状态
    this.cleanlinessBall = {
      progress: 0,        // 当前进度 0-1
      targetProgress: 0,  // 目标进度
      isAnimating: false,
      pulseEffect: false, // 脉冲效果
      glowIntensity: 0    // 发光强度
    };

    // 历史记录
    this.history = [];
    this.maxHistorySize = 50;

    // 统计
    this.stats = {
      totalEarned: 0,
      totalSpent: 0,
      levelsCompleted: 0,
      averageScore: 0
    };
  }

  /**
   * 初始化货币系统
   */
  init() {
    console.log('[CurrencySystem] 初始化货币系统');
  }

  /**
   * 3.4.4 实现金币的加减操作
   * 添加金币
   * @param {number} amount - 数量
   * @param {string} source - 来源
   * @param {Object} options - 选项
   * @returns {boolean}
   */
  addCoins(amount, source = 'unknown', options = {}) {
    if (amount <= 0) return false;

    const oldCoins = this.coins;
    this.coins += amount;

    // 更新统计
    this.stats.totalEarned += amount;

    // 记录历史
    this._addHistory({
      type: 'earn',
      currency: 'coins',
      amount,
      source,
      time: Date.now(),
      balance: this.coins
    });

    console.log(`[CurrencySystem] 获得 ${amount} 金币，来源: ${source}，当前: ${this.coins}`);

    globalEvent.emit('currency:coinsAdded', {
      amount,
      source,
      oldBalance: oldCoins,
      newBalance: this.coins
    });

    return true;
  }

  /**
   * 3.4.4 实现金币的加减操作
   * 消费金币
   * @param {number} amount - 数量
   * @param {string} reason - 原因
   * @returns {boolean}
   */
  spendCoins(amount, reason = 'unknown') {
    if (amount <= 0) return false;
    if (this.coins < amount) return false;

    const oldCoins = this.coins;
    this.coins -= amount;

    // 更新统计
    this.stats.totalSpent += amount;

    // 记录历史
    this._addHistory({
      type: 'spend',
      currency: 'coins',
      amount,
      source: reason,
      time: Date.now(),
      balance: this.coins
    });

    console.log(`[CurrencySystem] 消费 ${amount} 金币，原因: ${reason}，当前: ${this.coins}`);

    globalEvent.emit('currency:coinsSpent', {
      amount,
      reason,
      oldBalance: oldCoins,
      newBalance: this.coins
    });

    return true;
  }

  /**
   * 检查是否有足够金币
   * @param {number} amount - 数量
   * @returns {boolean}
   */
  hasEnoughCoins(amount) {
    return this.coins >= amount;
  }

  /**
   * 添加钻石
   * @param {number} amount - 数量
   * @param {string} source - 来源
   */
  addGems(amount, source = 'unknown') {
    if (amount <= 0) return false;

    this.gems += amount;

    globalEvent.emit('currency:gemsAdded', {
      amount,
      source,
      newBalance: this.gems
    });

    return true;
  }

  /**
   * 消费钻石
   * @param {number} amount - 数量
   * @param {string} reason - 原因
   */
  spendGems(amount, reason = 'unknown') {
    if (amount <= 0) return false;
    if (this.gems < amount) return false;

    this.gems -= amount;

    globalEvent.emit('currency:gemsSpent', {
      amount,
      reason,
      newBalance: this.gems
    });

    return true;
  }

  /**
   * 3.4.1 设计评分计算逻辑
   * 计算关卡评分
   * @param {Object} levelData - 关卡数据
   * @returns {Object}
   */
  calculateScore(levelData) {
    const {
      cleanProgress = 0,    // 清洁度 0-1
      accuracy = 0,         // 准确率 0-1
      timeUsed = 0,         // 用时（秒）
      timeLimit = 120,      // 时间限制（秒）
      maxCombo = 0,         // 最大连击
      mistakes = 0          // 错误次数
    } = levelData;

    // 基础分数
    let score = this.scoringConfig.baseScore;

    // 清洁度分数（60%权重）
    const cleanlinessScore = cleanProgress * this.scoringConfig.cleanlinessWeight * 10000;
    
    // 准确率分数（20%权重）
    const accuracyScore = accuracy * this.scoringConfig.accuracyWeight * 10000;
    
    // 时间分数（20%权重）
    let timeScore = 0;
    if (timeLimit > 0) {
      const timeRatio = Math.max(0, 1 - timeUsed / timeLimit);
      timeScore = timeRatio * this.scoringConfig.timeWeight * 10000;
    }

    // 连击奖励
    const comboBonus = maxCombo * this.scoringConfig.comboMultiplier * 100;

    // 错误惩罚
    const mistakePenalty = mistakes * 100;

    // 总分
    score = cleanlinessScore + accuracyScore + timeScore + comboBonus - mistakePenalty;
    score = Math.max(0, Math.min(10000, Math.round(score)));

    // 3.4.2 实现星级评价系统
    const stars = this._calculateStars(score, accuracy);

    return {
      score,
      stars,
      breakdown: {
        cleanliness: Math.round(cleanlinessScore),
        accuracy: Math.round(accuracyScore),
        time: Math.round(timeScore),
        combo: Math.round(comboBonus),
        penalty: -mistakePenalty
      }
    };
  }

  /**
   * 3.4.2 实现星级评价系统
   * 计算星级
   * @param {number} score - 分数
   * @param {number} accuracy - 准确率
   * @returns {number}
   */
  _calculateStars(score, accuracy) {
    // 检查3星条件
    if (score >= this.starThresholds[3].minScore && 
        accuracy >= this.starThresholds[3].minAccuracy) {
      return 3;
    }
    
    // 检查2星条件
    if (score >= this.starThresholds[2].minScore && 
        accuracy >= this.starThresholds[2].minAccuracy) {
      return 2;
    }
    
    // 检查1星条件
    if (score >= this.starThresholds[1].minScore && 
        accuracy >= this.starThresholds[1].minAccuracy) {
      return 1;
    }
    
    return 0;
  }

  /**
   * 3.4.3 实现金币奖励计算
   * 计算关卡金币奖励
   * @param {Object} levelData - 关卡数据
   * @param {number} stars - 星级
   * @returns {Object}
   */
  calculateCoinRewards(levelData, stars) {
    const {
      cleanProgress = 0,
      accuracy = 0,
      timeLimit = 120,
      timeUsed = 120,
      maxCombo = 0
    } = levelData;

    let totalCoins = 0;
    const breakdown = [];

    // 基础通关奖励
    totalCoins += this.coinRewards.baseClear;
    breakdown.push({ type: 'base', amount: this.coinRewards.baseClear });

    // 星级奖励
    if (stars > 0 && this.coinRewards.starBonus[stars]) {
      const starBonus = this.coinRewards.starBonus[stars];
      totalCoins += starBonus;
      breakdown.push({ type: 'stars', amount: starBonus, stars });
    }

    // 清洁度奖励
    if (cleanProgress >= 1) {
      totalCoins += this.coinRewards.cleanlinessBonus;
      breakdown.push({ type: 'cleanliness', amount: this.coinRewards.cleanlinessBonus });
    }

    // 准确率奖励
    for (const [threshold, bonus] of Object.entries(this.coinRewards.accuracyBonus)) {
      if (accuracy >= parseFloat(threshold)) {
        totalCoins += bonus;
        breakdown.push({ type: 'accuracy', amount: bonus, threshold });
        break;
      }
    }

    // 时间奖励
    if (timeLimit > timeUsed) {
      const remainingTime = timeLimit - timeUsed;
      const timeBonus = Math.floor(remainingTime * this.coinRewards.timeBonus);
      totalCoins += timeBonus;
      breakdown.push({ type: 'time', amount: timeBonus });
    }

    // 连击奖励
    if (maxCombo > 0) {
      const comboBonus = maxCombo * this.coinRewards.comboBonus;
      totalCoins += comboBonus;
      breakdown.push({ type: 'combo', amount: comboBonus });
    }

    return {
      total: totalCoins,
      breakdown
    };
  }

  /**
   * 发放关卡奖励
   * @param {Object} levelData - 关卡数据
   * @param {number} levelId - 关卡ID
   * @returns {Object}
   */
  grantLevelRewards(levelData, levelId) {
    // 计算评分
    const scoreResult = this.calculateScore(levelData);
    
    // 计算金币
    const coinResult = this.calculateCoinRewards(levelData, scoreResult.stars);

    // 发放金币
    if (coinResult.total > 0) {
      this.addCoins(coinResult.total, `level_${levelId}_complete`);
    }

    // 更新统计
    this.stats.levelsCompleted++;
    const totalScore = this.stats.averageScore * (this.stats.levelsCompleted - 1) + scoreResult.score;
    this.stats.averageScore = totalScore / this.stats.levelsCompleted;

    const result = {
      score: scoreResult,
      coins: coinResult,
      levelId
    };

    globalEvent.emit('currency:levelRewards', result);

    return result;
  }

  /**
   * 3.4.5 实现清洁度球UI更新与光效动画
   * 更新清洁度球进度
   * @param {number} progress - 进度 0-1
   * @param {boolean} animate - 是否动画
   */
  updateCleanlinessBall(progress, animate = true) {
    this.cleanlinessBall.targetProgress = MathUtils.clamp(progress, 0, 1);

    if (animate) {
      this.cleanlinessBall.isAnimating = true;
      
      // 使用Tween动画
      new Tween(this.cleanlinessBall, {
        progress: this.cleanlinessBall.targetProgress
      }, {
        duration: 500,
        easing: Easing.easeOutQuad,
        onComplete: () => {
          this.cleanlinessBall.isAnimating = false;
          // 触发脉冲效果
          if (this.cleanlinessBall.targetProgress >= 1) {
            this._triggerPulseEffect();
          }
        }
      }).start();
    } else {
      this.cleanlinessBall.progress = this.cleanlinessBall.targetProgress;
    }

    globalEvent.emit('cleanliness:updated', this.cleanlinessBall.progress);
  }

  /**
   * 触发脉冲光效
   */
  _triggerPulseEffect() {
    this.cleanlinessBall.pulseEffect = true;
    
    // 脉冲动画
    const pulse = () => {
      new Tween(this.cleanlinessBall, {
        glowIntensity: 1
      }, {
        duration: 300,
        easing: Easing.easeInOutQuad,
        onComplete: () => {
          new Tween(this.cleanlinessBall, {
            glowIntensity: 0
          }, {
            duration: 300,
            easing: Easing.easeInOutQuad,
            onComplete: () => {
              this.cleanlinessBall.pulseEffect = false;
            }
          }).start();
        }
      }).start();
    };
    
    pulse();
    globalEvent.emit('cleanliness:pulse');
  }

  /**
   * 获取清洁度球渲染数据
   * @returns {Object}
   */
  getCleanlinessBallData() {
    return {
      progress: this.cleanlinessBall.progress,
      percentage: Math.round(this.cleanlinessBall.progress * 100),
      pulse: this.cleanlinessBall.pulseEffect,
      glowIntensity: this.cleanlinessBall.glowIntensity,
      color: this._getProgressColor(this.cleanlinessBall.progress)
    };
  }

  /**
   * 根据进度获取颜色
   * @param {number} progress - 进度
   * @returns {string}
   */
  _getProgressColor(progress) {
    if (progress < 0.3) return '#FF6B6B'; // 红色
    if (progress < 0.6) return '#FFD93D'; // 黄色
    if (progress < 0.9) return '#6BCB77'; // 绿色
    return '#4D96FF'; // 蓝色（接近完成）
  }

  /**
   * 添加历史记录
   * @param {Object} record - 记录
   */
  _addHistory(record) {
    this.history.push(record);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * 获取历史记录
   * @returns {Array}
   */
  getHistory() {
    return this.history;
  }

  /**
   * 获取统计信息
   * @returns {Object}
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 保存数据
   * @returns {Object}
   */
  saveData() {
    return {
      coins: this.coins,
      gems: this.gems,
      stats: this.stats,
      history: this.history.slice(-20) // 只保留最近20条
    };
  }

  /**
   * 加载数据
   * @param {Object} data - 数据
   */
  loadData(data) {
    if (data.coins !== undefined) this.coins = data.coins;
    if (data.gems !== undefined) this.gems = data.gems;
    if (data.stats) this.stats = { ...this.stats, ...data.stats };
    if (data.history) this.history = data.history;
  }

  /**
   * 重置
   */
  reset() {
    this.coins = 0;
    this.gems = 0;
    this.cleanlinessBall.progress = 0;
    this.cleanlinessBall.targetProgress = 0;
    this.history = [];
    this.stats = {
      totalEarned: 0,
      totalSpent: 0,
      levelsCompleted: 0,
      averageScore: 0
    };
  }
}

// 导入MathUtils
import MathUtils from '../utils/MathUtils';

export default CurrencySystem;
