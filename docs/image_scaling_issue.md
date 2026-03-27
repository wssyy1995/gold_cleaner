# 背景图片显示问题文档

## 问题现象
图片不是被拉伸，而是**"放大了某个区域"** - 即图片的某个局部被放大显示，没有完整显示整张图片。

---

## 历史修复记录

### 尝试 1: 物理像素方案 ❌
- 将 Canvas 尺寸设为物理像素
- 移除 ctx.scale
- **结果**: 比例仍不对

### 尝试 2: 逻辑像素 + ctx.scale(dpr) ⚠️
- Canvas 缓冲区 = 逻辑尺寸 × dpr
- ctx.scale(dpr, dpr) 缩放坐标系
- drawImage 使用逻辑像素单位
- **结果**: 图片显示但"放大了某个区域"

### 尝试 3: Contain 模式 ❓
- 添加 `_drawBackgroundContain` 方法
- 保持图片比例，完整显示，可能有黑边
- **结果**: 用户反馈"还是不对"（待排查）

---

## 1. 当前代码架构（尝试3）

### 1.1 Canvas 初始化 (js/main.js)
```javascript
_initCanvas() {
  const sysInfo = wx.getSystemInfoSync();
  this.dpr = sysInfo.pixelRatio;           // 设备像素比 (如 2 或 3)
  this.screenWidth = sysInfo.windowWidth;   // 逻辑像素宽 (如 375)
  this.screenHeight = sysInfo.windowHeight; // 逻辑像素高 (如 812)
  
  this.canvas = wx.createCanvas();
  this.ctx = this.canvas.getContext('2d');
  
  // Canvas 缓冲区 = 逻辑尺寸 * dpr (物理像素)
  this.canvas.width = this.screenWidth * this.dpr;   // 750
  this.canvas.height = this.screenHeight * this.dpr; // 1624
  
  // 缩放坐标系，后续绘制使用逻辑像素
  this.ctx.scale(this.dpr, this.dpr);
  
  console.log(`[Main] 逻辑像素: ${this.screenWidth}x${this.screenHeight}, DPR: ${this.dpr}`);
}
```

### 1.2 图片加载 (js/scenes/LoadingScene.js)
```javascript
_loadBackground() {
  const img = wx.createImage();
  img.onload = () => {
    console.log(`[LoadingScene] 图片加载完成: ${img.width}x${img.height}`);
    this.bgImage = img;      // img.width = 1280, img.height = 1920
    this.bgLoaded = true;
  };
  img.src = 'images/backgrounds/bg-001-loading.png';
}
```

### 1.3 Contain 模式绘制 (js/scenes/LoadingScene.js)
```javascript
_drawBackgroundContain(ctx, img, sw, sh) {
  const imgRatio = img.width / img.height;    // 1280/1920 = 0.667
  const screenRatio = sw / sh;                // 375/812 = 0.462
  
  let dw, dh, dx, dy;
  if (imgRatio > screenRatio) {
    // 图片更宽，以宽度为基准，上下留白
    dw = sw;                                  // 375
    dh = sw / imgRatio;                       // 375/0.667 = 562
    dx = 0;
    dy = (sh - dh) / 2;                       // (812-562)/2 = 125
  } else {
    // 图片更高，以高度为基准，左右留白
    dh = sh;
    dw = sh * imgRatio;
    dx = (sw - dw) / 2;
    dy = 0;
  }
  
  // 绘制黑边背景
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, sw, sh);
  
  // 绘制图片 (预期: 375x562, 实际显示在屏幕中间)
  ctx.drawImage(img, dx, dy, dw, dh);
}

onRender(ctx) {
  const width = this.screenWidth;    // 375 (逻辑像素)
  const height = this.screenHeight;  // 812 (逻辑像素)
  
  if (this.bgImage && this.bgLoaded) {
    this._drawBackgroundContain(ctx, this.bgImage, width, height);
  }
}
```

---

## 2. 尺寸对比分析

| 项目 | 尺寸 | 比例 |
|------|------|------|
| 背景图片 (bg-001-loading.png) | 1280 × 1920 | 1:1.5 (2:3) |
| 背景图片 (bg-002-home.png) | 1280 × 1920 | 1:1.5 (2:3) |
| iPhone X 屏幕 (逻辑像素) | 375 × 812 | 1:2.16 |
| 屏幕与图片比例差异 | - | 图片更高 |

### 预期计算结果
- 图片比例 0.667 < 屏幕比例 0.462
- 走 else 分支：以高度为基准
- dh = 812, dw = 812 × 0.667 = **542**
- dx = (375-542)/2 = **-83** (左右溢出，被裁剪)
- dy = 0

