// 三元天星排盘简化算法 - ES Module 版本
// 仅依赖原生 JS，按 PDF 中的规则实现大玄空 + 玄空飞星 + 地/天/人盘。

const palaceOrder = ["Qian", "Dui", "Gen", "Li", "Kan", "Kun", "Zhen", "Xun"];
const palaceCn = {
    Qian: "乾", Dui: "兑", Gen: "艮", Li: "离",
    Kan: "坎", Kun: "坤", Zhen: "震", Xun: "巽",
};

const naJiaTrigram = {
    乾: "Qian", 甲: "Qian", 坤: "Kun", 乙: "Kun",
    艮: "Gen", 丙: "Gen", 巽: "Xun", 辛: "Xun",
    癸: "Kan", 申: "Kan", 子: "Kan", 辰: "Kan",
    壬: "Li", 寅: "Li", 午: "Li", 戌: "Li",
    庚: "Zhen", 亥: "Zhen", 卯: "Zhen", 未: "Zhen",
    丁: "Dui", 巳: "Dui", 酉: "Dui", 丑: "Dui",
};

const trigramOfMountain = {
    壬: "Kan", 子: "Kan", 癸: "Kan", 丑: "Gen", 艮: "Gen", 寅: "Gen",
    甲: "Zhen", 卯: "Zhen", 乙: "Zhen", 辰: "Xun", 巽: "Xun", 巳: "Xun",
    丙: "Li", 午: "Li", 丁: "Li", 未: "Kun", 坤: "Kun", 申: "Kun",
    庚: "Dui", 酉: "Dui", 辛: "Dui", 戌: "Qian", 乾: "Qian", 亥: "Qian",
};

const bigXuanKongStart = {
    癸: 1, 甲: 1, 申: 1, 坤: 2, 壬: 2, 乙: 2,
    卯: 3, 未: 3, 子: 3, 巳: 4, 乾: 4, 戌: 4,
    亥: 6, 巽: 6, 辰: 6, 辛: 7, 丙: 7, 艮: 7,
    寅: 8, 庚: 8, 丁: 8, 午: 9, 酉: 9, 丑: 9,
};

const tiGuaReplace = {
    子: 1, 癸: 1, 甲: 1, 申: 1, 坤: 2, 壬: 2, 乙: 2, 卯: 2, 未: 2,
    戌: 6, 乾: 6, 亥: 6, 辰: 6, 巽: 6, 巳: 6,
    艮: 7, 丙: 7, 辛: 7, 酉: 7, 丑: 7, 寅: 9, 午: 9, 庚: 9, 丁: 9,
};

const dragonYang = new Set(["乾", "坤", "艮", "巽", "甲", "庚", "丙", "壬", "寅", "申", "巳", "亥"]);
const dragonYin = new Set(["子", "午", "卯", "酉", "辰", "戌", "丑", "未", "乙", "辛", "丁", "癸"]);

const flipTrigram = {
    Li: "Zhen", Zhen: "Li", Qian: "Dui", Dui: "Qian",
    Gen: "Kun", Kun: "Gen", Kan: "Xun", Xun: "Kan",
};

const seqEarth = [1, 2, 3, 4, 5, 6, 7, 8];
const seqWater = [8, 6, 7, 5, 1, 2, 3, 4];
const seqHeaven = [8, 7, 2, 3, 4, 6, 5, 1];

const palaceCoords = {
    Li: { col: 0, row: 0 }, Xun: { col: 1, row: 0 },
    Kun: { col: 2, row: 0 }, Dui: { col: 3, row: 0 },
    Qian: { col: 0, row: 1 }, Gen: { col: 1, row: 1 },
    Kan: { col: 2, row: 1 }, Zhen: { col: 3, row: 1 },
};

const columnPalaces = {
    0: { top: "Li", bottom: "Qian" },
    1: { top: "Xun", bottom: "Gen" },
    2: { top: "Kun", bottom: "Kan" },
    3: { top: "Dui", bottom: "Zhen" },
};

const yuanLongMap = {
    '乾': 'tian', '坤': 'tian', '艮': 'tian', '巽': 'tian',
    '子': 'tian', '午': 'tian', '卯': 'tian', '酉': 'tian',
    '甲': 'di', '庚': 'di', '丙': 'di', '壬': 'di',
    '辰': 'di', '戌': 'di', '丑': 'di', '未': 'di',
    '寅': 'ren', '申': 'ren', '巳': 'ren', '亥': 'ren',
    '乙': 'ren', '辛': 'ren', '丁': 'ren', '癸': 'ren',
};

const trigramMountains = {
    Kan: ['子', '壬', '癸'], Gen: ['艮', '丑', '寅'],
    Zhen: ['卯', '甲', '乙'], Xun: ['巽', '辰', '巳'],
    Li: ['午', '丙', '丁'], Kun: ['坤', '未', '申'],
    Dui: ['酉', '庚', '辛'], Qian: ['乾', '戌', '亥'],
};

const wrap9 = (n) => ((n - 1) % 9 + 9) % 9 + 1;

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

function getYuanLong(mountain) {
    return yuanLongMap[mountain] || 'ren';
}

function starToTrigram(star) {
    const map = { 1: 'Kan', 2: 'Kun', 3: 'Zhen', 4: 'Xun', 6: 'Qian', 7: 'Dui', 8: 'Gen', 9: 'Li' };
    return map[star];
}

function findSameYuanLongMountain(trigram, yuanLong) {
    const mountains = trigramMountains[trigram];
    if (!mountains) throw new Error(`未知卦: ${trigram}`);
    if (yuanLong === 'tian') return mountains[0];
    if (yuanLong === 'di') return mountains[1];
    return mountains[2];
}

