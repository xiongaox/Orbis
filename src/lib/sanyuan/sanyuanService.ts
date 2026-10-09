import {
    DIRECTIONS,
    HUMAN_STAR_RELATIONS,
    NINE_STAR_NAMES,
    PALACE_LABELS,
    PALACE_ORDER,
    STAR_PAIR_INSIGHTS,
} from './constants';
import type {
    FlightDirection,
    Mountain,
    PalaceName,
    PalaceVerificationLevel,
    SanYuanChartPatternId,
    SanYuanChartSummary,
    SanYuanPalaceAnalysis,
    SanYuanChart,
    SanYuanHeader,
    SanYuanInput,
    SanYuanStarPairInsight,
    SanYuanTalentInsight,
    YuanPhase,
} from './types';

type Board = Record<PalaceName, number>;
type YuanLong = 'tian' | 'di' | 'ren';

const TRIGRAM_OF_MOUNTAIN: Record<Mountain, PalaceName> = {
    壬: 'Kan', 子: 'Kan', 癸: 'Kan',
    丑: 'Gen', 艮: 'Gen', 寅: 'Gen',
    甲: 'Zhen', 卯: 'Zhen', 乙: 'Zhen',
    辰: 'Xun', 巽: 'Xun', 巳: 'Xun',
    丙: 'Li', 午: 'Li', 丁: 'Li',
    未: 'Kun', 坤: 'Kun', 申: 'Kun',
    庚: 'Dui', 酉: 'Dui', 辛: 'Dui',
    戌: 'Qian', 乾: 'Qian', 亥: 'Qian',
};

const BIG_XUAN_KONG_START: Record<Mountain, number> = {
    癸: 1, 甲: 1, 申: 1,
    坤: 2, 壬: 2, 乙: 2,
    卯: 3, 未: 3, 子: 3,
    巳: 4, 乾: 4, 戌: 4,
    亥: 6, 巽: 6, 辰: 6,
    辛: 7, 丙: 7, 艮: 7,
    寅: 8, 庚: 8, 丁: 8,
    午: 9, 酉: 9, 丑: 9,
};

const TI_GUA_REPLACE: Record<Mountain, number> = {
    子: 1, 癸: 1, 甲: 1, 申: 1,
    坤: 2, 壬: 2, 乙: 2, 卯: 2, 未: 2,
    戌: 6, 乾: 6, 亥: 6, 辰: 6, 巽: 6, 巳: 6,
    艮: 7, 丙: 7, 辛: 7, 酉: 7, 丑: 7,
    寅: 9, 午: 9, 庚: 9, 丁: 9,
};

const YUAN_LONG: Record<Mountain, YuanLong> = {
    乾: 'tian', 坤: 'tian', 艮: 'tian', 巽: 'tian',
    子: 'tian', 午: 'tian', 卯: 'tian', 酉: 'tian',
    甲: 'di', 庚: 'di', 丙: 'di', 壬: 'di',
    辰: 'di', 戌: 'di', 丑: 'di', 未: 'di',
    寅: 'ren', 申: 'ren', 巳: 'ren', 亥: 'ren',
    乙: 'ren', 辛: 'ren', 丁: 'ren', 癸: 'ren',
};

const YANG_MOUNTAINS = new Set<Mountain>(['乾', '坤', '艮', '巽', '甲', '庚', '丙', '壬', '寅', '申', '巳', '亥']);

const TRIGRAM_MOUNTAINS: Record<PalaceName, readonly [Mountain, Mountain, Mountain]> = {
    Kan: ['子', '壬', '癸'],
    Gen: ['艮', '丑', '寅'],
    Zhen: ['卯', '甲', '乙'],
    Xun: ['巽', '辰', '巳'],
    Li: ['午', '丙', '丁'],
    Kun: ['坤', '未', '申'],
    Dui: ['酉', '庚', '辛'],
    Qian: ['乾', '戌', '亥'],
};

const STAR_TO_TRIGRAM: Record<number, PalaceName> = {
    1: 'Kan', 2: 'Kun', 3: 'Zhen', 4: 'Xun',
    6: 'Qian', 7: 'Dui', 8: 'Gen', 9: 'Li',
};

