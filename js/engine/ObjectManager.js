/**
 * ObjectManager 对象管理器
 * 负责任务 2.3.1 ~ 2.3.4
 * - 实现对象的创建、销毁
 * - 实现对象的生命周期管理
 * - 实现对象的排序渲染
 * - 实现对象池（ObjectPool）
 */

import { globalEvent } from '../core/EventEmitter';

/**
 * 对象池类
 */
class ObjectPool {
  /**
   * 构造函数
   * @param {Function} factory - 对象工厂函数
   * @param {number} initialSize - 初始大小
   * @param {number} maxSize - 最大大小
   */
  constructor(factory, initialSize = 10, maxSize = 100) {
    this.factory = factory;
    this.maxSize = maxSize;
    this.pool = [];
    this.activeObjects = new Set();
    this._createCount = 0;

    // 预创建对象
    for (let i = 0; i < initialSize; i++) {
      this._createObject();
    }
  }

  /**
   * 创建新对象
   */
  _createObject() {
    if (this.pool.length + this.activeObjects.size >= this.maxSize) {
      return null;
    }
    const obj = this.factory();
    obj._pooled = true;
    obj._pool = this;
    this.pool.push(obj);
    this._createCount++;
    return obj;
  }

  /**
   * 获取对象
   * @returns {Object|null}
   */
  acquire() {
    let obj = this.pool.pop();
    
    if (!obj) {
      obj = this._createObject();
    }

    if (obj) {
      this.activeObjects.add(obj);
      
      // 重置对象状态
      if (obj.reset) {
        obj.reset();
      }
      
      obj._active = true;
    }

    return obj;
  }

  /**
   * 释放对象回池中
   * @param {Object} obj - 对象
   */
  release(obj) {
    if (!obj || !this.activeObjects.has(obj)) {
      return false;
    }

    this.activeObjects.delete(obj);
    obj._active = false;

    // 清理对象
    if (obj.cleanup) {
      obj.cleanup();
    }

    // 如果池未满，放回池中
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }

    return true;
  }

  /**
   * 释放所有活动对象
   */
  releaseAll() {
    for (const obj of this.activeObjects) {
      if (obj.cleanup) {
        obj.cleanup();
      }
      obj._active = false;
      this.pool.push(obj);
    }
    this.activeObjects.clear();
  }

  /**
   * 清空对象池
   */
  clear() {
    this.releaseAll();
    this.pool = [];
    this._createCount = 0;
  }

  /**
   * 获取池大小
   * @returns {Object}
   */
  getStats() {
    return {
      available: this.pool.length,
      active: this.activeObjects.size,
      total: this.pool.length + this.activeObjects.size,
      max: this.maxSize,
      created: this._createCount
    };
  }
}

/**
 * 对象管理器类
 */
class ObjectManager {
  constructor() {
    // 2.3.1 实现对象的创建、销毁
    // 所有游戏对象的集合
    this._objects = new Map();
    
    // 按类型分组的对象
    this._objectsByType = new Map();
    
    // 按标签分组的对象
    this._objectsByTag = new Map();
    
    // 2.3.3 实现对象的排序渲染
    // 按zIndex排序的对象列表（缓存）
    this._sortedObjects = [];
    // 是否需要重新排序
    this._needsSort = false;

    // 2.3.4 实现对象池（ObjectPool）
    // 对象池集合
    this._pools = new Map();

    // 待销毁的对象队列
    this._destroyQueue = [];
    
    // 待添加的对象队列
    this._addQueue = [];

    // 对象计数器
    this._objectCounter = 0;

    // 生命周期状态
    this._isUpdating = false;
  }

  /**
   * 初始化对象管理器
   */
  init() {
    console.log('[ObjectManager] 初始化对象管理器');
  }

  /**
   * 2.3.1 实现对象的创建、销毁
   * 创建对象
   * @param {Class} ObjectClass - 对象类
   * @param {Object} options - 构造选项
   * @returns {Object}
   */
  create(ObjectClass, options = {}) {
    let obj;

    // 检查是否有对应的对象池
    const className = ObjectClass.name;
    const pool = this._pools.get(className);
    
    if (pool) {
      // 从对象池获取
      obj = pool.acquire();
      if (obj) {
        // 重新初始化
        if (obj.init) {
          obj.init(options);
        }
      }
    }

    if (!obj) {
      // 创建新对象
      obj = new ObjectClass(options);
    }

    // 分配唯一ID
    obj._id = ++this._objectCounter;
    obj._manager = this;

    // 添加到队列（避免在更新循环中直接添加）
    if (this._isUpdating) {
      this._addQueue.push(obj);
    } else {
      this._addObject(obj);
    }

    // 2.3.2 实现对象的生命周期管理
    // 调用初始化生命周期
    if (obj.onCreate) {
      obj.onCreate();
    }

    globalEvent.emit('object:created', obj);

    return obj;
  }

