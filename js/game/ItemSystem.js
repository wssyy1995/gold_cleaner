/**
 * ItemSystem 物品与道具系统
 * 负责任务 3.3.1 ~ 3.3.5
 * - 3.3.1 设计道具数据结构
 * - 3.3.2 实现道具获取逻辑
 * - 3.3.3 实现道具消耗逻辑
 * - 3.3.4 实现道具库存管理
 * - 3.3.5 实现新道具的提示与教学
 */

import { globalEvent } from '../core/EventEmitter';

class ItemSystem {
  constructor() {
    // 3.3.1 设计道具数据结构
    // 道具配置
    this._itemConfigs = new Map();
    
    // 3.3.4 实现道具库存管理
    // 玩家库存 { itemId: count }
    this.inventory = new Map();
    
    // 新获得的道具（用于提示）
    this.newItems = new Set();
    
    // 道具使用记录
    this.usageHistory = [];
    
    // 最大库存容量（每种道具）
    this.maxStackSize = 99;
  }

  /**
   * 初始化物品系统
   */
  init() {
    console.log('[ItemSystem] 初始化物品系统');
  }

  /**
   * 3.3.1 设计道具数据结构
   * 注册道具配置
   * @param {string} itemId - 道具ID
   * @param {Object} config - 道具配置
   */
  registerItem(itemId, config) {
    const itemConfig = {
      id: itemId,
      name: config.name || '未知道具',
      description: config.description || '',
      icon: config.icon || '',
      type: config.type || 'consumable', // consumable(消耗品), tool(工具), material(材料)
      rarity: config.rarity || 'common', // common, rare, epic, legendary
      maxStack: config.maxStack || this.maxStackSize,
      usable: config.usable !== false,
      usableInLevel: config.usableInLevel !== false,
      effect: config.effect || {}, // 使用效果
      // 使用效果配置
      effects: config.effects || {
        timeBonus: 0,      // 时间奖励（秒）
        cleanBoost: 0,     // 清洁加速倍数
        hint: false,       // 是否显示提示
        autoClean: false   // 是否自动清洁
      },
      // 获取途径
      obtainWays: config.obtainWays || {
        shop: false,       // 商店购买
        levelReward: false, // 关卡奖励
        dailyReward: false, // 每日奖励
        achievement: false  // 成就奖励
      },
      // 价格
      price: config.price || {
        coins: 0,
        gems: 0
      }
    };

    this._itemConfigs.set(itemId, itemConfig);
    console.log(`[ItemSystem] 注册道具: ${itemId}`);
  }

  /**
   * 批量注册道具
   * @param {Object} items - 道具配置对象
   */
  registerItems(items) {
    for (const [id, config] of Object.entries(items)) {
      this.registerItem(id, config);
    }
  }

  /**
   * 获取道具配置
   * @param {string} itemId - 道具ID
   * @returns {Object|undefined}
   */
  getItemConfig(itemId) {
    return this._itemConfigs.get(itemId);
  }

  /**
   * 3.3.2 实现道具获取逻辑
   * 获得道具
   * @param {string} itemId - 道具ID
   * @param {number} count - 数量
   * @param {Object} options - 选项
   * @returns {boolean}
   */
  obtainItem(itemId, count = 1, options = {}) {
    const config = this._itemConfigs.get(itemId);
    if (!config) {
      console.error(`[ItemSystem] 未知道具: ${itemId}`);
      return false;
    }

    if (count <= 0) return false;

    // 获取当前数量
    const currentCount = this.inventory.get(itemId) || 0;
    
    // 检查是否超过最大堆叠
    const newCount = Math.min(currentCount + count, config.maxStack);
    const actualAdded = newCount - currentCount;

    if (actualAdded <= 0) {
      console.log(`[ItemSystem] 道具 ${itemId} 已达到最大数量`);
      return false;
    }

    // 更新库存
    this.inventory.set(itemId, newCount);

    // 3.3.5 实现新道具的提示与教学
    // 标记为新获得的道具
    if (currentCount === 0 && !options.silent) {
      this.newItems.add(itemId);
    }

    console.log(`[ItemSystem] 获得道具: ${itemId} x${actualAdded}`);

    globalEvent.emit('item:obtained', {
      itemId,
      count: actualAdded,
      total: newCount,
      isNew: currentCount === 0,
      config
    });

    return true;
  }

