/**
 * ToolSlot 底部工具槽组件
 * 参考 docs/guide.txt 设计
 * 
 * 特点：
 * - 棕色/金色渐变容器背景
 * - 槽位圆角设计，选中发光效果
 * - 支持禁用状态和斜纹
 * - 可自定义图标
 */

import haptic from '../../utils/HapticFeedback';

class ToolSlot {
  constructor(options = {}) {
    this.screenWidth = options.screenWidth || 750;
    this.screenHeight = options.screenHeight || 1334;
    
    // 工具数据
    this.tools = options.tools || [];
    
    // 状态（默认不选中任何工具）
    this.selectedIndex = options.selectedIndex !== undefined ? options.selectedIndex : -1;
    this.disabledSlots = new Set(options.disabledSlots || []);
    this.emptySlots = new Set(); // 记录被取出工具的槽位
    
    // 回调
    this.onSelect = options.onSelect || (() => {});
    
    // 配置 - 始终显示 5 个槽位
    this.maxSlotCount = 5;
    this.slotSize = options.slotSize || 80;
    this.slotGap = options.slotGap || 15;
    this.padding = options.padding || 20;
    
    // 计算尺寸
    this._calculateDimensions();
  }
  
  /**
   * 计算尺寸和位置
   * 宽度占满整个屏幕，始终显示 5 个槽位
   */
  _calculateDimensions() {
    const W = this.screenWidth;
    const H = this.screenHeight;
    
    // 容器高度占底部 12% 区域的 90%（底部现在是 12%，不是 10%）
    this.containerH = H * 0.12 * 0.90;
    // 往上移动 10px
    this.containerY = H * 0.88 + (H * 0.12 - this.containerH) / 2 ;
    
    // 左右边距（屏幕宽度的 2%）
    this.sidePadding = W * 0.02;
    
    // 容器宽度占满屏幕（减去边距）
    this.containerX = this.sidePadding;
    this.containerW = W - this.sidePadding * 2;
    
    // 槽位之间的间隙（固定值或基于宽度）
    this.slotGap = W * 0.03;
    
    // 槽位大小：根据可用空间计算，然后减小5
    const availableWidth = this.containerW - this.slotGap * (this.maxSlotCount - 1);
    this.slotSize = availableWidth / this.maxSlotCount - 5;
    
    // 槽位垂直居中
    this.startX = this.containerX+10;
    this.startY = this.containerY + (this.containerH - this.slotSize) / 2;
    
    // 存储槽位位置（用于点击检测）
    this.slotPositions = [];
    for (let i = 0; i < this.maxSlotCount; i++) {
      this.slotPositions[i] = {
        x: this.startX + i * (this.slotSize + this.slotGap),
        y: this.startY,
        size: this.slotSize
      };
    }
  }
  
  /**
   * 更新数据
   */
  updateData(data) {
    if (data.selectedIndex !== undefined) {
      this.selectedIndex = data.selectedIndex;
    }
    if (data.tools !== undefined) {
      this.tools = data.tools;
      this._calculateDimensions();
      // 工具变化时清空空槽位记录
      this.emptySlots.clear();
    }
    if (data.disabledSlots !== undefined) {
      this.disabledSlots = new Set(data.disabledSlots);
    }
  }
  
  /**
   * 设置槽位为空（工具被取出），同时恢复之前空槽位的图标
   */
  setEmptySlot(index) {
    // 清空之前的空槽位记录（让之前的工具回到槽位）
    this.emptySlots.clear();
    // 设置当前槽位为空
    this.emptySlots.add(index);
  }
  
  /**
   * 绘制圆角矩形
   */
  _drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
  
  /**
   * 绘制组件
   */
  render(ctx) {
    this._drawContainer(ctx);
    this._drawSlots(ctx);
  }
  
  /**
   * 1) 绘制容器背景
   */
  _drawContainer(ctx) {
    const { containerX, containerY, containerW, containerH } = this;
    
    // 圆角矩形背景
    const radius = 15;
    this._drawRoundedRect(ctx, containerX, containerY, containerW, containerH, radius);
    
    // 主背景色（棕色/金色渐变）
    const bgGrad = ctx.createLinearGradient(containerX, containerY, containerX, containerY + containerH);
    bgGrad.addColorStop(0, '#c9905f');
    bgGrad.addColorStop(0.5, '#a86f38');
    bgGrad.addColorStop(1, '#8b5a2b');
    ctx.fillStyle = bgGrad;
    ctx.fill();
    
    // 外边框（深色）
    ctx.strokeStyle = 'rgba(60, 30, 10, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 内高光
    ctx.save();
    ctx.globalAlpha = 0.25;
    const highlightGrad = ctx.createLinearGradient(containerX, containerY, containerX, containerY + containerH * 0.3);
    highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this._drawRoundedRect(ctx, containerX + 2, containerY + 2, containerW - 4, containerH * 0.25, radius - 1);
    ctx.fillStyle = highlightGrad;
    ctx.fill();
    ctx.restore();
  }
  
