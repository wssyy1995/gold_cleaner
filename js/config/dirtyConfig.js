/**
 * DirtyConfig 污垢类型配置
 * 定义所有污垢类型的属性和清洁配方
 */

// 污垢类型定义
export const DIRT_TYPES = {
  preset_dust: { 
    name: '灰尘', 
    color: '#8B4513', 
    difficulty: 1,
    recipes: [['cloth']],
    operate_type: 'wipe'
  },
  paper:{
    name: '纸团',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/dirty/ui_dirty_paper.png',
    color: '#8B4513', 
    difficulty: 1,
    recipes: [['rubbish_bin']],
    operate_type: 'throw',
    scale: 1
  },
  paper2:{
    name: '纸团2',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/dirty/ui_dirty_paper2.png',
    color: '#8B4513', 
    difficulty: 1,
    recipes: [['rubbish_bin']],
    operate_type: 'throw',
    scale: 0.7
  },
  paper3:{
    name: '纸团3',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/dirty/ui_dirty_paper3.png',
    color: '#8B4513', 
    difficulty: 1,
    recipes: [['rubbish_bin']],
    operate_type: 'throw',
    scale: 1
  },
  apple:{
    name: '苹果',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/dirty/ui_dirty_apple.png',
    color: '#8B4513', 
    difficulty: 1,
    recipes: [['rubbish_bin']],
    operate_type: 'throw',
    scale: 0.7
  },
  banana:{
    name: '香蕉',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/dirty/ui_dirty_banana.png',
    color: '#8B4513', 
    difficulty: 1,
    recipes: [['rubbish_bin']],
    operate_type: 'throw',
    scale: 0.8
  },
  shred_paper:{
    name: '碎纸屑',
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/dirty/ui_dirty_shred_paper.png',
    color: '#8B4513', 
    difficulty: 1,
    recipes: [['broom']],
    operate_type: 'sweep',
    scale: 4
  },
  socks:{
    name: '脏袜子', 
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/dirty/ui_dirty_socks.png',
    color: '#8B4513', 
    difficulty: 1,
    recipes: [['dc_basket']],
    operate_type: 'throw',
    scale: 1.1
  },
  waterstain: { 
    name: '水渍污渍', 
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/dirty/ui_dirty_waterstain.png',
    color: '#654321', 
    difficulty: 2,
    scale: 2,
    recipes: [['cloth']],
    operate_type: 'wipe'
  },
  blackmark: { 
    name: '黑印', 
    imgPath: 'cloud://cloudbase-0gku48938517adc7.636c-cloudbase-0gku48938517adc7-1416711846/images/ui/dirty/ui_dirty_blackmark.png',
    color: '#654321', 
    difficulty: 2,
    scale: 1,
    recipes: [['cloth']],
    operate_type: 'wipe'
  },
  grime: { 
    name: '油渍', 
    color: '#3E2723', 
    difficulty: 3,
    recipes: [['common_spray', 'brush','cloth']],
    scale: 1
  },
  mold: {
    name: '霉斑',
    color: '#2E7D32',
    difficulty: 4,
    recipes: [['spray', 'brush'], ['magic_sponge']],
    scale: 1
  },
  rust: {
    name: '锈迹',
    color: '#C62828',
    difficulty: 5,
    recipes: [['rust_remover', 'brush'], ['spray', 'sponge']],
    scale: 1
  },
  leaves: {
    name: '落叶',
    color: '#D84315',
    difficulty: 2,
    recipes: [['broom']],
    operate_type: 'sweep',
    scale: 1.2
  }
};

/**
 * 获取污垢类型配置
 * @param {string} type - 污垢类型
 * @returns {Object|null}
 */
export function getDirtType(type) {
  return DIRT_TYPES[type] || null;
}

/**
 * 获取所有污垢类型
 * @returns {Object}
 */
export function getAllDirtTypes() {
  return DIRT_TYPES;
}

// 全局污垢图片缓存 - 供 LoadingScene 和 GameplayScene 共享
export const GlobalDirtImageCache = {
  _cache: {},
  
  get(type) {
    return this._cache[type] || null;
  },
  
  set(type, img) {
    this._cache[type] = img;
  },
  
  has(type) {
    return !!this._cache[type];
  }
};

export default {
  DIRT_TYPES,
  getDirtType,
  getAllDirtTypes,
  GlobalDirtImageCache
};