  /**
   * 批量获得道具
   * @param {Array<{itemId: string, count: number}>} items - 道具列表
   * @param {Object} options - 选项
   */
  obtainItems(items, options = {}) {
    const results = [];
    for (const { itemId, count } of items) {
      const success = this.obtainItem(itemId, count, options);
      results.push({ itemId, count, success });
    }
    return results;
  }

  /**
   * 3.3.3 实现道具消耗逻辑
   * 使用/消耗道具
   * @param {string} itemId - 道具ID
   * @param {number} count - 数量
   * @param {Object} context - 使用上下文（如当前关卡）
   * @returns {Object}
   */
  useItem(itemId, count = 1, context = {}) {
    const config = this._itemConfigs.get(itemId);
    if (!config) {
      return { success: false, error: 'unknown_item' };
    }

    // 检查库存
    const currentCount = this.inventory.get(itemId) || 0;
    if (currentCount < count) {
      return { success: false, error: 'not_enough' };
    }

    // 检查是否可使用
    if (!config.usable) {
      return { success: false, error: 'not_usable' };
    }

    // 检查是否可在关卡中使用
    if (context.inLevel && !config.usableInLevel) {
      return { success: false, error: 'not_usable_in_level' };
    }

    // 消耗道具
    const newCount = currentCount - count;
    if (newCount > 0) {
      this.inventory.set(itemId, newCount);
    } else {
      this.inventory.delete(itemId);
    }

    // 记录使用
    this.usageHistory.push({
      itemId,
      count,
      time: Date.now(),
      context
    });

    // 应用效果
    const effectResult = this._applyEffect(config, context);

    console.log(`[ItemSystem] 使用道具: ${itemId} x${count}`);

    globalEvent.emit('item:used', {
      itemId,
      count,
      remaining: newCount,
      config,
      effect: effectResult
    });

    return {
      success: true,
      itemId,
      count,
      remaining: newCount,
      effect: effectResult
    };
  }

  /**
   * 应用道具效果
   * @param {Object} config - 道具配置
   * @param {Object} context - 使用上下文
   * @returns {Object}
   */
  _applyEffect(config, context) {
    const effects = config.effects || {};
    const result = {
      timeBonus: 0,
      cleanBoost: 0,
      hint: false,
      autoClean: false
    };

    if (effects.timeBonus) {
      result.timeBonus = effects.timeBonus;
      // 通知关卡管理器增加时间
      globalEvent.emit('item:effect:timeBonus', effects.timeBonus);
    }

    if (effects.cleanBoost) {
      result.cleanBoost = effects.cleanBoost;
      globalEvent.emit('item:effect:cleanBoost', effects.cleanBoost);
    }

    if (effects.hint) {
      result.hint = true;
      globalEvent.emit('item:effect:hint');
    }

    if (effects.autoClean) {
      result.autoClean = true;
      globalEvent.emit('item:effect:autoClean');
    }

    return result;
  }

  /**
   * 检查是否可以使用道具
   * @param {string} itemId - 道具ID
   * @param {number} count - 数量
   * @param {Object} context - 使用上下文
   * @returns {boolean}
   */
  canUseItem(itemId, count = 1, context = {}) {
    const config = this._itemConfigs.get(itemId);
    if (!config) return false;

    const currentCount = this.inventory.get(itemId) || 0;
    if (currentCount < count) return false;

    if (!config.usable) return false;
    if (context.inLevel && !config.usableInLevel) return false;

    return true;
  }

  /**
   * 3.3.4 实现道具库存管理
   * 获取道具数量
   * @param {string} itemId - 道具ID
   * @returns {number}
   */
  getItemCount(itemId) {
    return this.inventory.get(itemId) || 0;
  }

