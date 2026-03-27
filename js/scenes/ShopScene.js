/**
 * ShopScene 商城场景
 * 负责任务 5.6.1 ~ 5.6.10
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import Panel from '../ui/components/Panel';
import { globalEvent } from '../core/EventEmitter';

class ShopScene extends Scene {
  constructor() {
    super({ name: 'ShopScene' });
    this.screenWidth = 750;
    this.screenHeight = 1334;
    this.currentTab = 'tools';
    this.products = [];
  }

  onLoad() {
    this._initUI();
    this._generateProducts();
  }

  _initUI() {
    this.backBtn = new Button({ x: 20, y: 40, width: 100, height: 50, text: '← 返回', fontSize: 24, bgColor: 'transparent', textColor: '#333333', onClick: () => globalEvent.emit('scene:switch', 'HomeScene') });
    this.titleText = new Text({ x: 375, y: 65, text: '商店', fontSize: 32, fontWeight: 'bold', color: '#333333', align: 'center' });
    this.coinText = new Text({ x: 650, y: 65, text: '💰 100', fontSize: 24, color: '#FF9500', align: 'center' });

    // Tab按钮
    this.toolsTab = new Button({ x: 50, y: 130, width: 150, height: 60, text: '工具', fontSize: 24, bgColor: '#4A90D9', textColor: '#FFFFFF', borderRadius: 8, onClick: () => this._switchTab('tools') });
    this.itemsTab = new Button({ x: 220, y: 130, width: 150, height: 60, text: '道具', fontSize: 24, bgColor: '#E0E0E0', textColor: '#333333', borderRadius: 8, onClick: () => this._switchTab('items') });
  }

  _generateProducts() {
    const tools = [
      { id: 'tool_advanced', name: '高级抹布', price: 100, desc: '清洁效率+20%' },
      { id: 'tool_magic', name: '魔法海绵', price: 200, desc: '可以清洁任何污渍' },
      { id: 'tool_robot', name: '扫地机器人', price: 500, desc: '自动清洁小区域' }
    ];
    this.products = tools.map((p, i) => ({
      ...p,
      x: 50 + (i % 2) * 350,
      y: 220 + Math.floor(i / 2) * 200
    }));
  }

  _switchTab(tab) {
    this.currentTab = tab;
    this.toolsTab.bgColor = tab === 'tools' ? '#4A90D9' : '#E0E0E0';
    this.toolsTab.textColor = tab === 'tools' ? '#FFFFFF' : '#333333';
    this.itemsTab.bgColor = tab === 'items' ? '#4A90D9' : '#E0E0E0';
    this.itemsTab.textColor = tab === 'items' ? '#FFFFFF' : '#333333';
  }

  onUpdate(deltaTime) {
    if (this.backBtn) this.backBtn.update(deltaTime);
    if (this.toolsTab) this.toolsTab.update(deltaTime);
    if (this.itemsTab) this.itemsTab.update(deltaTime);
  }

  onRender(ctx) {
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 顶部栏
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.screenWidth, 200);

    // 检查UI是否已初始化
    if (!this.backBtn) return;

    this.backBtn.onRender(ctx);
    if (this.titleText) this.titleText.onRender(ctx);
    if (this.coinText) this.coinText.onRender(ctx);
    if (this.toolsTab) this.toolsTab.onRender(ctx);
    if (this.itemsTab) this.itemsTab.onRender(ctx);

    // 商品列表
    if (this.products) {
      this.products.forEach(product => {
      // 商品卡片背景
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(product.x, product.y, 320, 180);
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.strokeRect(product.x, product.y, 320, 180);

      // 商品信息
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(product.name, product.x + 20, product.y + 40);

      ctx.fillStyle = '#666666';
      ctx.font = '18px sans-serif';
      ctx.fillText(product.desc, product.x + 20, product.y + 75);

      ctx.fillStyle = '#FF9500';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`💰 ${product.price}`, product.x + 20, product.y + 130);

      // 购买按钮
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(product.x + 200, product.y + 100, 100, 50);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('购买', product.x + 250, product.y + 132);
      });
    }
  }

  onTouchStart(x, y) {
    if (this.backBtn && this.backBtn.onTouchStart(x, y)) return true;
    if (this.toolsTab && this.toolsTab.onTouchStart(x, y)) return true;
    if (this.itemsTab && this.itemsTab.onTouchStart(x, y)) return true;
    return false;
  }

  onTouchEnd(x, y) {
    if (this.backBtn && this.backBtn.onTouchEnd(x, y)) return true;
    if (this.toolsTab && this.toolsTab.onTouchEnd(x, y)) return true;
    if (this.itemsTab && this.itemsTab.onTouchEnd(x, y)) return true;
    return false;
  }
}

export default ShopScene;
