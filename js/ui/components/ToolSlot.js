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
import { GlobalToolImageCache } from '../../config/ToolConfig';

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
    
    // 配置 - 每页显示 5 个槽位
    this.visibleSlotCount = 5;
    this.slotSize = options.slotSize || 80;
    this.slotGap = options.slotGap || 15;
    this.padding = options.padding || 20;
    
    // 滑动相关状态
    this.scrollOffset = 0;           // 当前滑动偏移
    this.maxScrollOffset = 0;        // 最大滑动偏移
    this.isDragging = false;         // 是否正在拖动
    this.dragStartX = 0;             // 拖动起始X
    this.dragStartOffset = 0;        // 拖动起始偏移
    this.dragVelocity = 0;           // 拖动速度（用于惯性）
    this.lastDragX = 0;              // 上一次拖动位置
    this.lastDragTime = 0;           // 上一次拖动时间
    
    // 回弹动画状态
    this.bounceAnim = {
      active: false,
      startOffset: 0,
      targetOffset: 0,
      progress: 0,
      duration: 300  // 回弹动画时长(ms)
    };
    
    // 计算尺寸
    this._calculateDimensions();
  }
  
  /**
   * 计算尺寸和位置
   * 宽度占满整个屏幕，每页显示 5 个槽位，支持滑动
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
    
    // 槽位大小：根据可见槽位数量计算
    const availableWidth = this.containerW - this.slotGap * (this.visibleSlotCount - 1);
    this.slotSize = availableWidth / this.visibleSlotCount - 5;
    
    // 槽位垂直居中
    this.startX = this.containerX + 10;
    this.startY = this.containerY + (this.containerH - this.slotSize) / 2;
    
    // 计算最大滑动偏移（确保最后一个槽位可以被滑到可见区域）
    const totalTools = this.tools.length;
    if (totalTools > this.visibleSlotCount) {
      // 最后一个槽位完全可见需要的偏移
      const lastSlotX = this.startX + (totalTools - 1) * (this.slotSize + this.slotGap);
      const visibleEndX = this.containerX + this.containerW;
      this.maxScrollOffset = Math.max(0, lastSlotX + this.slotSize - visibleEndX + this.slotGap);
    } else {
      this.maxScrollOffset = 0;
    }
    
    // 限制当前偏移在有效范围内
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, this.maxScrollOffset));
    
    // 存储所有槽位位置（用于点击检测，考虑滑动偏移）
    this._updateSlotPositions();
  }
  
  /**
   * 更新槽位位置（考虑滑动偏移）
   */
  _updateSlotPositions() {
    const totalTools = this.tools.length;
    this.slotPositions = [];
    for (let i = 0; i < totalTools; i++) {
      this.slotPositions[i] = {
        x: this.startX + i * (this.slotSize + this.slotGap) - this.scrollOffset,
        y: this.startY,
        size: this.slotSize,
        index: i
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
      // 工具变化时更新槽位位置
      this._updateSlotPositions();
      // 工具变化时清空空槽位记录
      this.emptySlots.clear();
    }
    if (data.disabledSlots !== undefined) {
      this.disabledSlots = new Set(data.disabledSlots);
    }
  }
  
  /**
   * 更新滑动（用于惯性动画和回弹）
   */
  update(deltaTime) {
    // 处理回弹动画
    if (this.bounceAnim.active) {
      this.bounceAnim.progress += deltaTime;
      const t = Math.min(this.bounceAnim.progress / this.bounceAnim.duration, 1);
      const eased = this._easeOutCubic(t);
      
      this.scrollOffset = this.bounceAnim.startOffset + 
        (this.bounceAnim.targetOffset - this.bounceAnim.startOffset) * eased;
      
      if (t >= 1) {
        this.bounceAnim.active = false;
        this.scrollOffset = this.bounceAnim.targetOffset;
      }
      
      this._updateSlotPositions();
      return;
    }
    
    // 处理惯性滑动
    if (!this.isDragging && Math.abs(this.dragVelocity) > 0.5) {
      // 应用惯性滑动
      this.scrollOffset += this.dragVelocity * deltaTime;
      
      // 更平滑的减速（指数衰减）
      this.dragVelocity *= 0.95;
      
      // 检查是否需要触发回弹
      if (this.scrollOffset < 0 || this.scrollOffset > this.maxScrollOffset) {
        // 触发出界回弹
        this._startBounce(
          this.scrollOffset,
          this.scrollOffset < 0 ? 0 : this.maxScrollOffset
        );
        this.dragVelocity = 0;
      }
      
      // 更新槽位位置
      this._updateSlotPositions();
    }
  }
  
  /**
   * 启动回弹动画
   */
  _startBounce(from, to) {
    this.bounceAnim = {
      active: true,
      startOffset: from,
      targetOffset: to,
      progress: 0,
      duration: 400  // 回弹动画时长(ms)
    };
  }
  
  /**
   * 缓出三次方（平滑减速）
   */
  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
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
   * 支持滑动，只绘制可见范围内的槽位
   */
  _drawSlots(ctx) {
    // 保存上下文并设置裁剪区域（只在容器内绘制）
    ctx.save();
    ctx.beginPath();
    this._drawRoundedRect(ctx, this.containerX, this.containerY, this.containerW, this.containerH, 15);
    ctx.clip();
    
    const totalTools = this.tools.length;
    const visibleStart = this.containerX - this.slotSize;
    const visibleEnd = this.containerX + this.containerW + this.slotSize;
    
    // 绘制所有工具的槽位
    for (let i = 0; i < totalTools; i++) {
      const pos = this.slotPositions[i];
      
      // 只绘制可见范围内的槽位（优化性能）
      if (pos.x + pos.size < visibleStart || pos.x > visibleEnd) {
        continue;
      }
      
      const isSelected = i === this.selectedIndex;
      const isDisabled = this.disabledSlots.has(i);
      const isEmpty = this.emptySlots.has(i);
      const hasTool = !isEmpty;
      
      this._drawSlot(ctx, pos.x, pos.y, pos.size, i, isSelected, isDisabled, hasTool, isEmpty, false);
    }
    
    ctx.restore();
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
   * 优先使用缓存的工具图片，其次使用 tool.icon (emoji)，最后使用 Canvas 绘制
   */
  _drawToolIcon(ctx, x, y, size, tool, isDisabled) {
    const iconX = x + size / 2;
    const iconY = y + size / 2;
    
    ctx.save();
    if (isDisabled) ctx.globalAlpha = 0.4;
    
    // 优先使用缓存的工具图片
    const toolImage = GlobalToolImageCache.get(tool.id);
    if (toolImage) {
      // 计算图片绘制尺寸（保持比例，统一显示为槽位的80%）
      const targetSize = size * 0.8; // 统一目标尺寸
      const scale = Math.min(
        targetSize / toolImage.width,
        targetSize / toolImage.height
      );
      const drawWidth = toolImage.width * scale;
      const drawHeight = toolImage.height * scale;
      const drawX = x + (size - drawWidth) / 2;
      const drawY = y + (size - drawHeight) / 2;
      
      ctx.drawImage(toolImage, drawX, drawY, drawWidth, drawHeight);
    } else if (tool.icon && tool.icon.length > 0) {
      // 如果没有图片缓存，使用 emoji 图标
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
    // 检查所有槽位位置（包括滑出可见区域的）
    for (let i = 0; i < this.slotPositions.length; i++) {
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
    // 检查是否在容器内
    if (x < this.containerX || x > this.containerX + this.containerW ||
        y < this.containerY || y > this.containerY + this.containerH) {
      // 重置待处理槽位索引，防止上一次的值被误用
      this._pendingSlotIndex = -1;
      return null;
    }
    
    // 开始拖动
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartOffset = this.scrollOffset;
    this.dragVelocity = 0;
    this.lastDragX = x;
    this.lastDragTime = Date.now();
    
    // 检查是否点击了某个槽位（用于后续判断是点击还是滑动）
    const slotIndex = this.getSlotIndexAt(x, y);
    this._pendingSlotIndex = slotIndex;
    
    return { slotIndex, isInContainer: true };
  }
  
  /**
   * 处理触摸移动（滑动）
   * 支持超出边界的阻力感
   */
  onTouchMove(x, y) {
    if (!this.isDragging) return false;
    
    // 计算滑动距离
    const deltaX = x - this.dragStartX;
    let newOffset = this.dragStartOffset - deltaX;
    
    // 超出边界的阻力感（超出越多阻力越大）
    const overScroll = this._getOverScroll(newOffset);
    if (overScroll !== 0) {
      // 使用阻尼公式：超出部分按平方根衰减，产生弹性感
      const dampedOverScroll = overScroll > 0 
        ? Math.sqrt(overScroll * 10) 
        : -Math.sqrt(-overScroll * 10);
      newOffset = overScroll > 0 
        ? this.maxScrollOffset + dampedOverScroll
        : dampedOverScroll;
    }
    
    // 计算速度（用于惯性）
    const now = Date.now();
    const dt = now - this.lastDragTime;
    if (dt > 0) {
      this.dragVelocity = (x - this.lastDragX) / dt * -1; // 反向，因为滑动方向与偏移方向相反
    }
    this.lastDragX = x;
    this.lastDragTime = now;
    
    // 如果滑动距离超过阈值，标记为滑动模式
    if (Math.abs(deltaX) > 10) {
      this._isScrolling = true;
    }
    
    // 更新偏移
    this.scrollOffset = newOffset;
    this._updateSlotPositions();
    
    return true;
  }
  
  /**
   * 获取超出边界的距离
   * @returns {number} 正值表示超出右边界，负值表示超出左边界，0表示在范围内
   */
  _getOverScroll(offset) {
    if (offset < 0) return offset; // 超出左边界
    if (offset > this.maxScrollOffset) return offset - this.maxScrollOffset; // 超出右边界
    return 0;
  }
  
  /**
   * 处理触摸结束
   */
  onTouchEnd(x, y) {
    if (!this.isDragging) return false;
    
    this.isDragging = false;
    
    // 如果是滑动操作，不处理点击
    if (this._isScrolling) {
      this._isScrolling = false;
      this._pendingSlotIndex = -1;
      
      // 检查是否需要回弹（超出边界）
      if (this.scrollOffset < 0 || this.scrollOffset > this.maxScrollOffset) {
        this._startBounce(
          this.scrollOffset,
          this.scrollOffset < 0 ? 0 : this.maxScrollOffset
        );
      }
      
      return true;
    }
    
    // 处理点击
    const slotIndex = this._pendingSlotIndex;
    this._pendingSlotIndex = -1;
    
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
