/**
 * GameplayScene 游戏进行场景
 * 负责任务 5.5.1 ~ 5.5.11
 */
import Scene from '../core/Scene';
import Button from '../ui/components/Button';
import Text from '../ui/components/Text';
import ProgressBar from '../ui/components/ProgressBar';
import { globalEvent } from '../core/EventEmitter';

import PauseMenu from '../ui/dialogs/PauseMenu';

class GameplayScene extends Scene {
  constructor() {
    super({ name: 'GameplayScene' });
    this.screenWidth = 750;
    this.screenHeight = 1334;
    this.levelId = 0;
    this.cleanProgress = 0;
    this.toolSlots = [];
    this.currentToolIndex = 0;
    this.dirtObjects = [];
    this.isPaused = false;
    
    // 视图状态
    this.viewMode = 'room'; // 'room' | 'zoom'
    this.zoomedDirt = null; // 当前放大的污垢
    this.zoomAnimation = 0; // 放大动画进度 0-1
    
    // 工具槽滑动
    this.toolSlotOffset = 0; // 滑动偏移
    this.toolSlotDragging = false;
    this.toolSlotStartX = 0;
    this.toolSlotLastX = 0;
    
    // 工具拖动清洁
    this.isDraggingTool = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.dragCurrentPos = { x: 0, y: 0 };
    
    // 动画效果
    this.sparkles = []; // 清洁完成时的闪光粒子
    this.toolShake = 0; // 错误工具震动效果
  }

  onLoad(data = {}) {
    this.levelId = data.levelId || 1;
    this.stage = data.stage || 1;
    this.bgImage = null;
    this.bgLoaded = false;
    this._initUI();
    this._generateDirts();
    this._loadBackground();
  }

  /**
   * 加载关卡背景图
   */
  _loadBackground() {
    if (typeof wx !== 'undefined') {
      const img = wx.createImage();
      img.onload = () => {
        console.log(`[GameplayScene] 背景图加载完成: stage${this.stage}_l${this.levelId}`);
        this.bgImage = img;
        this.bgLoaded = true;
      };
      img.onerror = () => {
        console.warn(`[GameplayScene] 背景图加载失败: stage${this.stage}_l${this.levelId}`);
      };
      // 图片路径格式: images/game/game_stage1_l1_home.png
      img.src = `images/game/game_stage${this.stage}_l${this.levelId}_home.png`;
    }
  }

  _initUI() {
    const s = this.screenWidth / 750;
    
    // 顶部栏
    this.backBtn = new Button({ 
      x: 20 * s, y: 40 * s, width: 100 * s, height: 50 * s, 
      text: '← 返回', fontSize: 24 * s, 
      bgColor: 'transparent', textColor: '#333333', 
      onClick: () => {
        if (this.viewMode === 'zoom') {
          this._exitZoomView();
        } else {
          globalEvent.emit('scene:switch', 'HomeScene');
        }
      }
    });
    this.levelText = new Text({ 
      x: 375 * s, y: 65 * s, 
      text: `关卡 ${this.levelId}`, 
      fontSize: 32 * s, fontWeight: 'bold', 
      color: '#333333', align: 'center' 
    });
    
    // 清洁度球
    this.cleanlinessText = new Text({ 
      x: 680 * s, y: 65 * s, 
      text: '0%', 
      fontSize: 24 * s, fontWeight: 'bold', 
      color: '#4CAF50', align: 'center' 
    });
    
    // 暂停按钮
    this.pauseBtn = new Button({
      x: 600 * s, y: 40 * s, width: 60 * s, height: 50 * s,
      text: '⏸', fontSize: 24 * s,
      bgColor: 'transparent', textColor: '#333333',
      onClick: () => this._showPauseMenu()
    });
    
    // 退出按钮（右上角）
    this.quitBtn = new Button({
      x: 670 * s, y: 40 * s, width: 70 * s, height: 50 * s,
      text: '退出', fontSize: 22 * s,
      bgColor: 'rgba(255, 107, 107, 0.9)', textColor: '#FFFFFF',
      borderRadius: 8 * s,
      onClick: () => this._onQuitClick()
    });

    // 工具槽（支持滑动）
    this.tools = [
      { id: 'cloth', name: '抹布', icon: '🧽', color: '#4A90D9' },
      { id: 'sponge', name: '海绵', icon: '🧼', color: '#66BB6A' },
      { id: 'brush', name: '刷子', icon: '🪥', color: '#FFA726' },
      { id: 'spray', name: '喷雾', icon: '🧴', color: '#AB47BC' },
      { id: 'vacuum', name: '吸尘器', icon: '🌪️', color: '#EF5350' },
    ];
    this.currentToolIndex = 0;
    this.toolSlotOffset = 0;
    
    // 工具提示框
    this.toolTipText = new Text({
      x: 375 * s, y: 950 * s,
      text: '点击拖动清洁',
      fontSize: 20 * s,
      color: '#666666',
      align: 'center'
    });
    this.showToolTip = true;

    // 污垢点击处理
    this._touchStartTime = 0;
    this._lastClickDirt = null;
    this._lastClickTime = 0;
    
    // 退出放大视图按钮
    this.exitZoomBtn = new Button({
      x: 20 * s, y: 100 * s, width: 80 * s, height: 40 * s,
      text: '✕', fontSize: 24 * s,
      bgColor: 'rgba(0,0,0,0.5)', textColor: '#FFFFFF',
      borderRadius: 20 * s,
      onClick: () => this._exitZoomView()
    });
  }

