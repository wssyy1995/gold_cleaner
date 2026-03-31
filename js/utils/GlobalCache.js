/**
 * GlobalCache 全局缓存模块
 * 供多个场景共享的图片缓存
 * 避免场景之间的循环依赖
 */

// ==================== 标题图片缓存 ====================
export const GlobalTitleImageCache = {
  _cache: {},
  
  save(key, img) {
    this._cache[key] = { img, loaded: !!img };
  },
  
  get(key) {
    return this._cache[key] || null;
  },
  
  has(key) {
    return !!this._cache[key];
  },
  
  clear() {
    this._cache = {};
  }
};

// ==================== 关卡预览图缓存 ====================
export const GlobalPreviewCache = {
  // key: "game_stage1_l1_home" -> { img, loaded }
  _cache: {},
  
  // 保存预览图
  save(key, img) {
    this._cache[key] = { img, loaded: true };
  },
  
  // 获取预览图
  get(key) {
    return this._cache[key] || null;
  },
  
  // 检查是否存在
  has(key) {
    return !!this._cache[key];
  },
  
  // 清除缓存
  clear() {
    this._cache = {};
  }
};

// ==================== 背景图缓存 ====================
export const GlobalBgCache = {
  bgImage: null,
  bgLoaded: false,
  currentStage: null,
  
  // 保存背景图
  save(bgImage, stage) {
    this.bgImage = bgImage;
    this.bgLoaded = !!bgImage;
    this.currentStage = stage;
  },
  
  // 获取背景图（如果 stage 匹配）
  get(stage) {
    if (this.bgImage && this.currentStage === stage) {
      return { bgImage: this.bgImage, bgLoaded: true };
    }
    return null;
  },
  
  // 清除缓存
  clear() {
    this.bgImage = null;
    this.bgLoaded = false;
    this.currentStage = null;
  }
};

// ==================== 底部按钮缓存 ====================
export const GlobalBottomBtnCache = {
  _cache: {},
  
  save(key, img) {
    this._cache[key] = { img, loaded: !!img };
  },
  
  get(key) {
    return this._cache[key] || null;
  },
  
  clear() {
    this._cache = {};
  }
};

// ==================== 关卡状态缓存 ====================
export const GlobalLevelStateCache = {
  // key: "stage1_level1" -> { status, stars, displayStatus }
  _cache: {},
  
  // 保存关卡状态
  save(stage, levelId, status, stars = 0) {
    const key = `stage${stage}_level${levelId}`;
    this._cache[key] = { status, stars, displayStatus: status };
  },
  
  // 获取关卡状态
  get(stage, levelId) {
    const key = `stage${stage}_level${levelId}`;
    return this._cache[key] || null;
  },
  
  // 批量保存关卡列表
  saveLevels(levels) {
    levels.forEach(level => {
      this.save(level.stage, level.id, level.status, level.stars);
    });
  },
  
  // 获取所有缓存的关卡
  getAll() {
    return { ...this._cache };
  },
  
  // 清除缓存
  clear() {
    this._cache = {};
  }
};

// ==================== HomeScene 内部使用的标题缓存 ====================
// 这个缓存用于 HomeScene 内部，避免重复加载
export const GlobalTitleCache = {
  _cache: {},
  
  save(key, img) {
    this._cache[key] = { img, loaded: true };
  },
  
  get(key) {
    return this._cache[key] || null;
  },
  
  has(key) {
    return !!this._cache[key];
  },
  
  clear() {
    this._cache = {};
  }
};

export default {
  GlobalTitleImageCache,
  GlobalPreviewCache,
  GlobalBgCache,
  GlobalBottomBtnCache,
  GlobalLevelStateCache,
  GlobalTitleCache
};
