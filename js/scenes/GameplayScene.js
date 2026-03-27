/**
 * GameplayScene 游戏进行场景
 * 核心游戏玩法界面
 */

import Scene from '../core/Scene';

class GameplayScene extends Scene {
  constructor() {
    super({ name: 'GameplayScene' });

    // 当前关卡ID
    this.levelId = 0;
    // 关卡数据
    this.levelData = null;
    // 污垢对象列表
    this.dirtObjects = [];
    // 当前选中的工具索引
    this.currentToolIndex = 0;
    // 工具槽
    this.toolSlots = [];
    // 清洁进度
    this.cleanProgress = 0;
    // 是否放大视图
    this.isZoomed = false;
    // 当前放大的污垢
    this.zoomedDirt = null;
  }

  /**
   * 场景加载
   * @param {Object} data - 场景数据
   */
  onLoad(data = {}) {
    console.log('[GameplayScene] 加载场景', data);
    this.levelId = data.levelId || 1;
    this.loadLevelData();
  }

  /**
   * 加载关卡数据
   */
  loadLevelData() {
    // TODO: 从配置或服务器加载关卡数据
    this.levelData = {
      id: this.levelId,
      name: `关卡 ${this.levelId}`,
      dirtCount: 5,
      timeLimit: 120
    };

    // 生成污垢对象
    this.generateDirtObjects();
  }

  /**
   * 生成污垢对象
   */
  generateDirtObjects() {
    this.dirtObjects = [];
    for (let i = 0; i < this.levelData.dirtCount; i++) {
      this.dirtObjects.push({
        id: i,
        type: 'dust',
        x: 100 + Math.random() * 550,
        y: 300 + Math.random() * 600,
        width: 80,
        height: 80,
        cleanProgress: 0,
        state: 'dirty' // dirty, cleaning, clean
      });
    }
  }

  /**
   * 进入场景
   */
  onEnter() {
    console.log('[GameplayScene] 进入场景');
    this.setupTools();
  }

  /**
   * 设置工具槽
   */
  setupTools() {
    // 默认工具配置
    this.toolSlots = [
      { id: 'tool_basic_cloth', name: '基础抹布', icon: 'tool_basic_cloth' },
      { id: 'tool_sponge', name: '海绵', icon: 'tool_sponge' },
      { id: 'tool_brush', name: '刷子', icon: 'tool_brush' }
    ];
  }

  /**
   * 更新
   * @param {number} deltaTime - 距离上一帧的时间间隔
   */
  onUpdate(deltaTime) {
    // 更新污垢状态等
  }

  /**
   * 渲染
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   */
  onRender(ctx) {
    const width = 750;
    const height = 1334;

    // 绘制房间背景
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(0, 0, width, height);

    // 绘制顶部UI栏
    this.renderTopUI(ctx, width);

    // 绘制房间区域
    this.renderRoom(ctx, width, height);

    // 绘制底部工具槽
    this.renderToolBar(ctx, width, height);

    // 如果处于放大视图，绘制返回按钮
    if (this.isZoomed) {
      this.renderBackButton(ctx);
    }
  }

  /**
   * 渲染顶部UI
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   * @param {number} width - 屏幕宽度
   */
  renderTopUI(ctx, width) {
    // 顶部栏背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, 120);

    // 返回按钮
    ctx.fillStyle = '#4A90D9';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('← 返回', 20, 70);

    // 关卡名称
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.levelData?.name || '关卡', width / 2, 70);

    // 清洁度球
    const ballX = width - 80;
    const ballY = 60;
    const ballRadius = 40;

