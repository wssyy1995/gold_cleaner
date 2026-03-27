/**
 * HomeScene 首页场景
 * 游戏主界面，显示关卡地图
 */

import Scene from '../core/Scene';

class HomeScene extends Scene {
  constructor() {
    super({ name: 'HomeScene' });

    // 当前阶段
    this.currentStage = 1;
    // 总阶段数
    this.totalStages = 3;
    // 关卡数据
    this.levels = [];
    // UI元素
    this.uiElements = [];
  }

  /**
   * 场景加载
   */
  onLoad() {
    console.log('[HomeScene] 加载场景');
    this.generateLevels();
  }

  /**
   * 生成关卡数据
   */
  generateLevels() {
    // 每个阶段12个关卡
    for (let i = 1; i <= 12; i++) {
      this.levels.push({
        id: i,
        stage: this.currentStage,
        name: `关卡 ${i}`,
        unlocked: i === 1, // 第一个关卡默认解锁
        stars: 0,
        x: 0,
        y: 0
      });
    }
  }

  /**
   * 进入场景
   */
  onEnter() {
    console.log('[HomeScene] 进入场景');
  }

  /**
   * 初始化
   */
  onInit() {
    console.log('[HomeScene] 初始化');
    this.setupUI();
  }

  /**
   * 设置UI
   */
  setupUI() {
    // TODO: 创建UI元素
  }

  /**
   * 更新
   * @param {number} deltaTime - 距离上一帧的时间间隔
   */
  onUpdate(deltaTime) {
    // 更新动画等
  }

  /**
   * 渲染
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   */
  onRender(ctx) {
    const width = 750;
    const height = 1334;

    // 绘制背景
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, width, height);

    // 绘制顶部栏
    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(0, 0, width, 100);

    // 绘制标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('金牌保洁升职记', width / 2, 60);

    // 绘制金币
    ctx.textAlign = 'left';
    ctx.font = '28px sans-serif';
    ctx.fillText('💰 100', 20, 60);

    // 绘制阶段标题
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`阶段 ${this.currentStage}`, width / 2, 160);

    // 绘制关卡列表
    this.renderLevels(ctx);
  }

  /**
   * 渲染关卡列表
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   */
  renderLevels(ctx) {
    const startY = 250;
    const gapY = 180;
    const width = 750;

    this.levels.forEach((level, index) => {
      const x = width / 2;
      const y = startY + index * gapY;

      // 绘制关卡图标背景
      if (level.unlocked) {
        ctx.fillStyle = '#4A90D9';
      } else {
        ctx.fillStyle = '#CCCCCC';
      }
      
      ctx.beginPath();
      ctx.arc(x, y, 50, 0, Math.PI * 2);
      ctx.fill();

      // 绘制关卡编号
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(level.id.toString(), x, y);

      // 绘制星级
      if (level.stars > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '24px sans-serif';
        ctx.fillText('★'.repeat(level.stars), x, y + 70);
      }

      // 绘制锁定图标
      if (!level.unlocked) {
        ctx.fillStyle = '#666666';
        ctx.font = '20px sans-serif';
        ctx.fillText('🔒', x, y);
      }
    });
  }

  /**
   * 处理点击事件
   * @param {number} x - 点击X坐标
   * @param {number} y - 点击Y坐标
   */
  onTouchStart(x, y) {
    // TODO: 处理关卡点击
  }
}

export default HomeScene;
