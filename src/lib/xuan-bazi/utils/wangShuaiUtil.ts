/**
 * 李双林八字旺衰算法 V32 (TypeScript Port)
 * 移植自 wangshuai.py
 * 包含：严谨定格、物理引擎（化气、从格、燥土防从、战克检测）、智能防御系统
 */

// =========================================================================
// 1. 静态数据库 (Static Data)
// =========================================================================

type Element = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';
type Polarity = '+' | '-';

interface StemInfo {
    el: Element;
    pol: Polarity;
}

const STEMS_INFO: Record<string, StemInfo> = {
    '甲': { el: 'Wood', pol: '+' }, '乙': { el: 'Wood', pol: '-' },
    '丙': { el: 'Fire', pol: '+' }, '丁': { el: 'Fire', pol: '-' },
    '戊': { el: 'Earth', pol: '+' }, '己': { el: 'Earth', pol: '-' },
    '庚': { el: 'Metal', pol: '+' }, '辛': { el: 'Metal', pol: '-' },
    '壬': { el: 'Water', pol: '+' }, '癸': { el: 'Water', pol: '-' }
};

// 藏干列表 (主气在index 0)
const ZANG_GAN_ORDER: Record<string, string[]> = {
    '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
    '辰': ['戊', '乙', '癸'], '巳': ['丙', '戊', '庚'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
};

interface HiddenStemWeight {
    [stem: string]: number;
}

// 原始藏干权重 (用于计算根气)
const RAW_HIDDEN_STEMS: Record<string, HiddenStemWeight> = {
    '子': { '癸': 30 }, '丑': { '己': 18, '癸': 9, '辛': 3 },
    '寅': { '甲': 18, '丙': 9, '戊': 3 }, '卯': { '乙': 30 },
    '辰': { '戊': 18, '乙': 9, '癸': 3 }, '巳': { '丙': 18, '戊': 9, '庚': 3 },
    '午': { '丁': 20, '己': 10 }, '未': { '己': 18, '丁': 9, '乙': 3 },
    '申': { '庚': 18, '壬': 9, '戊': 3 }, '酉': { '辛': 30 },
    '戌': { '戊': 18, '辛': 9, '丁': 3 }, '亥': { '壬': 18, '甲': 12 }
};

const ELEMENT_MAP: Record<string, Element> = {
    '甲': 'Wood', '乙': 'Wood', '丙': 'Fire', '丁': 'Fire', '戊': 'Earth',
    '己': 'Earth', '庚': 'Metal', '辛': 'Metal', '壬': 'Water', '癸': 'Water'
};

const DIRECTION_MAP: Record<Element, string> = {
    'Wood': '东方', 'Fire': '南方', 'Earth': '西南、东北', 'Metal': '西方', 'Water': '北方'
};

const CONTROLLING: Record<Element, Element> = {
    'Wood': 'Earth', 'Earth': 'Water', 'Water': 'Fire', 'Fire': 'Metal', 'Metal': 'Wood'
};

// 湿土/燥土分类
// 湿土/燥土分类
const WET_EARTH = ['辰', '丑'];
const DRY_EARTH = ['戌', '未'];

// 英文五行转中文映射
const ELEMENT_CN: Record<string, string> = { 'Wood': '木', 'Fire': '火', 'Earth': '土', 'Metal': '金', 'Water': '水' };

// 天干五合规则 (Pair, Transform Element, Valid Months, Blocker Element, Cleaner Element)
type TransformRule = [Set<string>, Element, string[], Element[], Element[]];

const TRANSFORM_RULES: TransformRule[] = [
    [new Set(['甲', '己']), 'Earth', ['辰', '戌', '丑', '未', '巳', '午'], ['Wood'], ['Metal', 'Fire']],
    [new Set(['乙', '庚']), 'Metal', ['申', '酉', '巳'], ['Fire'], ['Water', 'Earth']],
    [new Set(['丙', '辛']), 'Water', ['申', '酉'], ['Earth'], ['Wood', 'Metal']], // V32修正: 仅申酉
    [new Set(['丁', '壬']), 'Wood', ['寅', '卯'], ['Metal'], ['Fire', 'Water']],
    [new Set(['戊', '癸']), 'Fire', ['巳', '午', '寅', '卯', '戌'], ['Water'], ['Earth', 'Wood']]
];

// =========================================================================
// 2. 辅助函数 (Helpers)
// =========================================================================

function getElement(char: string): Element | null {
    return ELEMENT_MAP[char] || null;
}

function getTenGod(targetStem: string, dmStem: string): string {
    const dm = STEMS_INFO[dmStem];
    const tg = STEMS_INFO[targetStem];
    if (!dm || !tg) return "未知";

    const elements: Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
    const dmIdx = elements.indexOf(dm.el);
    const tgIdx = elements.indexOf(tg.el);

    // JS/TS取模负数问题处理: (a % n + n) % n
    const diff = (tgIdx - dmIdx + 5) % 5;
    const isSamePolarity = (dm.pol === tg.pol);

    if (diff === 0) return isSamePolarity ? '比肩' : '劫财';
    if (diff === 1) return isSamePolarity ? '食神' : '伤官';
    if (diff === 2) return isSamePolarity ? '偏财' : '正财';
    if (diff === 3) return isSamePolarity ? '七杀' : '正官';
    if (diff === 4) return isSamePolarity ? '偏印' : '正印';
    return "未知";
}

// =========================================================================
// 3. 结果接口
// =========================================================================

export interface WangShuaiResult {
    // 八字信息
    bazi: string;
    // 判定结果
    formalPattern: string;    // 传统格局
    verdict: string;          // 身旺/身弱
    calcPattern: string;      // 特殊格局
    physicsLog: string[];     // 物理逻辑日志
    // 建议
    joyGods: string[];        // 喜用神 (中文)
    jiGods: string[];         // 忌神 (中文)
    luckyDirections: string[];// 吉利方位
    // 数据
    zScore: number;
    formationCheck: string;   // 合化/会局检测文本
    dayKongWang: string[];    // 日柱空亡
    patternCode: string;      // 格局代码 (Normal, Follow_Weak, etc.)
}

// =========================================================================
// 4. 核心计算函数 (Core Calculation)
// =========================================================================

export function calculateWangShuai(pillars: Array<{ tiangan: string, dizhi: string }>): WangShuaiResult {
    // -------------------------------------------------------------------------
    // 2. 解析与预处理
    // -------------------------------------------------------------------------
    // 确保有四柱
    if (!pillars || pillars.length < 4) {
        return {
            bazi: "无效数据", formalPattern: "数据不全", verdict: "未知", calcPattern: "未知",
            physicsLog: [], joyGods: [], jiGods: [], luckyDirections: [],
            zScore: 0, formationCheck: "无", dayKongWang: [],
            patternCode: "Unknown"
        };
    }

    const stems = pillars.map(p => p.tiangan);
    const branches = pillars.map(p => p.dizhi);
    const dmStem = stems[2]; // 日主
    const monthBranch = branches[1];
    const dmInfo = STEMS_INFO[dmStem];
    const dmEl = dmInfo.el;

    // 辅助变量
    const hasWaterStem = stems.includes('壬') || stems.includes('癸');
    const hasWoodStem = stems.includes('甲') || stems.includes('乙');
    const hasFireStem = stems.includes('丙') || stems.includes('丁');
    const hasMetalStem = stems.includes('庚') || stems.includes('辛');

    // 生成八字字符串供返回
    const baziStr = pillars.map(p => p.tiangan + p.dizhi).join(' ');

    // -------------------------------------------------------------------------
    // 3. 严谨定格 (Strict Pattern)
    // -------------------------------------------------------------------------
    function determineStrictPattern(): string {
        const hidden = ZANG_GAN_ORDER[monthBranch] || [];
        if (hidden.length === 0) return "未知";
        if (!STEMS_INFO[dmStem]) return "未知";

        const mainQi = hidden[0];
        const relationMain = getTenGod(mainQi, dmStem);

        // 1. 禄刃
        if (relationMain === '劫财') {
            if (['子', '午', '卯', '酉'].includes(monthBranch)) return "羊刃格 (月令帝旺)";
        }
        if (relationMain === '比肩') {
            if (['寅', '申', '巳', '亥'].includes(monthBranch)) return "建禄格 (月令建禄)";
        }

        // 2. 八正格 (透干优先)
        const allVisibleStems = [stems[0], stems[1], stems[3]]; // 年月时干

        // 检查本气透干
        if (allVisibleStems.includes(mainQi)) {
            const god = getTenGod(mainQi, dmStem);
            if (!['比肩', '劫财'].includes(god)) return `${god}格 (本气透干)`;
        }

        // 检查杂气透干
        for (let i = 1; i < hidden.length; i++) {
            const subQi = hidden[i];
            if (allVisibleStems.includes(subQi)) {
                const god = getTenGod(subQi, dmStem);
                if (!['比肩', '劫财'].includes(god)) return `${god}格 (杂气透干)`;
            }
        }

        return "不成格 (月令藏干均未透)";
    }

    const formalPattern = determineStrictPattern();

    // -------------------------------------------------------------------------
    // 4. 物理引擎全集 (The Physics Core)
    // -------------------------------------------------------------------------

    // 深拷贝藏干权重，用于物理变化
    const hiddenStems: Record<string, HiddenStemWeight> = JSON.parse(JSON.stringify(RAW_HIDDEN_STEMS));
    const physicsLog: string[] = [];

    // 基础计数 (all_chars)
    const allChars = [...stems, ...branches];
    const counts: Record<Element, number> = { 'Wood': 0, 'Fire': 0, 'Earth': 0, 'Metal': 0, 'Water': 0 };
    allChars.forEach(char => {
        const el = getElement(char);
        if (el) counts[el]++;
    });

    // 强制用神 (用于特殊格局)
    let forcedYongShen: string[] = [];

    // 4.1 化气格判定
    let isTrueTransformation = false;
    let transformGodElement: Element | null = null;

    // 辅助函数：stem_has_root
    const stemHasRoot = (stem: string): boolean => {
        const info = STEMS_INFO[stem];
        if (!info) return false;
        const stemEl = info.el;
        for (const branch of branches) {
            const branchRoots = RAW_HIDDEN_STEMS[branch] || {};
            // 1. 本气/中气同字
            if (branchRoots[stem] && branchRoots[stem] >= 9) return true;
            // 2. 同五行且强根
            for (const [hidden, weight] of Object.entries(branchRoots)) {
                const hInfo = STEMS_INFO[hidden];
                if (hInfo && hInfo.el === stemEl && weight >= 18) return true;
            }
        }
        return false;
    };

    for (const rule of TRANSFORM_RULES) {
        const [pair, targetEl, validMonths, blockers, cleaners] = rule;

        // 检查日主是否在合中
        // pair is Set, check if dmStem in pair
        if (pair.has(dmStem)) {
            // Check if both stems in pair are present in stems
            // pair转Array
            const pairArr = Array.from(pair);
            const isPairPresent = pairArr.every(s => stems.includes(s));

            if (isPairPresent) {
                // 月令支持
                if (validMonths.includes(monthBranch)) {
                    let isBlocked = false;
                    const blockReasons: string[] = [];

                    // === 条件1: 日干必须无根 ===
                    if (stemHasRoot(dmStem)) {
                        isBlocked = true;
                        blockReasons.push("日干有根无法化气");
                    }

                    // === 条件2: 化神必须旺 ===
                    if (targetEl === 'Earth') {
                        // 甲己化土: 地支土>=2, 干透戊己
                        const earthBranches = branches.filter(b => [...WET_EARTH, ...DRY_EARTH].includes(b));
                        const hasWuJi = stems.includes('戊') || stems.includes('己');
                        if (earthBranches.length < 2) {
                            isBlocked = true;
                            blockReasons.push(`地支土仅${earthBranches.length}个(需>=2)`);
                        }
                        if (!hasWuJi) {
                            isBlocked = true;
                            blockReasons.push("天干未透戊己土");
                        }
                    } else if (targetEl === 'Metal') {
                        // 乙庚化金
                        const metalBranches = branches.filter(b => ['申', '酉'].includes(b));
                        if (metalBranches.length < 1 && !['申', '酉'].includes(monthBranch)) {
                            isBlocked = true;
                            blockReasons.push("地支无金气支撑");
                        }
                    } else if (targetEl === 'Water') {
                        // 丙辛化水
                        const waterBranches = branches.filter(b => ['亥', '子'].includes(b));
                        if (waterBranches.length < 1 && !['亥', '子'].includes(monthBranch)) {
                            isBlocked = true;
                            blockReasons.push("地支无水气支撑");
                        }
                    }

                    // === 条件3: 阻碍检测 ===
                    const blockerFound: string[] = [];
                    stems.forEach(s => {
                        if (!pair.has(s)) {
                            const info = STEMS_INFO[s];
                            if (info && blockers.includes(info.el)) {
                                blockerFound.push(s);
                            }
                        }
                    });

                    let transformLogDetail = "";

                    if (blockerFound.length > 0 && !isBlocked) {
                        // 寻找救应
                        let hasCleaner = false;
                        stems.forEach(s => {
                            const info = STEMS_INFO[s];
                            if (info && cleaners.includes(info.el)) hasCleaner = true;
                        });

                        if (hasCleaner) {
                            transformLogDetail = `✨ 真化气格：[${pairArr.sort().join('')}]合化[${ELEMENT_CN[targetEl]}]，虽有[${blockerFound.join('')}]阻碍，幸得救应去浊留清`;
                        } else {
                            isBlocked = true;
                            blockReasons.push(`有[${blockerFound.join('')}]克化神且无制`);
                        }
                    }

                    if (isBlocked) {
                        physicsLog.push(`🔗 假化气格：[${pairArr.sort().join('')}]合而不化 - ${blockReasons.join('; ')}`);
                    } else {
                        if (!transformLogDetail) {
                            transformLogDetail = `✨ 真化气格：[${pairArr.sort().join('')}]合化[${ELEMENT_CN[targetEl]}]，月令支持，化神旺，日干无根`;
                        }
                        physicsLog.push(transformLogDetail);
                        isTrueTransformation = true;
                        transformGodElement = targetEl;
                        break; // 成功化气，退出循环
                    }
                }
            }
        }
    }

    // 4.2 会局引动
    if (!isTrueTransformation) {
        // 申子合水
        if (branches.includes('申') && branches.includes('子') && ['亥', '子'].includes(monthBranch)) {
            if (hasWaterStem) {
                physicsLog.push("🌊 申子化水：天干透水引动，申金根气清空");
                if (hiddenStems['申']) hiddenStems['申'] = { '壬': 30 };
            } else {
                physicsLog.push("🔗 申子羁绊：水未透干，合而不化，根气保留");
            }
        }
        // 亥卯合木
        if (branches.includes('亥') && branches.includes('卯') && ['寅', '卯'].includes(monthBranch)) {
            if (hasWoodStem) {
                physicsLog.push("🌲 亥卯化木：天干透木引动，亥水根气清空");
                if (hiddenStems['亥']) hiddenStems['亥'] = { '甲': 30 };
            } else {
                physicsLog.push("🔗 亥卯羁绊：木未透干，合而不化");
            }
        }
        // 巳酉合金
        if (branches.includes('巳') && branches.includes('酉') && ['申', '酉'].includes(monthBranch)) {
            if (hasMetalStem) {
                physicsLog.push("⚔ 巳酉化金：天干透金引动，巳火变性");
                if (hiddenStems['巳']) hiddenStems['巳'] = { '庚': 30 };
            }
        }
        // 寅午合火
        if (branches.includes('寅') && branches.includes('午') && ['巳', '午'].includes(monthBranch)) {
            if (hasFireStem) {
                physicsLog.push("🔥 寅午化火：天干透火引动，寅木化火");
                if (hiddenStems['寅']) hiddenStems['寅'] = { '丙': 30 };
            }
        }
    }

    // 4.3 烈火分级
    let fireScore = 0;
    if (['巳', '午'].includes(monthBranch)) fireScore += 2.0;
    else if (['未', '戌'].includes(monthBranch)) fireScore += 0.5;

    if (['巳', '午'].includes(branches[2])) fireScore += 1.5; // 日支
    if (['巳', '午'].includes(branches[0])) fireScore += 1.0; // 年支
    if (['巳', '午'].includes(branches[3])) fireScore += 1.0; // 时支

    stems.forEach(s => { if (['丙', '丁'].includes(s)) fireScore += 1.0; });

    const isHotSeason = ['巳', '午', '未', '戌'].includes(monthBranch);

    if (isHotSeason && !isTrueTransformation) {
        if (fireScore >= 3.5) {
            WET_EARTH.forEach(wetEarth => {
                if (hiddenStems[wetEarth]) {
                    if (wetEarth === '丑') {
                        hiddenStems['丑'] = { '己': 28 }; // 归零
                        physicsLog.push(`🔥🔥 烈火烤土(丑)：火力评分${fireScore}，水气彻底蒸发 (真从)`);
                    } else if (wetEarth === '辰') {
                        const isGaitou = pillars.some(p => p.tiangan === '戊' && p.dizhi === '辰');
                        hiddenStems['辰'] = { '戊': 28 };
                        if (isGaitou) {
                            physicsLog.push("🧱 盖头之克(戊辰)：火月戊土透干，吸干辰中水木");
                        } else {
                            physicsLog.push(`🔥🔥 烈火烤土(辰)：火力评分${fireScore}，水木皆亡`);
                        }
                    }
                }
            });
        } else if (fireScore >= 2.5) {
            if (hiddenStems['丑']) {
                if (hiddenStems['丑']['癸']) hiddenStems['丑']['癸'] *= 0.2;
                physicsLog.push("🔥 烈火烤土(丑)：水气微存 (假从)");
            }
        }
    }

    // 4.4 稼穑与十干体象
    let isEarthDominant = false;
    if (dmEl === 'Earth' && (counts['Earth'] + counts['Fire'] >= 7) && !isTrueTransformation) {
        isEarthDominant = true;
        physicsLog.push("🧱 稼穑成格：火土气势宏大，论专旺");
        // 清空杂气
        [...WET_EARTH, ...DRY_EARTH].forEach(b => {
            if (hiddenStems[b]) {
                const newDict: HiddenStemWeight = {};
                Object.entries(hiddenStems[b]).forEach(([k, v]) => {
                    const el = getElement(k);
                    if (el === 'Earth' || el === 'Fire') newDict[k] = v;
                });
                hiddenStems[b] = newDict;
            }
        });
        forcedYongShen = ["Fire(印星)", "Earth(比劫)", "Metal(食伤)"];
    }

    // 水多土流
    if (dmEl === 'Earth' && counts['Water'] >= 3 && ['亥', '子'].includes(monthBranch) && !isEarthDominant) {
        const isWaterSuccess = physicsLog.some(l => l.includes("化水"));
        if (isWaterSuccess || counts['Water'] >= 5) {
            physicsLog.push("🌊 水多土流：冬土遇洪，根气全消");
            forcedYongShen = ["Water(财星)", "Wood(官杀)"];
        }
    }

    // 5. 旺衰评分 (Z-Score)
    const cycle: Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
    const idx = cycle.indexOf(dmEl);
    const textRelation = {
        'Self': dmEl,
        'Output': cycle[(idx + 1) % 5],
        'Wealth': cycle[(idx + 2) % 5],
        'Official': cycle[(idx + 3) % 5],
        'Resource': cycle[(idx + 4) % 5]
    };
    const relations: Record<string, Element> = textRelation; // 为了方便查找 Key

    const supportEls = [relations['Self'], relations['Resource']];

    // 月令得分
    const monthRoots = hiddenStems[monthBranch] || {};
    let monthScore = 0;
    const monthMainQi = ZANG_GAN_ORDER[monthBranch][0];
    const monthMainEl = getElement(monthMainQi);
    // 判断月令是否克日主 (Simplified: check if month main element controls day master)
    const isMonthHostile = monthMainEl && CONTROLLING[monthMainEl] === dmEl;

    Object.entries(monthRoots).forEach(([root, weight]) => {
        const rootEl = getElement(root);
        if (rootEl === dmEl) monthScore += (isMonthHostile ? weight * 0.3 : weight);
        else if (supportEls.includes(rootEl!)) monthScore += (isMonthHostile ? weight * 0.7 * 0.3 : weight * 0.7);
    });

    // 根气得分
    let rootsScore = 0;
    for (const i of [0, 2, 3]) { // 年日时
        const br = branches[i];
        let cScore = 0;
        const branchRoots = hiddenStems[br] || {};
        Object.entries(branchRoots).forEach(([root, weight]) => {
            const rel = getElement(root);
            if (rel === dmEl) cScore += weight;
            else if (supportEls.includes(rel!)) cScore += weight * 0.7;
        });
        rootsScore += cScore;
    }

    // 天干得分
    let stemsScore = 0;
    stems.forEach((s, i) => {
        if (i !== 2) { // 不算日干自己
            const sEl = getElement(s);
            if (sEl && supportEls.includes(sEl)) {
                stemsScore += 10;
            }
        }
    });

    // Round to 2 decimals
    let zScore = (0.1585 * monthScore) + (0.0139 * rootsScore) + (0.0336 * stemsScore) - 2.2463;
    if (isEarthDominant) zScore += 5.0;

    zScore = Math.round(zScore * 100) / 100;
    let verdict = zScore > 0 ? "身旺" : "身弱";

    // -------------------------------------------------------------------------
    // 6. 格局裁决 & 智能防御
    // -------------------------------------------------------------------------
    let patternCode = "Normal";
    let calcPattern = "普通格局";
    let transformJiShen: Element[] = [];

    // 计算十神统计(Counts for Ten Gods)
    const stemGods: string[] = [];
    stems.forEach((s, i) => {
        if (i !== 2) { // 排除日主
            const sInfo = STEMS_INFO[s];
            if (!sInfo) return;
            // Find god
            Object.entries(relations).forEach(([godKey, el]) => {
                if (el === sInfo.el) stemGods.push(godKey);
            });
        }
    });

    if (isTrueTransformation && transformGodElement) {
        calcPattern = `真化气格 (化${ELEMENT_CN[transformGodElement]})`;
        patternCode = "Transform";

        // 化气格喜忌
        const cycle = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
        const transIdx = cycle.indexOf(transformGodElement);
        const xieShen = cycle[(transIdx + 1) % 5];
        const keShen = cycle[(transIdx + 3) % 5];
        const shengKe = cycle[(transIdx + 2) % 5];

        forcedYongShen = [transformGodElement! as string, xieShen as string];
        transformJiShen = [keShen as Element, shengKe as Element];

    } else if (forcedYongShen.length > 0) {
        if (physicsLog.some(l => l.includes("水多土流"))) {
            calcPattern = "身弱 (水多土流)";
            patternCode = "Normal";
        } else if (physicsLog.some(l => l.includes("稼穑"))) {
            calcPattern = "专旺格 (稼穑/气势)";
            patternCode = "Follow_Strong";
        } else if (forcedYongShen.some(s => s.includes("财星"))) {
            calcPattern = "真从格 (弃命相从)";
            patternCode = "Follow_Weak";
        }
    } else if (isEarthDominant) {
        calcPattern = "专旺格 (稼穑格 / 气势专一)";
        patternCode = "Follow_Strong";
    } else if (zScore < -1.5) {
        // === 从格判定 (V32 核心修复逻辑) ===

        // 1. 强根 vs 弱根检测
        let hasStrongRoot = false;
        let hasWeakRoot = false;

        branches.forEach(b => {
            const roots = RAW_HIDDEN_STEMS[b] || {};
            // 日干在藏干
            if (roots[dmStem]) {
                if (roots[dmStem] >= 18) hasStrongRoot = true;
                else if (roots[dmStem] >= 3) hasWeakRoot = true;
            }
            // 同五行
            Object.entries(roots).forEach(([hidden, weight]) => {
                const hInfo = STEMS_INFO[hidden];
                if (hInfo && hInfo.el === dmEl) {
                    if (weight >= 18) hasStrongRoot = true;
                    else if (weight >= 9) hasWeakRoot = true;
                }
            });
        });

        // 2. 燥土防从逻辑
        const dryEarthInBranches = branches.filter(b => DRY_EARTH.includes(b));
        const hasDryEarth = dryEarthInBranches.length > 0;
        let dryEarthWeakened = false;

        if (hasDryEarth) {
            // 辰戌冲，丑未冲
            if ((branches.includes('辰') && branches.includes('戌')) ||
                (branches.includes('丑') && branches.includes('未'))) {
                dryEarthWeakened = true;
                const pair = branches.includes('辰') ? '辰戌' : '丑未';
                physicsLog.push(`🔀 ${pair}相冲：燥土力量削弱，可入从格`);
            }
            // 月令水旺克燥土
            if (['亥', '子'].includes(monthBranch) && !dryEarthWeakened) {
                dryEarthWeakened = true;
                physicsLog.push(`💧 月令${monthBranch}水旺：燥土被水克，力量削弱`);
            }
        }

        const isYangStem = ['甲', '丙', '戊', '庚', '壬'].includes(dmStem);

        // 3. 阳干比劫检测 (V32 Fix)
        let hasBijieInStems = false;
        const bijieStems: string[] = [];
        stems.forEach((s, i) => {
            if (i !== 2) {
                const sInfo = STEMS_INFO[s];
                if (sInfo && sInfo.el === dmEl) {
                    hasBijieInStems = true;
                    bijieStems.push(s);
                }
            }
        });

        if (hasBijieInStems && isYangStem) {
            physicsLog.push(`🔥 天干透比劫[${bijieStems.join(', ')}]：阳干有帮身，不入从格`);
        }

        const effectiveHasDryEarth = hasDryEarth && !dryEarthWeakened;

        // === 判定条件 ===
        // 阳干有比劫透天干时，不能断从格
        const canEnterCong = !hasStrongRoot && !effectiveHasDryEarth && !(hasBijieInStems && isYangStem);

        if (canEnterCong) {
            // 细分从格类型
            let congType = "从弱";
            let congElement: Element | null = null;

            const stemGodCounts = { 'Wealth': 0, 'Official': 0, 'Output': 0 };
            stemGods.forEach(g => {
                if (g === 'Wealth') stemGodCounts['Wealth']++;
                else if (g === 'Official') stemGodCounts['Official']++;
                else if (g === 'Output') stemGodCounts['Output']++;
            });

            // 从杀 > 从财 > 从儿
            if (stemGodCounts['Official'] > 0 && counts[relations['Official']] >= 2) {
                congType = "从杀格";
                congElement = relations['Official'];
            } else if (stemGodCounts['Wealth'] > 0 && counts[relations['Wealth']] >= 2) {
                congType = "从财格";
                congElement = relations['Wealth'];
            } else if (stemGodCounts['Output'] > 0 && counts[relations['Output']] >= 2) {
                congType = "从儿格";
                congElement = relations['Output'];
            }

            if (hasWeakRoot && isYangStem) {
                calcPattern = `假${congType} (余气微根)`;
                patternCode = "Fake_Follow";
                physicsLog.push(`🌀 假从格：${dmStem}为阳干，地支仅有余气微根，形成假${congType}`);
                physicsLog.push("⚠️ 假从格注意：大运喜忌具有动态性，需结合行运判断吉凶");

                // 假从格用神 (V32)
                if (congElement) {
                    const cycle = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
                    const cIdx = cycle.indexOf(congElement);
                    const shengCong = cycle[(cIdx - 1 + 5) % 5];
                    forcedYongShen = [congElement as string, shengCong as string];
                }
            } else if (!hasWeakRoot) {
                calcPattern = `真${congType} (弃命相从)`;
                patternCode = "Follow_Weak";
                if (congElement) {
                    const cycle = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
                    const cIdx = cycle.indexOf(congElement);
                    const shengCong = cycle[(cIdx - 1 + 5) % 5];
                    forcedYongShen = [congElement as string, shengCong as string];
                }
            } else {
                calcPattern = "假从格 / 极弱";
                patternCode = "Fake_Follow";
            }

        } else if (hasDryEarth && !(hasBijieInStems && isYangStem)) {
            physicsLog.push(`🏜️ 燥土防从：地支有[${dryEarthInBranches.join(', ')}]燥土，可助日干，不入真从`);
            calcPattern = "假从格 (燥土微根)";
            patternCode = "Fake_Follow";
            physicsLog.push("⚠️ 假从格注意：大运喜忌具有动态性，需结合行运判断吉凶");
        } else if (!(hasBijieInStems && isYangStem)) {
            calcPattern = "假从格 / 极弱";
            patternCode = "Fake_Follow";
        }
    } else if (zScore > 3.0) {
        calcPattern = "专旺格";
        patternCode = "Follow_Strong";
    }

    // 7. 智能防御 (战克检测)
    let isBetrayal = false;
    let isFighting = false;
    let conflictLog = "";

    if (['Follow_Weak', 'Fake_Follow'].includes(patternCode) && patternCode !== 'Transform') {
        const hasOutput = stemGods.includes('Output');
        const hasOfficial = stemGods.includes('Official');

        if (hasOutput && hasOfficial) {
            let foundCombine = false;
            for (const rule of TRANSFORM_RULES) {
                const [pair] = rule;
                const pairArr = Array.from(pair);
                // Check intersection
                const intersect = pairArr.filter(s => stems.includes(s));
                if (intersect.length === 2) {
                    const [e1, e2] = intersect;
                    const g1 = getTenGod(e1, dmStem);
                    const g2 = getTenGod(e2, dmStem);
                    const outputs = ['食神', '伤官'];
                    const officials = ['正官', '七杀'];
                    if ((outputs.includes(g1) && officials.includes(g2)) ||
                        (outputs.includes(g2) && officials.includes(g1))) {
                        foundCombine = true;
                        break;
                    }
                }
            }

            if (foundCombine) {
                isBetrayal = true;
                conflictLog = "⚠️ 贪合忘克：食伤与官杀相合，救星叛变，强制真从";
            } else {
                // 战克检测
                // Check strong root
                let dmHasStrongRoot = false;
                branches.forEach(b => {
                    const roots = RAW_HIDDEN_STEMS[b] || {};
                    if (roots[dmStem] && roots[dmStem] >= 18) dmHasStrongRoot = true;
                    else {
                        Object.entries(roots).forEach(([h, w]) => {
                            const hInfo = STEMS_INFO[h];
                            if (hInfo && hInfo.el === dmEl && w >= 18) dmHasStrongRoot = true;
                        });
                    }
                });

                if (dmHasStrongRoot) {
                    isFighting = true;
                    conflictLog = "⚠️ 战克不从：天干透食伤制杀，日主有强根，心存反抗";
                }
            }
        }
    }

    if (isBetrayal) {
        patternCode = "Follow_Weak";
        calcPattern = "真从格 (贪合忘克/弃命相从)";
        forcedYongShen = [relations['Wealth'], relations['Official']];
    } else if (isFighting) {
        patternCode = "Normal";
        calcPattern = "身弱 (伤官见官 / 杀重身轻)";
        verdict = "身弱";
    }

    // 8. 喜用神生成
    let yongShen: string[] = []; // store keys like 'Wealth' or elements 'Water'
    let jiShen: string[] = [];

    if (forcedYongShen.length > 0) {
        yongShen = forcedYongShen;
        if (patternCode === 'Transform') {
            jiShen = transformJiShen;
        } else if (patternCode === 'Follow_Weak') {
            jiShen = [relations['Resource'], relations['Self']];
        } else if (patternCode === 'Follow_Strong') {
            jiShen = [relations['Wealth'], relations['Official']];
        }
    } else {
        if (patternCode === 'Follow_Weak') {
            // 从格喜用: 财+官 (从杀格不喜食伤)
            yongShen = [relations['Wealth'], relations['Official']];
            jiShen = [relations['Resource'], relations['Self'], relations['Output']];
            // 特殊: 从儿格
            if (calcPattern.includes('从儿')) {
                yongShen = [relations['Output'], relations['Wealth']];
                jiShen = [relations['Resource'], relations['Official']];
            }
        } else if (patternCode === 'Fake_Follow') {
            yongShen = [relations['Output'], relations['Wealth'], relations['Official']];
            jiShen = [relations['Resource'], relations['Self']];
        } else if (patternCode === 'Follow_Strong') {
            yongShen = [relations['Resource'], relations['Self'], relations['Output']];
            jiShen = [relations['Wealth'], relations['Official']];
        } else if (patternCode === 'Normal') {
            if (verdict === '身弱') {
                yongShen = [relations['Resource'], relations['Self']];
                jiShen = [relations['Official'], relations['Wealth'], relations['Output']];
            } else {
                yongShen = [relations['Official'], relations['Wealth'], relations['Output']];
                jiShen = [relations['Resource'], relations['Self']];
            }
        }
    }

    // Output formatting
    const toCn = (list: string[]): string[] => {
        return list.map(item => {
            // Check if it is "Water(xx)"
            const elPart = item.split('(')[0];
            if (ELEMENT_CN[elPart]) return ELEMENT_CN[elPart];
            // Check if it is Element Key 'Wood'
            if (ELEMENT_CN[item]) return ELEMENT_CN[item];
            return item;
        });
    };

    const joyGods = toCn(yongShen);
    const jiGods = toCn(jiShen);

    const luckyDirections = [...new Set(yongShen.map(y => {
        const el = y.split('(')[0];
        return DIRECTION_MAP[el as Element] || '';
    }).filter(d => d))];

    // Final Log Formatting
    if (conflictLog) {
        if (physicsLog.length > 0) physicsLog.unshift(conflictLog);
        else physicsLog.push(conflictLog);
    }

    // 日柱空亡
    function getKongWang(stem: string, branch: string): string[] {
        const stemsArr = "甲乙丙丁戊己庚辛壬癸".split('');
        const branchesArr = "子丑寅卯辰巳午未申酉戌亥".split('');
        const sIdx = stemsArr.indexOf(stem);
        const bIdx = branchesArr.indexOf(branch);
        let offset = bIdx - sIdx;
        if (offset < 0) offset += 12;

        const kwMap: Record<number, string[]> = {
            10: ['申', '酉'], 8: ['午', '未'], 6: ['辰', '巳'],
            4: ['寅', '卯'], 2: ['子', '丑'], 0: ['戌', '亥']
        };
        return kwMap[offset] || [];
    }

    // Day pillar is index 2
    const dayKongWang = getKongWang(pillars[2].tiangan, pillars[2].dizhi);

    return {
        bazi: baziStr,
        formalPattern,
        verdict,
        calcPattern,
        physicsLog,
        joyGods,
        jiGods,
        luckyDirections,
        zScore,
        formationCheck: physicsLog[0] || "无",
        dayKongWang,
        patternCode
    };
}