const NA_JIA_TRIGRAM: Record<Mountain, PalaceName> = {
    乾: 'Qian', 甲: 'Qian',
    坤: 'Kun', 乙: 'Kun',
    艮: 'Gen', 丙: 'Gen',
    巽: 'Xun', 辛: 'Xun',
    癸: 'Kan', 申: 'Kan', 子: 'Kan', 辰: 'Kan',
    壬: 'Li', 寅: 'Li', 午: 'Li', 戌: 'Li',
    庚: 'Zhen', 亥: 'Zhen', 卯: 'Zhen', 未: 'Zhen',
    丁: 'Dui', 巳: 'Dui', 酉: 'Dui', 丑: 'Dui',
};

const FLIPPED_TRIGRAM: Record<PalaceName, PalaceName> = {
    Li: 'Zhen', Zhen: 'Li',
    Qian: 'Dui', Dui: 'Qian',
    Gen: 'Kun', Kun: 'Gen',
    Kan: 'Xun', Xun: 'Kan',
};

const EARTH_SEQUENCE = [1, 2, 3, 4, 5, 6, 7, 8];
const WATER_SEQUENCE = [8, 6, 7, 5, 1, 2, 3, 4];
const HEAVEN_SEQUENCE = [8, 7, 2, 3, 4, 6, 5, 1];

const PALACE_COORDS: Record<PalaceName, { col: number; row: number }> = {
    Li: { col: 0, row: 0 }, Xun: { col: 1, row: 0 }, Kun: { col: 2, row: 0 }, Dui: { col: 3, row: 0 },
    Qian: { col: 0, row: 1 }, Gen: { col: 1, row: 1 }, Kan: { col: 2, row: 1 }, Zhen: { col: 3, row: 1 },
};

const COLUMN_PALACES: Record<number, { top: PalaceName; bottom: PalaceName }> = {
    0: { top: 'Li', bottom: 'Qian' },
    1: { top: 'Xun', bottom: 'Gen' },
    2: { top: 'Kun', bottom: 'Kan' },
    3: { top: 'Dui', bottom: 'Zhen' },
};

export function wrap9(value: number): number {
    return ((value - 1) % 9 + 9) % 9 + 1;
}

export function getYuanPhaseDefault(yun: number): YuanPhase {
    return yun <= 4 ? 'upper' : 'lower';
}

export function isYuanPhaseChoiceRequired(yun: number): boolean {
    return yun === 5;
}

export function isBigXuanKongZeroGod(star: number, yuanPhase: YuanPhase): boolean {
    return yuanPhase === 'upper'
        ? [6, 7, 8, 9].includes(star)
        : [1, 2, 3, 4].includes(star);
}

export function isFourAuspiciousStar(star: number): boolean {
    return [1, 2, 6, 8].includes(star);
}

export function toChineseNumeral(value: number): string {
    return ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'][value] ?? '';
}

export function getNineStarName(value: number) {
    return NINE_STAR_NAMES[value];
}

export function getHumanStarRelation(value: number) {
    return HUMAN_STAR_RELATIONS[value];
}

function createTalentInsight(
    title: string,
    alias: string,
    value: number,
    guidance: string,
    relation?: SanYuanTalentInsight['relation'],
): SanYuanTalentInsight {
    const starName = getNineStarName(value);
    if (!starName) {
        throw new Error(`三才星数必须是 1 到 8，当前为：${value}`);
    }

    return {
        title,
        alias,
        value,
        starName,
        relation,
        isFourAuspicious: isFourAuspiciousStar(value),
        guidance,
    };
}

function getVerificationLevel(
    humanChildIsAuspicious: boolean,
    mountainAtCurrentYun: boolean,
    facingAtCurrentYun: boolean,
): PalaceVerificationLevel {
    if (humanChildIsAuspicious && (mountainAtCurrentYun || facingAtCurrentYun)) {
        return 'priority';
    }

    return humanChildIsAuspicious ? 'verify' : 'caution';
}

