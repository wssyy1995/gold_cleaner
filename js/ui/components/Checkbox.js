/**
 * Checkbox & Radio UI组件
 * 负责任务 5.1.6 实现单选框/多选框组件
 */

import Component from '../../core/Component';
import { globalEvent } from '../../core/EventEmitter';

/**
 * Checkbox 多选框
 */
class Checkbox extends Component {
  constructor(options = {}) {
    super(options);

    // 位置
    this.x = options.x || 0;
    this.y = options.y || 0;

    // 尺寸
    this.size = options.size || 24; // 复选框大小
    this.gap = options.gap || 8; // 复选框与文字的间距

    // 标签文字
    this.label = options.label || '';
    this.fontSize = options.fontSize || 14;
    this.textColor = options.textColor || '#333333';

    // 状态
    this._checked = options.checked || false;
    this._disabled = options.disabled || false;

    // 样式
    this.boxColor = options.boxColor || '#4A90D9';
    this.boxColorDisabled = options.boxColorDisabled || '#CCCCCC';
    this.checkColor = options.checkColor || '#FFFFFF';
    this.bgColor = options.bgColor || '#FFFFFF';
    this.borderRadius = options.borderRadius || 4;
    this.borderWidth = options.borderWidth || 2;

    // 回调
    this.onChange = options.onChange || null;

    // 动画
    this.checkScale = this._checked ? 1 : 0;
    this.targetCheckScale = this._checked ? 1 : 0;
  }

  /**
   * 获取/设置选中状态
   */
  get checked() { return this._checked; }
  set checked(value) {
    if (this._checked !== value) {
      this._checked = value;
      this.targetCheckScale = value ? 1 : 0;
      
      if (this.onChange) {
        this.onChange(value, this);
      }
      
      globalEvent.emit('ui:checkbox:change', value, this);
    }
  }

  /**
   * 切换选中状态
   */
  toggle() {
    if (!this._disabled) {
      this.checked = !this._checked;
    }
  }

  /**
   * 处理触摸
   */
  onTouchStart(x, y) {
    if (this._disabled) return false;
    
    if (this.containsPoint(x, y)) {
      this.toggle();
      return true;
    }
    return false;
  }

  /**
   * 更新动画
   */
  update(deltaTime) {
    // 勾选动画
    const speed = 0.2;
    this.checkScale += (this.targetCheckScale - this.checkScale) * speed;
  }

  /**
   * 渲染
   */
  onRender(ctx) {
    ctx.save();

    const boxColor = this._disabled ? this.boxColorDisabled : this.boxColor;
    const currentBgColor = this._checked ? boxColor : this.bgColor;

    // 绘制复选框
    ctx.fillStyle = currentBgColor;
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = this.borderWidth;

    if (this.borderRadius > 0) {
      this._drawRoundRect(ctx, this.x, this.y, this.size, this.size, this.borderRadius);
      ctx.fill();
      if (!this._checked) {
        ctx.stroke();
      }
    } else {
      ctx.fillRect(this.x, this.y, this.size, this.size);
      if (!this._checked) {
        ctx.strokeRect(this.x, this.y, this.size, this.size);
      }
    }

    // 绘制勾选标记
    if (this.checkScale > 0.01) {
      ctx.save();
      ctx.strokeStyle = this.checkColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const centerX = this.x + this.size / 2;
      const centerY = this.y + this.size / 2;
      const scale = this.checkScale;

      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      // 绘制对勾
      ctx.beginPath();
      ctx.moveTo(this.x + this.size * 0.2, this.y + this.size * 0.5);
      ctx.lineTo(this.x + this.size * 0.4, this.y + this.size * 0.7);
      ctx.lineTo(this.x + this.size * 0.8, this.y + this.size * 0.3);
      ctx.stroke();

      ctx.restore();
    }

    // 绘制标签
    if (this.label) {
      ctx.fillStyle = this._disabled ? '#888888' : this.textColor;
      ctx.font = `${this.fontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.x + this.size + this.gap, this.y + this.size / 2);
    }

    ctx.restore();
  }

  /**
   * 绘制圆角矩形
   */
  _drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    ctx.lineTo(x + radius, y + height);
    ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + radius);
    ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }

  /**
   * 检查点是否在组件内
   */
  containsPoint(x, y) {
    // 计算包含标签的总宽度
    const labelWidth = this.label ? this._getTextWidth() + this.gap : 0;
    const totalWidth = this.size + labelWidth;

    return x >= this.x && x <= this.x + totalWidth &&
           y >= this.y && y <= this.y + this.size;
  }

  /**
   * 获取文字宽度
   */
  _getTextWidth() {
    if (typeof wx !== 'undefined') {
      const canvas = wx.createCanvas();
      const ctx = canvas.getContext('2d');
      ctx.font = `${this.fontSize}px sans-serif`;
      return ctx.measureText(this.label).width;
    }
    return this.label.length * this.fontSize * 0.6;
  }
}

/**
 * Radio 单选框
 */
class Radio extends Component {
  constructor(options = {}) {
    super(options);

    // 位置
    this.x = options.x || 0;
    this.y = options.y || 0;

    // 尺寸
    this.size = options.size || 24;
    this.gap = options.gap || 8;

    // 标签
    this.label = options.label || '';
    this.fontSize = options.fontSize || 14;
    this.textColor = options.textColor || '#333333';

    // 值
    this.value = options.value || null;

    // 状态
    this._selected = options.selected || false;
    this._disabled = options.disabled || false;

    // 样式
    this.borderColor = options.borderColor || '#4A90D9';
    this.borderColorDisabled = options.borderColorDisabled || '#CCCCCC';
    this.dotColor = options.dotColor || '#4A90D9';
    this.bgColor = options.bgColor || '#FFFFFF';
    this.borderWidth = options.borderWidth || 2;

    // 回调
    this.onSelect = options.onSelect || null;

    // 动画
    this.dotScale = this._selected ? 1 : 0;
    this.targetDotScale = this._selected ? 1 : 0;

    // 所属组
    this.group = options.group || null;
  }

  /**
   * 获取/设置选中状态
   */
  get selected() { return this._selected; }
  set selected(value) {
    if (this._selected !== value) {
      this._selected = value;
      this.targetDotScale = value ? 1 : 0;

      if (value && this.onSelect) {
        this.onSelect(this.value, this);
      }

      globalEvent.emit('ui:radio:select', this.value, this);
    }
  }

  /**
   * 选中
   */
  select() {
    if (!this._disabled) {
      this.selected = true;
    }
  }

  /**
   * 取消选中
   */
  deselect() {
    this.selected = false;
  }

  /**
   * 处理触摸
   */
  onTouchStart(x, y) {
    if (this._disabled) return false;

    if (this.containsPoint(x, y)) {
      this.select();
      return true;
    }
    return false;
  }

  /**
   * 更新动画
   */
  update(deltaTime) {
    const speed = 0.2;
    this.dotScale += (this.targetDotScale - this.dotScale) * speed;
  }

  /**
   * 渲染
   */
  onRender(ctx) {
    ctx.save();

    const borderColor = this._disabled ? this.borderColorDisabled : this.borderColor;

    // 绘制外圆
    ctx.fillStyle = this.bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = this.borderWidth;

    const centerX = this.x + this.size / 2;
    const centerY = this.y + this.size / 2;
    const radius = this.size / 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - this.borderWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 绘制内部圆点
    if (this.dotScale > 0.01) {
      ctx.fillStyle = this._disabled ? this.borderColorDisabled : this.dotColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius - 6) * this.dotScale, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制标签
    if (this.label) {
      ctx.fillStyle = this._disabled ? '#888888' : this.textColor;
      ctx.font = `${this.fontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.x + this.size + this.gap, centerY);
    }

    ctx.restore();
  }

