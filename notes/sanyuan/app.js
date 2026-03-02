// 三元天星排盘简化算法
// 仅依赖原生 JS，按 PDF 中的规则实现大玄空 + 玄空飞星 + 地/天/人盘。

const palaceOrder = ["Qian", "Dui", "Gen", "Li", "Kan", "Kun", "Zhen", "Xun"]; // 中宫出发顺飞顺序
const palaceCn = {
  Qian: "乾",
  Dui: "兑",
  Gen: "艮",
  Li: "离",
  Kan: "坎",
  Kun: "坤",
  Zhen: "震",
  Xun: "巽",
};

// 下盘纳甲用的卦（纳甲口诀）
const naJiaTrigram = {
  乾: "Qian",
  甲: "Qian",
  坤: "Kun",
  乙: "Kun",
  艮: "Gen",
  丙: "Gen",
  巽: "Xun",
  辛: "Xun",
  癸: "Kan",
  申: "Kan",
  子: "Kan",
  辰: "Kan",
  壬: "Li",
  寅: "Li",
  午: "Li",
  戌: "Li",
  庚: "Zhen",
  亥: "Zhen",
  卯: "Zhen",
  未: "Zhen",
  丁: "Dui",
  巳: "Dui",
  酉: "Dui",
  丑: "Dui",
};

// 24山常规卦（用于大玄空/飞星）
const trigramOfMountain = {
  壬: "Kan",
  子: "Kan",
  癸: "Kan",
  丑: "Gen",
  艮: "Gen",
  寅: "Gen",
  甲: "Zhen",
  卯: "Zhen",
  乙: "Zhen",
  辰: "Xun",
  巽: "Xun",
  巳: "Xun",
  丙: "Li",
  午: "Li",
  丁: "Li",
  未: "Kun",
  坤: "Kun",
  申: "Kun",
  庚: "Dui",
  酉: "Dui",
  辛: "Dui",
  戌: "Qian",
  乾: "Qian",
  亥: "Qian",
};

// 大玄空起星数映射（无 5）
const bigXuanKongStart = {
  癸: 1,
  甲: 1,
  申: 1,
  坤: 2,
  壬: 2,
  乙: 2,
  卯: 3,
  未: 3,
  子: 3,
  巳: 4,
  乾: 4,
  戌: 4,
  亥: 6,
  巽: 6,
  辰: 6,
  辛: 7,
  丙: 7,
  艮: 7,
  寅: 8,
  庚: 8,
  丁: 8,
  午: 9,
  酉: 9,
  丑: 9,
};

// 替卦替数（坤壬乙诀）
const tiGuaReplace = {
  子: 1,
  癸: 1,
  甲: 1,
  申: 1,
  坤: 2,
  壬: 2,
  乙: 2,
  卯: 2,
  未: 2,
  戌: 6,
  乾: 6,
  亥: 6,
  辰: 6,
  巽: 6,
  巳: 6,
  艮: 7,
  丙: 7,
  辛: 7,
  酉: 7,
  丑: 7,
  寅: 9,
  午: 9,
  庚: 9,
  丁: 9,
};

// 三元龙阴阳
const dragonYang = new Set([
  "乾",
  "坤",
  "艮",
  "巽",
  "甲",
  "庚",
  "丙",
  "壬",
  "寅",
  "申",
  "巳",
  "亥",
]);
const dragonYin = new Set([
  "子",
  "午",
  "卯",
  "酉",
  "辰",
  "戌",
  "丑",
  "未",
  "乙",
  "辛",
  "丁",
  "癸",
]);

// 纳甲翻卦
const flipTrigram = {
  Li: "Zhen",
  Zhen: "Li",
  Qian: "Dui",
  Dui: "Qian",
  Gen: "Kun",
  Kun: "Gen",
  Kan: "Xun",
  Xun: "Kan",
};

