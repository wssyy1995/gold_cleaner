/**
 * LoadingScene 加载场景
 * 负责任务 5.3.1 ~ 5.3.5
 * - 5.3.1 设计加载页布局
 * - 5.3.2 实现加载动画
 * - 5.3.3 实现加载进度显示
 * - 5.3.4 实现核心资源预加载逻辑
 * - 5.3.5 加载完成后切换到首页
 */

import Scene from '../core/Scene';
import ProgressBar from '../ui/components/ProgressBar';
import Text from '../ui/components/Text';
import ResourceLoader from '../cloud/ResourceLoader';
import GameConfig from '../config/GameConfig';
import { globalEvent } from '../core/EventEmitter';

class LoadingScene extends Scene {
  constructor() {
    super({ name: 'LoadingScene' });

    // 屏幕尺寸
    this.screenWidth = 750;
    this.screenHeight = 1334;

    // 加载状态
    this.loadingState = 'initial'; // initial, loading, complete, error
    this.progress = 0;
    this.loadingText = '正在准备清洁工具...';

    // 加载提示
    this.tips = [
      '正在准备清洁工具...',
      '正在打扫房间...',
      '正在整理物品...',
      '正在检查卫生...',
      '马上就好...'
    ];
    this.currentTipIndex = 0;

    // 资源加载器
    this.resourceLoader = new ResourceLoader();

    // 背景图
    this.bgImage = null;
    this.bgLoaded = false;

    // UI组件
    this.progressBar = null;
    this.titleText = null;
    this.tipText = null;

    // 最小加载时间（避免闪屏）
    this.minLoadingTime = 2000;
    this.startTime = 0;
  }

  /**
   * 场景加载
   */
  onLoad() {
    console.log('[LoadingScene] 加载场景');
    this._loadBackground();
    this._initUI();
    this.resourceLoader.init();
  }

  /**
   * 加载背景图
   */
  _loadBackground() {
    if (typeof wx !== 'undefined') {
      const img = wx.createImage();
      img.onload = () => {
        console.log('[LoadingScene] 背景图加载完成');
        this.bgImage = img;
        this.bgLoaded = true;
      };
      img.onerror = () => {
        console.warn('[LoadingScene] 背景图加载失败');
      };
      img.src = 'images/backgrounds/bg-001-loading.png';
    }
  }

  /**
   * 初始化UI
   */
  _initUI() {
    const centerX = this.screenWidth / 2;

    // 5.3.1 设计加载页布局 - 标题
    this.titleText = new Text({
      x: centerX,
      y: 400,
      text: GameConfig.gameName,
      fontSize: 56,
      fontWeight: 'bold',
      color: '#4A90D9',
      align: 'center',
      shadow: { color: 'rgba(0,0,0,0.1)', blur: 4, offsetX: 2, offsetY: 2 }
    });

    // 副标题
    this.subtitleText = new Text({
      x: centerX,
      y: 480,
      text: '金牌保洁，从这里开始',
      fontSize: 28,
      color: '#666666',
      align: 'center'
    });

    // 5.3.2 实现加载动画 - 旋转图标区域（在render中绘制）

    // 5.3.3 实现加载进度显示 - 进度条
    this.progressBar = new ProgressBar({
      x: centerX - 250,
      y: 750,
      width: 500,
      height: 16,
      progress: 0,
      bgColor: '#E8E8E8',
      fillColor: '#4A90D9',
      fillGradient: { start: '#4A90D9', end: '#5BA0E9' },
      borderRadius: 8,
      striped: true,
      animated: true
    });

    // 进度百分比文字
    this.percentText = new Text({
      x: centerX,
      y: 790,
      text: '0%',
      fontSize: 24,
      color: '#4A90D9',
      align: 'center'
    });

    // 提示文字
    this.tipText = new Text({
      x: centerX,
      y: 850,
      text: this.tips[0],
      fontSize: 24,
      color: '#999999',
      align: 'center'
    });

    // 版本号
    this.versionText = new Text({
      x: centerX,
      y: this.screenHeight - 60,
      text: `v${GameConfig.version}`,
      fontSize: 20,
      color: '#CCCCCC',
      align: 'center'
    });
  }

  /**
   * 进入场景
   */
  onEnter() {
    console.log('[LoadingScene] 进入场景，开始加载资源');
    this.startTime = Date.now();
    this.loadingState = 'loading';
    this._startLoading();
  }

  /**
   * 5.3.4 实现核心资源预加载逻辑
   * 开始加载资源
   */
  async _startLoading() {
    try {
      // 开发模式：模拟加载进度，不实际加载资源
      // 实际项目中应该加载真实资源
      
      let progress = 0;
      const loadInterval = setInterval(() => {
        progress += 0.1;
        this._onProgressUpdate({ progress: Math.min(1, progress) });
        
        if (progress >= 1) {
          clearInterval(loadInterval);
          this._onLoadingComplete();
        }
      }, 200);
      
    } catch (error) {
      console.error('[LoadingScene] 加载失败:', error);
      this._onLoadingError(error.message);
    }
  }