export function analyzeSanYuanPalace(chart: SanYuanChart, palaceName: PalaceName): SanYuanPalaceAnalysis {
    const palace = chart.palaces[palaceName];
    const mountainAtCurrentYun = palace.mountainStar === chart.header.yun;
    const facingAtCurrentYun = palace.facingStar === chart.header.yun;
    const earthMother = createTalentInsight(
        '地母',
        '地母翻卦',
        palace.earthStar,
        '作为方位根本参考，需先与该方位的实际峦头合看。',
    );
    const heavenFather = createTalentInsight(
        '天父',
        '辅星水法',
        palace.waterStar,
        '涉及水、鱼缸、水景或进出水时重点核验，并结合向星。',
    );
    const humanChild = createTalentInsight(
        '人子',
        '天星阳宅',
        palace.heavenStar,
        '涉及人长期坐卧、活动与门位使用时重点核验。',
        getHumanStarRelation(palace.heavenStar),
    );
    const fourAuspiciousCount = [earthMother, heavenFather, humanChild]
        .filter((talent) => talent.isFourAuspicious)
        .length;
    const level = getVerificationLevel(humanChild.isFourAuspicious, mountainAtCurrentYun, facingAtCurrentYun);
    const currentYunSignals = [
        mountainAtCurrentYun ? '山星到山' : null,
        facingAtCurrentYun ? '向星到向' : null,
    ].filter((signal): signal is string => signal !== null);

    const verification = level === 'priority'
        ? {
            level,
            title: '优先核验',
            summary: `人子为${humanChild.starName}${humanChild.relation}，且${currentYunSignals.join('、')}，可优先结合现场用途核验。`,
        }
        : level === 'verify'
            ? {
                level,
                title: '结合峦头核验',
                summary: `人子为${humanChild.starName}${humanChild.relation}，可作为长期活动方位的候选，仍须以峦头与气口为准。`,
            }
            : {
                level,
                title: '谨慎核验',
                summary: `人子为${humanChild.starName}${humanChild.relation}，不宜仅凭盘面优先安排长期活动，需先核验峦头、用途与气口。`,
            };

    return {
        palace: palaceName,
        palaceLabel: palace.label,
        bigXuanKong: {
            value: palace.bigXuanKong,
            role: isBigXuanKongZeroGod(palace.bigXuanKong, chart.input.yuanPhase) ? '零神' : '正神',
        },
        timing: {
            mountainStar: palace.mountainStar,
            facingStar: palace.facingStar,
            mountainAtCurrentYun,
            facingAtCurrentYun,
        },
        talents: {
            earthMother,
            heavenFather,
            humanChild,
            fourAuspiciousCount,
        },
        verification: {
            ...verification,
            actionTips: [
                `${palace.label}宫有水、鱼缸或水景时，优先参看天父${heavenFather.value}${heavenFather.starName}并结合向星${palace.facingStar}。`,
                humanChild.isFourAuspicious
                    ? `${palace.label}宫可作为人长期坐卧、活动或门位使用的核验候选，重点参看人子${humanChild.value}${humanChild.starName}${humanChild.relation}。`
                    : `${palace.label}宫如作为人长期坐卧、活动或门位使用，应先核验人子${humanChild.value}${humanChild.starName}${humanChild.relation}与实际用途是否相合。`,
                currentYunSignals.length > 0
                    ? `当前${chart.header.yun}运见${currentYunSignals.join('、')}，时运层面可一并核验。`
                    : `当前${chart.header.yun}运未见山星或向星直接到位，时运层面不单独作催发判断。`,
            ],
            checklist: [
                '先看该宫对应方位的外部与内部峦头，再看理气。',
                '确认该宫是否为门、床、灶、长期坐卧或主要活动位置。',
                '有水体或水景时，单独核验天父与向星。',
            ],
        },
    };
}

function toFlightDirection(step: 1 | -1): FlightDirection {
    return step === 1 ? '顺飞' : '逆飞';
}

function flyFromCenter(start: number, step: 1 | -1): Board {
    let current = start;
    return PALACE_ORDER.reduce((board, palace) => {
        current = wrap9(current + step);
        board[palace] = current;
        return board;
    }, {} as Board);
}

function getDragonStep(mountain: Mountain): 1 | -1 {
    return YANG_MOUNTAINS.has(mountain) ? 1 : -1;
}

function getSameYuanLongMountain(trigram: PalaceName, yuanLong: YuanLong): Mountain {
    const mountains = TRIGRAM_MOUNTAINS[trigram];
    return mountains[yuanLong === 'tian' ? 0 : yuanLong === 'di' ? 1 : 2];
}

function getFlightStep(star: number, mountain: Mountain): 1 | -1 {
    if (star === 5) {
        return getDragonStep(mountain);
    }

    const trigram = STAR_TO_TRIGRAM[star];
    const matchingMountain = getSameYuanLongMountain(trigram, YUAN_LONG[mountain]);
    return getDragonStep(matchingMountain);
}