// 下盘起星序列
const seqEarth = [1, 2, 3, 4, 5, 6, 7, 8]; // 地母翻卦
const seqWater = [8, 6, 7, 5, 1, 2, 3, 4]; // 辅星水法
const seqHeaven = [8, 7, 2, 3, 4, 6, 5, 1]; // 天星阳宅

// 下盘行走路径（按“边起边落，中起中落，上起下落”推导）：
// 使用动态列遍历：起宫所在列优先，然后向左循环列，行顺序取决于起宫在上排/下排。
const palaceCoords = {
  Li: { col: 0, row: 0 },
  Xun: { col: 1, row: 0 },
  Kun: { col: 2, row: 0 },
  Dui: { col: 3, row: 0 },
  Qian: { col: 0, row: 1 },
  Gen: { col: 1, row: 1 },
  Kan: { col: 2, row: 1 },
  Zhen: { col: 3, row: 1 },
};
const columnPalaces = {
  0: { top: "Li", bottom: "Qian" },
  1: { top: "Xun", bottom: "Gen" },
  2: { top: "Kun", bottom: "Kan" },
  3: { top: "Dui", bottom: "Zhen" },
};
const pathHeavenBase = ["Li", "Qian", "Xun", "Gen", "Kun", "Kan", "Dui", "Zhen"]; // 仅用于天盘？将同样使用动态列逻辑保持一致

// 简化的 wrap9：将任意整数映射到 1-9 范围
const wrap9 = (n) => {
  const result = ((n - 1) % 9 + 9) % 9 + 1;
  return result;
};

function flyFromCenter(start, step) {
  let curr = start;
  const res = {};
  for (const p of palaceOrder) {
    curr = wrap9(curr + step);
    res[p] = curr;
  }
  return res;
}

function palaceOf(mountain) {
  const tri = trigramOfMountain[mountain];
  if (!tri) throw new Error(`未知坐/向山: ${mountain}`);
  return tri;
}

function dragonStep(mountain) {
  if (dragonYang.has(mountain)) return +1;
  if (dragonYin.has(mountain)) return -1;
  throw new Error(`未定义阴阳: ${mountain}`);
}

function zeroOrPositive(startNum, yuanPhase = "lower") {
  const zeroLower = new Set([1, 2, 3, 4]);
  const zeroUpper = new Set([6, 7, 8, 9]);
  if (yuanPhase === "upper") {
    return zeroUpper.has(startNum) ? "zero" : "positive";
  }
  return zeroLower.has(startNum) ? "zero" : "positive";
}

function computeBigXuanKong(mountain, yuanPhase = "lower") {
  const start = bigXuanKongStart[mountain];
  if (!start) throw new Error(`坐山未映射起星数: ${mountain}`);
  const step = zeroOrPositive(start, yuanPhase) === "zero" ? -1 : +1;
  return flyFromCenter(start, step);
}

function computeYunPan(yun) {
  return flyFromCenter(yun, +1);
}

/**
 * 【优化】提取公共函数：计算替卦调整后的起始星数
 * @param {Object} yunPan - 运盘
 * @param {string} mountainOrFacing - 坐山或向山
 * @param {boolean} isTiGua - 是否替卦
 * @returns {number} 调整后的起始星数
 */
function getAdjustedStart(yunPan, mountainOrFacing, isTiGua) {
  const startRaw = yunPan[palaceOf(mountainOrFacing)];
  if (!isTiGua) return startRaw;

  const yuanLong = getYuanLong(mountainOrFacing);
  const trigram = starToTrigram(startRaw);
  if (trigram) {
    const sameYuanMountain = findSameYuanLongMountain(trigram, yuanLong);
    if (tiGuaReplace[sameYuanMountain]) {
      return tiGuaReplace[sameYuanMountain];
    }
  }
  return startRaw;
}

function computeMountainPan(yunPan, mountain, isTiGua, yuanPhase = "lower") {
  const start = getAdjustedStart(yunPan, mountain, isTiGua);
  const step = getFlightStep(start, mountain);
  return flyFromCenterWithOrder(start, step);
}