  /**
   * 添加对象到管理
   * @param {Object} obj - 对象
   */
  _addObject(obj) {
    this._objects.set(obj._id, obj);

    // 按类型分组
    const type = obj.constructor.name;
    if (!this._objectsByType.has(type)) {
      this._objectsByType.set(type, new Set());
    }
    this._objectsByType.get(type).add(obj);

    // 按标签分组
    if (obj.tag) {
      if (!this._objectsByTag.has(obj.tag)) {
        this._objectsByTag.set(obj.tag, new Set());
      }
      this._objectsByTag.get(obj.tag).add(obj);
    }

    // 标记需要排序
    this._needsSort = true;
  }

  /**
   * 2.3.1 实现对象的创建、销毁
   * 销毁对象
   * @param {Object} obj - 对象
   * @param {boolean} immediate - 是否立即销毁
   */
  destroy(obj, immediate = false) {
    if (!obj || !this._objects.has(obj._id)) {
      return false;
    }

    // 标记为待销毁
    obj._destroyed = true;

    if (immediate) {
      this._doDestroy(obj);
    } else {
      // 加入销毁队列，延迟到更新循环结束后销毁
      this._destroyQueue.push(obj);
    }

    return true;
  }

  /**
   * 立即销毁对象
   * @param {Object} obj - 对象
   */
  _doDestroy(obj) {
    if (!obj._destroyed) return;

    // 2.3.2 实现对象的生命周期管理
    // 调用销毁生命周期
    if (obj.onDestroy) {
      obj.onDestroy();
    }

    // 从集合中移除
    this._objects.delete(obj._id);

    // 从类型分组中移除
    const type = obj.constructor.name;
    const typeSet = this._objectsByType.get(type);
    if (typeSet) {
      typeSet.delete(obj);
    }

    // 从标签分组中移除
    if (obj.tag) {
      const tagSet = this._objectsByTag.get(obj.tag);
      if (tagSet) {
        tagSet.delete(obj);
      }
    }

    // 2.3.4 实现对象池（ObjectPool）
    // 如果对象来自对象池，归还
    if (obj._pooled && obj._pool) {
      obj._pool.release(obj);
    }

    globalEvent.emit('object:destroyed', obj);
  }

  /**
   * 根据ID获取对象
   * @param {number} id - 对象ID
   * @returns {Object|undefined}
   */
  getById(id) {
    return this._objects.get(id);
  }

  /**
   * 根据类型获取对象
   * @param {Class} ObjectClass - 对象类
   * @returns {Array}
   */
  getByType(ObjectClass) {
    const set = this._objectsByType.get(ObjectClass.name);
    return set ? Array.from(set) : [];
  }

  /**
   * 根据标签获取对象
   * @param {string} tag - 标签
   * @returns {Array}
   */
  getByTag(tag) {
    const set = this._objectsByTag.get(tag);
    return set ? Array.from(set) : [];
  }

  /**
   * 查找对象（根据条件）
   * @param {Function} predicate - 判断函数
   * @returns {Object|undefined}
   */
  find(predicate) {
    for (const obj of this._objects.values()) {
      if (predicate(obj)) {
        return obj;
      }
    }
    return undefined;
  }

  /**
   * 查找所有符合条件的对象
   * @param {Function} predicate - 判断函数
   * @returns {Array}
   */
  findAll(predicate) {
    const results = [];
    for (const obj of this._objects.values()) {
      if (predicate(obj)) {
        results.push(obj);
      }
    }
    return results;
  }

  /**
   * 2.3.2 实现对象的生命周期管理
   * 更新所有对象
   * @param {number} deltaTime - 时间间隔
   */
  update(deltaTime) {
    this._isUpdating = true;

    // 更新所有活动对象
    for (const obj of this._objects.values()) {
      if (obj.active !== false && obj._destroyed !== true) {
        // 调用更新生命周期
        if (obj.onUpdate) {
          obj.onUpdate(deltaTime);
        }
        
        // 更新组件
        if (obj.components) {
          for (const component of obj.components.values()) {
            if (component.active !== false && component.update) {
              component.update(deltaTime);
            }
          }
        }
      }
    }

    this._isUpdating = false;

    // 处理销毁队列
    this._processDestroyQueue();

    // 处理添加队列
    this._processAddQueue();
  }

