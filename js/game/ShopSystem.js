/**
 * ShopSystem 商城系统
 * 负责任务 3.5.1 ~ 3.5.5
 * - 3.5.1 设计商城商品数据结构
 * - 3.5.2 实现商品购买逻辑
 * - 3.5.3 实现购买成功提示
 * - 3.5.4 实现商品列表管理
 * - 3.5.5 实现已购买商品标记
 */

import { globalEvent } from '../core/EventEmitter';

class ShopSystem {
  constructor() {
    // 3.5.1 设计商城商品数据结构
    // 商品配置
    this._products = new Map();
    
    // 商品分类
    this.categories = {
      TOOL: 'tool',         // 工具
      CONSUMABLE: 'consumable', // 消耗品
      SPECIAL: 'special'    // 特殊/礼包
    };

    // 3.5.5 实现已购买商品标记
    // 已购买商品记录
    this.purchasedProducts = new Set();
    
    // 购买限制记录（如限购）
    this.purchaseLimits = new Map(); // { productId: { limit, purchased } }

    // 购买历史
    this.purchaseHistory = [];

    // 限时优惠
    this.promotions = new Map();

    // 商品排序
    this._sortOrder = [];
  }

  /**
   * 初始化商城系统
   */
  init() {
    console.log('[ShopSystem] 初始化商城系统');
  }

  /**
   * 3.5.1 设计商城商品数据结构
   * 注册商品
   * @param {string} productId - 商品ID
   * @param {Object} config - 商品配置
   */
  registerProduct(productId, config) {
    const product = {
      id: productId,
      name: config.name || '未知道具',
      description: config.description || '',
      icon: config.icon || '',
      category: config.category || this.categories.CONSUMABLE,
      
      // 价格
      price: {
        coins: config.price?.coins || 0,
        gems: config.price?.gems || 0,
        realMoney: config.price?.realMoney || 0 // 真实货币（分）
      },
      
      // 商品内容
      content: config.content || {
        type: 'item', // item, tool, coins, gems
        itemId: productId,
        count: 1
      },
      
      // 限制
      limit: {
        maxPurchase: config.limit?.maxPurchase || -1, // -1 = 无限
        requireLevel: config.limit?.requireLevel || 0,
        requireVip: config.limit?.requireVip || 0
      },
      
      // 标签
      tags: config.tags || [], // 'new', 'hot', 'discount', 'limited'
      
      // 排序权重
      sortOrder: config.sortOrder || 0,
      
      // 是否启用
      enabled: config.enabled !== false,
      
      // 上架时间（用于限时商品）
      startTime: config.startTime || null,
      endTime: config.endTime || null
    };

    this._products.set(productId, product);
    
    // 更新排序
    this._updateSortOrder();
    
    console.log(`[ShopSystem] 注册商品: ${productId}`);
  }

  /**
   * 批量注册商品
   * @param {Object} products - 商品配置对象
   */
  registerProducts(products) {
    for (const [id, config] of Object.entries(products)) {
      this.registerProduct(id, config);
    }
  }

  /**
   * 获取商品信息
   * @param {string} productId - 商品ID
   * @returns {Object|undefined}
   */
  getProduct(productId) {
    return this._products.get(productId);
  }

  /**
   * 3.5.4 实现商品列表管理
   * 获取商品列表
   * @param {Object} filters - 过滤条件
   * @returns {Array}
   */
  getProductList(filters = {}) {
    const {
      category = null,
      tag = null,
      affordable = false, // 只显示买得起的
      playerData = null   // 玩家数据（用于检查解锁条件）
    } = filters;

    let list = [];

    for (const [id, product] of this._products) {
      // 检查是否启用
      if (!product.enabled) continue;

      // 检查分类
      if (category && product.category !== category) continue;

      // 检查标签
      if (tag && !product.tags.includes(tag)) continue;

      // 检查时间限制
      const now = Date.now();
      if (product.startTime && now < product.startTime) continue;
      if (product.endTime && now > product.endTime) continue;

      // 检查等级限制
      if (playerData && product.limit.requireLevel > 0) {
        if (playerData.level < product.limit.requireLevel) continue;
      }

      // 检查是否买得起
      if (affordable && playerData) {
        if (!this._canAfford(product, playerData)) continue;
      }

      // 获取购买状态
      const status = this._getProductStatus(product, playerData);

      list.push({
        ...product,
        status
      });
    }

    // 排序
    list.sort((a, b) => {
      // 已售罄的放后面
      if (a.status.soldOut !== b.status.soldOut) {
        return a.status.soldOut ? 1 : -1;
      }
      // 按sortOrder排序
      return b.sortOrder - a.sortOrder;
    });

    return list;
  }

