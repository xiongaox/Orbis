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
    // 天干
    '甲': 'Wood', '乙': 'Wood', '丙': 'Fire', '丁': 'Fire', '戊': 'Earth',
    '己': 'Earth', '庚': 'Metal', '辛': 'Metal', '壬': 'Water', '癸': 'Water',
    // 地支
    '寅': 'Wood', '卯': 'Wood', '巳': 'Fire', '午': 'Fire',
    '辰': 'Earth', '戌': 'Earth', '丑': 'Earth', '未': 'Earth',
    '申': 'Metal', '酉': 'Metal', '亥': 'Water', '子': 'Water'
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
    formalPattern: string;    // 传统格局（正官格、建禄格等）
    bodyStrength: string;     // 身体强弱（身强/身弱/从财/专旺等）
    verdict: string;          // 身旺/身弱（简化版）
    calcPattern: string;      // 特殊格局（兼容旧代码）
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
            bazi: "无效数据", formalPattern: "数据不全", bodyStrength: "未知", verdict: "未知", calcPattern: "未知",
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

        // 1. 禄刃判定 (直接映射表)
        const LU_MAP: Record<string, string> = {
            '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
            '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子'
        };
        // 羊刃 (阳干：帝旺；阴干：通常不论羊刃格，或论月刃)
        // 这里采用宽泛定义：只要是帝旺位即视为月刃/羊刃
        const REN_MAP: Record<string, string> = {
            '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午',
            '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥'
        };

        if (LU_MAP[dmStem] === monthBranch) return "建禄格 (月令建禄)";
        if (REN_MAP[dmStem] === monthBranch) return "羊刃格 (月令帝旺)";

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
    let isZhuanWang = false;
    let zhuanWangName = "";
    let isEarthDominant = false;

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
    // 4.4 专旺格精确判定 (Five Super-Strong Patterns)
    isZhuanWang = false;
    zhuanWangName = "";

    if (!isTrueTransformation) {
        // 辅助检测函数
        const hasFang = (el: Element): boolean => {
            if (el === 'Wood') return branches.includes('寅') && branches.includes('卯') && branches.includes('辰');
            if (el === 'Fire') return branches.includes('巳') && branches.includes('午') && branches.includes('未');
            if (el === 'Metal') return branches.includes('申') && branches.includes('酉') && branches.includes('戌');
            if (el === 'Water') return branches.includes('亥') && branches.includes('子') && branches.includes('丑');
            return false;
        };
        const hasJu = (el: Element): boolean => {
            if (el === 'Wood') return branches.includes('亥') && branches.includes('卯') && branches.includes('未');
            if (el === 'Fire') return branches.includes('寅') && branches.includes('午') && branches.includes('戌');
            if (el === 'Metal') return branches.includes('巳') && branches.includes('酉') && branches.includes('丑');
            if (el === 'Water') return branches.includes('申') && branches.includes('子') && branches.includes('辰');
            return false;
        };

        // 忌神检测 (是否存在强力的克神)
        const hasStrongKiller = (killerEl: Element): boolean => {
            // 简单规则：天干透克神，或者地支有2个以上克神
            const killerCount = counts[killerEl] || 0;
            const stemKiller = stems.some(s => {
                const info = STEMS_INFO[s];
                return info && info.el === killerEl;
            });
            return stemKiller || killerCount > 0;
        };

        // 1. 曲直格 (Wood)
        if (dmEl === 'Wood') {
            const isWoodStrong = hasFang('Wood') || hasJu('Wood') || (counts['Wood'] >= 5);
            if (isWoodStrong && !hasStrongKiller('Metal')) {
                isZhuanWang = true;
                zhuanWangName = "专旺格 (曲直/木)";
                physicsLog.push("🌲 曲直成格：木气成方/局，不见强金破格");
                forcedYongShen = ["Wood(比劫)", "Water(印星)", "Fire(食伤)"];
            }
        }
        // 2. 炎上格 (Fire)
        else if (dmEl === 'Fire') {
            const isFireStrong = hasFang('Fire') || hasJu('Fire') || (counts['Fire'] >= 5);
            if (isFireStrong && !hasStrongKiller('Water')) {
                isZhuanWang = true;
                zhuanWangName = "专旺格 (炎上/火)";
                physicsLog.push("🔥 炎上成格：火气成方/局，不见强水破格");
                forcedYongShen = ["Fire(比劫)", "Wood(印星)", "Earth(食伤)"];
            }
        }
        // 3. 稼穑格 (Earth)
        else if (dmEl === 'Earth') {
            // 四库全 OR 火土气势宏大(费中堂造: 子丑化土+土重)
            const fourKu = branches.includes('辰') && branches.includes('戌') && branches.includes('丑') && branches.includes('未');
            const earthDominant = (counts['Earth'] + counts['Fire'] >= 6);
            // 费中堂特殊检测: 子丑化土 + 土重
            const ziChouEarth = branches.includes('子') && branches.includes('丑') && earthDominant;

            if ((fourKu || earthDominant || ziChouEarth) && !hasStrongKiller('Wood')) {
                isZhuanWang = true;
                isEarthDominant = true;
                zhuanWangName = "专旺格 (稼穑/土)";
                physicsLog.push("🧱 稼穑成格：土气专旺，不见强木破格");
                forcedYongShen = ["Earth(比劫)", "Fire(印星)", "Metal(食伤)"];
            }
        }
        // 4. 从革格 (Metal)
        else if (dmEl === 'Metal') {
            const isMetalStrong = hasFang('Metal') || hasJu('Metal') || (counts['Metal'] >= 5);
            if (isMetalStrong && !hasStrongKiller('Fire')) {
                isZhuanWang = true;
                zhuanWangName = "专旺格 (从革/金)";
                physicsLog.push("⚔ 从革成格：金气成方/局，不见强火破格");
                forcedYongShen = ["Metal(比劫)", "Earth(印星)", "Water(食伤)"];
            }
        }
        // 5. 润下格 (Water)
        else if (dmEl === 'Water') {
            const isWaterStrong = hasFang('Water') || hasJu('Water') || (counts['Water'] >= 5);
            if (isWaterStrong && !hasStrongKiller('Earth')) {
                isZhuanWang = true;
                zhuanWangName = "专旺格 (润下/水)";
                physicsLog.push("🌊 润下成格：水气成方/局，不见强土破格");
                forcedYongShen = ["Water(比劫)", "Metal(印星)", "Wood(食伤)"];
            }
        }


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

    // -------------------------------------------------------------------------
    // 官印相生流通链检测 (Flow Chain Detection)
    // 当月令克日主时，检测是否存在 官杀→印→身 的流通链
    // 如果印星透干且得月令生助，则月令之克被化解，不判定为敌对
    // -------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // 调候检测：判断印星是否因寒燥失衡而失效
    // 五行生克在极端环境下会失效或反转
    // -------------------------------------------------------------------------
    const isResourceIneffective = (
        dayMasterEl: Element,
        resourceEl: Element,
        monthBr: string,
        allBranches: string[],
        allStems: string[]
    ): { ineffective: boolean; reason: string } => {
        const FIRE_BRANCHES = ['巳', '午'];
        const WATER_BRANCHES = ['亥', '子'];
        const DRY_EARTH_BR = ['戌', '未'];
        const WET_EARTH_BR = ['辰', '丑'];
        const EARTH_BRANCHES = [...DRY_EARTH_BR, ...WET_EARTH_BR];

        // 统计各类地支数量
        const countBranches = (targetList: string[]): number =>
            allBranches.filter(b => targetList.includes(b)).length;

        // 检查天干是否有某五行
        const hasStemElement = (targetEl: Element): boolean =>
            allStems.some(s => STEMS_INFO[s]?.el === targetEl);

        // =========================================================
        // 场景1: 燥土不生金 (金日主 + 土印星 + 火旺燥土)
        // 条件: 火月 + 地支多火/燥土(≥3) + 无水润
        // =========================================================
        if (dayMasterEl === 'Metal' && resourceEl === 'Earth') {
            const isFireMonth = FIRE_BRANCHES.includes(monthBr);
            const fireDryCount = countBranches([...FIRE_BRANCHES, ...DRY_EARTH_BR]);
            const hasWater = countBranches(WATER_BRANCHES) > 0 || hasStemElement('Water');
            const hasWetEarth = countBranches(WET_EARTH_BR) > 0;

            if (isFireMonth && fireDryCount >= 3 && !hasWater && !hasWetEarth) {
                return { ineffective: true, reason: "🔥 燥土不生金：火旺土燥，印星失效" };
            }
        }

        // =========================================================
        // 场景2: 寒水不生木 (木日主 + 水印星 + 水旺寒冷)
        // 条件: 水月 + 地支多水/寒土(≥3) + 无火暖
        // =========================================================
        if (dayMasterEl === 'Wood' && resourceEl === 'Water') {
            const isWaterMonth = WATER_BRANCHES.includes(monthBr);
            // 丑为寒湿土
            const waterColdCount = countBranches([...WATER_BRANCHES, '丑']);
            const hasFire = countBranches(FIRE_BRANCHES) > 0 || hasStemElement('Fire');

            if (isWaterMonth && waterColdCount >= 3 && !hasFire) {
                return { ineffective: true, reason: "❄️ 寒水不生木：水寒木冻，印星失效" };
            }
        }

        // =========================================================
        // 场景3: 湿木不生火 (火日主 + 木印星 + 水旺木湿)
        // 条件: 水月 + 地支多水(≥2) + 木无强根
        // =========================================================
        if (dayMasterEl === 'Fire' && resourceEl === 'Wood') {
            const isWaterMonth = WATER_BRANCHES.includes(monthBr);
            const waterCount = countBranches(WATER_BRANCHES);
            // 检查木是否有强根（寅卯）
            const hasWoodRoot = allBranches.includes('寅') || allBranches.includes('卯');

            if (isWaterMonth && waterCount >= 2 && !hasWoodRoot) {
                return { ineffective: true, reason: "💧 湿木不生火：水旺木湿，印星失效" };
            }
        }

        // =========================================================
        // 场景4: 土多金埋 (水日主 + 金印星 + 土重)
        // 条件: 土月 + 地支多土(≥3) + 金无强根
        // =========================================================
        if (dayMasterEl === 'Water' && resourceEl === 'Metal') {
            const isEarthMonth = EARTH_BRANCHES.includes(monthBr);
            const earthCount = countBranches(EARTH_BRANCHES);
            // 检查金是否有强根（申酉）
            const hasMetalRoot = allBranches.includes('申') || allBranches.includes('酉');

            if (isEarthMonth && earthCount >= 3 && !hasMetalRoot) {
                return { ineffective: true, reason: "🪨 土多金埋：土重金沉，印星失效" };
            }
        }

        // =========================================================
        // 场景5: 火多土焦 (土日主 + 火印星 + 火势过烈)
        // 条件: 火月 + 地支多火(≥3) + 土无水润
        // 注意: 此场景较少见，因为火生土通常是正常的
        // =========================================================
        if (dayMasterEl === 'Earth' && resourceEl === 'Fire') {
            const isFireMonth = FIRE_BRANCHES.includes(monthBr);
            const fireCount = countBranches(FIRE_BRANCHES);
            const hasWater = countBranches(WATER_BRANCHES) > 0 || hasStemElement('Water');
            const hasWetEarth = countBranches(WET_EARTH_BR) > 0;

            // 火多土焦需要非常极端的条件
            if (isFireMonth && fireCount >= 3 && !hasWater && !hasWetEarth) {
                return { ineffective: true, reason: "🔥🔥 火多土焦：火势过烈，土反被焦" };
            }
        }

        return { ineffective: false, reason: "" };
    };

    const hasFlowChain = (monthEl: Element, dayMasterEl: Element, allStems: string[]): boolean => {
        const flowCycle: Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
        const monthIdx = flowCycle.indexOf(monthEl);
        const dmIdx = flowCycle.indexOf(dayMasterEl);

        // 月令所生的五行
        const shengEl = flowCycle[(monthIdx + 1) % 5];
        // 日主的印星五行（生日主的五行）
        const resourceEl = flowCycle[(dmIdx + 4) % 5]; // (idx - 1 + 5) % 5 = (idx + 4) % 5

        // 月令所生的五行必须是日主的印星
        if (shengEl !== resourceEl) return false;

        // 检查印星是否透干
        let hasResourceStem = false;
        for (const s of allStems) {
            const sInfo = STEMS_INFO[s];
            if (sInfo && sInfo.el === resourceEl) {
                hasResourceStem = true;
                break;
            }
        }
        if (!hasResourceStem) return false;

        // 调候检测：检查印星是否因寒燥失衡而失效
        const { ineffective, reason } = isResourceIneffective(
            dayMasterEl, resourceEl, monthBranch, branches, stems
        );

        if (ineffective) {
            physicsLog.push(reason);
            return false; // 印星失效，流通链不成立
        }

        return true; // 印星透干且有效，流通链成立
    };

    // 判断月令是否克日主
    let isMonthHostile = false;

    if (monthMainEl && CONTROLLING[monthMainEl] === dmEl) {
        // 月令克日主，但检查是否有流通链
        if (hasFlowChain(monthMainEl, dmEl, stems)) {
            isMonthHostile = false; // 通关，不判敌对
            physicsLog.push(`🔄 官印相生：${ELEMENT_CN[monthMainEl]}生${ELEMENT_CN[cycle[(cycle.indexOf(monthMainEl) + 1) % 5] as Element]}，印透干生身，月令之克被化解`);
        } else {
            isMonthHostile = true;
        }
    }

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
    let verdict = zScore > 0 ? "身强" : "身弱";

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
        } else if (isZhuanWang) {
            calcPattern = zhuanWangName;
            patternCode = "Follow_Strong";
        } else if (forcedYongShen.some(s => s.includes("财星"))) {
            calcPattern = "真从格 (弃命相从)";
            patternCode = "Follow_Weak";
        }
    } else if (isZhuanWang) {
        calcPattern = zhuanWangName;
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

        // 3. 阳干比劫检测 (V32 Fix) - 增加根气检测
        let hasBijieInStems = false;
        let bijieHasRoot = false;  // 新增：比劫是否有根
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

        // 检测比劫是否有根气
        if (hasBijieInStems) {
            branches.forEach(b => {
                const roots = RAW_HIDDEN_STEMS[b] || {};
                Object.entries(roots).forEach(([hidden, weight]) => {
                    const hInfo = STEMS_INFO[hidden];
                    // 比劫五行在地支有藏干且权重>=9，视为有根
                    if (hInfo && hInfo.el === dmEl && weight >= 9) {
                        bijieHasRoot = true;
                    }
                });
            });
        }

        // 阳干透比劫且**有根**时，才不入从格
        if (hasBijieInStems && isYangStem && bijieHasRoot) {
            physicsLog.push(`🔥 天干透比劫[${bijieStems.join(', ')}]且有根：阳干有帮身，不入从格`);
        } else if (hasBijieInStems && isYangStem && !bijieHasRoot) {
            physicsLog.push(`💨 天干透比劫[${bijieStems.join(', ')}]但无根：比劫虚浮，可入从格`);
        }

        const effectiveHasDryEarth = hasDryEarth && !dryEarthWeakened;

        // === 判定条件 ===
        // 只有阳干透比劫且**有根**时，才不能断从格
        const canEnterCong = !hasStrongRoot && !effectiveHasDryEarth && !(hasBijieInStems && isYangStem && bijieHasRoot);

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

    // 8. 喜用神生成（精细筛选版）

    // -------------------------------------------------------------------------
    // 8.1 五行势力评估 (Element Power Evaluation)
    // -------------------------------------------------------------------------
    type PowerLevel = 'very_strong' | 'strong' | 'neutral' | 'weak' | 'very_weak';

    const evaluateElementPower = (targetEl: Element): PowerLevel => {
        let score = 0;

        // 月令得令检测
        const monthMainQiEl = getElement(ZANG_GAN_ORDER[monthBranch][0]);
        if (monthMainQiEl === targetEl) {
            score += 3; // 得令
        } else {
            // 检查月支中/余气
            const monthHidden = ZANG_GAN_ORDER[monthBranch] || [];
            for (let i = 1; i < monthHidden.length; i++) {
                if (getElement(monthHidden[i]) === targetEl) {
                    score += 1;
                    break;
                }
            }
        }

        // 地支根气检测
        for (const br of branches) {
            if (br === monthBranch) continue; // 已计算过
            const brHidden = RAW_HIDDEN_STEMS[br] || {};
            for (const [hidden, weight] of Object.entries(brHidden)) {
                if (getElement(hidden) === targetEl) {
                    if (weight >= 18) score += 2; // 本气强根
                    else if (weight >= 9) score += 1; // 中气
                    // 余气 < 9 不加分
                    break;
                }
            }
        }

        // 天干透出检测
        for (const s of stems) {
            if (getElement(s) === targetEl) {
                score += 1;
                break; // 只计一次
            }
        }

        // 根据总分确定等级
        if (score >= 6) return 'very_strong';
        if (score >= 4) return 'strong';
        if (score >= 2) return 'neutral';
        if (score >= 1) return 'weak';
        return 'very_weak';
    };

    // 评估所有五行的势力
    const elementPowers: Record<Element, PowerLevel> = {
        'Wood': evaluateElementPower('Wood'),
        'Fire': evaluateElementPower('Fire'),
        'Earth': evaluateElementPower('Earth'),
        'Metal': evaluateElementPower('Metal'),
        'Water': evaluateElementPower('Water')
    };

    // -------------------------------------------------------------------------
    // 8.2 用神打分筛选 (Yong Shen Scoring & Filtering)
    // -------------------------------------------------------------------------
    const sheng = (a: Element, b: Element): boolean => {
        const elCycle: Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
        return elCycle[(elCycle.indexOf(a) + 1) % 5] === b;
    };

    const ke = (a: Element, b: Element): boolean => {
        const elCycle: Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
        return elCycle[(elCycle.indexOf(a) + 2) % 5] === b;
    };

    const checkTongguan = (yongEl: Element, jiList: Element[]): number => {
        // 通关检测：若旺忌神克某五行，用神可以作为通关
        const elCycle: Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
        let bonus = 0;

        for (const ji of jiList) {
            const jiPower = elementPowers[ji];
            if (jiPower === 'very_strong' || jiPower === 'strong') {
                // 旺忌神克的目标
                const keTarget = elCycle[(elCycle.indexOf(ji) + 2) % 5];
                const keTargetPower = elementPowers[keTarget];

                // 如果被克目标较弱，存在交战
                if (keTargetPower === 'weak' || keTargetPower === 'very_weak' || keTargetPower === 'neutral') {
                    // 通关用神需满足：ji → 生 → yong → 生 → keTarget
                    const shengFromJi = elCycle[(elCycle.indexOf(ji) + 1) % 5];
                    const shengToTarget = elCycle[(elCycle.indexOf(keTarget) + 4) % 5];

                    if (yongEl === shengFromJi && yongEl === shengToTarget) {
                        bonus += 12; // 完美通关
                    }
                }
            }
        }
        return bonus;
    };

    const calculateYongShenScore = (yongEl: Element, jiList: Element[]): number => {
        let score = 5; // 基础分

        for (const ji of jiList) {
            const jiPower = elementPowers[ji];

            // 规则1-3: 用神克忌神
            if (ke(yongEl, ji)) {
                if (jiPower === 'very_strong' || jiPower === 'strong') {
                    score += 15; // 克旺忌神
                } else if (jiPower === 'neutral') {
                    score += 8;
                } else {
                    score += 3;
                }
            }

            // 规则4-6: 用神生忌神（助忌）
            if (sheng(yongEl, ji)) {
                if (jiPower === 'very_strong' || jiPower === 'strong') {
                    score -= 20; // 生旺忌神，严重扣分
                } else if (jiPower === 'neutral') {
                    score -= 10;
                } else {
                    score -= 3; // 生弱忌神，轻微扣分
                }
            }

            // 规则7-8: 用神被忌神克（受损）
            // 日主五行（Self/比劫）不参与生克运算
            // 因为日主是分析主体，"日主克用神"不应作为扣分依据
            if (ke(ji, yongEl)) {
                const isSelfElement = ji === relations['Self'];

                if (isSelfElement) {
                    // 日主五行不参与生克，跳过扣分
                } else {
                    if (jiPower === 'very_strong' || jiPower === 'strong') {
                        score -= 15;
                    } else if (jiPower === 'neutral') {
                        score -= 8;
                    }
                }
            }
        }

        // 规则9: 通关加分
        score += checkTongguan(yongEl, jiList);

        return score;
    };

    const filterYongShen = (initialYong: Element[], jiList: Element[]): Element[] => {
        const scored: Array<{ el: Element; score: number }> = [];

        for (const yong of initialYong) {
            const s = calculateYongShenScore(yong, jiList);
            scored.push({ el: yong, score: s });
        }

        // 按分数排序，剔除负分或零分
        scored.sort((a, b) => b.score - a.score);
        return scored.filter(s => s.score > 0).map(s => s.el);
    };

    // -------------------------------------------------------------------------
    // 8.3 生成初步喜忌神并筛选
    // -------------------------------------------------------------------------
    let yongShen: Element[] = [];
    let jiShen: Element[] = [];

    if (forcedYongShen.length > 0) {
        // 特殊格局有强制用神
        yongShen = forcedYongShen.map(s => {
            const el = s.split('(')[0];
            return (ELEMENT_CN[el] ? el : s) as Element;
        }).filter(el => ['Wood', 'Fire', 'Earth', 'Metal', 'Water'].includes(el)) as Element[];

        if (patternCode === 'Transform') {
            jiShen = transformJiShen;
        } else if (patternCode === 'Follow_Weak') {
            jiShen = [relations['Resource'], relations['Self']];
        } else if (patternCode === 'Follow_Strong') {
            jiShen = [relations['Wealth'], relations['Official']];
        }
    } else {
        // 普通格局根据身强/身弱确定初步喜忌
        let initialYong: Element[] = [];
        let initialJi: Element[] = [];

        if (patternCode === 'Follow_Weak') {
            initialYong = [relations['Wealth'], relations['Official']];
            initialJi = [relations['Resource'], relations['Self'], relations['Output']];
            if (calcPattern.includes('从儿')) {
                initialYong = [relations['Output'], relations['Wealth']];
                initialJi = [relations['Resource'], relations['Official']];
            }
        } else if (patternCode === 'Fake_Follow') {
            initialYong = [relations['Output'], relations['Wealth'], relations['Official']];
            initialJi = [relations['Resource'], relations['Self']];
        } else if (patternCode === 'Follow_Strong') {
            initialYong = [relations['Resource'], relations['Self'], relations['Output']];
            initialJi = [relations['Wealth'], relations['Official']];
        } else if (patternCode === 'Normal') {
            if (verdict === '身弱') {
                initialYong = [relations['Resource'], relations['Self']];
                initialJi = [relations['Official'], relations['Wealth'], relations['Output']];
            } else {
                initialYong = [relations['Official'], relations['Wealth'], relations['Output']];
                initialJi = [relations['Resource'], relations['Self']];
            }
        }

        jiShen = initialJi;
        // 精细筛选用神
        yongShen = filterYongShen(initialYong, jiShen);

        // 如果所有用神都被筛除，保留分数最高的一个（至少需要一个用神）
        if (yongShen.length === 0 && initialYong.length > 0) {
            const scored = initialYong.map(y => ({ el: y, score: calculateYongShenScore(y, jiShen) }));
            scored.sort((a, b) => b.score - a.score);
            yongShen = [scored[0].el];
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

    // 生成 bodyStrength 字段（身体强弱描述）
    let bodyStrength = verdict; // 默认使用 verdict（身强/身弱）

    // 从格类型判断函数（直接使用 stemGods 和 counts）
    const determineCongType = (): string => {
        // 统计天干十神
        const stemGodCounts = { 'Wealth': 0, 'Official': 0, 'Output': 0 };
        stemGods.forEach(g => {
            if (g === 'Wealth') stemGodCounts['Wealth']++;
            else if (g === 'Official') stemGodCounts['Official']++;
            else if (g === 'Output') stemGodCounts['Output']++;
        });

        // 从杀 > 从财 > 从儿
        if (stemGodCounts['Official'] > 0 && counts[relations['Official']] >= 2) {
            return '从官';
        } else if (stemGodCounts['Wealth'] > 0 && counts[relations['Wealth']] >= 2) {
            return '从财';
        } else if (stemGodCounts['Output'] > 0 && counts[relations['Output']] >= 2) {
            return '从儿';
        }
        return '从格';  // 默认
    };

    if (patternCode === 'Follow_Weak') {
        // 从格细分：直接判断
        bodyStrength = determineCongType();
    } else if (patternCode === 'Fake_Follow') {
        // 假从格细分
        const congType = determineCongType();
        bodyStrength = congType === '从格' ? '假从格' : '假' + congType;
    } else if (patternCode === 'Follow_Strong') {
        // 专旺格细分 (只有 calcPattern 明确指定了专旺类型才显示，否则只显示身强)
        if (calcPattern.includes('稼穑')) {
            bodyStrength = '专旺(稼穑)';
        } else if (calcPattern.includes('曲直')) {
            bodyStrength = '专旺(曲直)';
        } else if (calcPattern.includes('炎上')) {
            bodyStrength = '专旺(炎上)';
        } else if (calcPattern.includes('从革')) {
            bodyStrength = '专旺(从革)';
        } else if (calcPattern.includes('润下')) {
            bodyStrength = '专旺(润下)';
        } else {
            // 普通身强/极旺 (破格后的状态)
            bodyStrength = '身强';
        }
    } else if (patternCode === 'Transform') {
        bodyStrength = '化格';
    }

    return {
        bazi: baziStr,
        formalPattern,
        bodyStrength,
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
