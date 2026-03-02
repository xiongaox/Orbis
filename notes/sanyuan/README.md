# sanyuan-tianxing

**三元天星排盘算法** - 纯 JavaScript 实现的中国传统玄空风水排盘计算库

[![npm version](https://img.shields.io/npm/v/sanyuan-tianxing.svg)](https://www.npmjs.com/package/sanyuan-tianxing)
[![license](https://img.shields.io/npm/l/sanyuan-tianxing.svg)](https://github.com/your-username/sanyuan-tianxing/blob/main/LICENSE)

## ✨ 功能特性

- 🎯 **大玄空数** - 计算坐山的大玄空起星数
- 🌟 **玄空飞星** - 运盘、山盘、向盘计算
- 🌍 **三盘系统** - 地母翻卦（地）、辅星水法（天）、天星阳宅（人）
- 📦 **零依赖** - 纯原生 JavaScript，无需任何第三方库
- 🔧 **多环境支持** - 支持 Node.js 和浏览器环境

## 📦 安装

```bash
npm install sanyuan-tianxing
```

或通过 CDN 引入：

```html
<script src="https://cdn.jsdelivr.net/npm/sanyuan-tianxing/app.js"></script>
```

## 🚀 快速开始

### Node.js

```javascript
const SanYuan = require('sanyuan-tianxing');

// 计算运盘（九运）
const yunPan = SanYuan.computeYunPan(9);
console.log(yunPan);
// { Qian: 1, Dui: 2, Gen: 3, Li: 4, Kan: 5, Kun: 6, Zhen: 7, Xun: 8 }

// 计算大玄空数（壬山）
const bigXK = SanYuan.computeBigXuanKong('壬', 'lower');
console.log(bigXK);

// 计算山盘
const shan = SanYuan.computeMountainPan(yunPan, '壬', false, 'lower');
console.log(shan);

// 计算向盘
const xiang = SanYuan.computeFacingPan(yunPan, '丙', false, 'lower');
console.log(xiang);
```

### 浏览器

```html
<script src="https://cdn.jsdelivr.net/npm/sanyuan-tianxing/app.js"></script>
<script>
  const yunPan = SanYuan.computeYunPan(9);
  console.log(yunPan);
</script>
```

### ES Module

```javascript
import SanYuan from 'sanyuan-tianxing';

const yunPan = SanYuan.computeYunPan(9);
```

## 📖 API 文档

### 核心函数

#### `computeYunPan(yun)`
计算运盘

| 参数 | 类型 | 说明 |
|------|------|------|
| `yun` | `number` | 运数 (1-9) |

**返回值**: `Object` - 八宫对应的运星数

---

#### `computeBigXuanKong(mountain, yuanPhase)`
计算大玄空数

| 参数 | 类型 | 说明 |
|------|------|------|
| `mountain` | `string` | 坐山 (24山之一) |
| `yuanPhase` | `string` | 元运阶段 (`'lower'` 或 `'upper'`) |

**返回值**: `Object` - 八宫对应的大玄空数

---

#### `computeMountainPan(yunPan, mountain, isTiGua, yuanPhase)`
计算山盘（山星）

| 参数 | 类型 | 说明 |
|------|------|------|
| `yunPan` | `Object` | 运盘对象 |
| `mountain` | `string` | 坐山 |
| `isTiGua` | `boolean` | 是否替卦 |
| `yuanPhase` | `string` | 元运阶段 |

**返回值**: `Object` - 八宫对应的山星

---

#### `computeFacingPan(yunPan, facing, isTiGua, yuanPhase)`
计算向盘（向星）

| 参数 | 类型 | 说明 |
|------|------|------|
| `yunPan` | `Object` | 运盘对象 |
| `facing` | `string` | 向山 |
| `isTiGua` | `boolean` | 是否替卦 |
| `yuanPhase` | `string` | 元运阶段 |

**返回值**: `Object` - 八宫对应的向星

---

#### `computeEarthBoard(mountain)`
计算地母翻卦（地盘）

| 参数 | 类型 | 说明 |
|------|------|------|
| `mountain` | `string` | 坐山 |

**返回值**: `Object` - 八宫对应的地盘数

---

#### `computeWaterBoard(facing)`
计算辅星水法（天盘）

| 参数 | 类型 | 说明 |
|------|------|------|
| `facing` | `string` | 向山 |

**返回值**: `Object` - 八宫对应的天盘数

---

#### `computeHeavenBoard(mountain)`
计算天星阳宅（人盘）

| 参数 | 类型 | 说明 |
|------|------|------|
| `mountain` | `string` | 坐山 |

**返回值**: `Object` - 八宫对应的人盘数

---

#### `getHeaderInfo(yun, mountain, facing, isTiGua)`
获取盘头信息

| 参数 | 类型 | 说明 |
|------|------|------|
| `yun` | `number` | 运数 |
| `mountain` | `string` | 坐山 |
| `facing` | `string` | 向山 |
| `isTiGua` | `boolean` | 是否替卦 |

**返回值**: `Object` - `{ yun, shanStart, xiangStart, mountain, facing, isTiGua, panType }`

---

### 辅助函数

| 函数 | 说明 |
|------|------|
| `getYuanLong(mountain)` | 获取山的元龙类型 (`'tian'`/`'di'`/`'ren'`) |
| `dragonStep(mountain)` | 获取山的阴阳步进 (`+1` 顺飞 / `-1` 逆飞) |
| `starToTrigram(star)` | 运星数字转卦名 |
| `wrap9(n)` | 将数字映射到 1-9 范围 |

---

### 数据常量

| 常量 | 说明 |
|------|------|
| `palaceOrder` | 八宫顺飞顺序 |
| `palaceCn` | 八宫中文名称映射 |
| `trigramOfMountain` | 24山对应卦位 |
| `naJiaTrigram` | 纳甲对应卦位 |
| `tiGuaReplace` | 替卦替数表 |

## 📋 24山列表

```
壬 子 癸 丑 艮 寅 甲 卯 乙 辰 巽 巳
丙 午 丁 未 坤 申 庚 酉 辛 戌 乾 亥
```

## 🔧 完整示例

```javascript
const SanYuan = require('sanyuan-tianxing');

// 九运 壬山丙向 下卦
const params = {
  yun: 9,
  mountain: '壬',
  facing: '丙',
  isTiGua: false,
  yuanPhase: 'lower'
};

// 计算所有盘面
const yunPan = SanYuan.computeYunPan(params.yun);
const bigXK = SanYuan.computeBigXuanKong(params.mountain, params.yuanPhase);
const shan = SanYuan.computeMountainPan(yunPan, params.mountain, params.isTiGua, params.yuanPhase);
const xiang = SanYuan.computeFacingPan(yunPan, params.facing, params.isTiGua, params.yuanPhase);
const earth = SanYuan.computeEarthBoard(params.mountain);
const water = SanYuan.computeWaterBoard(params.facing);
const heaven = SanYuan.computeHeavenBoard(params.mountain);

// 获取盘头信息
const header = SanYuan.getHeaderInfo(params.yun, params.mountain, params.facing, params.isTiGua);

console.log('盘头:', header);
console.log('运盘:', yunPan);
console.log('大玄空:', bigXK);
console.log('山盘:', shan);
console.log('向盘:', xiang);
console.log('地盘:', earth);
console.log('天盘:', water);
console.log('人盘:', heaven);
```

## 📄 许可证

[MIT](./LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
