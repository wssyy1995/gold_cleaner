/**
 * LoadingScene 加载场景
 * 负责资源预加载和初始化
 */

import Scene from '../core/Scene';
import ResourceManager from '../managers/ResourceManager';
import GameConfig from '../config/GameConfig';
import ResourceConfig from '../config/ResourceConfig';

class LoadingScene extends Scene {
  constructor() {
    super({ name: 'LoadingScene' });

    // 加载进度
    this.progress = 0;
    // 加载提示文字
    this.tips = [
      '正在准备清洁工具...',
      '正在打扫房间...',
      '正在整理物品...',
      '马上就好...'
    ];
    this.currentTip = this.tips[0];

    // 资源管理器
    this.resourceManager = new ResourceManager();
  }

  /**
   * 场景加载
   */
  onLoad() {
    console.log('[LoadingScene] 加载场景');
    this.resourceManager.init();
  }

  /**
   * 进入场景
   */
  onEnter() {
    console.log('[LoadingScene] 进入场景');
    this.startLoading();
  }

  /**
   * 开始加载资源
   */
  startLoading() {
    // 收集需要预加载的图片资源
    const imagesToLoad = [];
    
    // UI资源
    for (const [key, src] of Object.entries(ResourceConfig.images.ui)) {
      imagesToLoad.push({ key, src });
    }

    // 工具资源
    for (const [key, src] of Object.entries(ResourceConfig.images.tools)) {
      imagesToLoad.push({ key, src });
    }

    // 开始加载
    this.resourceManager.loadImages(imagesToLoad, (progress, loaded, total) => {
      this.progress = progress;
      this.currentTip = this.tips[Math.floor(progress * (this.tips.length - 1))];
    }).then(() => {
      // 加载完成，跳转到首页
      console.log('[LoadingScene] 资源加载完成');
      setTimeout(() => {
        // TODO: 切换到HomeScene
        // this.game.switchScene('HomeScene');
      }, 500);
    }).catch(err => {
      console.error('[LoadingScene] 资源加载失败:', err);
    });
  }

  /**
   * 更新
   * @param {number} deltaTime - 距离上一帧的时间间隔
   */
  onUpdate(deltaTime) {
    // 更新加载动画等
  }

  /**
   * 渲染
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D上下文
   */
  onRender(ctx) {
    const width = 750; // 设计分辨率宽度
    const height = 1334; // 设计分辨率高度

    // 绘制背景
    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(0, 0, width, height);

    // 绘制标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(GameConfig.gameName, width / 2, height * 0.3);

    // 绘制进度条背景
    const barWidth = 500;
    const barHeight = 20;
    const barX = (width - barWidth) / 2;
    const barY = height * 0.6;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // 绘制进度条
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(barX, barY, barWidth * this.progress, barHeight);

    // 绘制进度文字
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${Math.floor(this.progress * 100)}%`, width / 2, barY + 50);

    // 绘制提示文字
    ctx.font = '28px sans-serif';
    ctx.fillText(this.currentTip, width / 2, barY + 90);
  }
}

export default LoadingScene;