  _generateDirts() {
    const s = this.screenWidth / 750;
    this.dirtObjects = [];
    
    // 定义几种污垢类型和对应的清洁配方
    const dirtTypes = [
      { type: 'dust', name: '灰尘', color: '#8B4513', recipes: [['cloth'], ['sponge']] },
      { type: 'stain', name: '污渍', color: '#654321', recipes: [['spray', 'cloth'], ['sponge']] },
      { type: 'grime', name: '油垢', color: '#3E2723', recipes: [['spray', 'brush'], ['sponge', 'sponge']] },
    ];
    
    // 游戏区域是屏幕下方 90%
    const gameAreaHeight = this.screenHeight * 0.9;
    
    for (let i = 0; i < 5; i++) {
      const dirtType = dirtTypes[Math.floor(Math.random() * dirtTypes.length)];
      // y 坐标基于游戏区域（0 ~ gameAreaHeight），渲染时会加上 top_bar 偏移
      const relativeY = (50 + Math.random() * (gameAreaHeight / s - 150)) * s;
      
      this.dirtObjects.push({
        id: i,
        type: dirtType.type,
        name: dirtType.name,
        x: (80 + Math.random() * 590) * s,
        y: relativeY, // 相对于游戏区域的 y 坐标
        width: 100 * s, 
        height: 100 * s,
        state: 'dirty', // dirty, cleaning, clean
        cleanProgress: 0,
        maxProgress: dirtType.recipes[0].length * 100, // 需要多少次清洁
        currentRecipe: dirtType.recipes[0],
        currentStep: 0, // 当前清洁步骤
        color: dirtType.color,
        recipes: dirtType.recipes
      });
    }
  }

  _selectTool(index) {
    this.currentToolIndex = index;
    this.showToolTip = true;
    // 重置提示框定时器
    if (this._toolTipTimer) clearTimeout(this._toolTipTimer);
    this._toolTipTimer = setTimeout(() => {
      this.showToolTip = false;
    }, 2000);
  }

  /**
   * 进入放大视图
   */
  _enterZoomView(dirt) {
    this.zoomedDirt = dirt;
    this.viewMode = 'zoom';
    this.zoomAnimation = 0;
    this.showToolTip = true;
    
    // 2秒后隐藏提示
    if (this._toolTipTimer) clearTimeout(this._toolTipTimer);
    this._toolTipTimer = setTimeout(() => {
      this.showToolTip = false;
    }, 2000);
  }

  /**
   * 退出放大视图
   */
  _exitZoomView() {
    this.viewMode = 'room';
    this.zoomedDirt = null;
    this.zoomAnimation = 0;
    this.isDraggingTool = false;
  }

  /**
   * 检查工具是否匹配当前步骤
   */
  _checkToolMatch(dirt) {
    const currentTool = this.tools[this.currentToolIndex].id;
    const requiredTool = dirt.currentRecipe[dirt.currentStep];
    return currentTool === requiredTool;
  }