function computeFacingPan(yunPan, facing, isTiGua, yuanPhase = "lower") {
  const start = getAdjustedStart(yunPan, facing, isTiGua);
  const step = getFlightStep(start, facing);
  return flyFromCenterWithOrder(start, step);
}

/**
 * 获取飞星步进方向
 * @param {number} star - 运星数字
 * @param {string} mountain - 山名
 * @returns {number} +1顺飞，-1逆飞
 */
function getFlightStep(star, mountain) {
  // 如果是5，直接用山的阴阳
  if (star === 5) {
    return dragonStep(mountain);
  }

  // 获取山的元龙类型
  const yuanLong = getYuanLong(mountain);

  // 获取运星对应的卦
  const trigram = starToTrigram(star);

  // 查找该卦中同元龙的山
  const sameYuanMountain = findSameYuanLongMountain(trigram, yuanLong);

  // 返回该山的阴阳
  return dragonStep(sameYuanMountain);
}

/**
 * 【优化】元龙类型映射表：使用 Map 实现 O(1) 查询
 */
const yuanLongMap = {
  '乾': 'tian', '坤': 'tian', '艮': 'tian', '巽': 'tian',
  '子': 'tian', '午': 'tian', '卯': 'tian', '酉': 'tian',
  '甲': 'di', '庚': 'di', '丙': 'di', '壬': 'di',
  '辰': 'di', '戌': 'di', '丑': 'di', '未': 'di',
  '寅': 'ren', '申': 'ren', '巳': 'ren', '亥': 'ren',
  '乙': 'ren', '辛': 'ren', '丁': 'ren', '癸': 'ren',
};

/**
 * 获取山的元龙类型
 * @param {string} mountain - 山名
 * @returns {'tian'|'di'|'ren'} 元龙类型
 */
function getYuanLong(mountain) {
  return yuanLongMap[mountain] || 'ren';
}

/**
 * 运星数字对应的卦
 */
function starToTrigram(star) {
  const starTrigramMap = {
    1: 'Kan',
    2: 'Kun',
    3: 'Zhen',
    4: 'Xun',
    6: 'Qian',
    7: 'Dui',
    8: 'Gen',
    9: 'Li'
  };
  return starTrigramMap[star];
}

/**
 * 每个卦对应的三山（按天元、地元、人元顺序）
 */
const trigramMountains = {
  Kan: ['子', '壬', '癸'],   // 天元子、地元壬、人元癸
  Gen: ['艮', '丑', '寅'],   // 天元艮、地元丑、人元寅
  Zhen: ['卯', '甲', '乙'],  // 天元卯、地元甲、人元乙
  Xun: ['巽', '辰', '巳'],   // 天元巽、地元辰、人元巳
  Li: ['午', '丙', '丁'],    // 天元午、地元丙、人元丁
  Kun: ['坤', '未', '申'],   // 天元坤、地元未、人元申
  Dui: ['酉', '庚', '辛'],   // 天元酉、地元庚、人元辛
  Qian: ['乾', '戌', '亥']   // 天元乾、地元戌、人元亥
};

/**
 * 查找卦中同元龙的山
 */
function findSameYuanLongMountain(trigram, yuanLong) {
  const mountains = trigramMountains[trigram];
  if (!mountains) throw new Error(`未知卦: ${trigram}`);

  // 天元龙取第一个，地元龙取第二个，人元龙取第三个
  if (yuanLong === 'tian') return mountains[0];
  if (yuanLong === 'di') return mountains[1];
  return mountains[2];
}

function rotateOrderFrom(palace) {
  const idx = palaceOrder.indexOf(palace);
  if (idx === -1) throw new Error(`未知宫位: ${palace}`);
  return [...palaceOrder.slice(idx), ...palaceOrder.slice(0, idx)];
}

