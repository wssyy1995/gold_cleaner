# Z 字动画问题记录

## 问题现象
新手引导中的 Z 字引导动画，第3画（第二横）没有显示，只显示了前两画（第一横和斜线）。

## 问题历史

### 初始实现
- Z 字动画使用分段绘制：
  - 0-600ms: 第一横
  - 600-1200ms: 斜线  
  - 1200-1800ms: 第二横
  - 1800-2300ms: 停顿
- 问题：第二横没有显示

### 第一次修复尝试
- 将停顿期间进度设为 0.999，避免 `currentSegment` 变成 3
- 为第二横添加完成分支
- 结果：问题仍然存在

### 第二次修复尝试
- 改用路径长度计算：
  - 计算三段实际长度 len1, len2, len3
  - 根据总长度和进度 t 决定画到哪里
  - 当 t=1 时应该显示完整 Z 字
- 结果：问题仍然存在，第二横仍不显示

### 第三次修复（当前方案）
- 改用固定比例分配时间：
  - 第一横：0% - 35%（约 630ms）
  - 斜线：35% - 80%（约 810ms）
  - 第二横：80% - 100%（约 360ms）
- 简化逻辑，直接使用进度 t 判断
- 当 t >= 0.80 时进入第二横绘制逻辑

## 修复代码

```javascript
if (t < 0.35) {
  // 第一横
  const p = t / 0.35;
  ctx.lineTo(zPoints[0].x + (zPoints[1].x - zPoints[0].x) * p, ...);
} else if (t < 0.80) {
  // 斜线
  ctx.lineTo(zPoints[1].x, zPoints[1].y);
  const p = (t - 0.35) / 0.45;
  ctx.lineTo(zPoints[1].x + (zPoints[2].x - zPoints[1].x) * p, ...);
} else {
  // 第二横（包含 t=1 的情况）
  ctx.lineTo(zPoints[1].x, zPoints[1].y);
  ctx.lineTo(zPoints[2].x, zPoints[2].y);
  const p = Math.min(1, (t - 0.80) / 0.20);
  ctx.lineTo(zPoints[2].x + (zPoints[3].x - zPoints[2].x) * p, ...);
}
```

## 测试验证
- [ ] 确认 Z 字 3 画都能完整显示
- [ ] 确认动画流畅，没有卡顿
- [ ] 确认停顿期间显示完整 Z 字

## 相关文件
- `js/scenes/GameplayScene.js`
- 函数：`_renderTutorialClothDirtHint`
