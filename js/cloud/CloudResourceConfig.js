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
  // UI 图标（必须） - key 与文件名保持一致
  'ui-icon-locked': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/icon/ui-icon-locked.png',
  'ui-icon-unlocked': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/icon/ui-icon-unlocked.png',
  'ui-icon-pass': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/icon/ui-icon-pass.png',
  // 主页背景图（根据用户进度动态选择 stage）
  'bg-stage1-home': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg-stage1-home.png',
  'bg-stage2-home': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg-stage2-home.png',
  'bg-stage3-home': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg-stage3-home.png',
  'bg-stage4-home': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg-stage4-home.png',
  // 新用户第一关预览图（必须预加载，用户第一眼看到的关卡）
  'game_stage1_l1_home': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/game/game_stage1_l1_home.png',
  // 游戏标题和阶段标签（主页面中间显示）
  'bg_game_title': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg_game_title.png',
  'bg_stage1_tag': 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/backgrounds/bg_stage1_tag.png',
  // 污垢图片配置已迁移到 dirtyConfig.js，不再在此处维护
};

// 云环境 ID（从 PRELOAD_CLOUD_FILE_IDS 中提取）
const CLOUD_ENV_ID = 'cloudbase-0gku48938517adc7';
const CLOUD_ENV_SUFFIX = '636c-cloudbase-0gku48938517adc7-1416711846';

/**
 * 根据 key 生成云存储 fileID
 * 格式：cloud://{envId}.{wxappid}-{appid}-{timestamp}/images/xxx.png
 * @param {string} key - 图片 key（不含扩展名）
 * @returns {string|null} - fileID
 */
export function getCloudFileID(key) {
  if (!key) return null;
  
  // 根据 key 确定路径
  let cloudPath = '';
  
  // UI 图标
  if (key.startsWith('ui-icon-')) {
    cloudPath = `images/ui/icon/${key}.png`;
  }
  // 主页背景
  else if (key.startsWith('bg-stage') && key.endsWith('-home')) {
    cloudPath = `images/backgrounds/${key}.png`;
  }
  // 标题和标签
  else if (key.startsWith('bg_')) {
    cloudPath = `images/backgrounds/${key}.png`;
  }
  // 关卡图片 (支持 game_stage1_l1_home 和 stage1_l1_home)
  else if (key.startsWith('game_stage') && key.endsWith('_home')) {
    cloudPath = `images/game/${key}.png`;
  }
  else if (key.startsWith('stage') && key.includes('_l') && key.endsWith('_home')) {
    // 添加 game_ 前缀生成云存储路径
    cloudPath = `images/game/game_${key}.png`;
  }
  // 污垢图片
  else if (key.startsWith('dirt_')) {
    const dirtType = key.replace('dirt_', '');
    cloudPath = `images/ui/dirty/${dirtType}.png`;
  }
  
  if (!cloudPath) return null;
  
  return `cloud://${CLOUD_ENV_ID}.${CLOUD_ENV_SUFFIX}/${cloudPath}`;
}

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
 * 逻辑：
 * 1. 如果是 bg-001-loading，强制从本地加载
 * 2. 如果在必预载列表中，从云存储加载
 * 3. 其他图片，尝试从云存储缓存记录中获取 fileID，找不到则回退到本地
 * @param {string} key - 图片标识
 * @returns {Object} - { type: 'cloud'|'local', fileID?: string, localPath: string }
 */
export function getImageLoadConfig(key) {
  // 1. 强制本地加载的图片（加载页背景）
  if (key === 'bg-001-loading') {
    return {
      type: 'local',
      localPath: 'images/backgrounds/bg-001-loading.png'
    };
  }
  
  // 2. 检查是否在必预载列表中
  if (PRELOAD_CLOUD_FILE_IDS[key]) {
    return {
      type: 'cloud',
      fileID: PRELOAD_CLOUD_FILE_IDS[key],
      cacheKey: key
    };
  }
  
  // 3. 尝试从云存储缓存记录中获取 fileID
  const fileID = getCloudFileID(key);
  if (fileID) {
    return {
      type: 'cloud',
      fileID: fileID,
      cacheKey: key
    };
  }
  
  // 4. 回退到本地加载
  const localPath = getLocalImagePath(key);
  return {
    type: 'local',
    localPath
  };
}

/**
 * 获取本地图片路径（动态构建，避免编译检查）
 * key 与文件名保持一致（不含扩展名）
 */
function getLocalImagePath(key) {
  const parts = ['images'];
  
  // UI 图标 (ui-icon-locked → images/ui/icon/ui-icon-locked.png)
  if (key.startsWith('ui-icon-')) {
    parts.push('ui', 'icon', `${key}.png`);
    return parts.join('/');
  }
  
  // 主页背景 (bg-stage1-home → images/backgrounds/bg-stage1-home.png)
  if (key.startsWith('bg-stage') && key.endsWith('-home')) {
    parts.push('backgrounds', `${key}.png`);
    return parts.join('/');
  }
  
  // 标题和标签 (bg_game_title → images/backgrounds/bg_game_title.png)
  if (key.startsWith('bg_')) {
    parts.push('backgrounds', `${key}.png`);
    return parts.join('/');
  }
  
  // 关卡图片 (game_stage1_l1_home → images/game/game_stage1_l1_home.png)
  // 也支持 stage1_l1_home → images/game/stage1_l1_home.png
  if (key.startsWith('game_stage') && key.endsWith('_home')) {
    parts.push('game', `${key}.png`);
    return parts.join('/');
  }
  if (key.startsWith('stage') && key.includes('_l') && key.endsWith('_home')) {
    parts.push('game', `${key}.png`);
    return parts.join('/');
  }
  
  // 污垢图片 (dirt_paper → images/ui/dirty/ui_dirty_paper.png)
  if (key.startsWith('dirt_')) {
    const dirtType = key.replace('dirt_', '');
    parts.push('ui', 'dirty', `ui_dirty_${dirtType}.png`);
    return parts.join('/');
  }
  
  return null;
}

/**
 * 根据阶段和关卡生成 key
 * key 与文件名保持一致（不含扩展名）: game_stage1_l1_home
 */
export function getLevelImageKey(stage, level) {
  return `game_stage${stage}_l${level}_home`;
}

/**
 * 获取关卡图片配置
 * 优先从 LevelConfig 获取 homeImagePath（完整的云存储 fileID）
 */
export function getLevelImageConfig(stage, level) {
  // 动态导入 LevelConfig 避免循环依赖
  const { getLevel } = require('../config/LevelConfig');
  const levelConfig = getLevel(stage, level);
  
  if (levelConfig && levelConfig.homeImagePath) {
    // 使用 LevelConfig 中配置的完整云存储路径
    return {
      type: 'cloud',
      fileID: levelConfig.homeImagePath,
      cacheKey: getLevelImageKey(stage, level),
      localPath: null  // 有云存储路径时不使用本地路径
    };
  }
  
  // 后备：使用 key 生成配置
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
  getAllPreloadImages,
  getImageLoadConfig,
  getCloudFileID,
  getLevelImageKey,
  getLevelImageConfig,
  isPreloadCloudImage
};

// CommonJS 兼容性导出（用于 require）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PRELOAD_CLOUD_FILE_IDS,
    getAllPreloadImages,
    getImageLoadConfig,
    getCloudFileID,
    getLevelImageKey,
    getLevelImageConfig,
    isPreloadCloudImage
  };
}