function flyFromPalace(startPalace, startNum, step) {
  const order = rotateOrderFrom(startPalace);
  const res = {};
  let curr = startNum;
  order.forEach((p, idx) => {
    if (idx === 0) {
      res[p] = curr;
    } else {
      curr = wrap9(curr + step);
      res[p] = curr;
    }
  });
  return res;
}

// 按“中宫出发顺飞顺序”，起星在中宫，首落乾，依序飞布八宫
function flyFromCenterWithOrder(startNum, step) {
  let curr = startNum;
  const res = {};
  palaceOrder.forEach((p) => {
    curr = wrap9(curr + step);
    res[p] = curr;
  });
  return res;
}

/**
 * 【保留】按起始宫位旋转顺序填充序列（供外部扩展使用）
 * @param {string} startPalace - 起始宫位
 * @param {number[]} seq - 数字序列
 * @returns {Object} 各宫位对应的数字
 */
function fillSequence(startPalace, seq) {
  const order = rotateOrderFrom(startPalace);
  const res = {};
  for (let i = 0; i < order.length; i++) {
    res[order[i]] = seq[i % seq.length];
  }
  return res;
}

function computeEarthBoard(mountain) {
  const tri = naJiaTrigram[mountain];
  const flipped = flipTrigram[tri];
  // 【优化】直接使用 getFlightPath，移除冗余的别名函数
  const path = getFlightPath(flipped);
  return fillSequenceWithPath(seqEarth, path);
}

function computeWaterBoard(facing) {
  const tri = naJiaTrigram[facing];
  // 【优化】直接使用 getFlightPath
  const path = getFlightPath(tri);
  return fillSequenceWithPath(seqWater, path);
}

function computeHeavenBoard(mountain) {
  const tri = naJiaTrigram[mountain];
  // 【优化】直接使用 getFlightPath
  const path = getFlightPath(tri);
  return fillSequenceWithPath(seqHeaven, path);
}

function fillSequenceWithPath(seq, basePath) {
  const res = {};
  for (let i = 0; i < seq.length; i++) {
    res[basePath[i]] = seq[i];
  }
  return res;
}

/**
 * 计算飞星行进路径
 * PDF规则："边起边落，中起中落，上起下落"
 * - 边列(0,3)起：往中间走（列向中间递进）
 * - 中间列(1,2)起：往两边走（列向外递进）
 * - 上排起：先上后下（每列先上再下）
 * - 下排起：先下后上（每列先下再上）
 */
function getFlightPath(startPalace) {
  const coord = palaceCoords[startPalace];
  if (!coord) throw new Error(`未知起始卦：${startPalace}`);
  const startCol = coord.col;
  const startRow = coord.row;

  // 判断是边列还是中间列
  const isEdge = startCol === 0 || startCol === 3;

  let colOrder;
  if (isEdge) {
    // 边起边落：往中间走
    if (startCol === 0) {
      // 从列0往中间走：0 -> 1 -> 2 -> 3
      colOrder = [0, 1, 2, 3];
    } else {
      // 从列3往中间走：3 -> 2 -> 1 -> 0
      colOrder = [3, 2, 1, 0];
    }
  } else {
    // 中起中落：往两边走
    // 根据PDF壬山丙向辅星水法验证（艮起）：
    // 正确路径: Gen(col1) -> Xun(col1) -> Qian(col0) -> Li(col0) -> Zhen(col3) -> Dui(col3) -> Kan(col2) -> Kun(col2)
    // 列顺序是：1 -> 0 -> 3 -> 2
    if (startCol === 1) {
      colOrder = [1, 0, 3, 2];
    } else {
      // 从列2往两边走：2 -> 3 -> 0 -> 1
      colOrder = [2, 3, 0, 1];
    }
  }

  // 上起下落，下起上落
  const rowOrder = startRow === 0 ? ["top", "bottom"] : ["bottom", "top"];

  const path = [];
  colOrder.forEach((c) => {
    rowOrder.forEach((r) => {
      path.push(columnPalaces[c][r]);
    });
  });
  return path;
}