  /**
   * 获取分类列表
   * @returns {Array}
   */
  getCategories() {
    return [
      { id: this.categories.TOOL, name: '工具', icon: '🔧' },
      { id: this.categories.CONSUMABLE, name: '消耗品', icon: '📦' },
      { id: this.categories.SPECIAL, name: '特惠', icon: '✨' }
    ];
  }

  /**
   * 3.5.5 实现已购买商品标记
   * 获取商品状态
   * @param {Object} product - 商品
   * @param {Object} playerData - 玩家数据
   * @returns {Object}
   */
  _getProductStatus(product, playerData) {
    const status = {
      owned: false,      // 是否已拥有
      soldOut: false,    // 是否售罄
      canAfford: true,   // 是否买得起
      discounted: false, // 是否打折
      locked: false,     // 是否锁定
      lockReason: ''     // 锁定原因
    };

    // 检查是否已拥有（针对工具类）
    if (product.category === this.categories.TOOL && playerData) {
      if (playerData.ownedTools?.includes(product.content.itemId)) {
        status.owned = true;
      }
    }

    // 3.5.5 实现已购买商品标记
    // 检查是否已购买
    if (this.purchasedProducts.has(product.id)) {
      status.owned = true;
    }

    // 检查购买限制
    const limitInfo = this.purchaseLimits.get(product.id);
    if (product.limit.maxPurchase > 0 && limitInfo) {
      if (limitInfo.purchased >= product.limit.maxPurchase) {
        status.soldOut = true;
      }
    }

    // 检查是否买得起
    if (playerData) {
      status.canAfford = this._canAfford(product, playerData);
    }

    // 检查是否打折
    if (this.promotions.has(product.id)) {
      status.discounted = true;
    }

    // 检查等级锁定
    if (product.limit.requireLevel > 0 && playerData) {
      if (playerData.level < product.limit.requireLevel) {
        status.locked = true;
        status.lockReason = `需要等级 ${product.limit.requireLevel}`;
      }
    }

    return status;
  }

  /**
   * 检查是否买得起
   * @param {Object} product - 商品
   * @param {Object} playerData - 玩家数据
   * @returns {boolean}
   */
  _canAfford(product, playerData) {
    if (product.price.coins > 0 && playerData.coins < product.price.coins) {
      return false;
    }
    if (product.price.gems > 0 && playerData.gems < product.price.gems) {
      return false;
    }
    return true;
  }

  /**
   * 3.5.2 实现商品购买逻辑
   * 购买商品
   * @param {string} productId - 商品ID
   * @param {Object} playerData - 玩家数据
   * @param {Function} spendCallback - 消费回调 (type, amount) => boolean
   * @returns {Object}
   */
  buyProduct(productId, playerData, spendCallback) {
    const product = this._products.get(productId);
    if (!product) {
      return { success: false, error: 'product_not_found' };
    }

    // 检查是否启用
    if (!product.enabled) {
      return { success: false, error: 'product_disabled' };
    }

    // 检查是否已拥有（一次性购买）
    if (product.limit.maxPurchase === 1) {
      if (this.purchasedProducts.has(productId)) {
        return { success: false, error: 'already_owned' };
      }
    }

    // 检查购买限制
    if (product.limit.maxPurchase > 0) {
      const limitInfo = this.purchaseLimits.get(productId) || { purchased: 0 };
      if (limitInfo.purchased >= product.limit.maxPurchase) {
        return { success: false, error: 'purchase_limit_reached' };
      }
    }

    // 检查等级要求
    if (product.limit.requireLevel > 0) {
      if (playerData.level < product.limit.requireLevel) {
        return { success: false, error: 'level_too_low' };
      }
    }

    // 检查货币
    let spent = { coins: 0, gems: 0 };

    // 扣除金币
    if (product.price.coins > 0) {
      const success = spendCallback('coins', product.price.coins);
      if (!success) {
        return { success: false, error: 'not_enough_coins' };
      }
      spent.coins = product.price.coins;
    }

    // 扣除钻石
    if (product.price.gems > 0) {
      const success = spendCallback('gems', product.price.gems);
      if (!success) {
        // 回滚金币
        if (spent.coins > 0) {
          spendCallback('coins', -spent.coins);
        }
        return { success: false, error: 'not_enough_gems' };
      }
      spent.gems = product.price.gems;
    }

    // 处理购买成功
    return this._processPurchaseSuccess(productId, product, playerData);
  }