    // 绘制进度球背景
    ctx.fillStyle = '#E0E0E0';
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    // 绘制进度
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius * this.cleanProgress, 0, Math.PI * 2);
    ctx.fill();

    // 绘制进度文字
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(this.cleanProgress * 100)}%`, ballX, ballY + 8);
  }

  /**
   * 渲染房间
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   * @param {number} width - 屏幕宽度
   * @param {number} height - 屏幕高度
   */
  renderRoom(ctx, width, height) {
    // 房间背景
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(20, 140, width - 40, height - 400);

    // 绘制污垢对象
    if (!this.isZoomed) {
      this.dirtObjects.forEach(dirt => {
        if (dirt.state !== 'clean') {
          this.renderDirt(ctx, dirt);
        }
      });
    } else if (this.zoomedDirt) {
      // 放大视图，只显示当前污垢
      this.renderZoomedDirt(ctx, this.zoomedDirt);
    }
  }

  /**
   * 渲染污垢
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   * @param {Object} dirt - 污垢对象
   */
  renderDirt(ctx, dirt) {
    // 污垢背景
    const alpha = 1 - dirt.cleanProgress * 0.5;
    ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
    ctx.fillRect(dirt.x, dirt.y, dirt.width, dirt.height);

    // 污垢边框
    ctx.strokeStyle = 'rgba(160, 82, 45, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(dirt.x, dirt.y, dirt.width, dirt.height);

    // 提示双击
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('双击清洁', dirt.x + dirt.width / 2, dirt.y + dirt.height / 2 + 6);
  }

  /**
   * 渲染放大的污垢
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   * @param {Object} dirt - 污垢对象
   */
  renderZoomedDirt(ctx, dirt) {
    const centerX = 375;
    const centerY = 500;
    const size = 400;

    // 绘制放大的污垢区域
    ctx.fillStyle = `rgba(139, 69, 19, ${1 - dirt.cleanProgress * 0.5})`;
    ctx.fillRect(centerX - size / 2, centerY - size / 2, size, size);

    // 提示文字
    ctx.fillStyle = '#333333';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('选择工具并拖动清洁', centerX, centerY + size / 2 + 40);
  }

  /**
   * 渲染底部工具槽
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   * @param {number} width - 屏幕宽度
   * @param {number} height - 屏幕高度
   */
  renderToolBar(ctx, width, height) {
    const barHeight = 200;
    const barY = height - barHeight;

    // 工具栏背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, barY, width, barHeight);

    // 绘制工具槽
    const slotSize = 80;
    const slotGap = 20;
    const startX = 40;
    const slotY = barY + 30;

    this.toolSlots.forEach((tool, index) => {
      const x = startX + index * (slotSize + slotGap);

      // 选中高亮
      if (index === this.currentToolIndex) {
        ctx.fillStyle = '#4A90D9';
        ctx.fillRect(x - 5, slotY - 5, slotSize + 10, slotSize + 10);
      }

      // 工具槽背景
      ctx.fillStyle = '#F0F0F0';
      ctx.fillRect(x, slotY, slotSize, slotSize);

      // 工具图标占位
      ctx.fillStyle = '#999999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tool.name, x + slotSize / 2, slotY + slotSize / 2 + 5);

      // 工具名称
      ctx.fillStyle = '#333333';
      ctx.font = '12px sans-serif';
      ctx.fillText(tool.name, x + slotSize / 2, slotY + slotSize + 20);
    });
  }

  /**
   * 渲染返回按钮
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   */
  renderBackButton(ctx) {
    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(20, 140, 80, 40);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('退出', 60, 167);
  }

  /**
   * 选择工具
   * @param {number} index - 工具索引
   */
  selectTool(index) {
    if (index >= 0 && index < this.toolSlots.length) {
      this.currentToolIndex = index;
    }
  }

  /**
   * 双击污垢
   * @param {Object} dirt - 污垢对象
   */
  doubleClickDirt(dirt) {
    if (!this.isZoomed && dirt.state !== 'clean') {
      this.isZoomed = true;
      this.zoomedDirt = dirt;
    }
  }

  /**
   * 退出放大视图
   */
  exitZoom() {
    this.isZoomed = false;
    this.zoomedDirt = null;
  }

  /**
   * 使用工具清洁
   * @param {Object} dirt - 污垢对象
   */
  useToolOnDirt(dirt) {
    const tool = this.toolSlots[this.currentToolIndex];
    if (!tool) return;

    // TODO: 检查工具与污垢的匹配
    // 更新清洁进度
    dirt.cleanProgress += 0.2;
    
    if (dirt.cleanProgress >= 1) {
      dirt.cleanProgress = 1;
      dirt.state = 'clean';
      this.exitZoom();
      this.checkLevelComplete();
    }

    this.updateCleanProgress();
  }

  /**
   * 更新整体清洁进度
   */
  updateCleanProgress() {
    const totalDirt = this.dirtObjects.length;
    const cleanedDirt = this.dirtObjects.filter(d => d.state === 'clean').length;
    this.cleanProgress = cleanedDirt / totalDirt;
  }

  /**
   * 检查关卡是否完成
   */
  checkLevelComplete() {
    if (this.cleanProgress >= 1) {
      console.log('[GameplayScene] 关卡完成!');
      // TODO: 显示结算弹窗
    }
  }
}

export default GameplayScene;
