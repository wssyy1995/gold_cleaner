/**
 * Config Index 配置入口
 * 统一导出所有配置
 */

// 关卡配置
export { 
  DIRT_TYPES, 
  STAGES, 
  getLevel, 
  getStageLevels, 
  isStageUnlocked 
} from './LevelConfig';

// 工具配置
export { 
  BASE_TOOLS, 
  PREMIUM_TOOLS, 
  ALL_TOOLS, 
  MAX_TOOL_SLOTS,
  getDefaultToolSlots,
  getTool,
  isToolUnlocked 
} from './ToolConfig';

// 商城配置
export { 
  SHOP_CATEGORIES,
  TOOL_PRODUCTS,
  ITEM_PRODUCTS,
  SKILL_PRODUCTS,
  ALL_PRODUCTS,
  getProductsByCategory,
  canPurchase,
  calculateEffect
} from './ShopConfig';

// 游戏配置
export {
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
} from './GameConfig';

// 默认导出
export { default as LevelConfig } from './LevelConfig';
export { default as ToolConfig } from './ToolConfig';
export { default as ShopConfig } from './ShopConfig';
export { default as GameConfig } from './GameConfig';
