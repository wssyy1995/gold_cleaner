/**
 * ToolScene 工具包场景
 * 负责任务 5.7.1 ~ 5.7.9
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import { globalEvent } from '../core/EventEmitter';
import CoordinateRenderer from '../utils/CoordinateRenderer';

class ToolScene extends Scene {
  constructor() {
    super({ name: 'ToolScene' });
    this.screenWidth = 750;
    this.screenHeight = 1334;
    
    // 背包中的工具（所有已拥有的工具）
    this.inventory = [];
    
    // 工具槽（当前装备的工具，最多8个）
    this.toolSlots = new Array(8).fill(null);
    
    // 拖动状态
    this.dragState = {
      isDragging: false,
      draggedTool: null,
      sourceType: null, // 'inventory' | 'slot'
      sourceIndex: -1,
      currentX: 0,
      currentY: 0
    };
    
    // 槽位配置
    this.slotConfig = {
      size: 100,
      gap: 20,
      startY: 900
    };
    
    // 背包配置
    this.inventoryConfig = {
      cols: 4,
      rows: 3,
      size: 80,
      gapX: 30,
      gapY: 30,
      startY: 250
    };
  }

  onLoad() {
    this._loadToolData();
    this._initUI();
  }

  _loadToolData() {
    // 从本地存储加载工具配置
    try {
      const savedSlots = wx.getStorageSync('toolSlots');
      if (savedSlots) {
        this.toolSlots = JSON.parse(savedSlots);
      }
      
      const savedInventory = wx.getStorageSync('toolInventory');
      if (savedInventory) {
        this.inventory = JSON.parse(savedInventory);
      } else {
        // 默认工具
        this.inventory = [
          { id: 'cloth', name: '抹布', icon: '🧽', color: '#4A90D9', rarity: 'common' },
          { id: 'sponge', name: '海绵', icon: '🧼', color: '#66BB6A', rarity: 'common' },
          { id: 'brush', name: '刷子', icon: '🪥', color: '#FFA726', rarity: 'common' },
          { id: 'spray', name: '喷雾', icon: '🧴', color: '#AB47BC', rarity: 'common' },
        ];
      }
    } catch (e) {
      console.warn('[ToolScene] 加载工具数据失败');
      this._initDefaultTools();
    }
  }

  _initDefaultTools() {
    this.inventory = [
      { id: 'cloth', name: '抹布', icon: '🧽', color: '#4A90D9', rarity: 'common' },
      { id: 'sponge', name: '海绵', icon: '🧼', color: '#66BB6A', rarity: 'common' },
      { id: 'brush', name: '刷子', icon: '🪥', color: '#FFA726', rarity: 'common' },
      { id: 'spray', name: '喷雾', icon: '🧴', color: '#AB47BC', rarity: 'common' },
    ];
    this.toolSlots = new Array(8).fill(null);
    // 默认装备前4个工具
    for (let i = 0; i < 4 && i < this.inventory.length; i++) {
      this.toolSlots[i] = { ...this.inventory[i] };
    }
  }

  _initUI() {
    const s = this.screenWidth / 750;
    
    // 顶部栏
    this.backBtn = new Button({ 
      x: 20 * s, y: 40 * s, width: 100 * s, height: 50 * s, 
      text: '← 返回', fontSize: 24 * s, 
      bgColor: 'transparent', textColor: '#333333', 
      onClick: () => globalEvent.emit('scene:switch', 'HomeScene') 
    });
    
    this.titleText = new Text({ 
      x: 375 * s, y: 65 * s, 
      text: '工具包', 
      fontSize: 32 * s, fontWeight: 'bold', 
      color: '#333333', align: 'center' 
    });

    // 区域标题
    this.inventoryTitle = new Text({
      x: 375 * s, y: 180 * s,
      text: '背包（点击并拖动工具到下方工具槽）',
      fontSize: 20 * s,
      color: '#666666', align: 'center'
    });

    this.slotsTitle = new Text({
      x: 375 * s, y: 820 * s,
      text: '工具槽（已装备的工具）',
      fontSize: 20 * s,
      color: '#666666', align: 'center'
    });

    // 保存按钮
    this.saveBtn = new Button({
      x: 200 * s, y: 1150 * s, width: 150 * s, height: 60 * s,
      text: '💾 保存', fontSize: 22 * s,
      bgColor: '#4CAF50', textColor: '#FFFFFF',
      borderRadius: 12 * s,
      onClick: () => this._saveConfig()
    });

    // 重置按钮
    this.resetBtn = new Button({
      x: 400 * s, y: 1150 * s, width: 150 * s, height: 60 * s,
      text: '↺ 重置', fontSize: 22 * s,
      bgColor: '#FF9500', textColor: '#FFFFFF',
      borderRadius: 12 * s,
      onClick: () => this._resetConfig()
    });
  }

  _saveConfig() {
    try {
      wx.setStorageSync('toolSlots', JSON.stringify(this.toolSlots));
      wx.setStorageSync('toolInventory', JSON.stringify(this.inventory));
      this._showToast('配置已保存');
    } catch (e) {
      this._showToast('保存失败');
    }
  }

  _resetConfig() {
    const ConfirmDialog = require('../ui/dialogs/ConfirmDialog').default;
    const dialog = new ConfirmDialog({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      title: '确认重置',
      message: '确定要重置工具配置吗？这将恢复默认设置。',
      confirmText: '重置',
      cancelText: '取消',
      onConfirm: () => {
        this._initDefaultTools();
        this._saveConfig();
        this._showToast('已重置为默认配置');
      }
    });
    globalEvent.emit('dialog:show', dialog);
  }

  _showToast(message) {
    this.toastMessage = message;
    this.toastTime = 2000;
  }

  /**
   * 获取背包格子位置
   */
  _getInventorySlotPosition(index, s) {
    const col = index % this.inventoryConfig.cols;
    const row = Math.floor(index / this.inventoryConfig.cols);
    const size = this.inventoryConfig.size * s;
    const gapX = this.inventoryConfig.gapX * s;
    const gapY = this.inventoryConfig.gapY * s;
    
    const totalWidth = this.inventoryConfig.cols * size + (this.inventoryConfig.cols - 1) * gapX;
    const startX = (this.screenWidth - totalWidth) / 2;
    
    return {
      x: startX + col * (size + gapX),
      y: this.inventoryConfig.startY * s + row * (size + gapY),
      size: size
    };
  }

  /**
   * 获取工具槽位置
   */
  _getToolSlotPosition(index, s) {
    const size = this.slotConfig.size * s;
    const gap = this.slotConfig.gap * s;
    const totalWidth = 4 * size + 3 * gap;
    const startX = (this.screenWidth - totalWidth) / 2;
    
    const col = index % 4;
    const row = Math.floor(index / 4);
    
    return {
      x: startX + col * (size + gap),
      y: this.slotConfig.startY * s + row * (size + gap),
      size: size
    };
  }

  /**
   * 检查点击位置
   */
  _checkHit(x, y, s) {
    // 检查背包格子
    for (let i = 0; i < this.inventory.length; i++) {
      const pos = this._getInventorySlotPosition(i, s);
      if (x >= pos.x && x <= pos.x + pos.size &&
          y >= pos.y && y <= pos.y + pos.size) {
        return { type: 'inventory', index: i, tool: this.inventory[i] };
      }
    }
    
    // 检查工具槽
    for (let i = 0; i < this.toolSlots.length; i++) {
      const pos = this._getToolSlotPosition(i, s);
      if (x >= pos.x && x <= pos.x + pos.size &&
          y >= pos.y && y <= pos.y + pos.size) {
        return { type: 'slot', index: i, tool: this.toolSlots[i] };
      }
    }
    
    return null;
  }

  /**
   * 处理放置
   */
  _handleDrop(target) {
    const { sourceType, sourceIndex, draggedTool } = this.dragState;
    
    if (!target) return;
    
    if (sourceType === 'inventory' && target.type === 'slot') {
      // 从背包拖到工具槽
      this.toolSlots[target.index] = { ...draggedTool };
    } else if (sourceType === 'slot' && target.type === 'slot') {
      // 在工具槽之间移动
      const temp = this.toolSlots[target.index];
      this.toolSlots[target.index] = this.toolSlots[sourceIndex];
      this.toolSlots[sourceIndex] = temp;
    } else if (sourceType === 'slot' && target.type === 'inventory') {
      // 从工具槽放回背包（移除装备）
      this.toolSlots[sourceIndex] = null;
    }
    
    this._cleanupDrag();
  }

  _cleanupDrag() {
    this.dragState = {
      isDragging: false,
      draggedTool: null,
      sourceType: null,
      sourceIndex: -1,
      currentX: 0,
      currentY: 0
    };
  }

  update(deltaTime) {
    const s = this.screenWidth / 750;
    
    if (this.backBtn) this.backBtn.update(deltaTime);
    if (this.saveBtn) this.saveBtn.update(deltaTime);
    if (this.resetBtn) this.resetBtn.update(deltaTime);
    
    // 更新Toast
    if (this.toastTime > 0) {
      this.toastTime -= deltaTime;
      if (this.toastTime <= 0) {
        this.toastMessage = null;
      }
    }
  }

  /**
   * 绘制圆角矩形（兼容小程序）
   */
  _drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    ctx.lineTo(x + radius, y + height);
    ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + radius);
    ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }

  onRender(ctx) {
    const s = this.screenWidth / 750;
    
    // 背景
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 顶部栏
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.screenWidth, 120 * s);

    if (this.backBtn) this.backBtn.onRender(ctx);
    if (this.titleText) this.titleText.onRender(ctx);
    if (this.inventoryTitle) this.inventoryTitle.onRender(ctx);
    if (this.slotsTitle) this.slotsTitle.onRender(ctx);

    // 绘制背包区域背景
    ctx.fillStyle = '#FFFFFF';
    this._drawRoundedRect(ctx, 30 * s, 210 * s, 690 * s, 380 * s, 16 * s);
    ctx.fill();
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    // 绘制工具槽区域背景
    ctx.fillStyle = '#FFFFFF';
    this._drawRoundedRect(ctx, 30 * s, 850 * s, 690 * s, 260 * s, 16 * s);
    ctx.fill();
    ctx.strokeStyle = '#E0E0E0';
    ctx.stroke();

    // 绘制背包
    this._renderInventory(ctx, s);
    
    // 绘制工具槽
    this._renderToolSlots(ctx, s);
    
    // 绘制拖动的工具
    this._renderDraggingTool(ctx, s);

    // 绘制按钮
    if (this.saveBtn) this.saveBtn.onRender(ctx);
    if (this.resetBtn) this.resetBtn.onRender(ctx);

    // Toast
    this._renderToast(ctx, s);
    
    // 绘制坐标网格（调试用）
    if (CoordinateRenderer.isEnabled()) {
      CoordinateRenderer.render(ctx, this.screenWidth, this.screenHeight, 100);
    }
  }

  _renderInventory(ctx, s) {
    this.inventory.forEach((tool, index) => {
      const pos = this._getInventorySlotPosition(index, s);
      
      // 格子背景
      ctx.fillStyle = '#F5F5F5';
      this._drawRoundedRect(ctx, pos.x, pos.y, pos.size, pos.size, 8 * s);
      ctx.fill();
      
      // 边框
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 2 * s;
      ctx.stroke();
      
      if (tool) {
        // 工具背景色
        ctx.fillStyle = tool.color + '20'; // 20% 透明度
        this._drawRoundedRect(ctx, pos.x + 4 * s, pos.y + 4 * s, pos.size - 8 * s, pos.size - 8 * s, 6 * s);
        ctx.fill();
        
        // 工具图标
        ctx.font = `${36 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tool.icon, pos.x + pos.size / 2, pos.y + pos.size / 2 - 8 * s);
        
        // 工具名称
        ctx.fillStyle = '#333333';
        ctx.font = `${12 * s}px sans-serif`;
        ctx.fillText(tool.name, pos.x + pos.size / 2, pos.y + pos.size - 15 * s);
      }
    });
  }

  _renderToolSlots(ctx, s) {
    this.toolSlots.forEach((tool, index) => {
      const pos = this._getToolSlotPosition(index, s);
      
      // 空槽背景
      ctx.fillStyle = '#E8E8E8';
      this._drawRoundedRect(ctx, pos.x, pos.y, pos.size, pos.size, 12 * s);
      ctx.fill();
      
      // 边框（已装备显示绿色边框）
      if (tool) {
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3 * s;
      } else {
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 2 * s;
      }
      ctx.stroke();
      
      // 槽位编号
      if (!tool) {
        ctx.fillStyle = '#AAAAAA';
        ctx.font = `${20 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), pos.x + pos.size / 2, pos.y + pos.size / 2);
      }
      
      if (tool) {
        // 工具背景
        ctx.fillStyle = tool.color + '30';
        this._drawRoundedRect(ctx, pos.x + 4 * s, pos.y + 4 * s, pos.size - 8 * s, pos.size - 8 * s, 8 * s);
        ctx.fill();
        
        // 工具图标
        ctx.font = `${48 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tool.icon, pos.x + pos.size / 2, pos.y + pos.size / 2);
      }
    });
  }

  _renderDraggingTool(ctx, s) {
    if (!this.dragState.isDragging || !this.dragState.draggedTool) return;
    
    const tool = this.dragState.draggedTool;
    const size = 80 * s;
    const x = this.dragState.currentX - size / 2;
    const y = this.dragState.currentY - size / 2;
    
    // 阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this._drawRoundedRect(ctx, x + 4 * s, y + 4 * s, size, size, 12 * s);
    ctx.fill();
    
    // 工具背景
    ctx.fillStyle = tool.color;
    this._drawRoundedRect(ctx, x, y, size, size, 12 * s);
    ctx.fill();
    
    // 图标
    ctx.font = `${40 * s}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tool.icon, x + size / 2, y + size / 2);
  }

  _renderToast(ctx, s) {
    if (!this.toastMessage || this.toastTime <= 0) return;
    
    const padding = 20 * s;
    const fontSize = 16 * s;
    
    ctx.font = `${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(this.toastMessage).width;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = 50 * s;
    const x = (this.screenWidth - boxWidth) / 2;
    const y = this.screenHeight - 150 * s;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this._drawRoundedRect(ctx, x, y, boxWidth, boxHeight, 25 * s);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.toastMessage, this.screenWidth / 2, y + boxHeight / 2);
  }

  onTouchStart(x, y) {
    const s = this.screenWidth / 750;
    
    if (this.backBtn && this.backBtn.onTouchStart(x, y)) return true;
    if (this.saveBtn && this.saveBtn.onTouchStart(x, y)) return true;
    if (this.resetBtn && this.resetBtn.onTouchStart(x, y)) return true;
    
    // 检查是否点击了工具
    const hit = this._checkHit(x, y, s);
    if (hit && hit.tool) {
      this.dragState = {
        isDragging: true,
        draggedTool: hit.tool,
        sourceType: hit.type,
        sourceIndex: hit.index,
        currentX: x,
        currentY: y
      };
      return true;
    }
    
    return false;
  }

  onTouchMove(x, y) {
    if (!this.dragState.isDragging) return false;
    
    this.dragState.currentX = x;
    this.dragState.currentY = y;
    return true;
  }

  onTouchEnd(x, y) {
    const s = this.screenWidth / 750;
    
    if (this.backBtn && this.backBtn.onTouchEnd(x, y)) return true;
    if (this.saveBtn && this.saveBtn.onTouchEnd(x, y)) return true;
    if (this.resetBtn && this.resetBtn.onTouchEnd(x, y)) return true;
    
    if (this.dragState.isDragging) {
      // 检查放置位置
      const target = this._checkHit(x, y, s);
      this._handleDrop(target);
      return true;
    }
    
    return false;
  }
}

export default ToolScene;
