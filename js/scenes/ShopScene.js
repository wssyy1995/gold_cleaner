/**
 * ShopScene 商城场景
 * 负责任务 5.6.1 ~ 5.6.10
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import { globalEvent } from '../core/EventEmitter';

class ShopScene extends Scene {
  constructor() {
    super({ name: 'ShopScene' });
    this.screenWidth = 750;
    this.screenHeight = 1334;
    this.currentTab = 'tools';
    this.products = [];
    this.ownedProducts = new Set(); // 已购买的商品
    this.coins = 1000; // 玩家金币数
  }

  onLoad() {
    this._initUI();
    this._generateProducts();
    this._loadOwnedProducts();
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
      text: '商店', 
      fontSize: 32 * s, fontWeight: 'bold', 
      color: '#333333', align: 'center' 
    });
    
    this.coinText = new Text({ 
      x: 650 * s, y: 65 * s, 
      text: `💰 ${this.coins}`, 
      fontSize: 24 * s, 
      color: '#FF9500', align: 'center' 
    });

    // Tab按钮
    this.toolsTab = new Button({ 
      x: 50 * s, y: 130 * s, width: 150 * s, height: 60 * s, 
      text: '工具', fontSize: 24 * s, 
      bgColor: '#4A90D9', textColor: '#FFFFFF', 
      borderRadius: 8 * s, 
      onClick: () => this._switchTab('tools') 
    });
    
    this.itemsTab = new Button({ 
      x: 220 * s, y: 130 * s, width: 150 * s, height: 60 * s, 
      text: '道具', fontSize: 24 * s, 
      bgColor: '#E0E0E0', textColor: '#333333', 
      borderRadius: 8 * s, 
      onClick: () => this._switchTab('items') 
    });
    
    this.skillsTab = new Button({ 
      x: 390 * s, y: 130 * s, width: 150 * s, height: 60 * s, 
      text: '技能', fontSize: 24 * s, 
      bgColor: '#E0E0E0', textColor: '#333333', 
      borderRadius: 8 * s, 
      onClick: () => this._switchTab('skills') 
    });
  }

  _generateProducts() {
    const s = this.screenWidth / 750;
    
    // 工具类商品
    this.toolsProducts = [
      { id: 'tool_cloth_advanced', name: '高级抹布', icon: '🧽', price: 100, desc: '清洁效率+20%', effect: { efficiency: 1.2 } },
      { id: 'tool_sponge_magic', name: '魔法海绵', icon: '🧼', price: 200, desc: '可以清洁任何污渍', effect: { universal: true } },
      { id: 'tool_brush_power', name: '电动刷子', icon: '🪥', price: 300, desc: '清洁速度+50%', effect: { speed: 1.5 } },
      { id: 'tool_spray_pro', name: '专业喷雾', icon: '🧴', price: 150, desc: '范围清洁', effect: { aoe: true } },
      { id: 'tool_vacuum', name: '吸尘器', icon: '🌪️', price: 500, desc: '自动清洁小区域', effect: { auto: true } },
      { id: 'tool_robot', name: '清洁机器人', icon: '🤖', price: 1000, desc: '自动清洁大区域', effect: { auto: true, range: 'large' } },
    ];
    
    // 道具类商品
    this.itemsProducts = [
      { id: 'item_time', name: '时间延长', icon: '⏱️', price: 50, desc: '关卡时间+30秒', effect: { timeBonus: 30 } },
      { id: 'item_hint', name: '清洁提示', icon: '💡', price: 30, desc: '显示下一个需要清洁的区域', effect: { hint: true } },
      { id: 'item_multiplier', name: '金币翻倍', icon: '💰', price: 100, desc: '本局金币收益x2', effect: { coinMultiplier: 2 } },
      { id: 'item_stars', name: '星级保护', icon: '⭐', price: 80, desc: '失误不扣星', effect: { starProtection: true } },
    ];
    
    // 技能类商品
    this.skillsProducts = [
      { id: 'skill_speed', name: '快手技能', icon: '⚡', price: 500, desc: '永久提升清洁速度10%', effect: { permanent: true, speedBonus: 0.1 } },
      { id: 'skill_coin', name: '财神技能', icon: '💎', price: 800, desc: '永久提升金币收益15%', effect: { permanent: true, coinBonus: 0.15 } },
      { id: 'skill_efficiency', name: '效率大师', icon: '📈', price: 1000, desc: '永久提升清洁效率20%', effect: { permanent: true, efficiencyBonus: 0.2 } },
    ];
    
    this._updateProductPositions();
  }
  
  _updateProductPositions() {
    const s = this.screenWidth / 750;
    const cardWidth = 320 * s;
    const cardHeight = 180 * s;
    const gapX = 30 * s;
    const gapY = 20 * s;
    const startY = 220 * s;
    
    // 根据当前标签选择商品列表
    let products = [];
    switch (this.currentTab) {
      case 'tools': products = this.toolsProducts; break;
      case 'items': products = this.itemsProducts; break;
      case 'skills': products = this.skillsProducts; break;
    }
    
    // 计算位置（两列布局）
    this.products = products.map((p, i) => ({
      ...p,
      x: (50 + (i % 2) * (340)) * s,
      y: startY + Math.floor(i / 2) * (cardHeight + gapY),
      width: cardWidth,
      height: cardHeight,
      owned: this.ownedProducts.has(p.id)
    }));
  }

  _loadOwnedProducts() {
    // 从本地存储加载已购买商品
    try {
      const owned = wx.getStorageSync('ownedProducts');
      if (owned) {
        this.ownedProducts = new Set(JSON.parse(owned));
      }
    } catch (e) {
      console.warn('[ShopScene] 加载已购商品失败');
    }
  }

  _saveOwnedProducts() {
    try {
      wx.setStorageSync('ownedProducts', JSON.stringify([...this.ownedProducts]));
    } catch (e) {
      console.warn('[ShopScene] 保存已购商品失败');
    }
  }

  _switchTab(tab) {
    this.currentTab = tab;
    
    // 更新Tab按钮样式
    const tabs = ['tools', 'items', 'skills'];
    const buttons = [this.toolsTab, this.itemsTab, this.skillsTab];
    
    tabs.forEach((t, i) => {
      const isActive = t === tab;
      buttons[i].bgColor = isActive ? '#4A90D9' : '#E0E0E0';
      buttons[i].textColor = isActive ? '#FFFFFF' : '#333333';
    });
    
    // 更新商品位置
    this._updateProductPositions();
  }

  _onBuyProduct(product) {
    if (product.owned) {
      this._showToast('您已拥有该商品');
      return;
    }
    
    if (this.coins < product.price) {
      this._showToast('金币不足');
      return;
    }
    
    // 显示确认弹窗
    globalEvent.emit('dialog:show', 'ConfirmDialog', {
      title: '确认购买',
      message: `确定要花费 ${product.price} 金币购买 ${product.name} 吗？`,
      confirmText: '购买',
      cancelText: '取消',
      onConfirm: () => {
        this._confirmPurchase(product);
      }
    });
  }

  _confirmPurchase(product) {
    // 扣除金币
    this.coins -= product.price;
    this.coinText.setText(`💰 ${this.coins}`);
    
    // 标记为已拥有
    this.ownedProducts.add(product.id);
    product.owned = true;
    this._saveOwnedProducts();
    
    // 应用效果
    this._applyProductEffect(product);
    
    // 显示成功提示
    this._showToast(`购买成功！获得 ${product.name}`);
  }

  _applyProductEffect(product) {
    // 将商品效果保存到玩家数据
    const playerData = wx.getStorageSync('playerData') || {};
    if (!playerData.bonuses) playerData.bonuses = {};
    
    Object.assign(playerData.bonuses, product.effect);
    wx.setStorageSync('playerData', playerData);
  }

  _showToast(message) {
    this.toastMessage = message;
    this.toastTime = 2000; // 显示2秒
  }

  update(deltaTime) {
    const s = this.screenWidth / 750;
    
    if (this.backBtn) this.backBtn.update(deltaTime);
    if (this.toolsTab) this.toolsTab.update(deltaTime);
    if (this.itemsTab) this.itemsTab.update(deltaTime);
    if (this.skillsTab) this.skillsTab.update(deltaTime);
    
    // 更新Toast时间
    if (this.toastTime > 0) {
      this.toastTime -= deltaTime;
      if (this.toastTime <= 0) {
        this.toastMessage = null;
      }
    }
  }

  onRender(ctx) {
    const s = this.screenWidth / 750;
    
    // 背景
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
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
    ctx.fillRect(0, 0, this.screenWidth, 200 * s);

    // 检查UI是否已初始化
    if (!this.backBtn) return;

    this.backBtn.onRender(ctx);
    if (this.titleText) this.titleText.onRender(ctx);
    if (this.coinText) this.coinText.onRender(ctx);
    if (this.toolsTab) this.toolsTab.onRender(ctx);
    if (this.itemsTab) this.itemsTab.onRender(ctx);
    if (this.skillsTab) this.skillsTab.onRender(ctx);

    // 商品列表
    this._renderProducts(ctx, s);
    
    // Toast提示
    this._renderToast(ctx, s);
  }
  
  _renderProducts(ctx, s) {
    if (!this.products) return;
    
    this.products.forEach(product => {
      // 商品卡片背景
      ctx.fillStyle = product.owned ? '#E8F5E9' : '#FFFFFF';
      this._drawRoundedRect(ctx, product.x, product.y, product.width, product.height, 12 * s);
      ctx.fill();
      
      // 边框
      ctx.strokeStyle = product.owned ? '#4CAF50' : '#E0E0E0';
      ctx.lineWidth = product.owned ? 2 * s : 1 * s;
      ctx.stroke();

      // 图标
      ctx.font = `${48 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(product.icon, product.x + 50 * s, product.y + 70 * s);

      // 商品名称
      ctx.fillStyle = '#333333';
      ctx.font = `bold ${22 * s}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(product.name, product.x + 100 * s, product.y + 35 * s);

      // 商品描述
      ctx.fillStyle = '#666666';
      ctx.font = `${14 * s}px sans-serif`;
      ctx.fillText(product.desc, product.x + 100 * s, product.y + 60 * s);

      // 价格或已拥有标记
      if (product.owned) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = `bold ${18 * s}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('✓ 已拥有', product.x + product.width - 20 * s, product.y + product.height - 25 * s);
      } else {
        ctx.fillStyle = '#FF9500';
        ctx.font = `bold ${24 * s}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(`💰 ${product.price}`, product.x + 100 * s, product.y + 100 * s);

        // 购买按钮
        const canAfford = this.coins >= product.price;
        ctx.fillStyle = canAfford ? '#4CAF50' : '#BDBDBD';
        this._drawRoundedRect(ctx, product.x + product.width - 110 * s, product.y + product.height - 60 * s, 90 * s, 40 * s, 8 * s);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${16 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('购买', product.x + product.width - 65 * s, product.y + product.height - 40 * s);
      }
    });
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
    
    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this._drawRoundedRect(ctx, x, y, boxWidth, boxHeight, 25 * s);
    ctx.fill();
    
    // 文字
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.toastMessage, this.screenWidth / 2, y + boxHeight / 2);
  }

  onTouchStart(x, y) {
    if (this.backBtn && this.backBtn.onTouchStart(x, y)) return true;
    if (this.toolsTab && this.toolsTab.onTouchStart(x, y)) return true;
    if (this.itemsTab && this.itemsTab.onTouchStart(x, y)) return true;
    if (this.skillsTab && this.skillsTab.onTouchStart(x, y)) return true;
    
    // 检查商品点击
    for (const product of this.products) {
      if (!product.owned &&
          x >= product.x + product.width - 110 * (this.screenWidth/750) && 
          x <= product.x + product.width - 20 * (this.screenWidth/750) &&
          y >= product.y + product.height - 60 * (this.screenWidth/750) && 
          y <= product.y + product.height - 20 * (this.screenWidth/750)) {
        this._onBuyProduct(product);
        return true;
      }
    }
    
    return false;
  }

  onTouchEnd(x, y) {
    if (this.backBtn && this.backBtn.onTouchEnd(x, y)) return true;
    if (this.toolsTab && this.toolsTab.onTouchEnd(x, y)) return true;
    if (this.itemsTab && this.itemsTab.onTouchEnd(x, y)) return true;
    if (this.skillsTab && this.skillsTab.onTouchEnd(x, y)) return true;
    return false;
  }
}

export default ShopScene;
