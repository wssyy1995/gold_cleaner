/**
 * 游戏配置文件
 * 集中管理游戏数据：污垢、关卡等
 * 工具配置在 ToolConfig.js 中
 */

import { BASE_TOOLS } from './ToolConfig';

const GameConfig = {
  // ==================== 污垢配置 ====================
  dirtTypes: [
    {
      type: 'dust',
      name: '灰尘',
      color: '#8B4513',
      description: '普通灰尘，容易清理',
      recipes: [
        ['cloth'],           // 方案1：抹布
        ['sponge'],          // 方案2：海绵
        ['vacuum']           // 方案3：吸尘器
      ],
      score: 10,             // 清洁得分
      coinReward: 5          // 金币奖励
    },
    {
      type: 'stain',
      name: '污渍',
      color: '#654321',
      description: '液体留下的污渍',
      recipes: [
        ['sponge'],                  // 方案1：海绵
        ['spray', 'cloth'],          // 方案2：喷雾+抹布
        ['spray', 'sponge']          // 方案3：喷雾+海绵
      ],
      score: 20,
      coinReward: 10
    },
    {
      type: 'grime',
      name: '油垢',
      color: '#3E2723',
      description: '顽固的油垢，需要多次清洁',
      recipes: [
        ['spray', 'brush'],          // 方案1：喷雾+刷子
        ['spray', 'sponge', 'sponge'], // 方案2：喷雾+海绵x2
        ['spray', 'spray', 'cloth']    // 方案3：喷雾x2+抹布
      ],
      score: 30,
      coinReward: 15
    },
    {
      type: 'mud',
      name: '泥渍',
      color: '#5D4037',
      description: '干掉的泥巴',
      recipes: [
        ['brush', 'sponge'],         // 方案1：刷子+海绵
        ['spray', 'brush', 'cloth'], // 方案2：喷雾+刷子+抹布
        ['vacuum', 'sponge']         // 方案3：吸尘器+海绵
      ],
      score: 25,
      coinReward: 12
    },
    {
      type: 'paint',
      name: '油漆',
      color: '#C62828',
      description: '最难清理的油漆渍',
      recipes: [
        ['spray', 'spray', 'brush', 'cloth'],  // 方案1
        ['spray', 'brush', 'sponge', 'sponge'] // 方案2
      ],
      score: 50,
      coinReward: 25
    }
  ],

  // ==================== 关卡配置 ====================
  levels: {
    // 每关的污垢数量
    dirtCount: {
      1: 3,
      2: 4,
      3: 4,
      4: 5,
      5: 5,
      6: 6,
      7: 6,
      8: 7,
      9: 7,
      10: 8
    },
    // 每关的时间限制（秒）
    timeLimit: {
      1: 60,
      2: 60,
      3: 70,
      4: 70,
      5: 80,
      6: 80,
      7: 90,
      8: 90,
      9: 100,
      10: 120
    },
    // 每关可用的污垢类型
    availableDirtTypes: {
      1: ['dust'],                    // 第1关：只有灰尘
      2: ['dust', 'stain'],           // 第2关：灰尘、污渍
      3: ['dust', 'stain'],           // 第3关：灰尘、污渍
      4: ['dust', 'stain', 'mud'],    // 第4关：新增泥渍
      5: ['dust', 'stain', 'mud'],
      6: ['dust', 'stain', 'mud', 'grime'], // 第6关：新增油垢
      7: ['stain', 'mud', 'grime'],
      8: ['stain', 'mud', 'grime', 'paint'], // 第8关：新增油漆
      9: ['mud', 'grime', 'paint'],
      10: ['dust', 'stain', 'mud', 'grime', 'paint'] // 第10关：全部类型
    }
  },

  // ==================== 游戏参数 ====================
  game: {
    // 屏幕布局比例
    layout: {
      topBarHeight: 0.08,      // 顶部栏高度占比
      gameAreaHeight: 0.80,    // 游戏区域高度占比
      toolSlotHeight: 0.10     // 工具槽高度占比
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
   * 获取指定类型的污垢配置
   */
  getDirtType(type) {
    return this.dirtTypes.find(d => d.type === type) || null;
  },

  /**
   * 获取指定关卡可用的工具列表（从 ToolConfig）
   */
  getAvailableTools(levelId) {
    // 从 ToolConfig 的 BASE_TOOLS 中筛选
    return BASE_TOOLS.filter(t => t.unlockLevel <= levelId);
  },

  /**
   * 获取指定关卡可用的污垢类型
   */
  getAvailableDirtTypes(levelId) {
    const types = this.levels.availableDirtTypes[levelId] || ['dust'];
    return types.map(type => this.getDirtType(type)).filter(Boolean);
  },

  /**
   * 获取关卡的污垢数量
   */
  getDirtCount(levelId) {
    return this.levels.dirtCount[levelId] || 5;
  },

  /**
   * 获取关卡的时间限制
   */
  getTimeLimit(levelId) {
    return this.levels.timeLimit[levelId] || 60;
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
