/**
 * ShopConfig 商城配置
 */

import { PREMIUM_TOOLS } from './ToolConfig';

// 商品分类
export const SHOP_CATEGORIES = [
  { id: 'tools', name: '工具', icon: '🛠️' },
  { id: 'items', name: '道具', icon: '📦' },
  { id: 'skills', name: '技能', icon: '⭐' }
];

// 工具类商品（从ToolConfig同步）
export const TOOL_PRODUCTS = PREMIUM_TOOLS.map(tool => ({
  id: tool.id,
  category: 'tools',
  name: tool.name,
  icon: tool.icon,
  description: tool.description,
  price: tool.price,
  currency: 'coins',
  effect: tool.special || {},
  unlockStage: tool.unlockStage,
  owned: false
}));

// 道具类商品
export const ITEM_PRODUCTS = [
  {
    id: 'item_time_30',
    category: 'items',
    name: '时间延长',
    icon: '⏱️',
    description: '关卡时间+30秒',
    price: 50,
    currency: 'coins',
    effect: { timeBonus: 30 },
    consumable: true,
    unlockStage: 1
  },
  {
    id: 'item_time_60',
    category: 'items',
    name: '超级延时',
    icon: '⏳',
    description: '关卡时间+60秒',
    price: 90,
    currency: 'coins',
    effect: { timeBonus: 60 },
    consumable: true,
    unlockStage: 2
  },
  {
    id: 'item_hint',
    category: 'items',
    name: '清洁提示',
    icon: '💡',
    description: '显示下一个需要清洁的区域',
    price: 30,
    currency: 'coins',
    effect: { hint: true },
    consumable: true,
    unlockStage: 1
  },
  {
    id: 'item_multiplier_x2',
    category: 'items',
    name: '金币翻倍',
    icon: '💰',
    description: '本局金币收益x2',
    price: 100,
    currency: 'coins',
    effect: { coinMultiplier: 2 },
    consumable: true,
    unlockStage: 2
  },
  {
    id: 'item_multiplier_x3',
    category: 'items',
    name: '超级翻倍',
    icon: '💎',
    description: '本局金币收益x3',
    price: 250,
    currency: 'coins',
    effect: { coinMultiplier: 3 },
    consumable: true,
    unlockStage: 3
  },
  {
    id: 'item_star_protect',
    category: 'items',
    name: '星级保护',
    icon: '🛡️',
    description: '失误不扣星',
    price: 80,
    currency: 'coins',
    effect: { starProtection: true },
    consumable: true,
    unlockStage: 2
  }
];

// 技能类商品（永久加成）
export const SKILL_PRODUCTS = [
  {
    id: 'skill_speed_1',
    category: 'skills',
    name: '快手Lv.1',
    icon: '⚡',
    description: '永久提升清洁速度10%',
    price: 500,
    currency: 'coins',
    effect: { type: 'permanent', speedBonus: 0.1 },
    maxLevel: 5,
    currentLevel: 0,
    unlockStage: 1
  },
  {
    id: 'skill_speed_2',
    category: 'skills',
    name: '快手Lv.2',
    icon: '⚡',
    description: '永久提升清洁速度20%',
    price: 1000,
    currency: 'coins',
    effect: { type: 'permanent', speedBonus: 0.2 },
    requires: 'skill_speed_1',
    maxLevel: 1,
    currentLevel: 0,
    unlockStage: 2
  },
  {
    id: 'skill_coin_1',
    category: 'skills',
    name: '财神Lv.1',
    icon: '🧧',
    description: '永久提升金币收益15%',
    price: 800,
    currency: 'coins',
    effect: { type: 'permanent', coinBonus: 0.15 },
    maxLevel: 5,
    currentLevel: 0,
    unlockStage: 1
  },
  {
    id: 'skill_efficiency_1',
    category: 'skills',
    name: '效率大师Lv.1',
    icon: '📈',
    description: '永久提升清洁效率20%',
    price: 1000,
    currency: 'coins',
    effect: { type: 'permanent', efficiencyBonus: 0.2 },
    maxLevel: 3,
    currentLevel: 0,
    unlockStage: 2
  },
  {
    id: 'skill_lucky',
    category: 'skills',
    name: '幸运星',
    icon: '🌟',
    description: '有10%概率获得双倍金币',
    price: 2000,
    currency: 'coins',
    effect: { type: 'permanent', luckyChance: 0.1 },
    maxLevel: 1,
    currentLevel: 0,
    unlockStage: 3
  }
];

// 所有商品
export const ALL_PRODUCTS = [
  ...TOOL_PRODUCTS,
  ...ITEM_PRODUCTS,
  ...SKILL_PRODUCTS
];

// 获取分类商品
export function getProductsByCategory(category, currentStage = 1) {
  return ALL_PRODUCTS.filter(p => 
    p.category === category && 
    (p.unlockStage || 1) <= currentStage
  );
}

// 检查商品是否可购买
export function canPurchase(productId, coins, ownedProducts = [], currentStage = 1) {
  const product = ALL_PRODUCTS.find(p => p.id === productId);
  if (!product) return { canBuy: false, reason: '商品不存在' };
  
  // 检查阶段解锁
  if (product.unlockStage && currentStage < product.unlockStage) {
    return { canBuy: false, reason: `阶段${product.unlockStage}解锁` };
  }
  
  // 检查是否已拥有（非消耗品）
  if (!product.consumable && ownedProducts.includes(productId)) {
    return { canBuy: false, reason: '已拥有' };
  }
  
  // 检查金币
  if (coins < product.price) {
    return { canBuy: false, reason: '金币不足' };
  }
  
  // 检查前置技能
  if (product.requires && !ownedProducts.includes(product.requires)) {
    return { canBuy: false, reason: '需要先购买前置技能' };
  }
  
  return { canBuy: true };
}

// 计算购买后的效果
export function calculateEffect(ownedSkills) {
  const effect = {
    speedBonus: 0,
    coinBonus: 0,
    efficiencyBonus: 0,
    luckyChance: 0
  };
  
  ownedSkills.forEach(skillId => {
    const skill = SKILL_PRODUCTS.find(s => s.id === skillId);
    if (skill && skill.effect) {
      Object.keys(skill.effect).forEach(key => {
        if (key !== 'type' && effect.hasOwnProperty(key)) {
          effect[key] += skill.effect[key];
        }
      });
    }
  });
  
  return effect;
}

export default {
  SHOP_CATEGORIES,
  TOOL_PRODUCTS,
  ITEM_PRODUCTS,
  SKILL_PRODUCTS,
  ALL_PRODUCTS,
  getProductsByCategory,
  canPurchase,
  calculateEffect
};