function getAdjustedStart(yunBoard: Board, mountain: Mountain, isTiGua: boolean): number {
    const rawStart = yunBoard[TRIGRAM_OF_MOUNTAIN[mountain]];
    if (!isTiGua) {
        return rawStart;
    }

    if (rawStart === 5) {
        return TI_GUA_REPLACE[mountain];
    }

    const sameYuanMountain = getSameYuanLongMountain(STAR_TO_TRIGRAM[rawStart], YUAN_LONG[mountain]);
    return TI_GUA_REPLACE[sameYuanMountain];
}

function computeBigXuanKong(mountain: Mountain, yuanPhase: YuanPhase): { board: Board; start: number; step: 1 | -1 } {
    const start = BIG_XUAN_KONG_START[mountain];
    const zeroStars = yuanPhase === 'upper' ? new Set([6, 7, 8, 9]) : new Set([1, 2, 3, 4]);
    const step: 1 | -1 = zeroStars.has(start) ? -1 : 1;
    return { board: flyFromCenter(start, step), start, step };
}

function computeYunBoard(yun: number): Board {
    return flyFromCenter(yun, 1);
}

function getFlightPath(startPalace: PalaceName): PalaceName[] {
    const { col: startCol, row: startRow } = PALACE_COORDS[startPalace];
    const columnOrder = startCol === 0
        ? [0, 1, 2, 3]
        : startCol === 3
            ? [3, 2, 1, 0]
            : startCol === 1
                ? [1, 0, 3, 2]
                : [2, 3, 0, 1];
    const rowOrder = startRow === 0 ? ['top', 'bottom'] as const : ['bottom', 'top'] as const;

    return columnOrder.flatMap((column) => rowOrder.map((row) => COLUMN_PALACES[column][row]));
}

function fillSequence(sequence: number[], path: PalaceName[]): Board {
    return path.reduce((board, palace, index) => {
        board[palace] = sequence[index];
        return board;
    }, {} as Board);
}

function getDirectionLabel(mountain: Mountain, facing: Mountain): string {
    return DIRECTIONS.find((direction) => direction.mountain === mountain && direction.facing === facing)?.label
        ?? `${mountain}山${facing}向`;
}

export function calculateSanYuanChart(input: SanYuanInput): SanYuanChart {    if (!Number.isInteger(input.yun) || input.yun < 1 || input.yun > 9) {
        throw new Error('元运必须是 1 到 9 之间的整数。');
    }

    const isTiGua = input.panType === 'ti';
    const yunBoard = computeYunBoard(input.yun);
    const bigXuanKong = computeBigXuanKong(input.mountain, input.yuanPhase);
    const mountainStart = getAdjustedStart(yunBoard, input.mountain, isTiGua);
    const facingStart = getAdjustedStart(yunBoard, input.facing, isTiGua);
    const mountainStep = getFlightStep(mountainStart, input.mountain);
    const facingStep = getFlightStep(facingStart, input.facing);
    const mountainBoard = flyFromCenter(mountainStart, mountainStep);
    const facingBoard = flyFromCenter(facingStart, facingStep);
    const mountainNaJia = NA_JIA_TRIGRAM[input.mountain];
    const facingNaJia = NA_JIA_TRIGRAM[input.facing];
    const earthBoard = fillSequence(EARTH_SEQUENCE, getFlightPath(FLIPPED_TRIGRAM[mountainNaJia]));
    const waterBoard = fillSequence(WATER_SEQUENCE, getFlightPath(facingNaJia));
    const heavenBoard = fillSequence(HEAVEN_SEQUENCE, getFlightPath(mountainNaJia));

    const header: SanYuanHeader = {
        directionLabel: getDirectionLabel(input.mountain, input.facing),
        yun: input.yun,
        panType: input.panType,
        panTypeLabel: isTiGua ? '替卦' : '下卦',
        yuanPhase: input.yuanPhase,
        yuanPhaseLabel: input.yuanPhase === 'upper' ? '上元' : '下元',
        mountainStart,
        facingStart,
        bigXuanKongStart: bigXuanKong.start,
        bigXuanKongFlight: toFlightDirection(bigXuanKong.step),
        mountainFlight: toFlightDirection(mountainStep),
        facingFlight: toFlightDirection(facingStep),
        mountainUsesReplacement: isTiGua && mountainStart !== yunBoard[TRIGRAM_OF_MOUNTAIN[input.mountain]],
        facingUsesReplacement: isTiGua && facingStart !== yunBoard[TRIGRAM_OF_MOUNTAIN[input.facing]],
        mountainNaJia,
        mountainFlippedNaJia: FLIPPED_TRIGRAM[mountainNaJia],
        facingNaJia,
    };

    const palaces = PALACE_ORDER.reduce((result, name) => {
        result[name] = {
            name,
            label: PALACE_LABELS[name],
            bigXuanKong: bigXuanKong.board[name],
            yunStar: yunBoard[name],
            mountainStar: mountainBoard[name],
            facingStar: facingBoard[name],
            earthStar: earthBoard[name],
            waterStar: waterBoard[name],
            heavenStar: heavenBoard[name],
        };
        return result;
    }, {} as SanYuanChart['palaces']);

    return { input, header, palaces };
}