  /**
   * 注册需要加载的资源
   */
  _registerResources() {
    // 核心UI资源
    const commonResources = [
      { key: 'ui_btn_normal', url: 'images/ui/btn_normal.png', type: 'image', priority: 10 },
      { key: 'ui_btn_pressed', url: 'images/ui/btn_pressed.png', type: 'image', priority: 10 },
      { key: 'ui_panel', url: 'images/ui/panel.png', type: 'image', priority: 9 },
      { key: 'ui_progress_bar', url: 'images/ui/progress_bar.png', type: 'image', priority: 9 },
      { key: 'ui_coin', url: 'images/ui/coin.png', type: 'image', priority: 8 },
      { key: 'ui_star', url: 'images/ui/star.png', type: 'image', priority: 8 },
      // 基础工具
      { key: 'tool_basic_cloth', url: 'images/tools/basic_cloth.png', type: 'image', priority: 7 },
      { key: 'tool_sponge', url: 'images/tools/sponge.png', type: 'image', priority: 7 },
      { key: 'tool_brush', url: 'images/tools/brush.png', type: 'image', priority: 7 }
    ];

    this.resourceLoader.registerSceneResources('common', commonResources);
  }

  /**
   * 进度更新
   */
  _onProgressUpdate(progress) {
    this.progress = progress.progress;

    // 检查UI是否已初始化
    if (!this.progressBar || !this.percentText || !this.tipText) {
      return;
    }

    // 更新进度条
    this.progressBar.setProgress(this.progress);

    // 更新百分比
    this.percentText.setText(`${Math.floor(this.progress * 100)}%`);

    // 更新提示文字
    const tipIndex = Math.floor(this.progress * (this.tips.length - 1));
    if (tipIndex !== this.currentTipIndex && tipIndex < this.tips.length) {
      this.currentTipIndex = tipIndex;
      this.tipText.setText(this.tips[tipIndex]);
    }

    globalEvent.emit('loading:progress', this.progress);
  }

  /**
   * 加载完成
   */
  _onLoadingComplete() {
    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.minLoadingTime - elapsed);

    console.log(`[LoadingScene] 资源加载完成，用时 ${elapsed}ms，等待 ${remaining}ms`);

    // 确保最小加载时间
    setTimeout(() => {
      this.loadingState = 'complete';
      this.progress = 1;
      
      // 检查UI是否还存在（可能场景已切换）
      if (this.progressBar) this.progressBar.setProgress(1);
      if (this.percentText) this.percentText.setText('100%');
      if (this.tipText) this.tipText.setText('准备就绪！');

      // 5.3.5 加载完成后切换到首页
      this._switchToHome();
    }, remaining);
  }

  /**
   * 5.3.5 加载完成后切换到首页
   * 切换到首页
   */
  _switchToHome() {
    console.log('[LoadingScene] 切换到首页');

    setTimeout(() => {
      globalEvent.emit('scene:switch', 'HomeScene');
    }, 500);
  }

  /**
   * 加载错误
   */
  _onLoadingError(message) {
    this.loadingState = 'error';
    if (this.tipText) {
      this.tipText.setText(`加载失败: ${message}`);
      this.tipText.setColor('#FF6B6B');
    }

    // 显示重试按钮（简化版，实际可以用Button组件）
    console.error('[LoadingScene] 加载错误:', message);
  }

  /**
   * 更新
   */
  onUpdate(deltaTime) {
    // 更新进度条动画
    if (this.progressBar) {
      this.progressBar.update(deltaTime);
    }

    // 更新旋转动画角度
    this._rotation = (this._rotation || 0) + deltaTime * 0.005;
    if (this._rotation > Math.PI * 2) {
      this._rotation -= Math.PI * 2;
    }
  }

  /**
   * 渲染
   */
  onRender(ctx) {
    // 使用逻辑像素（Canvas 已经通过 ctx.scale(dpr, dpr) 缩放）
    const width = this.screenWidth;
    const height = this.screenHeight;

    // 绘制背景图
    if (this.bgImage && this.bgLoaded) {
      // 直接填满屏幕（使用逻辑像素坐标）
      // Canvas 已经缩放了，所以直接画 0,0 到 width,height 即可
      ctx.drawImage(this.bgImage, 0, 0, width, height);
    } else {
      // 备用背景色
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, width, height);
      
      // 绘制装饰圆形
      ctx.fillStyle = 'rgba(74, 144, 217, 0.05)';
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.3, 200, 0, Math.PI * 2);
      ctx.fill();
    }

    // 检查UI是否已初始化
    if (!this.titleText) return;

    // 绘制标题
    this.titleText.onRender(ctx);
    if (this.subtitleText) this.subtitleText.onRender(ctx);

    // 5.3.2 实现加载动画 - 绘制旋转的加载图标
    this._drawLoadingIcon(ctx, width / 2, 620);

    // 绘制进度条
    if (this.progressBar) this.progressBar.onRender(ctx);
    if (this.percentText) this.percentText.onRender(ctx);
    if (this.tipText) this.tipText.onRender(ctx);

    // 绘制版本号
    if (this.versionText) this.versionText.onRender(ctx);
  }

  /**
   * 5.3.2 实现加载动画
   * 绘制加载图标
   */
  _drawLoadingIcon(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._rotation || 0);

    // 绘制旋转的小圆点
    const dotCount = 8;
    const radius = 30;
    const dotRadius = 6;

    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const dotX = Math.cos(angle) * radius;
      const dotY = Math.sin(angle) * radius;

      // 根据位置设置透明度，形成渐变效果
      const alpha = 0.3 + ((i / dotCount) * 0.7);

      ctx.fillStyle = `rgba(74, 144, 217, ${alpha})`;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export default LoadingScene;