// 【优化】已移除冗余的 dynamicPathEarth 和 dynamicPathWater 别名函数
// 现在直接使用 getFlightPath

function formatBoard(board) {
  // 3x3 输出，中心留空
  const row1 = `${pad(board.Li)} ${pad(board.Xun)} ${pad(board.Kun)} ${pad(board.Dui)}`;
  const row2 = `${pad(board.Qian)} ${pad(board.Gen)} ${pad(board.Kan)} ${pad(board.Zhen)}`;
  return `${row1}\n${row2}`;
  function pad(v) {
    return v !== undefined ? String(v).padStart(2, " ") : " -";
  }
}

function runDemo() {
  const params = {
    yun: 9,
    mountain: "壬",
    facing: "丙",
    isTiGua: false,
    yuanPhase: "lower",
  };
  const left = computeBigXuanKong(params.mountain, params.yuanPhase);
  const yunPan = computeYunPan(params.yun);
  const shan = computeMountainPan(
    yunPan,
    params.mountain,
    params.isTiGua,
    params.yuanPhase,
  );
  const xiang = computeFacingPan(
    yunPan,
    params.facing,
    params.isTiGua,
    params.yuanPhase,
  );
  const earth = computeEarthBoard(params.mountain);
  const water = computeWaterBoard(params.facing);
  const heaven = computeHeavenBoard(params.mountain);

  console.log("示例：九运 壬山丙向 下卦");
  console.log("\n左盘 大玄空数:");
  console.log(formatBoard(left));
  console.log("\n右盘 运星:");
  console.log(formatBoard(yunPan));
  console.log("\n右盘 山星:");
  console.log(formatBoard(shan));
  console.log("\n右盘 向星:");
  console.log(formatBoard(xiang));
  console.log("\n下盘 地母翻卦（地）:");
  console.log(formatBoard(earth));
  console.log("\n下盘 辅星水法（天）:");
  console.log(formatBoard(water));
  console.log("\n下盘 天星阳宅（人）:");
  console.log(formatBoard(heaven));
}

if (typeof require !== "undefined" && require.main === module) {
  runDemo();
}
// 导出供浏览器和 Node 复用
const SanYuan = {
  palaceOrder,
  palaceCn,
  trigramOfMountain,
  computeBigXuanKong,
  computeYunPan,
  computeMountainPan,
  computeFacingPan,
  computeEarthBoard,
  computeWaterBoard,
  computeHeavenBoard,
  naJiaTrigram,
  dragonStep,
  wrap9,
  rotateOrderFrom,
  fillSequence,
  getYuanLong,
  starToTrigram,
  findSameYuanLongMountain,
  tiGuaReplace,

  /**
   * 获取盘头信息
   * @param {number} yun - 运数
   * @param {string} mountain - 坐山
   * @param {string} facing - 向山
   * @param {boolean} isTiGua - 是否替卦
   * @returns {Object} 盘头信息
   */
  // 【优化】使用 getAdjustedStart 消除重复计算逻辑
  getHeaderInfo(yun, mountain, facing, isTiGua = false) {
    const yunPan = computeYunPan(yun);

    // 复用公共函数计算山盘和向盘入中数
    const shanStart = getAdjustedStart(yunPan, mountain, isTiGua);
    const xiangStart = getAdjustedStart(yunPan, facing, isTiGua);

    return {
      yun,                    // 运数
      shanStart,              // 山盘入中数
      xiangStart,             // 向盘入中数
      mountain,               // 坐山
      facing,                 // 向山
      isTiGua,                // 是否替卦
      panType: isTiGua ? '替卦' : '下卦'
    };
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SanYuan;
}
if (typeof window !== "undefined") {
  window.SanYuan = SanYuan;
}