  /**
   * 使用工具清洁
   */
  _useToolOnDirt(dirt) {
    if (!this._checkToolMatch(dirt)) {
      // 工具不匹配 - 触发震动效果
      this.toolShake = 1;
      setTimeout(() => { this.toolShake = 0; }, 500);
      return false;
    }
    
    // 正确工具 - 增加进度
    dirt.cleanProgress += 100;
    dirt.currentStep++;
    dirt.state = 'cleaning';
    
    // 检查是否完成所有步骤
    if (dirt.currentStep >= dirt.currentRecipe.length) {
      this._completeCleanDirt(dirt);
    }
    
    return true;
  }

  /**
   * 完成清洁污垢
   */
  _completeCleanDirt(dirt) {
    dirt.state = 'clean';
    
    // 添加闪光粒子效果
    const s = this.screenWidth / 750;
    for (let i = 0; i < 8; i++) {
      this.sparkles.push({
        x: dirt.x + dirt.width / 2,
        y: dirt.y + dirt.height / 2,
        vx: (Math.random() - 0.5) * 10 * s,
        vy: (Math.random() - 0.5) * 10 * s,
        life: 1,
        size: (5 + Math.random() * 10) * s
      });
    }
    
    // 检查是否全部清洁完成
    if (this.dirtObjects.every(d => d.state === 'clean')) {
      setTimeout(() => {
        this._showSettlement();
      }, 1000);
    }
  }

  /**
   * 显示结算弹窗
   */
  _showSettlement() {
    const stars = 3; // 根据时间和清洁度计算
    const coins = 100 + Math.floor(Math.random() * 50);
    
    globalEvent.emit('dialog:show', 'SettlementDialog', {
      levelId: this.levelId,
      stars: stars,
      coins: coins,
      onNext: () => {
        globalEvent.emit('scene:switch', 'GameplayScene', { levelId: this.levelId + 1 });
      },
      onReplay: () => {
        globalEvent.emit('scene:switch', 'GameplayScene', { levelId: this.levelId });
      },
      onHome: () => {
        globalEvent.emit('scene:switch', 'HomeScene');
      }
    });
  }

  /**
   * 显示暂停菜单
   */
  _showPauseMenu() {
    this.isPaused = true;
    globalEvent.emit('game:pause');
    
    const s = this.screenWidth / 750;
    const pauseMenu = new PauseMenu({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      onResume: () => {
        this.isPaused = false;
        globalEvent.emit('game:resume');
      },
      onRestart: () => {
        this.isPaused = false;
        globalEvent.emit('scene:switch', 'GameplayScene', { levelId: this.levelId });
      },
      onHome: () => {
        this.isPaused = false;
        globalEvent.emit('scene:switch', 'HomeScene');
      }
    });
    
    globalEvent.emit('dialog:show', 'PauseMenu', pauseMenu);
  }

  /**
   * 退出按钮点击处理
   */
  _onQuitClick() {
    // 显示确认弹窗
    globalEvent.emit('dialog:show', 'ConfirmDialog', {
      title: '确认退出',
      message: '确定要退出当前关卡吗？进度将不会保存。',
      confirmText: '退出',
      cancelText: '继续游戏',
      onConfirm: () => {
        // 返回首页
        globalEvent.emit('scene:switch', 'HomeScene');
      }
    });
  }

  onUpdate(deltaTime) {
    // 暂停时不更新游戏逻辑
    if (this.isPaused) return;
    
    const s = this.screenWidth / 750;
    
    // 更新按钮
    if (this.backBtn) this.backBtn.update(deltaTime);
    if (this.pauseBtn) this.pauseBtn.update(deltaTime);
    if (this.quitBtn) this.quitBtn.update(deltaTime);
    if (this.exitZoomBtn) this.exitZoomBtn.update(deltaTime);
    
    // 更新清洁度
    if (this.dirtObjects && this.cleanlinessText) {
      const cleaned = this.dirtObjects.filter(d => d.state === 'clean').length;
      this.cleanProgress = cleaned / this.dirtObjects.length;
      this.cleanlinessText.setText(`${Math.floor(this.cleanProgress * 100)}%`);
    }
    
    // 更新粒子
    this.sparkles.forEach((p, i) => {
      p.life -= deltaTime * 0.002;
      if (p.life <= 0) this.sparkles.splice(i, 1);
    });
    
    // 震动效果衰减
    if (this.toolShake > 0) {
      this.toolShake -= deltaTime * 0.002;
      if (this.toolShake < 0) this.toolShake = 0;
    }
    
    // 检查是否全部完成
    if (this.dirtObjects && this.dirtObjects.length > 0 && 
        this.dirtObjects.every(d => d.state === 'clean') && 
        !this._completed) {
      this._completed = true;
      setTimeout(() => this._showSettlement(), 500);
    }
  }