/** 八宫对宫（合十/反吟逐宫校验用） */
const OPPOSITE_PALACE: Record<PalaceName, PalaceName> = {
    Qian: 'Li', Li: 'Qian',
    Kan: 'Kun', Kun: 'Kan',
    Zhen: 'Dui', Dui: 'Zhen',
    Gen: 'Xun', Xun: 'Gen',
};

/** 四大局断语（形峦前提 + 吉凶取向，随格局固定） */
const CHART_PATTERN_VERDICTS: Record<SanYuanChartPatternId, { title: string; verdict: string }> = {
    'wang-shan-wang-xiang': {
        title: '旺山旺向',
        verdict: '当运山星到坐、向星到向，为理气最吉之局；坐后宜有实（楼/高地）、向首宜开阔或见水，形理相配方主丁财两旺。',
    },
    'shang-shan-xia-shui': {
        title: '上山下水',
        verdict: '当运山星到向、向星到坐，理气颠倒；须坐空朝满（坐后低洼见水、向前有实）方可取用，形理不合则损丁破财。',
    },
    'shuang-xing-hui-zuo': {
        title: '双星会坐',
        verdict: '山向二星同到坐山，旺丁不旺财；坐后宜有靠勿空，可于向首布置动水以催财。',
    },
    'shuang-xing-hui-xiang': {
        title: '双星会向',
        verdict: '山向二星同到向首，旺财不旺丁；向首宜见水、水外有山为佳，现代城市向首开阔即算得用。',
    },
};

/**
 * 盘级格局总览：四大局、伏吟/反吟、合十、当运旺星落宫、大玄空零神方、五黄落宫。
 * 全部为确定性数学判定；伏吟/反吟/合十按整盘（八宫全部满足）判定，
 * 局部同象在条目 basis 中列出具体宫位。
 */