  /**
   * 检查是否拥有道具
   * @param {string} itemId - 道具ID
   * @param {number} count - 最小数量
   * @returns {boolean}
   */
  hasItem(itemId, count = 1) {
    return this.getItemCount(itemId) >= count;
  }

  /**
   * 获取所有道具
   * @returns {Array}
   */
  getAllItems() {
    const items = [];
    for (const [itemId, count] of this.inventory) {
      const config = this._itemConfigs.get(itemId);
      if (config) {
        items.push({
          id: itemId,
          count,
          config,
          isNew: this.newItems.has(itemId)
        });
      }
    }
    return items;
  }

  /**
   * 获取特定类型的道具
   * @param {string} type - 道具类型
   * @returns {Array}
   */
  getItemsByType(type) {
    return this.getAllItems().filter(item => item.config.type === type);
  }

  /**
   * 设置道具数量（用于初始化或作弊）
   * @param {string} itemId - 道具ID
   * @param {number} count - 数量
   */
  setItemCount(itemId, count) {
    const config = this._itemConfigs.get(itemId);
    if (!config) return false;

    if (count <= 0) {
      this.inventory.delete(itemId);
    } else {
      this.inventory.set(itemId, Math.min(count, config.maxStack));
    }

    globalEvent.emit('item:countChanged', itemId, count);
    return true;
  }

  /**
   * 丢弃道具
   * @param {string} itemId - 道具ID
   * @param {number} count - 数量
   */
  discardItem(itemId, count = 1) {
    const currentCount = this.inventory.get(itemId) || 0;
    const newCount = Math.max(0, currentCount - count);

    if (newCount > 0) {
      this.inventory.set(itemId, newCount);
    } else {
      this.inventory.delete(itemId);
    }

    globalEvent.emit('item:discarded', itemId, count, newCount);
    return newCount;
  }

  /**
   * 3.3.5 实现新道具的提示与教学
   * 检查是否有新道具
   * @returns {boolean}
   */
  hasNewItems() {
    return this.newItems.size > 0;
  }

  /**
   * 获取新道具列表
   * @returns {Array}
   */
  getNewItems() {
    const items = [];
    for (const itemId of this.newItems) {
      const config = this._itemConfigs.get(itemId);
      const count = this.inventory.get(itemId) || 0;
      if (config) {
        items.push({ id: itemId, config, count });
      }
    }
    return items;
  }

  /**
   * 标记道具为已查看
   * @param {string} itemId - 道具ID
   */
  markAsViewed(itemId) {
    this.newItems.delete(itemId);
  }

  /**
   * 标记所有道具为已查看
   */
  markAllAsViewed() {
    this.newItems.clear();
  }

  /**
   * 获取道具使用统计
   * @returns {Object}
   */
  getUsageStats() {
    const stats = {};
    for (const record of this.usageHistory) {
      if (!stats[record.itemId]) {
        stats[record.itemId] = { count: 0, times: 0 };
      }
      stats[record.itemId].count += record.count;
      stats[record.itemId].times++;
    }
    return stats;
  }

  /**
   * 保存数据
   * @returns {Object}
   */
  saveData() {
    return {
      inventory: Array.from(this.inventory.entries()),
      newItems: Array.from(this.newItems),
      usageHistory: this.usageHistory.slice(-100) // 只保留最近100条
    };
  }

  /**
   * 加载数据
   * @param {Object} data - 数据
   */
  loadData(data) {
    if (data.inventory) {
      this.inventory = new Map(data.inventory);
    }
    if (data.newItems) {
      this.newItems = new Set(data.newItems);
    }
    if (data.usageHistory) {
      this.usageHistory = data.usageHistory;
    }
  }

  /**
   * 重置
   */
  reset() {
    this.inventory.clear();
    this.newItems.clear();
    this.usageHistory = [];
  }

  /**
   * 销毁
   */
  destroy() {
    this.reset();
    this._itemConfigs.clear();
  }
}

export default ItemSystem;
