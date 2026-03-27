/**
 * Math 工具类
 * 数学基础库，提供游戏开发常用的数学工具函数
 */

const MathUtils = {
  /**
   * 角度转弧度
   * @param {number} degrees - 角度
   * @returns {number}
   */
  degToRad(degrees) {
    return degrees * Math.PI / 180;
  },

  /**
   * 弧度转角度
   * @param {number} radians - 弧度
   * @returns {number}
   */
  radToDeg(radians) {
    return radians * 180 / Math.PI;
  },

  /**
   * 线性插值
   * @param {number} a - 起始值
   * @param {number} b - 结束值
   * @param {number} t - 插值系数 (0-1)
   * @returns {number}
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /**
   * 限制数值在范围内
   * @param {number} value - 数值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number}
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * 获取两点之间的距离
   * @param {number} x1 - 点1的X坐标
   * @param {number} y1 - 点1的Y坐标
   * @param {number} x2 - 点2的X坐标
   * @param {number} y2 - 点2的Y坐标
   * @returns {number}
   */
  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * 获取两点之间的距离平方（性能优化版本）
   * @param {number} x1 - 点1的X坐标
   * @param {number} y1 - 点1的Y坐标
   * @param {number} x2 - 点2的X坐标
   * @param {number} y2 - 点2的Y坐标
   * @returns {number}
   */
  distanceSquared(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  },

  /**
   * 获取两点之间的角度
   * @param {number} x1 - 点1的X坐标
   * @param {number} y1 - 点1的Y坐标
   * @param {number} x2 - 点2的X坐标
   * @param {number} y2 - 点2的Y坐标
   * @returns {number} - 角度（弧度）
   */
  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  /**
   * 检查点是否在矩形内
   * @param {number} px - 点的X坐标
   * @param {number} py - 点的Y坐标
   * @param {number} rx - 矩形的X坐标
   * @param {number} ry - 矩形的Y坐标
   * @param {number} rw - 矩形的宽度
   * @param {number} rh - 矩形的高度
   * @returns {boolean}
   */
  pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  },

  /**
   * 检查两个矩形是否相交
   * @param {number} x1 - 矩形1的X坐标
   * @param {number} y1 - 矩形1的Y坐标
   * @param {number} w1 - 矩形1的宽度
   * @param {number} h1 - 矩形1的高度
   * @param {number} x2 - 矩形2的X坐标
   * @param {number} y2 - 矩形2的Y坐标
   * @param {number} w2 - 矩形2的宽度
   * @param {number} h2 - 矩形2的高度
   * @returns {boolean}
   */
  rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  },

  /**
   * 检查点是否在圆内
   * @param {number} px - 点的X坐标
   * @param {number} py - 点的Y坐标
   * @param {number} cx - 圆心的X坐标
   * @param {number} cy - 圆心的Y坐标
   * @param {number} radius - 圆的半径
   * @returns {boolean}
   */
  pointInCircle(px, py, cx, cy, radius) {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
  },

  /**
   * 检查两个圆是否相交
   * @param {number} x1 - 圆1的X坐标
   * @param {number} y1 - 圆1的Y坐标
   * @param {number} r1 - 圆1的半径
   * @param {number} x2 - 圆2的X坐标
   * @param {number} y2 - 圆2的Y坐标
   * @param {number} r2 - 圆2的半径
   * @returns {boolean}
   */
  circleIntersect(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distanceSquared = dx * dx + dy * dy;
    const radiusSum = r1 + r2;
    return distanceSquared <= radiusSum * radiusSum;
  },

  /**
   * 生成随机整数
   * @param {number} min - 最小值
   * @param {number} max - 最大值（不包含）
   * @returns {number}
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  },

  /**
   * 生成随机浮点数
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number}
   */
  randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  },

  /**
   * 从数组中随机选择一个元素
   * @param {Array} array - 数组
   * @returns {any}
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * 平滑阻尼
   * @param {number} current - 当前值
   * @param {number} target - 目标值
   * @param {number} currentVelocity - 当前速度
   * @param {number} smoothTime - 平滑时间
   * @param {number} maxSpeed - 最大速度
   * @param {number} deltaTime - 时间间隔
   * @returns {{value: number, velocity: number}}
   */
  smoothDamp(current, target, currentVelocity, smoothTime, maxSpeed = Infinity, deltaTime) {
    smoothTime = Math.max(0.0001, smoothTime);
    const num = 2 / smoothTime;
    const num2 = num * deltaTime;
    const num3 = 1 / (1 + num2 + 0.48 * num2 * num2 + 0.235 * num2 * num2 * num2);
    let num4 = current - target;
    const num5 = target;
    const num6 = maxSpeed * smoothTime;
    num4 = MathUtils.clamp(num4, -num6, num6);
    target = current - num4;
    const num7 = (currentVelocity + num * num4) * deltaTime;
    currentVelocity = (currentVelocity - num * num7) * num3;
    let value = target + (num4 + num7) * num3;
    if (num5 - current > 0 === value > num5) {
      value = num5;
      currentVelocity = (value - num5) / deltaTime;
    }
    return { value, velocity: currentVelocity };
  },

  /**
   * 贝塞尔曲线
   * @param {number} t - 插值系数 (0-1)
   * @param {number} p0 - 控制点0
   * @param {number} p1 - 控制点1
   * @param {number} p2 - 控制点2
   * @param {number} p3 - 控制点3
   * @returns {number}
   */
  bezier(t, p0, p1, p2, p3) {
    const oneMinusT = 1 - t;
    return oneMinusT * oneMinusT * oneMinusT * p0 +
           3 * oneMinusT * oneMinusT * t * p1 +
           3 * oneMinusT * t * t * p2 +
           t * t * t * p3;
  },

  /**
   * 向目标值移动
   * @param {number} current - 当前值
   * @param {number} target - 目标值
   * @param {number} maxDelta - 最大变化量
   * @returns {number}
   */
  moveTowards(current, target, maxDelta) {
    if (Math.abs(target - current) <= maxDelta) {
      return target;
    }
    return current + Math.sign(target - current) * maxDelta;
  },

  /**
   * 格式化数字显示
   * @param {number} num - 数字
   * @param {number} digits - 小数位数
   * @returns {string}
   */
  formatNumber(num, digits = 0) {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(digits) + '亿';
    }
    if (num >= 10000) {
      return (num / 10000).toFixed(digits) + '万';
    }
    return num.toFixed(digits);
  }
};

export default MathUtils;
