/**
 * EventEmitter 事件系统
 * 提供解耦的模块间通信机制
 */

class EventEmitter {
  constructor() {
    // 事件监听器存储
    this._events = {};
    // 一次性事件监听器
    this._onceEvents = {};
  }

  /**
   * 监听事件
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   * @returns {EventEmitter}
   */
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Listener must be a function');
    }

    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);

    return this;
  }

  /**
   * 监听一次性事件
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   * @returns {EventEmitter}
   */
  once(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Listener must be a function');
    }

    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };
    onceWrapper._originalListener = listener;

    this.on(event, onceWrapper);

    return this;
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   * @returns {EventEmitter}
   */
  off(event, listener) {
    if (!this._events[event]) {
      return this;
    }

    const listeners = this._events[event];
    const index = listeners.findIndex(l => 
      l === listener || l._originalListener === listener
    );

    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      delete this._events[event];
    }

    return this;
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {...any} args - 传递给监听器的参数
   * @returns {boolean}
   */
  emit(event, ...args) {
    if (!this._events[event]) {
      return false;
    }

    const listeners = this._events[event].slice();
    for (const listener of listeners) {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error(`[EventEmitter] Error in listener for "${event}":`, error);
      }
    }

    return true;
  }

  /**
   * 获取指定事件的监听器数量
   * @param {string} event - 事件名称
   * @returns {number}
   */
  listenerCount(event) {
    return this._events[event] ? this._events[event].length : 0;
  }

  /**
   * 获取所有事件名称
   * @returns {string[]}
   */
  eventNames() {
    return Object.keys(this._events);
  }

  /**
   * 移除指定事件的所有监听器
   * @param {string} event - 事件名称
   * @returns {EventEmitter}
   */
  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }
}

// 创建全局事件总线
export const globalEvent = new EventEmitter();

export default EventEmitter;
