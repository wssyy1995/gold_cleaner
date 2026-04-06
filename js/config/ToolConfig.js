/**
 * ToolConfig 工具配置
 */

// 基础工具
export const BASE_TOOLS = [
  {
    id: 'cloth',
    name: '抹布',
    icon: '🧽',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/tool/ui_tool_cloth.png',
    color: '#4A90D9',
    description: '基础清洁工具，适合清理灰尘',
    efficiency: 1.0,
    type: 'base',
    unlockLevel: 1
  },
  {
    id: 'broom',
    name: '扫帚',
    icon: '🧹',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/tool/ui_tool_broom.png',
    color: '#66BB6A',
    description: '可以清理稀碎的固体垃圾，碎纸屑',
    efficiency: 1.2,
    type: 'base',
    unlockLevel: 3
  },
  {
    id: 'rubbish_bin',
    name: '垃圾桶',
    icon: '🗑️',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/tool/ui_tool_rubbish_bin.png',
    color: '#66BB6A',
    description: '纸团，包装纸类的垃圾扔进去',
    efficiency: 1.2,
    type: 'base',
    unlockLevel: 1
  },
  {
    id: 'dc_basket',
    name: '脏衣篓',
    icon: '👖',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/tool/ui_tool_dc_basket.png',
    color: '#66BB6A',
    description: '放脏衣服',
    efficiency: 1.2,
    type: 'base',
    unlockLevel: 1
  },
  {
    id: 'magnifier',
    name: '放大镜',
    icon: '🔍',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/tool/ui_tool_magnifier.png',
    color: '#4A90D9',
    description: '特殊道具！可以帮助找到一处隐藏垃圾。',
    efficiency: 1.0,
    type: 'base',
    unlockLevel: 3
  },
  {
    id: 'brush',
    name: '刷子',
    icon: '🪥',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/tool/ui_tool_brush.png',
    color: '#FFA726',
    description: '刷洗顽固污垢',
    efficiency: 1.0,
    type: 'base',
    unlockLevel: 3
  },
  {
    id: 'common_spray',
    name: '万能清洁剂',
    icon: '🧴',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/tool/ui_tool_common_spray.png',
    color: '#AB47BC',
    description: '喷洒清洁剂，对大部分污渍有效，对顽固污渍作用较弱',
    efficiency: 0.5, // 喷雾本身清洁力低，但可组合
    type: 'auxiliary',
    unlockLevel: 2
  },
  {
    id: 'mop',
    name: '吸水拖把',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/tool/ui_tool_mop.png',
    description: '强力吸水拖把',
    efficiency: 0.5, // 喷雾本身清洁力低，但可组合
    type: 'auxiliary',
    unlockLevel: 2
  },
  {
    id: 'vacuum',
    name: '吸尘器',
    icon: '🌪️',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/tool/ui_tool_vacuum.png',
    color: '#EF5350',
    description: '快速清理大量灰尘',
    efficiency: 2.0,
    type: 'advanced',
    unlockLevel: 4
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

// 全局工具图片缓存 - 供 LoadingScene 和 GameplayScene 共享
export const GlobalToolImageCache = {
  _cache: {},
  
  get(toolId) {
    return this._cache[toolId] || null;
  },
  
  set(toolId, img) {
    this._cache[toolId] = img;
  },
  
  has(toolId) {
    return !!this._cache[toolId];
  }
};

export default {
  BASE_TOOLS,
  PREMIUM_TOOLS,
  ALL_TOOLS,
  MAX_TOOL_SLOTS,
  getDefaultToolSlots,
  getTool,
  isToolUnlocked,
  GlobalToolImageCache
};
