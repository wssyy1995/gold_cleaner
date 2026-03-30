/**
 * Text UI组件
 * 负责任务 5.1.2 实现文本组件（Text）
 */

import Component from '../../core/Component';

class Text extends Component {
  constructor(options = {}) {
    super(options);

    // 位置
    this.x = options.x || 0;
    this.y = options.y || 0;

    // 内容
    this.text = options.text || '';
    this._displayText = this.text; // 实际显示的文本（考虑截断）

    // 字体样式
    this.fontSize = options.fontSize || 14;
    this.fontFamily = options.fontFamily || 'sans-serif';
    this.fontWeight = options.fontWeight || 'normal'; // normal, bold
    this.fontStyle = options.fontStyle || 'normal'; // normal, italic
    this.lineHeight = options.lineHeight || 1.4; // 行高倍数

    // 颜色
    this.color = options.color || '#333333';
    this.strokeColor = options.strokeColor || null; // 描边颜色
    this.strokeWidth = options.strokeWidth || 0; // 描边宽度
    this.shadowColor = options.shadowColor || null;
    this.shadowBlur = options.shadowBlur || 0;
    this.shadowOffsetX = options.shadowOffsetX || 0;
    this.shadowOffsetY = options.shadowOffsetY || 0;

    // 对齐
    this.align = options.align || 'left'; // left, center, right
    this.baseline = options.baseline || 'top'; // top, middle, bottom, alphabetic

    // 尺寸限制
    this.maxWidth = options.maxWidth || null; // 最大宽度
    this.maxLines = options.maxLines || null; // 最大行数
    this.ellipsis = options.ellipsis !== false; // 超出显示省略号

    // 多行文本
    this._lines = []; // 分行后的文本
    this.lineHeightPx = this.fontSize * this.lineHeight;

    // 尺寸
    this._width = 0;
    this._height = 0;

    // 解析文本
    this._parseText();
  }

  /**
   * 设置文本
   */
  setText(text) {
    this.text = String(text);
    this._parseText();
  }

  /**
   * 解析文本（分行等）
   */
  _parseText() {
    if (!this.text) {
      this._lines = [];
      this._width = 0;
      this._height = 0;
      return;
    }

    // 创建临时Canvas来测量文本
    const canvas = typeof wx !== 'undefined' ? wx.createCanvas() : document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = this._getFontString();

    if (!this.maxWidth) {
      // 单行文本，无宽度限制
      this._lines = this.text.split('\n');
      this._width = Math.max(...this._lines.map(line => ctx.measureText(line).width));
    } else {
      // 需要自动换行
      this._lines = this._wrapText(ctx, this.text, this.maxWidth);
      this._width = this.maxWidth;
    }

    // 限制行数
    if (this.maxLines && this._lines.length > this.maxLines) {
      this._lines = this._lines.slice(0, this.maxLines);
      if (this.ellipsis && this._lines.length > 0) {
        const lastLine = this._lines[this._lines.length - 1];
        const truncated = this._truncateWithEllipsis(ctx, lastLine, this.maxWidth);
        this._lines[this._lines.length - 1] = truncated;
      }
    }

    // 计算高度
    this._height = this._lines.length * this.lineHeightPx;
  }

  /**
   * 文本自动换行
   */
  _wrapText(ctx, text, maxWidth) {
    const lines = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      let currentLine = '';
      const words = paragraph.split(''); // 按字符分割（中文）

      for (const word of words) {
        const testLine = currentLine + word;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * 截断文本并添加省略号
   */
  _truncateWithEllipsis(ctx, text, maxWidth) {
    const ellipsis = '...';
    let result = text;
    
    while (ctx.measureText(result + ellipsis).width > maxWidth && result.length > 0) {
      result = result.slice(0, -1);
    }
    
    return result + ellipsis;
  }

  /**
   * 获取字体字符串
   */
  _getFontString() {
    return `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
  }

  /**
   * 渲染
   */
  onRender(ctx) {
    ctx.save();

    // 设置字体
    ctx.font = this._getFontString();
    ctx.fillStyle = this.color;
    ctx.textAlign = this.align;
    ctx.textBaseline = this.baseline;

    // 设置阴影
    if (this.shadowColor) {
      ctx.shadowColor = this.shadowColor;
      ctx.shadowBlur = this.shadowBlur;
      ctx.shadowOffsetX = this.shadowOffsetX;
      ctx.shadowOffsetY = this.shadowOffsetY;
    }

    // Canvas 的 textAlign 已经处理了对齐，x 直接使用 this.x 即可
    const x = this.x;

    // 绘制每行
    for (let i = 0; i < this._lines.length; i++) {
      const lineY = this.y + i * this.lineHeightPx;
      
      // 绘制描边
      if (this.strokeWidth > 0 && this.strokeColor) {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.strokeText(this._lines[i], x, lineY);
      }

      // 绘制填充
      ctx.fillText(this._lines[i], x, lineY);
    }

    ctx.restore();
  }

  /**
   * 获取文本尺寸
   */
  getSize() {
    return { width: this._width, height: this._height };
  }

  /**
   * 获取行数
   */
  getLineCount() {
    return this._lines.length;
  }

  /**
   * 设置位置
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * 设置最大宽度
   */
  setMaxWidth(maxWidth) {
    this.maxWidth = maxWidth;
    this._parseText();
  }

  /**
   * 设置颜色
   */
  setColor(color) {
    this.color = color;
  }

  /**
   * 设置字体大小
   */
  setFontSize(size) {
    this.fontSize = size;
    this.lineHeightPx = this.fontSize * this.lineHeight;
    this._parseText();
  }
}

export default Text;
