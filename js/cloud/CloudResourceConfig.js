/**
 * CloudResourceConfig 云存储资源配置
 * 混合方案：核心资源从云存储下载，其他从本地加载
 * 
 * 注意：fileID 必须从微信云存储控制台复制完整格式
 * 示例：cloud://cloudbase-xxx.636c-cloudbase-xxx-1416711846/images/...
 */

/**
 * 需要从云存储预加载的核心资源（游戏启动时必须）
 * 这些图片会在 LoadingScene 下载并缓存
 * 
 * 请从微信开发者工具云存储控制台复制实际的完整 fileID
 */
export const PRELOAD_CLOUD_FILE_IDS = {
  // UI 图标（必须）
  'ui_icon_locked': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/icon/ui-icon-locked.png',
  'ui_icon_unlocked': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/icon/ui-icon-unlocked.png',
  'ui_icon_pass': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/icon/ui-icon-pass.png',
  // 主页背景图（根据用户进度动态选择 stage）
  'bg_home_stage1': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg-stage1-home.png',
  'bg_home_stage2': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg-stage2-home.png',
  'bg_home_stage3': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg-stage3-home.png',
  'bg_home_stage4': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg-stage4-home.png',
  // 新用户第一关预览图（必须预加载，用户第一眼看到的关卡）
  'game_stage1_l1': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l1_home.png',
  // 游戏标题和阶段标签（主页面中间显示）
  'bg_game_title': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg_game_title.png',
  'bg_stage1_tag': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg_stage1_tag.png'
};

/**
 * 可选的云存储资源（如需要动态更新）
 * 如果配置了云存储 fileID，则优先从云存储加载
 * 否则从本地 images/ 目录加载
 * 
 * 关卡图片：配置后优先从云存储加载，不配置则从本地加载
 */
export const OPTIONAL_CLOUD_FILE_IDS = {
  // Stage 1 关卡预览图（l1 已在预加载列表中）
  'game_stage1_l2': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l2_home.png',
  'game_stage1_l3': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l3_home.png',
  'game_stage1_l4': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l4_home.png',
  'game_stage1_l5': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l5_home.png',
  'game_stage1_l6': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l6_home.png',
  'game_stage1_l7': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l7_home.png',
  'game_stage1_l8': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l8_home.png',
  'game_stage1_l9': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l9_home.png',
  'game_stage1_l10': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l10_home.png',
  
  // Stage 2 关卡预览图
  'game_stage2_l1': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage2_l1_home.png',
  'game_stage2_l2': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage2_l2_home.png',
  'game_stage2_l3': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage2_l3_home.png',
  'game_stage2_l4': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage2_l4_home.png',
  'game_stage2_l5': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage2_l5_home.png',
  'game_stage2_l6': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage2_l6_home.png',
  'game_stage2_l7': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage2_l7_home.png',
  'game_stage2_l8': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage2_l8_home.png',
  'game_stage2_l9': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage2_l9_home.png',
  'game_stage2_l10': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage2_l10_home.png',
  
  // Stage 3 关卡预览图
  'game_stage3_l1': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage3_l1_home.png',
  'game_stage3_l2': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage3_l2_home.png',
  'game_stage3_l3': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage3_l3_home.png',
  'game_stage3_l4': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage3_l4_home.png',
  'game_stage3_l5': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage3_l5_home.png',
  'game_stage3_l6': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage3_l6_home.png',
  'game_stage3_l7': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage3_l7_home.png',
  'game_stage3_l8': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage3_l8_home.png',
  'game_stage3_l9': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage3_l9_home.png',
  'game_stage3_l10': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage3_l10_home.png',
  
  // Stage 4 关卡预览图
  'game_stage4_l1': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage4_l1_home.png',
  'game_stage4_l2': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage4_l2_home.png',
  'game_stage4_l3': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage4_l3_home.png',
  'game_stage4_l4': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage4_l4_home.png',
  'game_stage4_l5': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage4_l5_home.png',
  'game_stage4_l6': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage4_l6_home.png',
  'game_stage4_l7': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage4_l7_home.png',
  'game_stage4_l8': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage4_l8_home.png',
  'game_stage4_l9': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage4_l9_home.png',
  'game_stage4_l10': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage4_l10_home.png',
};

/**
 * 获取所有需要预加载的图片列表（给 LoadingScene 使用）
 */
export function getAllPreloadImages() {
  return Object.entries(PRELOAD_CLOUD_FILE_IDS).map(([key, fileID]) => ({
    key,
    fileID
  }));
}

/**
 * 获取图片加载配置
 * @param {string} key - 图片标识
 * @returns {Object} - { type: 'cloud'|'local', fileID?: string, localPath: string }
 */
export function getImageLoadConfig(key) {
  // 1. 检查是否在必预载列表中
  if (PRELOAD_CLOUD_FILE_IDS[key]) {
    return {
      type: 'cloud',
      fileID: PRELOAD_CLOUD_FILE_IDS[key],
      cacheKey: key
    };
  }
  
  // 2. 检查是否在可选云存储列表中
  if (OPTIONAL_CLOUD_FILE_IDS[key]) {
    return {
      type: 'cloud',
      fileID: OPTIONAL_CLOUD_FILE_IDS[key],
      cacheKey: key
    };
  }
  
  // 3. 返回本地路径
  const localPath = getLocalImagePath(key);
  return {
    type: 'local',
    localPath
  };
}

/**
 * 获取本地图片路径（动态构建，避免编译检查）
 */
function getLocalImagePath(key) {
  const parts = ['images'];
  
  // UI 图标
  if (key.startsWith('ui_icon_')) {
    const name = key.replace('ui_icon_', '');
    parts.push('ui', 'icon', `ui-icon-${name}.png`);
    return parts.join('/');
  }
  
  // 背景
  if (key === 'bg_loading') {
    parts.push('backgrounds', 'bg-001-loading.png');
    return parts.join('/');
  }
  if (key === 'bg_home') {
    parts.push('backgrounds', 'bg-stage1-home.png');
    return parts.join('/');
  }
  
  // 关卡图片
  const match = key.match(/game_stage(\d+)_l(\d+)/);
  if (match) {
    parts.push('game', `game_stage${match[1]}_l${match[2]}_home.png`);
    return parts.join('/');
  }
  
  return null;
}

/**
 * 根据阶段和关卡生成 key
 */
export function getLevelImageKey(stage, level) {
  return `game_stage${stage}_l${level}`;
}

/**
 * 获取关卡图片配置
 */
export function getLevelImageConfig(stage, level) {
  const key = getLevelImageKey(stage, level);
  return getImageLoadConfig(key);
}

/**
 * 判断是否为预加载的云存储图片
 */
export function isPreloadCloudImage(key) {
  return !!PRELOAD_CLOUD_FILE_IDS[key];
}

export default {
  PRELOAD_CLOUD_FILE_IDS,
  OPTIONAL_CLOUD_FILE_IDS,
  getAllPreloadImages,
  getImageLoadConfig,
  getLevelImageKey,
  getLevelImageConfig,
  isPreloadCloudImage
};

// CommonJS 兼容性导出（用于 require）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PRELOAD_CLOUD_FILE_IDS,
    OPTIONAL_CLOUD_FILE_IDS,
    getAllPreloadImages,
    getImageLoadConfig,
    getLevelImageKey,
    getLevelImageConfig,
    isPreloadCloudImage
  };
}