**等等！这说明 Contain 模式也会左右溢出...**

---

## 3. 问题根因分析（新发现）

### 3.1 比例计算错误
之前分析认为图片比例 (0.667) > 屏幕比例 (0.462)，但实际：
- 图片比例 = 1280/1920 = **0.667** (宽/高)
- 屏幕比例 = 375/812 = **0.462** (宽/高)
- 0.667 > 0.462，所以图片相对更**宽**

**但图片是 1280×1920，明显是竖图（高>宽），怎么会"更宽"？**

### 3.2 真相：屏幕比图片更"瘦"
- 屏幕 375×812 是非常瘦的竖屏 (9:19.5)
- 图片 1280×1920 是比较标准的竖图 (2:3)
- 相对屏幕来说，图片算是"比较宽"的

### 3.3 Contain 模式的实际效果
```
屏幕: 375×812 (很瘦)
图片: 1280×1920 (较宽)

Contain 计算:
- 图片比例 0.667 > 屏幕比例 0.462
- 以宽度为基准：dw=375, dh=375/0.667=562
- 结果: 图片上下有 125px 留白，左右正好填满

这看起来是对的啊？为什么用户说"还是不对"？
```

---

## 4. 可能的问题原因

### 原因 A: 尺寸获取错误
`wx.getSystemInfoSync()` 返回的尺寸可能不是预期的值。

**排查**: 添加日志确认
```javascript
const sysInfo = wx.getSystemInfoSync();
console.log('windowWidth:', sysInfo.windowWidth);
console.log('windowHeight:', sysInfo.windowHeight);
console.log('screenWidth:', sysInfo.screenWidth);
console.log('screenHeight:', sysInfo.screenHeight);
console.log('pixelRatio:', sysInfo.pixelRatio);
```

### 原因 B: Canvas 尺寸与屏幕不匹配
微信小程序 Canvas 可能有特殊行为。

**排查**: 确认 `wx.createCanvas()` 返回的 Canvas 尺寸
```javascript
this.canvas = wx.createCanvas();
console.log('canvas width:', this.canvas.width);
console.log('canvas height:', this.canvas.height);
```

### 原因 C: ctx.scale 影响了图片尺寸
`ctx.scale(dpr, dpr)` 会把所有坐标缩放，包括 drawImage 的目标尺寸。

**验证**: 如果 dpr=2，drawImage(img, 0, 0, 375, 812) 实际绘制 750×1624 像素，这正好是 Canvas 缓冲区大小。**这应该是对的**。

### 原因 D: 图片本身加载问题
图片可能没有正确加载，或者尺寸读取错误。

**排查**: 
```javascript
img.onload = () => {
  console.log('图片自然尺寸:', img.naturalWidth, img.naturalHeight);
  console.log('图片实际尺寸:', img.width, img.height);
};
```

### 原因 E: 屏幕尺寸传递错误
Scene 中的 screenWidth/screenHeight 可能不是从 Main 正确传递的。

**排查**: 检查 `loadingScene.screenWidth = this.screenWidth`

---

## 5. 下一步排查清单

请收集以下信息：

1. **控制台日志**
   ```
   [Main] 逻辑像素: ?x?, DPR: ?
   [LoadingScene] 图片加载完成: ?x?
   ```

2. **实际现象描述**
   - 图片是"只显示了局部"还是"完整显示了但比例不对"？
   - 有没有黑边？黑边在什么位置？
   - 图片是模糊的还是清晰的？

3. **测试设备信息**
   - 手机型号
   - 微信版本

4. **截图**
   - 实际显示效果截图

---

## 6. 相关文件

| 文件 | 作用 |
|------|------|
| js/main.js | Canvas 初始化，DPR 处理 |
| js/scenes/LoadingScene.js | 加载页背景图加载与绘制 |
| js/scenes/HomeScene.js | 首页背景图加载与绘制 |
| images/backgrounds/bg-001-loading.png | 1280×1920 |
| images/backgrounds/bg-002-home.png | 1280×1920 |

---

## 7. 备选方案

如果 Contain 模式确实无法满足需求：

### 方案 D: 使用 9:16 比例的图片
让美术重新出图，比例与手机屏幕一致。

### 方案 E: 使用 CSS 背景图（如果可能）
微信小程序支持 `<canvas type="2d">`，可能有不同的渲染行为。

### 方案 F: 动态调整 Canvas 尺寸
让 Canvas 尺寸与图片比例一致，然后居中显示。

---

## 当前状态

- ✅ 代码逻辑已更新为 Contain 模式
- ❓ 用户反馈"还是不对"（具体现象待确认）
- ⏳ 需要收集日志和截图进一步分析
