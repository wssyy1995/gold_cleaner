/**
 * 游戏配置文件
 * 集中管理游戏通用参数
 * 工具配置在 ToolConfig.js 中
 * 污垢和关卡配置在 LevelConfig.js 中
 */

import { BASE_TOOLS } from './ToolConfig';
import { DIRT_TYPES, getLevel } from './LevelConfig';

const GameConfig = {
  // ==================== 游戏参数 ====================
  game: {
    // 屏幕布局比例
    layout: {
      topBarHeight: 0.08,      // 顶部栏高度占比
      gameAreaHeight: 0.80,    // 游戏区域高度占比
      toolSlotHeight: 0.12     // 工具槽高度占比
    },
    // 评分标准（根据剩余时间）
    starRating: {
      3: 0.6,  // 剩余 60% 以上时间 = 3星
      2: 0.3,  // 剩余 30% 以上时间 = 2星
      1: 0     // 其他 = 1星
    },
    // 金币计算
    coins: {
      baseReward: 50,          // 基础奖励
      perStarBonus: 25,        // 每颗星额外奖励
      timeBonus: 0.5           // 每秒剩余时间兑换金币
    }
  },

  // ==================== 工具方法 ====================
  
  /**
   * 获取指定类型的污垢配置（从 LevelConfig）
   */
  getDirtType(type) {
    return DIRT_TYPES[type] || null;
  },

  /**
   * 获取指定关卡可用的工具列表（从 ToolConfig）
   */
  getAvailableTools(levelId) {
    return BASE_TOOLS.filter(t => t.unlockLevel <= levelId);
  },

  /**
   * 获取指定关卡可用的污垢类型（从 LevelConfig）
   */
  getAvailableDirtTypes(levelId) {
    // 从 LevelConfig 获取关卡数据
    const level = getLevel(1, levelId); // 默认从阶段1获取
    if (!level || !level.dirts) return [];
    
    // 提取关卡中使用的污垢类型
    const types = [...new Set(level.dirts.map(d => d.type))];
    return types.map(type => this.getDirtType(type)).filter(Boolean);
  },

  /**
   * 获取关卡的污垢数量（从 LevelConfig）
   */
  getDirtCount(levelId) {
    const level = getLevel(1, levelId);
    return level ? level.dirts.length : 5;
  },

  /**
   * 获取关卡的时间限制（从 LevelConfig）
   */
  getTimeLimit(levelId) {
    const level = getLevel(1, levelId);
    return level ? level.timeLimit : 60;
  },

  /**
   * 计算星级评分
   * @param {number} remainingTime - 剩余时间（秒）
   * @param {number} totalTime - 总时间（秒）
   */
  calculateStars(remainingTime, totalTime) {
    const ratio = remainingTime / totalTime;
    if (ratio >= this.game.starRating[3]) return 3;
    if (ratio >= this.game.starRating[2]) return 2;
    return 1;
  },

  /**
   * 计算金币奖励
   * @param {number} stars - 星级
   * @param {number} remainingTime - 剩余时间
   * @param {number} dirtCleaned - 清洁的污垢数量
   */
  calculateCoins(stars, remainingTime, dirtCleaned) {
    const base = this.game.coins.baseReward;
    const starBonus = stars * this.game.coins.perStarBonus;
    const timeBonus = Math.floor(remainingTime * this.game.coins.timeBonus);
    return base + starBonus + timeBonus;
  }
};

export default GameConfig;
