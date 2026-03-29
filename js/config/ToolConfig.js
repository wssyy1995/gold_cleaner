/**
 * ToolConfig 工具配置
 */

// 基础工具
export const BASE_TOOLS = [
  {
    id: 'cloth',
    name: '抹布',
    icon: '🧽',
    color: '#4A90D9',
    description: '基础清洁工具，适合清理灰尘',
    efficiency: 1.0,
    type: 'base',
    unlockLevel: 1
  },
  {
    id: 'sponge',
    name: '海绵',
    icon: '🧼',
    color: '#66BB6A',
    description: '吸水性好，适合清理污渍',
    efficiency: 1.2,
    type: 'base',
    unlockLevel: 1
  },
  {
    id: 'brush',
    name: '刷子',
    icon: '🪥',
    color: '#FFA726',
    description: '刷洗顽固污垢',
    efficiency: 1.0,
    type: 'base',
    unlockLevel: 1
  },
  {
    id: 'spray',
    name: '喷雾',
    icon: '🧴',
    color: '#AB47BC',
    description: '喷洒清洁剂，预处理污垢',
    efficiency: 0.5, // 喷雾本身清洁力低，但可组合
    type: 'auxiliary',
    unlockLevel: 1
  },
  {
    id: 'vacuum',
    name: '吸尘器',
    icon: '🌪️',
    color: '#EF5350',
    description: '快速清理大量灰尘',
    efficiency: 2.0,
    type: 'advanced',
    unlockLevel: 2
  }
];

// 高级工具（需要购买）
export const PREMIUM_TOOLS = [
  {
    id: 'magic_sponge',
    name: '魔法海绵',
    icon: '✨',
    color: '#FFD700',
    description: '可以清洁任何类型污垢',
    efficiency: 1.5,
    type: 'premium',
    price: 500,
    unlockStage: 2,
    special: { universal: true }
  },
  {
    id: 'electric_brush',
    name: '电动刷子',
    icon: '⚡',
    color: '#FF5722',
    description: '清洁速度+50%',
    efficiency: 1.8,
    type: 'premium',
    price: 800,
    unlockStage: 2,
    special: { speedBonus: 0.5 }
  },
  {
    id: 'rust_remover',
    name: '除锈剂',
    icon: '🧪',
    color: '#795548',
    description: '专门清除锈迹',
    efficiency: 2.5,
    type: 'premium',
    price: 300,
    unlockStage: 3,
    special: { targetType: 'rust' }
  },
  {
    id: 'mold_spray',
    name: '除霉喷雾',
    icon: '🌿',
    color: '#2E7D32',
    description: '专门清除霉斑',
    efficiency: 2.5,
    type: 'premium',
    price: 300,
    unlockStage: 2,
    special: { targetType: 'mold' }
  },
  {
    id: 'cleaning_robot',
    name: '清洁机器人',
    icon: '🤖',
    color: '#607D8B',
    description: '自动清洁小范围区域',
    efficiency: 1.0,
    type: 'premium',
    price: 1500,
    unlockStage: 3,
    special: { auto: true, range: 'small' }
  }
];

// 所有工具
export const ALL_TOOLS = [...BASE_TOOLS, ...PREMIUM_TOOLS];

// 工具槽最大数量
export const MAX_TOOL_SLOTS = 8;

// 默认装备的工具
export function getDefaultToolSlots() {
  return [
    BASE_TOOLS[0], // 抹布
    BASE_TOOLS[1], // 海绵
    null,
    null,
    null,
    null,
    null,
    null
  ];
}

// 获取工具信息
export function getTool(toolId) {
  return ALL_TOOLS.find(t => t.id === toolId) || null;
}

// 检查工具是否解锁
export function isToolUnlocked(toolId, currentStage = 1, ownedTools = []) {
  const tool = getTool(toolId);
  if (!tool) return false;
  
  // 已购买的工具
  if (ownedTools.includes(toolId)) return true;
  
  // 基础工具根据关卡解锁
  if (tool.type === 'base' && tool.unlockLevel) {
    // 简化：假设已通过足够关卡
    return true;
  }
  
  // 高级工具根据阶段解锁
  if (tool.type === 'premium' && tool.unlockStage) {
    return currentStage >= tool.unlockStage;
  }
  
  return true;
}

export default {
  BASE_TOOLS,
  PREMIUM_TOOLS,
  ALL_TOOLS,
  MAX_TOOL_SLOTS,
  getDefaultToolSlots,
  getTool,
  isToolUnlocked
};