  onRender(ctx) {
    const s = this.screenWidth / 750;
    
    // 背景
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    if (this.viewMode === 'zoom' && this.zoomedDirt) {
      this._renderZoomView(ctx, s);
    } else {
      this._renderRoomView(ctx, s);
    }
    
    // 绘制闪光粒子
    this._renderSparkles(ctx);
  }

  /**
   * 渲染房间视图
   * 布局：顶部 10% 为 top_bar，下方 90% 为游戏区域
   */
  _renderRoomView(ctx, s) {
    const topBarHeight = this.screenHeight * 0.1; // 顶部栏高度 10%
    const gameAreaY = topBarHeight; // 游戏区域起始 Y
    const gameAreaHeight = this.screenHeight - topBarHeight; // 游戏区域高度 90%
    
    // 先绘制顶部栏背景（防止图片覆盖）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.screenWidth, topBarHeight);
    
    // 绘制关卡背景图（在游戏区域内，占屏幕下方 90%）
    if (this.bgImage && this.bgLoaded) {
      // 使用 Cover 模式绘制背景图在游戏区域，并裁剪到游戏区域内
      ctx.save();
      ctx.rect(0, gameAreaY, this.screenWidth, gameAreaHeight);
      ctx.clip(); // 裁剪，防止图片覆盖 top_bar
      this._drawBackgroundCover(ctx, this.bgImage, 0, gameAreaY, this.screenWidth, gameAreaHeight);
      ctx.restore();
    } else {
      // 未加载时显示默认背景
      ctx.fillStyle = '#F5F5DC';
      ctx.fillRect(20 * s, gameAreaY + 20 * s, this.screenWidth - 40 * s, gameAreaHeight - 40 * s);
    }

    // 检查UI是否已初始化
    if (!this.dirtObjects) return;
    
    // 绘制污垢（y 坐标加上 gameAreaY 偏移，因为图片区域下移了）
    this.dirtObjects.forEach(dirt => {
      if (dirt.state !== 'clean') {
        const dy = dirt.y + gameAreaY; // 加上游戏区域偏移
        const alpha = 1 - (dirt.cleanProgress / dirt.maxProgress) * 0.5;
        ctx.fillStyle = this._hexToRgba(dirt.color, alpha);
        ctx.fillRect(dirt.x, dy, dirt.width, dirt.height);
        ctx.strokeStyle = this._hexToRgba(dirt.color, 0.8);
        ctx.lineWidth = 2 * s;
        ctx.strokeRect(dirt.x, dy, dirt.width, dirt.height);
        
        // 绘制进度
        if (dirt.cleanProgress > 0) {
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(dirt.x, dy - 10 * s, dirt.width * (dirt.cleanProgress / dirt.maxProgress), 6 * s);
        }
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${14 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('双击', dirt.x + dirt.width / 2, dy + dirt.height / 2 + 5 * s);
      }
    });

    // UI元素
    if (this.backBtn) this.backBtn.onRender(ctx);
    if (this.levelText) this.levelText.onRender(ctx);
    if (this.cleanlinessText) this.cleanlinessText.onRender(ctx);
    if (this.pauseBtn) this.pauseBtn.onRender(ctx);
    if (this.quitBtn) this.quitBtn.onRender(ctx);

    // 绘制清洁度球
    this._renderCleanlinessBall(ctx, s);

    // 工具栏
    this._renderToolSlot(ctx, s);
  }

  /**
   * Cover 模式绘制背景图 - 保持比例，填满指定区域，裁剪溢出
   * @param {number} targetX - 目标区域 X
   * @param {number} targetY - 目标区域 Y  
   * @param {number} targetW - 目标区域宽度
   * @param {number} targetH - 目标区域高度
   */
  _drawBackgroundCover(ctx, img, targetX, targetY, targetW, targetH) {
    const scaleX = targetW / img.width;
    const scaleY = targetH / img.height;
    
    // Cover 模式：选择较大的缩放比例，确保填满区域
    const scale = Math.max(scaleX, scaleY);
    
    // 计算绘制尺寸
    const dw = img.width * scale;
    const dh = img.height * scale;
    
    // 居中显示（超出部分自动被裁剪）
    const dx = targetX + (targetW - dw) / 2;
    const dy = targetY + (targetH - dh) / 2;
    
    // 绘制图片
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /**
   * 渲染放大视图
   */
  _renderZoomView(ctx, s) {
    const dirt = this.zoomedDirt;
    if (!dirt) return;
    
    // 深色背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    
    // 顶部栏（简化）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, this.screenWidth, 80 * s);
    
    if (this.exitZoomBtn) this.exitZoomBtn.onRender(ctx);
    
    // 绘制污垢名称
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${24 * s}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(dirt.name, 375 * s, 120 * s);
    
    // 绘制放大的污垢
    const centerX = 375 * s;
    const centerY = 600 * s;
    const size = 300 * s;
    
    const progress = dirt.cleanProgress / dirt.maxProgress;
    const alpha = 1 - progress * 0.5;
    
    ctx.fillStyle = this._hexToRgba(dirt.color, alpha);
    ctx.fillRect(centerX - size/2, centerY - size/2, size, size);
    ctx.strokeStyle = this._hexToRgba(dirt.color, 0.8);
    ctx.lineWidth = 4 * s;
    ctx.strokeRect(centerX - size/2, centerY - size/2, size, size);
    
    // 绘制进度条
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(centerX - 100 * s, centerY + size/2 + 20 * s, 200 * s, 10 * s);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(centerX - 100 * s, centerY + size/2 + 20 * s, 200 * s * progress, 10 * s);
    
    // 显示当前需要的工具
    if (dirt.state !== 'clean') {
      const requiredTool = this.tools.find(t => t.id === dirt.currentRecipe[dirt.currentStep]);
      if (requiredTool) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${18 * s}px sans-serif`;
        ctx.fillText(`需要使用: ${requiredTool.name}`, centerX, centerY + size/2 + 60 * s);
      }
    }
    
    // 绘制工具提示
    if (this.showToolTip && this.toolTipText) {
      this.toolTipText.onRender(ctx);
    }
    
    // 绘制工具槽
    this._renderToolSlot(ctx, s);
    
    // 绘制拖动的工具
    if (this.isDraggingTool) {
      const tool = this.tools[this.currentToolIndex];
      const shakeX = this.toolShake > 0 ? (Math.random() - 0.5) * 10 * s : 0;
      const shakeY = this.toolShake > 0 ? (Math.random() - 0.5) * 10 * s : 0;
      
      ctx.fillStyle = tool.color;
      ctx.beginPath();
      ctx.arc(this.dragCurrentPos.x + shakeX, this.dragCurrentPos.y + shakeY, 30 * s, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${24 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tool.icon, this.dragCurrentPos.x + shakeX, this.dragCurrentPos.y + shakeY);
      
      // 错误提示
      if (this.toolShake > 0) {
        ctx.strokeStyle = '#FF5252';
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.arc(this.dragCurrentPos.x, this.dragCurrentPos.y, 35 * s, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /**
   * 渲染工具槽
   */
  _renderToolSlot(ctx, s) {
    const slotY = 1100 * s;
    const slotHeight = 234 * s;
    
    // 工具栏背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, slotY, this.screenWidth, slotHeight);
    
    // 绘制工具项
    const toolWidth = 140 * s;
    const startX = 40 * s + this.toolSlotOffset;
    
    this.tools.forEach((tool, index) => {
      const x = startX + index * toolWidth;
      const y = slotY + 30 * s;
      const size = 120 * s;
      
      // 只绘制可见的
      if (x + size < 0 || x > this.screenWidth) return;
      
      // 选中高亮
      if (index === this.currentToolIndex) {
        ctx.fillStyle = tool.color;
        this._drawRoundedRect(ctx, x - 5 * s, y - 5 * s, size + 10 * s, size + 10 * s, 16 * s);
        ctx.fill();
      }
      
      // 工具背景
      ctx.fillStyle = index === this.currentToolIndex ? 'rgba(255,255,255,0.9)' : '#F5F5F5';
      this._drawRoundedRect(ctx, x, y, size, size, 12 * s);
      ctx.fill();
      
      // 工具图标
      ctx.fillStyle = tool.color;
      ctx.font = `${48 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tool.icon, x + size/2, y + size/2 - 10 * s);
      
      // 工具名称
      ctx.fillStyle = '#333333';
      ctx.font = `${16 * s}px sans-serif`;
      ctx.fillText(tool.name, x + size/2, y + size - 20 * s);
    });
    
    // 分页指示器
    const pageCount = this.tools.length;
    const dotSize = 8 * s;
    const dotGap = 16 * s;
    const totalWidth = pageCount * dotGap - dotGap;
    const startDotX = (this.screenWidth - totalWidth) / 2;
    
    for (let i = 0; i < pageCount; i++) {
      const dotX = startDotX + i * dotGap;
      const dotY = slotY + slotHeight - 20 * s;
      const isActive = i === this.currentToolIndex;
      
      ctx.fillStyle = isActive ? '#4A90D9' : '#CCCCCC';
      ctx.beginPath();
      ctx.arc(dotX, dotY, isActive ? dotSize : dotSize/2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 渲染清洁度球
   */
  _renderCleanlinessBall(ctx, s) {
    const cx = 680 * s;
    const cy = 65 * s;
    const radius = 40 * s;
    
    // 背景圆
    ctx.fillStyle = '#E0E0E0';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 进度圆
    ctx.fillStyle = `rgba(76, 175, 80, ${this.cleanProgress})`;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * this.cleanProgress, 0, Math.PI * 2);
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * 渲染闪光粒子
   */
  _renderSparkles(ctx) {
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const p = this.sparkles[i];
      
      ctx.fillStyle = `rgba(255, 215, 0, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      
      // 更新粒子
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      
      if (p.life <= 0) {
        this.sparkles.splice(i, 1);
      }
    }
  }

  /**
   * Hex颜色转RGBA
   */
  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * 绘制圆角矩形路径（兼容小程序）
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x 
   * @param {number} y 
   * @param {number} width 
   * @param {number} height 
   * @param {number} radius 
   */
  _drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  onTouchStart(x, y) {
    this._touchStartTime = Date.now();
    this._touchStartPos = { x, y };
    
    const s = this.screenWidth / 750;
    
    // 放大视图模式
    if (this.viewMode === 'zoom') {
      // 检查退出按钮
      if (this.exitZoomBtn && this.exitZoomBtn.onTouchStart(x, y)) return true;
      
      // 检查是否在工具槽区域（开始拖动）
      if (y > 1100 * s) {
        const toolIndex = this._getToolIndexAt(x);
        if (toolIndex >= 0) {
          this._selectTool(toolIndex);
          this.isDraggingTool = true;
          this.dragStartPos = { x, y };
          this.dragCurrentPos = { x, y };
          this.showToolTip = false;
          return true;
        }
      }
      
      // 检查是否点击污垢区域（开始拖动工具）
      if (this.isDraggingTool) {
        this.dragCurrentPos = { x, y };
        return true;
      }
      
      return true;
    }
    
    // 房间视图模式
    if (this.backBtn && this.backBtn.onTouchStart(x, y)) return true;
    if (this.pauseBtn && this.pauseBtn.onTouchStart(x, y)) return true;
    if (this.quitBtn && this.quitBtn.onTouchStart(x, y)) return true;
    
    // 检查工具槽滑动
    if (y > 1100 * s) {
      this.toolSlotDragging = true;
      this.toolSlotStartX = x;
      this.toolSlotLastX = x;
      
      // 检查是否点击了某个工具
      const toolIndex = this._getToolIndexAt(x);
      if (toolIndex >= 0) {
        this._selectTool(toolIndex);
      }
      return true;
    }

    // 检查污垢点击（双击检测）
    const clickedDirt = this._findDirtAt(x, y);
    if (clickedDirt) {
      const now = Date.now();
      if (this._lastClickDirt === clickedDirt && now - this._lastClickTime < 300) {
        // 双击 - 进入放大视图
        this._enterZoomView(clickedDirt);
      }
      this._lastClickTime = now;
      this._lastClickDirt = clickedDirt;
      return true;
    }

    return false;
  }

  onTouchMove(x, y) {
    const s = this.screenWidth / 750;
    
    if (this.viewMode === 'zoom' && this.isDraggingTool) {
      // 放大视图中的工具拖动
      this.dragCurrentPos = { x, y };
      return true;
    }
    
    if (this.toolSlotDragging) {
      // 工具槽滑动
      const deltaX = x - this.toolSlotLastX;
      this.toolSlotOffset += deltaX;
      
      // 限制滑动范围
      const minOffset = -(this.tools.length - 4) * 140 * s;
      this.toolSlotOffset = Math.max(minOffset, Math.min(0, this.toolSlotOffset));
      
      this.toolSlotLastX = x;
      return true;
    }
    
    return false;
  }

  onTouchEnd(x, y) {
    const s = this.screenWidth / 750;
    
    // 放大视图模式
    if (this.viewMode === 'zoom') {
      if (this.exitZoomBtn && this.exitZoomBtn.onTouchEnd(x, y)) return true;
      
      // 检查工具拖动结束
      if (this.isDraggingTool && this.zoomedDirt) {
        // 检查是否在污垢区域内
        const dirt = this.zoomedDirt;
        const centerX = 375 * s;
        const centerY = 600 * s;
        const size = 300 * s;
        
        if (x >= centerX - size/2 && x <= centerX + size/2 &&
            y >= centerY - size/2 && y <= centerY + size/2) {
          // 在污垢区域内使用工具
          this._useToolOnDirt(dirt);
        }
        
        this.isDraggingTool = false;
        return true;
      }
      
      return true;
    }
    
    // 房间视图模式
    if (this.backBtn && this.backBtn.onTouchEnd(x, y)) return true;
    if (this.pauseBtn && this.pauseBtn.onTouchEnd(x, y)) return true;
    if (this.quitBtn && this.quitBtn.onTouchEnd(x, y)) return true;
    
    // 结束工具槽滑动
    if (this.toolSlotDragging) {
      this.toolSlotDragging = false;
      
      // 吸附到最近的工具
      const toolWidth = 140 * s;
      const index = Math.round(-this.toolSlotOffset / toolWidth);
      const clampedIndex = Math.max(0, Math.min(this.tools.length - 1, index));
      this.toolSlotOffset = -clampedIndex * toolWidth;
      
      return true;
    }
    
    return false;
  }

  /**
   * 获取点击位置的工具索引
   */
  _getToolIndexAt(x) {
    const s = this.screenWidth / 750;
    const startX = 40 * s + this.toolSlotOffset;
    const toolWidth = 140 * s;
    
    const index = Math.floor((x - startX) / toolWidth);
    if (index >= 0 && index < this.tools.length) {
      return index;
    }
    return -1;
  }

  _findDirtAt(x, y) {
    // 将屏幕坐标转换为游戏区域坐标（减去 top_bar 高度）
    const gameAreaY = this.screenHeight * 0.1;
    const gameY = y - gameAreaY;
    
    for (let i = this.dirtObjects.length - 1; i >= 0; i--) {
      const dirt = this.dirtObjects[i];
      // 使用游戏区域坐标进行比较
      if (dirt.state !== 'clean' && x >= dirt.x && x <= dirt.x + dirt.width && 
          gameY >= dirt.y && gameY <= dirt.y + dirt.height) {
        return dirt;
      }
    }
    return null;
  }

  _cleanDirt(dirt) {
    dirt.cleanProgress += 0.3;
    if (dirt.cleanProgress >= 1) {
      dirt.state = 'clean';
      // 检查是否全部清洁完成
      if (this.dirtObjects.every(d => d.state === 'clean')) {
        setTimeout(() => {
          globalEvent.emit('game:levelComplete', { levelId: this.levelId, stars: 3 });
        }, 500);
      }
    }
  }
}

export default GameplayScene;