function flyFromCenter(start, step) {
    let curr = start;
    const res = {};
    for (const p of palaceOrder) {
        curr = wrap9(curr + step);
        res[p] = curr;
    }
    return res;
}

function zeroOrPositive(startNum, yuanPhase = "lower") {
    const zeroLower = new Set([1, 2, 3, 4]);
    const zeroUpper = new Set([6, 7, 8, 9]);
    if (yuanPhase === "upper") return zeroUpper.has(startNum) ? "zero" : "positive";
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

function getFlightStep(star, mountain) {
    if (star === 5) return dragonStep(mountain);
    const yuanLong = getYuanLong(mountain);
    const trigram = starToTrigram(star);
    const sameYuanMountain = findSameYuanLongMountain(trigram, yuanLong);
    return dragonStep(sameYuanMountain);
}

function getAdjustedStart(yunPan, mountainOrFacing, isTiGua) {
    const startRaw = yunPan[palaceOf(mountainOrFacing)];
    if (!isTiGua) return startRaw;
    const yuanLong = getYuanLong(mountainOrFacing);
    const trigram = starToTrigram(startRaw);
    if (trigram) {
        const sameYuanMountain = findSameYuanLongMountain(trigram, yuanLong);
        if (tiGuaReplace[sameYuanMountain]) return tiGuaReplace[sameYuanMountain];
    }
    return startRaw;
}

function flyFromCenterWithOrder(startNum, step) {
    let curr = startNum;
    const res = {};
    palaceOrder.forEach((p) => {
        curr = wrap9(curr + step);
        res[p] = curr;
    });
    return res;
}

function computeMountainPan(yunPan, mountain, isTiGua = false, yuanPhase = "lower") {
    const start = getAdjustedStart(yunPan, mountain, isTiGua);
    const step = getFlightStep(start, mountain);
    return flyFromCenterWithOrder(start, step);
}

function computeFacingPan(yunPan, facing, isTiGua = false, yuanPhase = "lower") {
    const start = getAdjustedStart(yunPan, facing, isTiGua);
    const step = getFlightStep(start, facing);
    return flyFromCenterWithOrder(start, step);
}

function rotateOrderFrom(palace) {
    const idx = palaceOrder.indexOf(palace);
    if (idx === -1) throw new Error(`未知宫位: ${palace}`);
    return [...palaceOrder.slice(idx), ...palaceOrder.slice(0, idx)];
}

function fillSequence(startPalace, seq) {
    const order = rotateOrderFrom(startPalace);
    const res = {};
    for (let i = 0; i < order.length; i++) res[order[i]] = seq[i % seq.length];
    return res;
}

function getFlightPath(startPalace) {
    const coord = palaceCoords[startPalace];
    if (!coord) throw new Error(`未知起始卦：${startPalace}`);
    const { col: startCol, row: startRow } = coord;
    const isEdge = startCol === 0 || startCol === 3;
    let colOrder;
    if (isEdge) {
        colOrder = startCol === 0 ? [0, 1, 2, 3] : [3, 2, 1, 0];
    } else {
        colOrder = startCol === 1 ? [1, 0, 3, 2] : [2, 3, 0, 1];
    }
    const rowOrder = startRow === 0 ? ["top", "bottom"] : ["bottom", "top"];
    const path = [];
    colOrder.forEach((c) => rowOrder.forEach((r) => path.push(columnPalaces[c][r])));
    return path;
}

function fillSequenceWithPath(seq, basePath) {
    const res = {};
    for (let i = 0; i < seq.length; i++) res[basePath[i]] = seq[i];
    return res;
}

function computeEarthBoard(mountain) {
    const tri = naJiaTrigram[mountain];
    const flipped = flipTrigram[tri];
    return fillSequenceWithPath(seqEarth, getFlightPath(flipped));
}

function computeWaterBoard(facing) {
    const tri = naJiaTrigram[facing];
    return fillSequenceWithPath(seqWater, getFlightPath(tri));
}

function computeHeavenBoard(mountain) {
    const tri = naJiaTrigram[mountain];
    return fillSequenceWithPath(seqHeaven, getFlightPath(tri));
}

function getHeaderInfo(yun, mountain, facing, isTiGua = false) {
    const yunPan = computeYunPan(yun);
    const shanStart = getAdjustedStart(yunPan, mountain, isTiGua);
    const xiangStart = getAdjustedStart(yunPan, facing, isTiGua);
    return {
        yun, shanStart, xiangStart, mountain, facing, isTiGua,
        panType: isTiGua ? '替卦' : '下卦'
    };
}

const SanYuan = {
    palaceOrder, palaceCn, trigramOfMountain, naJiaTrigram, tiGuaReplace,
    computeBigXuanKong, computeYunPan, computeMountainPan, computeFacingPan,
    computeEarthBoard, computeWaterBoard, computeHeavenBoard, getHeaderInfo,
    dragonStep, wrap9, rotateOrderFrom, fillSequence,
    getYuanLong, starToTrigram, findSameYuanLongMountain,
};

export default SanYuan;
export {
    SanYuan,
    palaceOrder, palaceCn, trigramOfMountain, naJiaTrigram, tiGuaReplace,
    computeBigXuanKong, computeYunPan, computeMountainPan, computeFacingPan,
    computeEarthBoard, computeWaterBoard, computeHeavenBoard, getHeaderInfo,
    dragonStep, wrap9, rotateOrderFrom, fillSequence,
    getYuanLong, starToTrigram, findSameYuanLongMountain,
};