  /**
   * 3.5.3 实现购买成功提示
   * 处理购买成功
   * @param {string} productId - 商品ID
   * @param {Object} product - 商品信息
   * @param {Object} playerData - 玩家数据
   * @returns {Object}
   */
  _processPurchaseSuccess(productId, product, playerData) {
    // 标记为已购买
    if (product.limit.maxPurchase === 1) {
      this.purchasedProducts.add(productId);
    }

    // 更新购买限制
    if (product.limit.maxPurchase > 0) {
      const limitInfo = this.purchaseLimits.get(productId) || { limit: product.limit.maxPurchase, purchased: 0 };
      limitInfo.purchased++;
      this.purchaseLimits.set(productId, limitInfo);
    }

    // 记录购买历史
    const record = {
      productId,
      productName: product.name,
      price: { ...product.price },
      content: { ...product.content },
      time: Date.now()
    };
    this.purchaseHistory.push(record);

    console.log(`[ShopSystem] 购买成功: ${productId}`);

    // 触发事件
    globalEvent.emit('shop:purchaseSuccess', {
      productId,
      product,
      playerData
    });

    return {
      success: true,
      productId,
      product,
      content: product.content
    };
  }

  /**
   * 获取购买结果提示信息
   * @param {Object} result - 购买结果
   * @returns {string}
   */
  getPurchaseMessage(result) {
    if (!result.success) {
      const errorMessages = {
        product_not_found: '商品不存在',
        product_disabled: '商品已下架',
        already_owned: '您已拥有该商品',
        purchase_limit_reached: '已达到购买上限',
        level_too_low: '等级不足',
        not_enough_coins: '金币不足',
        not_enough_gems: '钻石不足'
      };
      return errorMessages[result.error] || '购买失败';
    }

    const product = result.product;
    return `成功购买 ${product.name}`;
  }

  /**
   * 设置限时优惠
   * @param {string} productId - 商品ID
   * @param {Object} promotion - 优惠信息
   */
  setPromotion(productId, promotion) {
    this.promotions.set(productId, {
      discount: promotion.discount || 1, // 折扣率 0-1
      startTime: promotion.startTime,
      endTime: promotion.endTime,
      reason: promotion.reason || ''
    });
  }

  /**
   * 获取商品实际价格（考虑折扣）
   * @param {string} productId - 商品ID
   * @returns {Object}
   */
  getActualPrice(productId) {
    const product = this._products.get(productId);
    if (!product) return null;

    let price = { ...product.price };

    // 应用折扣
    const promotion = this.promotions.get(productId);
    if (promotion) {
      const now = Date.now();
      if ((!promotion.startTime || now >= promotion.startTime) &&
          (!promotion.endTime || now <= promotion.endTime)) {
        price.coins = Math.floor(price.coins * promotion.discount);
        price.gems = Math.floor(price.gems * promotion.discount);
      }
    }

    return price;
  }

  /**
   * 搜索商品
   * @param {string} keyword - 关键词
   * @returns {Array}
   */
  searchProducts(keyword) {
    if (!keyword) return this.getProductList();
    
    const lowerKeyword = keyword.toLowerCase();
    const list = this.getProductList();
    
    return list.filter(product => 
      product.name.toLowerCase().includes(lowerKeyword) ||
      product.description.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 更新排序
   */
  _updateSortOrder() {
    this._sortOrder = Array.from(this._products.keys())
      .sort((a, b) => {
        const productA = this._products.get(a);
        const productB = this._products.get(b);
        return productB.sortOrder - productA.sortOrder;
      });
  }

  /**
   * 获取推荐商品
   * @param {number} count - 数量
   * @returns {Array}
   */
  getRecommendedProducts(count = 4) {
    const list = this.getProductList({ tag: 'hot' });
    return list.slice(0, count);
  }

  /**
   * 获取新商品
   * @returns {Array}
   */
  getNewProducts() {
    return this.getProductList({ tag: 'new' });
  }

  /**
   * 获取购买历史
   * @param {number} limit - 限制数量
   * @returns {Array}
   */
  getPurchaseHistory(limit = 20) {
    return this.purchaseHistory.slice(-limit).reverse();
  }

  /**
   * 保存数据
   * @returns {Object}
   */
  saveData() {
    return {
      purchasedProducts: Array.from(this.purchasedProducts),
      purchaseLimits: Array.from(this.purchaseLimits.entries()),
      purchaseHistory: this.purchaseHistory.slice(-50)
    };
  }

  /**
   * 加载数据
   * @param {Object} data - 数据
   */
  loadData(data) {
    if (data.purchasedProducts) {
      this.purchasedProducts = new Set(data.purchasedProducts);
    }
    if (data.purchaseLimits) {
      this.purchaseLimits = new Map(data.purchaseLimits);
    }
    if (data.purchaseHistory) {
      this.purchaseHistory = data.purchaseHistory;
    }
  }

  /**
   * 重置
   */
  reset() {
    this.purchasedProducts.clear();
    this.purchaseLimits.clear();
    this.purchaseHistory = [];
    this.promotions.clear();
  }

  /**
   * 销毁
   */
  destroy() {
    this.reset();
    this._products.clear();
  }
}

export default ShopSystem;