  /**
   * 检查点是否在组件内
   */
  containsPoint(x, y) {
    const labelWidth = this.label ? this._getTextWidth() + this.gap : 0;
    const totalWidth = this.size + labelWidth;

    return x >= this.x && x <= this.x + totalWidth &&
           y >= this.y && y <= this.y + this.size;
  }

  /**
   * 获取文字宽度
   */
  _getTextWidth() {
    if (typeof wx !== 'undefined') {
      const canvas = wx.createCanvas();
      const ctx = canvas.getContext('2d');
      ctx.font = `${this.fontSize}px sans-serif`;
      return ctx.measureText(this.label).width;
    }
    return this.label.length * this.fontSize * 0.6;
  }
}

/**
 * RadioGroup 单选组
 */
class RadioGroup {
  constructor(options = {}) {
    this.name = options.name || '';
    this.radios = [];
    this._value = options.value || null;
    this.onChange = options.onChange || null;
  }

  /**
   * 添加单选框
   */
  addRadio(radio) {
    radio.group = this;
    this.radios.push(radio);

    // 如果当前有值，设置对应的radio为选中
    if (this._value !== null && radio.value === this._value) {
      radio.selected = true;
    }

    // 监听选择
    const originalOnSelect = radio.onSelect;
    radio.onSelect = (value, radioInstance) => {
      if (originalOnSelect) originalOnSelect(value, radioInstance);
      this._onRadioSelect(radioInstance);
    };
  }

  /**
   * 移除单选框
   */
  removeRadio(radio) {
    const index = this.radios.indexOf(radio);
    if (index !== -1) {
      radio.group = null;
      this.radios.splice(index, 1);
    }
  }

  /**
   * 处理单选框选择
   */
  _onRadioSelect(selectedRadio) {
    // 取消其他radio的选中
    for (const radio of this.radios) {
      if (radio !== selectedRadio) {
        radio.deselect();
      }
    }

    this._value = selectedRadio.value;

    if (this.onChange) {
      this.onChange(this._value, selectedRadio);
    }
  }

  /**
   * 获取/设置当前值
   */
  get value() { return this._value; }
  set value(val) {
    this._value = val;
    for (const radio of this.radios) {
      radio.selected = (radio.value === val);
    }
  }

  /**
   * 清空选择
   */
  clear() {
    this._value = null;
    for (const radio of this.radios) {
      radio.deselect();
    }
  }
}

export { Checkbox, Radio, RadioGroup };
export default Checkbox;