export function summarizeSanYuanChart(chart: SanYuanChart): SanYuanChartSummary {
    const { header, palaces, input } = chart;
    const yun = header.yun;

    const sittingPalace = TRIGRAM_OF_MOUNTAIN[input.mountain];
    const facingPalace = TRIGRAM_OF_MOUNTAIN[input.facing];
    const sitting = palaces[sittingPalace];
    const facing = palaces[facingPalace];

    // ---- 四大局：以坐山/向首两宫的山向星分布判定（五黄寄宫不影响：山星入中时看坐山是否得向星） ----
    const mountainAtSitting = sitting.mountainStar === yun;
    const facingAtSitting = sitting.facingStar === yun;
    const mountainAtFacing = facing.mountainStar === yun;
    const facingAtFacing = facing.facingStar === yun;

    let pattern: SanYuanChartSummary['pattern'] = null;
    const basisOf = (starLabel: string, palaceLabel: string) =>
        `${starLabel}${toChineseNumeral(yun)}到${palaceLabel}宫`;

    if (mountainAtSitting && facingAtFacing) {
        pattern = {
            id: 'wang-shan-wang-xiang',
            ...CHART_PATTERN_VERDICTS['wang-shan-wang-xiang'],
            basis: `${basisOf('山星', sitting.label)}、${basisOf('向星', facing.label)}`,
        };
    } else if (mountainAtFacing && facingAtSitting) {
        pattern = {
            id: 'shang-shan-xia-shui',
            ...CHART_PATTERN_VERDICTS['shang-shan-xia-shui'],
            basis: `${basisOf('山星', facing.label)}、${basisOf('向星', sitting.label)}`,
        };
    } else if (mountainAtSitting && facingAtSitting) {
        pattern = {
            id: 'shuang-xing-hui-zuo',
            ...CHART_PATTERN_VERDICTS['shuang-xing-hui-zuo'],
            basis: `山星、向星${toChineseNumeral(yun)}同到${sitting.label}宫`,
        };
    } else if (mountainAtFacing && facingAtFacing) {
        pattern = {
            id: 'shuang-xing-hui-xiang',
            ...CHART_PATTERN_VERDICTS['shuang-xing-hui-xiang'],
            basis: `山星、向星${toChineseNumeral(yun)}同到${facing.label}宫`,
        };
    }

    // ---- 伏吟/反吟/合十：整盘判定，同时记录满足的宫位 ----
    const yuanBoard = computeYunBoard(yun); // 运盘即元旦盘（五入中顺飞所得）
    const panList: { pan: '山盘' | '向盘'; board: Board }[] = [
        { pan: '山盘', board: Object.fromEntries(PALACE_ORDER.map((name) => [name, palaces[name].mountainStar])) as Board },
        { pan: '向盘', board: Object.fromEntries(PALACE_ORDER.map((name) => [name, palaces[name].facingStar])) as Board },
    ];

    const fuYinHits: { pan: '山盘' | '向盘'; palace: PalaceName }[] = [];
    const fanYinHits: { pan: '山盘' | '向盘'; palace: PalaceName }[] = [];
    const heShiHits: { pan: '山盘' | '向盘' }[] = [];

    for (const { pan, board } of panList) {
        const fuPalaces = PALACE_ORDER.filter((name) => board[name] === yuanBoard[name]);
        const fanPalaces = PALACE_ORDER.filter((name) => board[name] === yuanBoard[OPPOSITE_PALACE[name]]);
        const shiPalaces = PALACE_ORDER.filter((name) => wrap9(board[name] + yun) === 10);

        if (fuPalaces.length === PALACE_ORDER.length) {
            fuYinHits.push({ pan, palace: sittingPalace });
        } else if (fuPalaces.length > 0) {
            // 局部伏吟：记录宫位供参考，不作为整盘伏吟结论
            fuPalaces.forEach((palace) => fuYinHits.push({ pan, palace }));
        }
        if (fanPalaces.length === PALACE_ORDER.length) {
            fanYinHits.push({ pan, palace: sittingPalace });
        }
        if (shiPalaces.length === PALACE_ORDER.length) {
            heShiHits.push({ pan });
        }
    }

    // ---- 当运旺星落宫（山星/向星 = 运数；中五无宫不计） ----
    const wangStars: SanYuanChartSummary['wangStars'] = [];
    for (const kind of ['山星', '向星'] as const) {
        const hitPalaces = PALACE_ORDER
            .filter((name) => (kind === '山星' ? palaces[name].mountainStar : palaces[name].facingStar) === yun)
            .map((name) => ({ name, label: palaces[name].label }));
        wangStars.push({ kind, palaces: hitPalaces });
    }

    // ---- 大玄空零神方（当元零神数所在宫） ----
    const zeroGodPalaces = PALACE_ORDER
        .filter((name) => isBigXuanKongZeroGod(palaces[name].bigXuanKong, input.yuanPhase))
        .map((name) => ({ name, label: palaces[name].label, value: palaces[name].bigXuanKong }));

    // ---- 五黄落宫（山星/向星 = 5；寄宫不计） ----
    const wuHuang: SanYuanChartSummary['wuHuang'] = [];
    for (const kind of ['山星', '向星'] as const) {
        const hit = PALACE_ORDER.find((name) => (kind === '山星' ? palaces[name].mountainStar : palaces[name].facingStar) === 5);
        if (hit) {
            wuHuang.push({ kind, palace: { name: hit, label: palaces[hit].label } });
        }
    }

    return {
        pattern,
        fuYin: fuYinHits.length > 0 ? fuYinHits : null,
        fanYin: fanYinHits.length > 0 ? fanYinHits : null,
        heShi: heShiHits.length > 0 ? heShiHits : null,
        wangStars,
        zeroGodPalaces,
        wuHuang,
    };
}

/** 取某宫山星×向星组合断语（未收录组合返回 null 字段） */
export function getSanYuanStarPairInsight(chart: SanYuanChart, palaceName: PalaceName): SanYuanStarPairInsight {
    const palace = chart.palaces[palaceName];
    const hit = STAR_PAIR_INSIGHTS.find(
        (item) => item.mountainStar === palace.mountainStar && item.facingStar === palace.facingStar,
    );
    return {
        mountainStar: palace.mountainStar,
        facingStar: palace.facingStar,
        name: hit?.name ?? null,
        meaning: hit?.meaning ?? null,
    };
}
