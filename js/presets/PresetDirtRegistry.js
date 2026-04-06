/**
 * PresetDirtRegistry 预制污垢注册中心
 * 管理所有预制污垢类型的生成和渲染
 */

import MildewPreset from './MildewPreset';
import WaterIncrustationPreset from './WaterIncrustationPreset';
import DustPreset from './DustPreset';
import UrinePreset from './UrinePreset';

// 预制污垢类型映射
const PRESET_MAP = {
  'preset_mildew': MildewPreset,
  'preset_water_incru': WaterIncrustationPreset,
  'preset_dust': DustPreset,
  'preset_urine': UrinePreset
};

export default class PresetDirtRegistry {
  /**
   * 检查是否是预制污垢类型
   * @param {string} type - 污垢类型
   * @returns {boolean}
   */
  static isPresetType(type) {
    return type && type.startsWith('preset_') && PRESET_MAP[type];
  }
  
  /**
   * 生成预制污垢数据
   * @param {string} type - 污垢类型
   * @param {Object} config - 配置 { x, y, size, count, ... }
   * @param {number} s - 屏幕缩放比例
   * @returns {Object|null} 预制污垢数据
   */
  static generate(type, config, s) {
    const PresetClass = PRESET_MAP[type];
    if (!PresetClass) return null;
    
    return PresetClass.generate(config, s);
  }
  
  /**
   * 渲染预制污垢
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} dirt - 污垢对象
   * @param {number} s - 屏幕缩放比例
   * @param {number} pulseAlpha - 脉冲透明度
   * @param {number} remainingRatio - 剩余显示比例
   * @param {number} cx - 实际渲染中心X
   * @param {number} cy - 实际渲染中心Y
   */
  static render(ctx, dirt, s, pulseAlpha = 1, remainingRatio = 1, cx, cy) {
    if (!dirt.presetType) return;
    
    const PresetClass = PRESET_MAP[dirt.presetType];
    if (!PresetClass) return;
    
    PresetClass.render(ctx, dirt, s, pulseAlpha, remainingRatio, cx, cy);
  }
  
  /**
   * 注册新的预制污垢类型
   * @param {string} type - 类型名称
   * @param {Class} PresetClass - 预制污垢类
   */
  static register(type, PresetClass) {
    PRESET_MAP[type] = PresetClass;
  }
}