  /**
   * 2) 绘制所有槽位
   * 始终显示 5 个槽位，不足时显示"待解锁"
   */
  _drawSlots(ctx) {
    for (let i = 0; i < this.maxSlotCount; i++) {
      const pos = this.slotPositions[i];
      const isSelected = i === this.selectedIndex;
      const isDisabled = this.disabledSlots.has(i);
      // 判断槽位状态
      const isEmpty = this.emptySlots.has(i); // 工具被取出
      const hasTool = i < this.tools.length && !isEmpty; // 有工具且未被取出
      const isLocked = i >= this.tools.length; // 未解锁槽位
      
      this._drawSlot(ctx, pos.x, pos.y, pos.size, i, isSelected, isDisabled, hasTool, isEmpty, isLocked);
    }
  }
  
  /**
   * 3) 绘制单个槽位
   * @param {boolean} hasTool - 是否有工具
   * @param {boolean} isEmpty - 工具是否被取出
   * @param {boolean} isLocked - 是否未解锁
   */
  _drawSlot(ctx, x, y, size, index, isSelected, isDisabled, hasTool, isEmpty, isLocked) {
    // 槽位背景渐变（空槽位也保持正常米色）
    const slotGrad = ctx.createLinearGradient(x, y, x, y + size);
    if (isLocked) {
      // 未解锁槽位：深灰色系
      slotGrad.addColorStop(0, '#8a8a8a');
      slotGrad.addColorStop(0.5, '#6a6a6a');
      slotGrad.addColorStop(1, '#4a4a4a');
    } else {
      // 有工具或空槽位：都使用正常米色
      slotGrad.addColorStop(0, '#e8d4b8');
      slotGrad.addColorStop(0.5, '#d9c399');
      slotGrad.addColorStop(1, '#b8956b');
    }
    
    ctx.save();
    
    // 选中状态：添加发光边框
    if (isSelected) {
      ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    // 槽位背景
    this._drawRoundedRect(ctx, x, y, size, size, size * 0.15);
    ctx.fillStyle = slotGrad;
    ctx.fill();
    
    // 槽位边框
    let borderColor;
    if (isSelected) {
      borderColor = '#ffd700'; // 选中金色
    } else if (isDisabled) {
      borderColor = '#666'; // 禁用灰色
    } else if (isLocked) {
      borderColor = '#555'; // 未解锁深灰
    } else {
      borderColor = '#8b7355'; // 正常边框
    }
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    
    // 槽位内阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 3;
    this._drawRoundedRect(ctx, x + size * 0.03, y + size * 0.03, size * 0.94, size * 0.94, size * 0.12);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
    
    // 禁用时添加斜纹
    if (isDisabled) {
      this._drawDisabledPattern(ctx, x, y, size);
    }
    
    // 绘制内容
    if (hasTool) {
      // 有工具：绘制工具图标
      const tool = this.tools[index];
      this._drawToolIcon(ctx, x, y, size, tool, isDisabled);
    } else if (isLocked) {
      // 未解锁：显示"待解锁"
      this._drawLockedSlot(ctx, x, y, size);
    }
    // isEmpty（空槽位）不显示任何内容，保持空白，但背景色不变
  }
  
  /**
   * 绘制锁定/待解锁槽位
   */
  _drawLockedSlot(ctx, x, y, size) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    
    ctx.save();
    
    // 绘制锁图标（简单圆形 + 锁扣）
    const iconSize = size * 0.25;
    
    // 锁体（矩形）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this._drawRoundedRect(ctx, centerX - iconSize * 0.6, centerY - iconSize * 0.3, iconSize * 1.2, iconSize * 0.9, iconSize * 0.2);
    ctx.fill();
    
    // 锁扣（弧形）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = iconSize * 0.15;
    ctx.beginPath();
    ctx.arc(centerX, centerY - iconSize * 0.3, iconSize * 0.35, Math.PI, 0);
    ctx.stroke();
    
    // "待解锁" 文字
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `${Math.floor(size * 0.18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('待解锁', centerX, centerY + size * 0.25);
    
    ctx.restore();
  }
  
  /**
   * 4) 禁用状态斜纹
   */
  _drawDisabledPattern(ctx, x, y, size) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    for (let i = -size; i < size * 2; i += 8) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + size, y + size);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  /**
   * 5) 绘制工具图标
   * 优先使用 tool.icon (emoji)，如果没有则使用 Canvas 绘制
   */
  _drawToolIcon(ctx, x, y, size, tool, isDisabled) {
    const iconX = x + size / 2;
    const iconY = y + size / 2;
    
    ctx.save();
    if (isDisabled) ctx.globalAlpha = 0.4;
    
    // 如果有 emoji 图标，优先使用
    if (tool.icon && tool.icon.length > 0) {
      ctx.font = `${Math.floor(size * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tool.icon, iconX, iconY);
    } else {
      // 没有 icon 时，使用 Canvas 绘制
      const iconSize = size * 0.55;
      switch (tool.id) {
        case 'cloth':
          this._drawCloth(ctx, iconX, iconY, iconSize, tool.color);
          break;
        case 'sponge':
          this._drawSponge(ctx, iconX, iconY, iconSize, tool.color);
          break;
        case 'brush':
          this._drawBrush(ctx, iconX, iconY, iconSize, tool.color);
          break;
        case 'spray':
          this._drawSpray(ctx, iconX, iconY, iconSize, tool.color);
          break;
        case 'vacuum':
          this._drawVacuum(ctx, iconX, iconY, iconSize, tool.color);
          break;
        default:
          // 默认圆形图标
          ctx.fillStyle = tool.color || '#4A90D9';
          ctx.beginPath();
          ctx.arc(iconX, iconY, iconSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
      }
    }
    
    ctx.restore();
  }
  
  // ========== 图标绘制函数 ==========
  
  _drawCloth(ctx, cx, cy, size, color) {
    // 抹布图标
    ctx.fillStyle = color;
    this._drawRoundedRect(ctx, cx - size * 0.4, cy - size * 0.3, size * 0.8, size * 0.6, size * 0.1);
    ctx.fill();
    
    // 纹理线条
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.3, cy + i * size * 0.1);
      ctx.lineTo(cx + size * 0.3, cy + i * size * 0.1);
      ctx.stroke();
    }
  }
  
  _drawSponge(ctx, cx, cy, size, color) {
    // 海绵图标
    ctx.fillStyle = color;
    this._drawRoundedRect(ctx, cx - size * 0.35, cy - size * 0.35, size * 0.7, size * 0.7, size * 0.15);
    ctx.fill();
    
    // 气孔
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 0; i < 4; i++) {
      const px = cx + (Math.random() - 0.5) * size * 0.5;
      const py = cy + (Math.random() - 0.5) * size * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  _drawBrush(ctx, cx, cy, size, color) {
    // 刷子图标
    // 刷毛
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy - size * 0.2, size * 0.35, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 手柄
    ctx.fillStyle = '#8b5a2b';
    this._drawRoundedRect(ctx, cx - size * 0.12, cy - size * 0.1, size * 0.24, size * 0.5, size * 0.05);
    ctx.fill();
  }
  
  _drawSpray(ctx, cx, cy, size, color) {
    // 喷雾瓶图标
    // 瓶身
    ctx.fillStyle = color;
    this._drawRoundedRect(ctx, cx - size * 0.25, cy - size * 0.1, size * 0.5, size * 0.5, size * 0.08);
    ctx.fill();
    
    // 喷嘴
    ctx.fillStyle = '#333';
    this._drawRoundedRect(ctx, cx - size * 0.2, cy - size * 0.35, size * 0.4, size * 0.3, size * 0.05);
    ctx.fill();
    
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    this._drawRoundedRect(ctx, cx - size * 0.2, cy - size * 0.05, size * 0.15, size * 0.3, size * 0.03);
    ctx.fill();
  }
  
  _drawVacuum(ctx, cx, cy, size, color) {
    // 吸尘器图标（简化）
    // 主体
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    // 吸管
    ctx.strokeStyle = '#666';
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.25, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.45, cy - size * 0.45);
    ctx.stroke();
  }
  
  /**
   * 检查点击位置是否在槽位内
   */
  getSlotIndexAt(x, y) {
    for (let i = 0; i < this.maxSlotCount; i++) {
      const slot = this.slotPositions[i];
      if (x >= slot.x && x <= slot.x + slot.size &&
          y >= slot.y && y <= slot.y + slot.size) {
        return i;
      }
    }
    return -1;
  }
  
  /**
   * 检查槽位是否有工具
   */
  hasToolAt(index) {
    return index >= 0 && index < this.tools.length;
  }
  
  /**
   * 处理触摸开始
   */
  onTouchStart(x, y) {
    const slotIndex = this.getSlotIndexAt(x, y);
    // 只有有工具的槽位才能被选中
    if (slotIndex >= 0 && this.hasToolAt(slotIndex) && !this.disabledSlots.has(slotIndex)) {
      return { slotIndex };
    }
    return null;
  }
  
  /**
   * 处理触摸结束
   */
  onTouchEnd(x, y) {
    const slotIndex = this.getSlotIndexAt(x, y);
    // 只有有工具的槽位才能被选中
    if (slotIndex >= 0 && this.hasToolAt(slotIndex) && !this.disabledSlots.has(slotIndex)) {
      // 切换选中
      if (this.selectedIndex !== slotIndex) {
        this.selectedIndex = slotIndex;
        this.onSelect(slotIndex, this.tools[slotIndex]);
        // 工具切换振动反馈
        haptic.selection();
      }
      return true;
    }
    return false;
  }
}

export default ToolSlot;