  /**
   * 2.3.3 实现对象的排序渲染
   * 渲染所有对象
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  render(ctx) {
    // 确保对象已排序
    this._ensureSorted();

    // 渲染所有可见对象
    for (const obj of this._sortedObjects) {
      if (obj.visible !== false && obj.active !== false && obj._destroyed !== true) {
        ctx.save();

        // 应用对象变换
        if (obj.x !== undefined && obj.y !== undefined) {
          ctx.translate(obj.x, obj.y);
        }
        if (obj.rotation) {
          ctx.rotate(obj.rotation);
        }
        if (obj.scaleX !== undefined && obj.scaleY !== undefined) {
          ctx.scale(obj.scaleX, obj.scaleY);
        }
        if (obj.alpha !== undefined) {
          ctx.globalAlpha = obj.alpha;
        }

        // 调用渲染生命周期
        if (obj.onRender) {
          obj.onRender(ctx);
        }

        // 渲染组件
        if (obj.components) {
          for (const component of obj.components.values()) {
            if (component.visible !== false && component.render) {
              component.render(ctx);
            }
          }
        }

        ctx.restore();
      }
    }
  }

  /**
   * 确保对象已排序
   */
  _ensureSorted() {
    if (this._needsSort) {
      this._sortedObjects = Array.from(this._objects.values());
      
      // 按zIndex排序，zIndex相同则按id排序（保持创建顺序）
      this._sortedObjects.sort((a, b) => {
        const zA = a.zIndex || 0;
        const zB = b.zIndex || 0;
        if (zA !== zB) {
          return zA - zB;
        }
        return a._id - b._id;
      });

      this._needsSort = false;
    }
  }

  /**
   * 标记需要重新排序
   */
  markNeedsSort() {
    this._needsSort = true;
  }

  /**
   * 处理销毁队列
   */
  _processDestroyQueue() {
    for (const obj of this._destroyQueue) {
      this._doDestroy(obj);
    }
    this._destroyQueue = [];
  }

  /**
   * 处理添加队列
   */
  _processAddQueue() {
    for (const obj of this._addQueue) {
      this._addObject(obj);
    }
    this._addQueue = [];
  }

  /**
   * 2.3.4 实现对象池（ObjectPool）
   * 注册对象池
   * @param {Class} ObjectClass - 对象类
   * @param {number} initialSize - 初始大小
   * @param {number} maxSize - 最大大小
   */
  registerPool(ObjectClass, initialSize = 10, maxSize = 100) {
    const className = ObjectClass.name;
    
    if (this._pools.has(className)) {
      console.warn(`[ObjectManager] 对象池 "${className}" 已存在`);
      return;
    }

    const pool = new ObjectPool(
      () => new ObjectClass(),
      initialSize,
      maxSize
    );

    this._pools.set(className, pool);
    console.log(`[ObjectManager] 注册对象池: ${className}`);
  }

  /**
   * 获取对象池
   * @param {Class} ObjectClass - 对象类
   * @returns {ObjectPool|undefined}
   */
  getPool(ObjectClass) {
    return this._pools.get(ObjectClass.name);
  }

  /**
   * 清空对象池
   * @param {Class} ObjectClass - 对象类
   */
  clearPool(ObjectClass) {
    const pool = this._pools.get(ObjectClass.name);
    if (pool) {
      pool.clear();
    }
  }

  /**
   * 清空所有对象池
   */
  clearAllPools() {
    for (const pool of this._pools.values()) {
      pool.clear();
    }
  }

  /**
   * 获取对象池统计
   * @returns {Object}
   */
  getPoolStats() {
    const stats = {};
    for (const [name, pool] of this._pools) {
      stats[name] = pool.getStats();
    }
    return stats;
  }

  /**
   * 获取所有对象数量
   * @returns {number}
   */
  getObjectCount() {
    return this._objects.size;
  }

  /**
   * 清空所有对象
   */
  clear() {
    // 先清空销毁队列
    this._processDestroyQueue();

    // 销毁所有对象
    for (const obj of this._objects.values()) {
      obj._destroyed = true;
      if (obj.onDestroy) {
        obj.onDestroy();
      }
    }

    this._objects.clear();
    this._objectsByType.clear();
    this._objectsByTag.clear();
    this._sortedObjects = [];
    this._addQueue = [];
    this._destroyQueue = [];
  }

  /**
   * 销毁对象管理器
   */
  destroy() {
    this.clear();
    this.clearAllPools();
    this._pools.clear();
  }
}

export { ObjectPool };
export default ObjectManager;
