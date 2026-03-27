# 背景图片显示问题文档

## 问题现象
图片不是被拉伸，而是**"放大了某个区域"** - 即图片的某个局部被放大显示，没有完整显示整张图片。

---

## 1. 当前代码架构

### 1.1 Canvas 初始化 (js/main.js)
```javascript
_initCanvas() {
  const sysInfo = wx.getSystemInfoSync();
  this.dpr = sysInfo.pixelRatio;           // 设备像素比 (如 2 或 3)
  this.screenWidth = sysInfo.windowWidth;   // 逻辑像素宽 (如 375)
  this.screenHeight = sysInfo.windowHeight; // 逻辑像素高 (如 812)
  
  this.canvas = wx.createCanvas();
  this.ctx = this.canvas.getContext('2d');
  
  // Canvas 缓冲区设为物理像素尺寸
  this.canvas.width = this.screenWidth * this.dpr;   // 750
  this.canvas.height = this.screenHeight * this.dpr; // 1624
  
  // 缩放坐标系，后续绘制使用逻辑像素
  this.ctx.scale(this.dpr, this.dpr);
}
```

### 1.2 图片加载 (js/scenes/LoadingScene.js)
```javascript
_loadBackground() {
  const img = wx.createImage();
  img.onload = () => {
    this.bgImage = img;      // img.width = 1280, img.height = 1920
    this.bgLoaded = true;
  };
  img.src = 'images/backgrounds/bg-001-loading.png';
}
```

### 1.3 图片绘制 (js/scenes/LoadingScene.js)
```javascript
onRender(ctx) {
  const width = this.screenWidth;    // 375 (逻辑像素)
  const height = this.screenHeight;  // 812 (逻辑像素)
  
  // 将 1280x1920 的图片绘制到 375x812 的区域
  ctx.drawImage(this.bgImage, 0, 0, width, height);
}
```

---

## 2. 尺寸对比分析

| 项目 | 尺寸 | 比例 |
|------|------|------|
| 背景图片 (bg-001-loading.png) | 1280 × 1920 | 1:1.5 (2:3) |
| 背景图片 (bg-002-home.png) | 1280 × 1920 | 1:1.5 (2:3) |
| iPhone 屏幕 (逻辑像素) | 375 × 812 | 1:2.16 |
| 屏幕与图片比例差异 | - | 高度比例不一致 |

### 问题根源
1. **图片比例 2:3** vs **屏幕比例 9:19.5 (约 1:2.16)**
2. 直接 `drawImage(img, 0, 0, screenWidth, screenHeight)` 会强制将 1280x1920 缩放到 375x812
3. 由于 ctx.scale(dpr, dpr) 的存在，实际绘制区域是物理像素 750x1624
4. 图片被强制拉伸/缩放以适应屏幕，导致"放大某个区域"的感觉

---

## 3. 问题诊断

### 3.1 如果看到的是图片局部放大
**原因**: drawImage 目标尺寸太小，图片被压缩显示，但只显示了部分内容

### 3.2 如果看到的是图片模糊
**原因**: 图片被过度缩小（1280→375），然后因 DPR 缩放又放大

### 3.3 当前问题
"放大了某个区域" = 图片比例与屏幕比例不匹配，导致：
- 图片高度被压缩，或者
- 图片宽度被裁剪

---

## 4. 解决方案

### 方案 A: Cover 模式（保持比例，裁剪溢出）
保持图片比例，填满屏幕，超出部分裁剪。

```javascript
_drawBackgroundCover(ctx, img, sw, sh) {
  const imgRatio = img.width / img.height;  // 1280/1920 = 0.667
  const screenRatio = sw / sh;              // 375/812 = 0.462
  
  let dw, dh, dx, dy;
  
  if (imgRatio > screenRatio) {
    // 图片更宽，以高度为基准，左右裁剪
    dh = sh;
    dw = sh * imgRatio;
    dx = (sw - dw) / 2;
    dy = 0;
  } else {
    // 图片更高，以宽度为基准，上下裁剪
    dw = sw;
    dh = sw / imgRatio;
    dx = 0;
    dy = (sh - dh) / 2;
  }
  
  ctx.drawImage(img, dx, dy, dw, dh);
}
```

### 方案 B: Contain 模式（保持比例，完整显示）
保持图片比例，完整显示，可能有黑边。

```javascript
_drawBackgroundContain(ctx, img, sw, sh) {
  const imgRatio = img.width / img.height;
  const screenRatio = sw / sh;
  
  let dw, dh, dx, dy;
  
  if (imgRatio > screenRatio) {
    // 图片更宽，以宽度为基准
    dw = sw;
    dh = sw / imgRatio;
    dx = 0;
    dy = (sh - dh) / 2;
  } else {
    // 图片更高，以高度为基准
    dh = sh;
    dw = sh * imgRatio;
    dx = (sw - dw) / 2;
    dy = 0;
  }
  
  ctx.drawImage(img, dx, dy, dw, dh);
}
```

### 方案 C: 重新设计图片
让美术提供与手机屏幕比例一致的背景图（如 9:19.5 或 9:16）。

---

## 5. 修复步骤

1. **确认期望效果**
   - Cover: 填满屏幕，允许裁剪
   - Contain: 完整显示图片，允许黑边
   - Stretch: 强制拉伸（当前效果，不推荐）

2. **选择对应方案代码**
   - 添加到 LoadingScene 和 HomeScene
   - 替换 `ctx.drawImage(this.bgImage, 0, 0, width, height)`

3. **测试验证**
   - 在不同尺寸手机上测试
   - 检查是否还有"放大区域"现象

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

## 7. 日志调试

在 `_loadBackground` 和 `onRender` 中添加日志：

```javascript
_loadBackground() {
  const img = wx.createImage();
  img.onload = () => {
    console.log(`[LoadingScene] 图片尺寸: ${img.width}x${img.height}`);
    this.bgImage = img;
    this.bgLoaded = true;
  };
}

onRender(ctx) {
  console.log(`[LoadingScene] 屏幕尺寸: ${this.screenWidth}x${this.screenHeight}`);
  console.log(`[LoadingScene] 图片尺寸: ${this.bgImage?.width}x${this.bgImage?.height}`);
  // ...
}
```

---

## 结论

问题本质是**图片比例 (2:3) 与屏幕比例 (~9:19.5) 不匹配**。当前代码强制拉伸图片填满屏幕，导致视觉上的"放大区域"效果。

**推荐方案**: 使用 Cover 模式，保持图片比例，填满屏幕并裁剪溢出部分。
