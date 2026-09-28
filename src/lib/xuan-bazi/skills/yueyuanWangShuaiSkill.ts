/**
 * yueyuanWangShuaiSkill - 领域技能层
 *
 * 模块定位：
 * - 所在层级：领域计算与 AI Skill 层
 * - 结合项目：/Users/xiongaox/Downloads/00code/yueyuan-bazi (跃渊 · 专业八字分析系统 v1.8)
 * - 主要目标：提取跃渊子平命理体系的断旺衰条件变量框架，提供本地确定性指标粗筛与 AI 深度推导 Prompt
 *
 * 关键职责：
 * - 确定性计算：得令、得地、得生、得助四要素矩阵与地支合克损益核算
 * - 能量天平：生扶方 vs 克泄耗方真实权重比率（能量对比条）
 * - 裁判词生成：将得失博弈与最终旺衰定调合一，杜绝自相矛盾
 * - 构造符合跃渊规范的学术推导 Prompt
 */

import type { BaziApiResponse, PillarData } from '../../../types/bazi';

export interface RootDetail {
  pillar: string; // 年支/月支/日支/时支
  zhi: string; // 亥
  gan: string; // 壬
  shiShen: string; // 比肩
  type: '本气根' | '中气根' | '余气根';
  power: number; // 相对权重
  damageNote?: string; // 损益说明，如 "寅亥合木化泄" 或 "燥土脆金"
  isDamaged?: boolean;
}

export interface WangShuaiDashboardData {
  // 1. 核心定调
  dayMaster: string; // 壬水
  dayMasterWx: string; // 水
  yueZhi: string; // 亥
  yueZhiWx: string; // 水
  diShi: string; // 临官
  pattern: string; // 建禄格
  finalVerdict: string; // 身弱
  verdictDetail: string; // 偏于「身弱财旺」· 单禄不任重财
  verdictLevel: '身强' | '偏强' | '中和偏强' | '中和偏弱' | '中和' | '偏弱' | '身弱' | '从格' | '专旺';

  // 2. 能量天平 (生扶党 vs 克泄耗党)
  energyBalance: {
    shengPercent: number; // 例如 34
    kePercent: number; // 例如 66
    shengScore: number;
    keScore: number;
    shengTags: string[];
    keTags: string[];
  };

  // 3. 子平四要素矩阵
  fourPillars: {
    deLing: {
      passed: boolean;
      tag: string; // 得令 / 失令
      desc: string;
      level: '旺' | '相' | '休' | '囚' | '死';
    };
    deDi: {
      passed: boolean;
      tag: string; // 得地 (1个本气根) / 无根 / 微根
      roots: RootDetail[];
      desc: string;
    };
    deSheng: {
      passed: boolean;
      tag: string; // 得生 (有印) / 无印生扶
      desc: string;
    };
    deZhu: {
      passed: boolean;
      tag: string; // 得助受羁 / 得助有援 / 不得助
      desc: string;
    };
  };

  // 4. 特殊克泄耗格局（三合/三会/克泄结党）
  heavyPatterns: string[];
  clashCombinations: string[];

  // 5. 裁判词与定调总结
  refereeSummary: string;

  // 6. 用神指引
  godsGuide: {
    fuyongXi: string[];
    fuyongJi: string[];
    tiaohouAdvice: string;
    tiaohouGods?: string[];
  };

  // 7. 喜用神与方位（直接适配外层面板渲染）
  joyGods: string[];
  jiGods: string[];
  luckyDirections: string[];

  // 8. 跃渊子平底层推演日志（逐步离散推演明细）
  physicsLog: string[];
}

export interface YueyuanWangShuaiResult {
  bodyStrength: string;
  formalPattern: string;
  joyGods: string[];
  luckyDirections: string[];
  physicsLog: string[];
  dashboardData: WangShuaiDashboardData;
}

export interface WangShuaiIndicators {
  riGan: string;
  riGanWx: string;
  yueZhi: string;
  yueZhiWx: string;
  deLing: boolean;
  deDi: boolean;
  deSheng: boolean;
  deZhu: boolean;
  diShi: string;
  preliminaryStrength: '身强' | '身弱' | '中和' | '中和偏弱' | '中和偏强';
  rootsSummary: string[];
  specialStructures: string[];
}

const GAN_WUXING: Record<string, string> = {
 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const ZHI_WUXING: Record<string, string> = {
 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

const SHENG_MAP: Record<string, string> = {
 木: '水', 火: '木', 土: '火', 金: '土', 水: '金',
};

const KE_MAP: Record<string, string> = {
 木: '金', 火: '水', 土: '木', 金: '火', 水: '土',
};

const WO_SHENG_MAP: Record<string, string> = {
 木: '火', 火: '土', 土: '金', 金: '水', 水: '木',
};

const WO_KE_MAP: Record<string, string> = {
 木: '土', 火: '金', 土: '水', 金: '木', 水: '火',
};

/**
 * 根据日主天干与旺衰定调计算五行喜用神与忌神
 */
export function getGodsByVerdict(riGan: string, verdict: string): { joyGods: string[]; jiGods: string[] } {
  const wx = GAN_WUXING[riGan] || '金';
  const shengWo = SHENG_MAP[wx] || '土'; // 印星
  const keWo = KE_MAP[wx] || '火'; // 官杀
  const woSheng = WO_SHENG_MAP[wx] || '水'; // 食伤
  const woKe = WO_KE_MAP[wx] || '木'; // 财星

  if (verdict.includes('弱')) {
    return {
      joyGods: [shengWo, wx],
      jiGods: [woKe, keWo],
    };
  } else if (verdict.includes('从')) {
    return {
      joyGods: [woKe, keWo, woSheng],
      jiGods: [shengWo, wx],
    };
  } else if (verdict.includes('专')) {
    return {
      joyGods: [wx, shengWo, woSheng],
      jiGods: [keWo, woKe],
    };
  } else {
    // 偏强 / 身强
    return {
      joyGods: [woKe, keWo, woSheng],
      jiGods: [shengWo, wx],
    };
  }
}

const YIN_SHISHEN = ['正印', '偏印', '印', '枭'];
const BIJIE_SHISHEN = ['比肩', '劫财', '比', '劫'];

// 天干五合映射
const TIAN_GAN_HE: Record<string, { partner: string; transform: string; name: string }> = {
 甲: { partner: '己', transform: '土', name: '甲己合土' },
 己: { partner: '甲', transform: '土', name: '甲己合土' },
 乙: { partner: '庚', transform: '金', name: '乙庚合金' },
 庚: { partner: '乙', transform: '金', name: '乙庚合金' },
 丙: { partner: '辛', transform: '水', name: '丙辛合水' },
 辛: { partner: '丙', transform: '水', name: '丙辛合水' },
 丁: { partner: '壬', transform: '木', name: '丁壬合木' },
 壬: { partner: '丁', transform: '木', name: '丁壬合木' },
 戊: { partner: '癸', transform: '火', name: '戊癸合火' },
 癸: { partner: '戊', transform: '火', name: '戊癸合火' },
};

// 五行对应吉利方位
const DIRECTION_MAP: Record<string, string> = {
 木: '东方',
 火: '南方',
 土: '西南、东北',
 金: '西方',
 水: '北方',
};

// 天干阴阳与五行
const STEM_INFO: Record<string, { el: string; pol: '+' | '-' }> = {
 甲: { el: '木', pol: '+' }, 乙: { el: '木', pol: '-' },
 丙: { el: '火', pol: '+' }, 丁: { el: '火', pol: '-' },
 戊: { el: '土', pol: '+' }, 己: { el: '土', pol: '-' },
 庚: { el: '金', pol: '+' }, 辛: { el: '金', pol: '-' },
 壬: { el: '水', pol: '+' }, 癸: { el: '水', pol: '-' },
};

// 地支默认藏干表（本气在前）
const DI_ZHI_CANG_GAN_MAP: Record<string, string[]> = {
 子: ['癸'],
 丑: ['己', '癸', '辛'],
 寅: ['甲', '丙', '戊'],
 卯: ['乙'],
 辰: ['戊', '乙', '癸'],
 巳: ['丙', '戊', '庚'],
 午: ['丁', '己'],
 未: ['己', '丁', '乙'],
 申: ['庚', '壬', '戊'],
 酉: ['辛'],
 戌: ['戊', '辛', '丁'],
 亥: ['壬', '甲'],
};

/**
 * 计算十神
 */
export function getTenGod(targetStem: string, dmStem: string): string {
  const dm = STEM_INFO[dmStem];
  const tg = STEM_INFO[targetStem];
  if (!dm || !tg) return '比肩';
  const WU_XING_ORDER = ['木', '火', '土', '金', '水'];
  const dmIdx = WU_XING_ORDER.indexOf(dm.el);
  const tgIdx = WU_XING_ORDER.indexOf(tg.el);
  const diff = (tgIdx - dmIdx + 5) % 5;
  const samePol = dm.pol === tg.pol;
  if (diff === 0) return samePol ? '比肩' : '劫财';
  if (diff === 1) return samePol ? '食神' : '伤官';
  if (diff === 2) return samePol ? '偏财' : '正财';
  if (diff === 3) return samePol ? '七杀' : '正官';
  if (diff === 4) return samePol ? '偏印' : '正印';
  return '比肩';
}

function toStandardPatternName(shiShen: string): string {
  if (!shiShen) return '正官格';
  if (shiShen.includes('正官')) return '正官格';
  if (shiShen.includes('七杀') || shiShen.includes('偏官') || shiShen.includes('杀')) return '七杀格';
  if (shiShen.includes('正财')) return '正财格';
  if (shiShen.includes('偏财')) return '偏财格';
  if (shiShen.includes('食神')) return '食神格';
  if (shiShen.includes('伤官')) return '伤官格';
  if (shiShen.includes('正印')) return '正印格';
  if (shiShen.includes('偏印') || shiShen.includes('枭')) return '偏印格';
  if (shiShen.includes('比肩')) return '建禄格';
  if (shiShen.includes('劫财')) return '月劫格';
  return `${shiShen}格`;
}

/**
 * 《子平真诠》月令定格算法
 * 规则：
 * 1. 临官当令 -> 建禄格
 * 2. 阳干（甲丙戊庚壬）帝旺当令 -> 羊刃格；阴干逢帝旺以生旺月劫论，不称羊刃格。
 * 3. 检查月令地支藏干（本气、中气、余气）及其对应十神：
 *    - 检查年月时天干（排除日主）是否透出月支藏干。
 *    - 若透出，以透出者定格（本气透干 > 中气透干 > 余气透干）。
 *    - 若月支藏干皆未透干，取月令本气十神定格。
 */
export function determineFormalPattern(baziData: BaziApiResponse): { pattern: string; reason: string } {
  const pillars = baziData.pillars || [];
  const monthP = pillars[1] || ({} as PillarData);
  const dayP = pillars[2] || ({} as PillarData);

  const riGan = dayP.tiangan || '甲';
  const yueZhi = monthP.dizhi || '子';
  const diShi = monthP.diShi || '';

  // 1. 建禄格判断 (月支为日主临官禄位)
  const LU_MAP: Record<string, string> = {
 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳',
 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
  };
  if (LU_MAP[riGan] === yueZhi || diShi === '临官') {
    return {
      pattern: '建禄格',
      reason: `月令${yueZhi}为日主${riGan}临官真禄，成建禄真格`,
    };
  }

  // 2. 羊刃格判断 (仅阳干逢帝旺称羊刃，阴干帝旺以生旺月劫论)
  const YANG_GANS = new Set(['甲', '丙', '戊', '庚', '壬']);
  const REN_MAP: Record<string, string> = {
 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子',
  };
  if (YANG_GANS.has(riGan) && (REN_MAP[riGan] === yueZhi || diShi === '帝旺')) {
    return {
      pattern: '羊刃格',
      reason: `月令${yueZhi}为阳干${riGan}帝旺阳刃当权，成羊刃格`,
    };
  }

  // 3. 提取月令藏干 (优先用已有藏干，否则用标准藏干表)
  const zangganRaw = (Array.isArray(monthP.zanggan) && monthP.zanggan.length > 0)
    ? monthP.zanggan.map((zg) => ({ gan: zg.gan, shiShen: zg.shiShen || getTenGod(zg.gan, riGan) }))
    : (DI_ZHI_CANG_GAN_MAP[yueZhi] || []).map((g) => ({ gan: g, shiShen: getTenGod(g, riGan) }));

  // 收集天干透出（年干、月干、时干，排除日主自身）
  const tianGans = [
    { label: '年干', gan: pillars[0]?.tiangan },
    { label: '月干', gan: pillars[1]?.tiangan },
    { label: '时干', gan: pillars[3]?.tiangan },
  ].filter((item): item is { label: string; gan: string } => Boolean(item.gan));

  // 优先看透干定格（本气透干 > 中气透干 > 余气透干）
  for (let i = 0; i < zangganRaw.length; i++) {
    const zg = zangganRaw[i];
    const matched = tianGans.find((tg) => tg.gan === zg.gan);
    if (matched) {
      const ss = zg.shiShen || getTenGod(zg.gan, riGan);
      const patternName = toStandardPatternName(ss);
      const depth = i === 0 ? '本气' : i === 1 ? '中气' : '余气';
      return {
        pattern: patternName,
        reason: `月令${yueZhi}藏干${depth}${zg.gan}(${ss})透于${matched.label}，依《子平真诠》透干定格为【${patternName}】`,
      };
    }
  }

  // 4. 若藏干皆未透出天干，取月令本气定格
  if (zangganRaw.length > 0) {
    const mainZg = zangganRaw[0];
    const ss = mainZg.shiShen || getTenGod(mainZg.gan, riGan);
    const patternName = toStandardPatternName(ss);
    return {
      pattern: patternName,
      reason: `月令藏干皆未透干，取提纲${yueZhi}本气${mainZg.gan}(${ss})立格为【${patternName}】`,
    };
  }

  return {
    pattern: `${yueZhi}月格`,
    reason: `以月令${yueZhi}立格`,
  };
}

/**
 * 《穷通宝鉴》调候用神决策表（十天干 × 十二月）
 */
export const TIAO_HOU: Record<string, Record<string, string[]>> = {
 甲: {
 寅: ['丙', '癸'],
 卯: ['庚', '丙', '丁'],
 辰: ['庚', '丁', '壬'],
 巳: ['癸', '丁', '庚'],
 午: ['癸', '丁'],
 未: ['癸', '庚', '丁'],
 申: ['庚', '丁', '壬'],
 酉: ['丁', '丙', '庚'],
 戌: ['甲', '庚'],
 亥: ['庚', '丁', '丙', '戊'],
 子: ['丁', '庚', '丙'],
 丑: ['丁', '庚', '丙'],
  },
 乙: {
 寅: ['丙', '癸'],
 卯: ['丙', '癸'],
 辰: ['癸', '丙', '戊'],
 巳: ['癸'],
 午: ['癸', '丙'],
 未: ['癸', '丙'],
 申: ['丙', '癸', '己'],
 酉: ['癸', '丙', '丁'],
 戌: ['癸', '辛'],
 亥: ['丙', '戊'],
 子: ['丙'],
 丑: ['丙'],
  },
 丙: {
 寅: ['壬', '庚'],
 卯: ['壬', '己', '戊'],
 辰: ['壬', '甲'],
 巳: ['壬', '庚', '癸'],
 午: ['壬', '庚'],
 未: ['壬', '庚'],
 申: ['壬', '戊'],
 酉: ['壬', '癸'],
 戌: ['甲', '壬'],
 亥: ['甲', '戊', '庚', '壬'],
 子: ['壬', '戊', '己'],
 丑: ['壬', '甲'],
  },
 丁: {
 寅: ['甲', '庚'],
 卯: ['庚', '甲'],
 辰: ['甲', '庚', '戊'],
 巳: ['甲', '庚'],
 午: ['壬', '癸'],
 未: ['甲', '壬', '庚'],
 申: ['甲', '庚', '丙', '戊'],
 酉: ['甲', '庚', '丙', '戊'],
 戌: ['甲', '庚', '戊'],
 亥: ['甲', '庚'],
 子: ['甲', '庚'],
 丑: ['甲', '庚'],
  },
 戊: {
 寅: ['丙', '甲', '癸'],
 卯: ['丙', '甲', '癸'],
 辰: ['甲', '丙', '癸'],
 巳: ['甲', '丙', '癸'],
 午: ['壬', '甲', '丙'],
 未: ['癸', '丙', '甲'],
 申: ['丙', '癸', '甲'],
 酉: ['丙', '癸'],
 戌: ['甲', '丙', '癸'],
 亥: ['甲', '丙'],
 子: ['丙', '甲'],
 丑: ['丙', '甲'],
  },
 己: {
 寅: ['丙', '庚', '甲'],
 卯: ['甲', '癸', '丙'],
 辰: ['丙', '癸', '甲'],
 巳: ['癸', '丙'],
 午: ['癸', '丙'],
 未: ['癸', '丙'],
 申: ['丙', '癸'],
 酉: ['癸', '丙'],
 戌: ['甲', '丙', '癸'],
 亥: ['丙', '甲', '戊'],
 子: ['丙', '甲', '戊'],
 丑: ['丙', '甲', '戊'],
  },
 庚: {
 寅: ['丙', '甲'],
 卯: ['丁', '甲'],
 辰: ['丁', '甲', '壬'],
 巳: ['壬', '丙', '戊'],
 午: ['壬', '癸'],
 未: ['丁', '甲'],
 申: ['丁', '甲'],
 酉: ['丁', '甲', '丙'],
 戌: ['甲', '壬'],
 亥: ['丁', '丙'],
 子: ['丁', '丙'],
 丑: ['丙', '丁', '甲'],
  },
 辛: {
 寅: ['壬', '己', '庚'],
 卯: ['壬', '己'],
 辰: ['壬', '甲'],
 巳: ['壬', '癸', '甲'],
 午: ['壬', '己', '癸'],
 未: ['壬', '庚', '甲'],
 申: ['壬', '甲', '戊'],
 酉: ['壬', '甲'],
 戌: ['壬', '甲'],
 亥: ['丙', '壬'],
 子: ['丙'],
 丑: ['丙', '壬'],
  },
 壬: {
 寅: ['庚', '丙', '戊'],
 卯: ['戊', '辛', '庚'],
 辰: ['甲', '庚'],
 巳: ['庚', '辛', '壬'],
 午: ['癸', '庚', '辛'],
 未: ['辛', '甲'],
 申: ['戊', '丁'],
 酉: ['甲', '庚'],
 戌: ['甲', '丙'],
 亥: ['戊', '丙', '庚'],
 子: ['戊', '丙'],
 丑: ['丙', '丁', '甲'],
  },
 癸: {
 寅: ['辛', '丙'],
 卯: ['庚', '辛'],
 辰: ['丙', '辛', '甲'],
 巳: ['辛'],
 午: ['庚', '辛', '壬'],
 未: ['庚', '辛', '壬'],
 申: ['丁'],
 酉: ['辛', '丙'],
 戌: ['辛', '甲', '壬'],
 亥: ['庚', '辛', '戊', '丁'],
 子: ['丙', '辛'],
 丑: ['丙', '丁'],
  },
};

export function getTiaoHouYongShen(riGan: string, yueZhi: string): string[] {
  return TIAO_HOU[riGan]?.[yueZhi] || [];
}

/**
 * 确定性指标分析（兼容旧版接口）
 */
export function calculateWangShuaiIndicators(baziData: BaziApiResponse): WangShuaiIndicators {
  const dashboard = calculateWangShuaiDashboard(baziData);
  return {
    riGan: dashboard.dayMaster,
    riGanWx: dashboard.dayMasterWx,
    yueZhi: dashboard.yueZhi,
    yueZhiWx: dashboard.yueZhiWx,
    deLing: dashboard.fourPillars.deLing.passed,
    deDi: dashboard.fourPillars.deDi.passed,
    deSheng: dashboard.fourPillars.deSheng.passed,
    deZhu: dashboard.fourPillars.deZhu.passed,
    diShi: dashboard.diShi,
    preliminaryStrength: dashboard.verdictLevel.includes('强') ? '身强' : dashboard.verdictLevel.includes('弱') ? '身弱' : '中和',
    rootsSummary: dashboard.fourPillars.deDi.roots.map(r => `${r.pillar}${r.zhi}藏${r.gan}(${r.shiShen}, ${r.type})${r.damageNote ? ` [${r.damageNote}]` : ''}`),
    specialStructures: dashboard.heavyPatterns.concat(dashboard.clashCombinations),
  };
}

/**
 * 核心：计算子平四要素矩阵、能量天平与全局裁决看板数据
 */
export function calculateWangShuaiDashboard(
  baziData: BaziApiResponse,
  externalVerdict?: { bodyStrength?: string; formalPattern?: string }
): WangShuaiDashboardData {
  const pillars = baziData.pillars || [];
  const yearP = pillars[0] || ({} as PillarData);
  const monthP = pillars[1] || ({} as PillarData);
  const dayP = pillars[2] || ({} as PillarData);
  const hourP = pillars[3] || ({} as PillarData);

  const riGan = dayP.tiangan || '甲';
  const riGanWx = GAN_WUXING[riGan] || '木';
  const yueZhi = monthP.dizhi || '子';
  const yueZhiWx = ZHI_WUXING[yueZhi] || '水';
  const diShi = dayP.diShi || monthP.diShi || '冠带';

  // 1. 得令判断与旺相休囚死
  const shengWo = SHENG_MAP[riGanWx];
  const keWo = KE_MAP[riGanWx];
  const woSheng = WO_SHENG_MAP[riGanWx];
  const woKe = WO_KE_MAP[riGanWx];

  let lingLevel: '旺' | '相' | '休' | '囚' | '死' = '休';
  let deLing = false;
  if (yueZhiWx === riGanWx) {
    lingLevel = '旺';
    deLing = true;
  } else if (yueZhiWx === shengWo) {
    lingLevel = '相';
    deLing = true;
  } else if (yueZhiWx === woSheng) {
    lingLevel = '休';
  } else if (yueZhiWx === woKe) {
    lingLevel = '囚';
  } else if (yueZhiWx === keWo) {
    lingLevel = '死';
  }

  // 2. 地支合化冲刑与特殊结构通用检测
  const allZhis = pillars.map((p) => p.dizhi).filter(Boolean);
  const zhiSet = new Set(allZhis);
  const heavyPatterns: string[] = [];
  const clashCombinations: string[] = [];

  // 三会方局
  if (zhiSet.has('巳') && zhiSet.has('午') && zhiSet.has('未')) heavyPatterns.push('地支巳午未三会火局');
  if (zhiSet.has('亥') && zhiSet.has('子') && zhiSet.has('丑')) heavyPatterns.push('地支亥子丑三会水局');
  if (zhiSet.has('寅') && zhiSet.has('卯') && zhiSet.has('辰')) heavyPatterns.push('地支寅卯辰三会木局');
  if (zhiSet.has('申') && zhiSet.has('酉') && zhiSet.has('戌')) heavyPatterns.push('地支申酉戌三会金局');

  // 三合局
  if (zhiSet.has('寅') && zhiSet.has('午') && zhiSet.has('戌')) heavyPatterns.push('地支寅午戌三合火局');
  if (zhiSet.has('申') && zhiSet.has('子') && zhiSet.has('辰')) heavyPatterns.push('地支申子辰三合水局');
  if (zhiSet.has('亥') && zhiSet.has('卯') && zhiSet.has('未')) heavyPatterns.push('地支亥卯未三合木局');
  if (zhiSet.has('巳') && zhiSet.has('酉') && zhiSet.has('丑')) heavyPatterns.push('地支巳酉丑三合金局');

  // 半合局
  if (heavyPatterns.length === 0) {
    if (zhiSet.has('寅') && zhiSet.has('午')) heavyPatterns.push('地支寅午半合火局');
    if (zhiSet.has('午') && zhiSet.has('戌')) heavyPatterns.push('地支午戌半合火局');
    if (zhiSet.has('申') && zhiSet.has('子')) heavyPatterns.push('地支申子半合水局');
    if (zhiSet.has('子') && zhiSet.has('辰')) heavyPatterns.push('地支子辰半合水局');
    if (zhiSet.has('亥') && zhiSet.has('卯')) heavyPatterns.push('地支亥卯半合木局');
    if (zhiSet.has('卯') && zhiSet.has('未')) heavyPatterns.push('地支卯未半合木局');
    if (zhiSet.has('巳') && zhiSet.has('酉')) heavyPatterns.push('地支巳酉半合金局');
    if (zhiSet.has('酉') && zhiSet.has('丑')) heavyPatterns.push('地支酉丑半合金局');
  }

  // 六合与六冲
  if (zhiSet.has('寅') && zhiSet.has('亥')) clashCombinations.push('寅亥六合木(暗损合泄水气)');
  if (zhiSet.has('卯') && zhiSet.has('戌')) clashCombinations.push('卯戌六合火');
  if (zhiSet.has('辰') && zhiSet.has('酉')) clashCombinations.push('辰酉六合金');
  if (zhiSet.has('巳') && zhiSet.has('申')) clashCombinations.push('巳申六合水');
  if (zhiSet.has('午') && zhiSet.has('未')) clashCombinations.push('午未六合');
  if (zhiSet.has('子') && zhiSet.has('丑')) clashCombinations.push('子丑六合土');

  if (zhiSet.has('子') && zhiSet.has('午')) clashCombinations.push('子午相冲');
  if (zhiSet.has('丑') && zhiSet.has('未')) clashCombinations.push('丑未相冲');
  if (zhiSet.has('寅') && zhiSet.has('申')) clashCombinations.push('寅申相冲');
  if (zhiSet.has('卯') && zhiSet.has('酉')) clashCombinations.push('卯酉相冲');
  if (zhiSet.has('辰') && zhiSet.has('戌')) clashCombinations.push('辰戌相冲');
  if (zhiSet.has('巳') && zhiSet.has('亥')) clashCombinations.push('巳亥相冲');

  // 3. 天干合绊分析
  const stemBindings: Array<{ pair: string; desc: string }> = [];
  // 年干与月干
  if (yearP.tiangan && monthP.tiangan) {
    const info = TIAN_GAN_HE[yearP.tiangan];
    if (info && info.partner === monthP.tiangan) {
      stemBindings.push({ pair: `${yearP.tiangan}${monthP.tiangan}`, desc: `${info.name}(年月相合羁绊)` });
    }
  }
  // 月干与日干
  if (monthP.tiangan && dayP.tiangan) {
    const info = TIAN_GAN_HE[monthP.tiangan];
    if (info && info.partner === dayP.tiangan) {
      stemBindings.push({ pair: `${monthP.tiangan}${dayP.tiangan}`, desc: `${info.name}(月日合身)` });
    }
  }
  // 日干与时干
  if (dayP.tiangan && hourP.tiangan) {
    const info = TIAN_GAN_HE[dayP.tiangan];
    if (info && info.partner === hourP.tiangan) {
      stemBindings.push({ pair: `${dayP.tiangan}${hourP.tiangan}`, desc: `${info.name}(日时合化)` });
    }
  }

  // 4. 提取通根明细 (得地)
  const pillarLabels = ['年支', '月支', '日支', '时支'];
  const roots: RootDetail[] = [];

  pillars.forEach((p, idx) => {
    const pLabel = pillarLabels[idx] || '地支';
    if (!Array.isArray(p.zanggan)) return;

    p.zanggan.forEach((zg) => {
      if (BIJIE_SHISHEN.some((bj) => zg.shiShen?.includes(bj))) {
        const isMain = zg.gan === p.dizhi || (zg.element && zg.element === riGanWx && p.zanggan.indexOf(zg) === 0);
        const type: '本气根' | '中气根' | '余气根' = isMain ? '本气根' : (p.zanggan.indexOf(zg) === 1 ? '中气根' : '余气根');
        let power = isMain ? (idx === 1 ? 30 : idx === 2 ? 18 : 12) : 6;
        let damageNote = '';
        let isDamaged = false;

        // 检测冲克合泄
        if (p.dizhi === '亥' && zhiSet.has('寅')) {
          damageNote = '逢寅亥合木化泄';
          isDamaged = true;
          power = Math.round(power * 0.7);
        } else if (p.dizhi === '子' && zhiSet.has('午')) {
          damageNote = '逢子午冲损';
          isDamaged = true;
          power = Math.round(power * 0.5);
        } else if (p.dizhi === '巳' && zhiSet.has('亥')) {
          damageNote = '逢巳亥冲损';
          isDamaged = true;
          power = Math.round(power * 0.5);
        } else if (p.dizhi === '卯' && zhiSet.has('酉')) {
          damageNote = '逢卯酉冲损';
          isDamaged = true;
          power = Math.round(power * 0.5);
        }

        roots.push({
          pillar: pLabel,
          zhi: p.dizhi,
          gan: zg.gan,
          shiShen: zg.shiShen || '比劫',
          type,
          power,
          damageNote,
          isDamaged,
        });
      }
    });
  });

  const deDi = roots.length > 0;

  // 5. 提取印星 (得生) 与 比劫 (得助)
  const validYinStems: string[] = [];
  const validYinZhis: string[] = [];
  const validBijieStems: string[] = [];

  pillars.forEach((p, idx) => {
    // 天干
    if (idx !== 2 && p.tiangan && p.tianganShiShen) {
      if (YIN_SHISHEN.some((y) => p.tianganShiShen.includes(y))) {
        validYinStems.push(`${pillarLabels[idx]}${p.tiangan}(${p.tianganShiShen})`);
      }
      if (BIJIE_SHISHEN.some((b) => p.tianganShiShen.includes(b))) {
        let note = '';
        // 检查合绊
        const bound = stemBindings.find((b) => b.pair.includes(p.tiangan));
        if (bound) {
          note = `·受合羁绊`;
        }
        validBijieStems.push(`${pillarLabels[idx]}${p.tiangan}(${p.tianganShiShen}${note})`);
      }
    }
    // 地支藏印（排除燥土脆金）
    if (Array.isArray(p.zanggan)) {
      p.zanggan.forEach((zg) => {
        if (YIN_SHISHEN.some((y) => zg.shiShen?.includes(y))) {
          const isDryEarth = (p.dizhi === '戌' || p.dizhi === '未') && riGanWx === '水';
          if (!isDryEarth) {
            validYinZhis.push(`${p.dizhi}藏${zg.gan}(${zg.shiShen})`);
          }
        }
      });
    }
  });

  const deSheng = validYinStems.length > 0 || validYinZhis.length > 0;
  const deZhu = validBijieStems.length > 0 || roots.length > 0;

  // 6. 能量天平动态计分（加权能量量化）
  let shengScore = 0;
  let keScore = 0;
  const shengTags: string[] = [];
  const keTags: string[] = [];

  // 月令提纲权衡
  if (deLing) {
    shengScore += 35;
    shengTags.push(`提纲${yueZhi}月令真神生旺(+35)`);
  } else {
    keScore += 35;
    keTags.push(`提纲${yueZhi}月令真神克泄(+35)`);
  }

  // 通根力量
  roots.forEach((r) => {
    shengScore += r.power;
    shengTags.push(`${r.pillar}${r.zhi}藏${r.gan}通根(+${r.power}${r.damageNote ? `，${r.damageNote}` : ''})`);
  });

  // 天干生扶
  validYinStems.forEach((ys) => {
    shengScore += 12;
    shengTags.push(`${ys}生身(+12)`);
  });

  validBijieStems.forEach((bs) => {
    const isBound = bs.includes('合羁绊');
    const score = isBound ? 6 : 12;
    shengScore += score;
    shengTags.push(`${bs}助身(+${score})`);
  });

  // 天干克泄耗
  const tianGanList = [
    { p: yearP, label: '年干', base: 8 },
    { p: monthP, label: '月干', base: 12 },
    { p: hourP, label: '时干', base: 12 },
  ];

  tianGanList.forEach(({ p, label, base }) => {
    if (p.tiangan && p.tianganShiShen) {
      const isHelp = YIN_SHISHEN.some((y) => p.tianganShiShen.includes(y)) || BIJIE_SHISHEN.some((b) => p.tianganShiShen.includes(b));
      if (!isHelp) {
        keScore += base;
        keTags.push(`${label}${p.tiangan}·${p.tianganShiShen}(+${base})`);
      }
    }
  });

  // 地支克泄耗（年支、日支、时支若非生扶，均构成真实克泄耗阻力）
  const zhiList = [
    { p: yearP, label: '年支', base: 10 },
    { p: dayP, label: '日支', base: 16 },
    { p: hourP, label: '时支', base: 14 },
  ];

  zhiList.forEach(({ p, label, base }) => {
    if (p.dizhi) {
      const isRoot = roots.some((r) => r.pillar.includes(label.slice(0, 1)));
      const isYinZhi = validYinZhis.some((y) => y.startsWith(p.dizhi));
      if (!isRoot && !isYinZhi) {
        keScore += base;
        keTags.push(`${label}${p.dizhi}克泄耗(+${base})`);
      }
    }
  });

  // 特殊三合/三会大局额外能量增幅
  heavyPatterns.forEach((hp) => {
    const isFireHe = hp.includes('火局');
    const isWaterHe = hp.includes('水局');
    const isWoodHe = hp.includes('木局');
    const isMetalHe = hp.includes('金局');
    const isEarthHe = hp.includes('土局');

    let isSupport = false;
    if (riGanWx === '火' && isFireHe) isSupport = true;
    if (riGanWx === '水' && isWaterHe) isSupport = true;
    if (riGanWx === '木' && isWoodHe) isSupport = true;
    if (riGanWx === '金' && isMetalHe) isSupport = true;
    if (riGanWx === '土' && isEarthHe) isSupport = true;

    // 印局也算生扶
    if (shengWo === '火' && isFireHe) isSupport = true;
    if (shengWo === '水' && isWaterHe) isSupport = true;
    if (shengWo === '木' && isWoodHe) isSupport = true;
    if (shengWo === '金' && isMetalHe) isSupport = true;
    if (shengWo === '土' && isEarthHe) isSupport = true;

    if (isSupport) {
      shengScore += 24;
      shengTags.push(`${hp}汇聚同党(+24)`);
    } else {
      keScore += 26;
      keTags.push(`${hp}极盛克泄耗(+26)`);
    }
  });

  // 能量百分比
  const totalScore = Math.max(shengScore + keScore, 1);
  const shengPercent = Math.min(95, Math.max(5, Math.round((shengScore / totalScore) * 100)));
  const kePercent = 100 - shengPercent;

  // 7. 旺衰定调逻辑（解决单一“中和”无倾向的核心痛点）
  let verdictLevel: WangShuaiDashboardData['verdictLevel'] = '中和偏弱';
  let finalVerdict = '中和偏弱';
  let verdictDetail = '';

  // 结合外部传入的高阶判定优先保障体系协同
  const extBody = externalVerdict?.bodyStrength || '';

  if (extBody.includes('身强') || extBody.includes('偏强') || extBody.includes('偏旺') || extBody.includes('旺')) {
    verdictLevel = shengPercent > 65 ? '身强' : '中和偏强';
    finalVerdict = extBody;
    verdictDetail = deLing ? '得令得地 · 印比两旺' : '虽失令但通根深厚 · 党羽众多';
  } else if (extBody.includes('从')) {
    verdictLevel = '从格';
    finalVerdict = extBody;
    verdictDetail = '日主极弱无依 · 顺应局势从化';
  } else if (extBody.includes('专旺')) {
    verdictLevel = '专旺';
    finalVerdict = '专旺';
    verdictDetail = '一气纯粹专旺';
  } else if (extBody.includes('身弱') || extBody.includes('偏弱')) {
    verdictLevel = shengPercent < 35 ? '身弱' : '中和偏弱';
    finalVerdict = extBody;
    verdictDetail = deLing
      ? '中和偏弱 · 偏于「身弱财旺」，单禄难任重财与群杀'
      : '失令少援 · 克泄耗过重';
  } else {
    // 算法自主根据天平与得令综合裁定（永远给出明确倾向，绝不单单出“中和”）
    if (shengPercent >= 60) {
      verdictLevel = '身强';
      finalVerdict = '身强';
      verdictDetail = `生扶党羽强劲（生扶${shengPercent}%），身强能任财官`;
    } else if (shengPercent > 50) {
      verdictLevel = '中和偏强';
      finalVerdict = '中和偏强';
      verdictDetail = `生扶略占优势（生扶${shengPercent}%），中和偏强，进退有据`;
    } else if (shengPercent === 50) {
      // 50% 对半开时以月令得失与通根裁决倾向
      if (deLing || roots.length >= 2) {
        verdictLevel = '中和偏强';
        finalVerdict = '中和偏强';
        verdictDetail = '生克力量均等，因得天时通根生扶，综合偏于中和偏强';
      } else {
        verdictLevel = '中和偏弱';
        finalVerdict = '中和偏弱';
        verdictDetail = '生克力量均等，因处失令休囚克泄之地，综合偏于中和偏弱';
      }
    } else if (shengPercent > 42) {
      verdictLevel = '中和偏弱';
      finalVerdict = '中和偏弱';
      verdictDetail = deLing
        ? `月令虽得生旺，但克泄党众（克泄${kePercent}%），定为中和偏弱`
        : `失令且克泄耗占${kePercent}%，生扶稍显吃力，定为中和偏弱`;
    } else {
      verdictLevel = '身弱';
      finalVerdict = '身弱';
      verdictDetail = deLing
        ? '偏于「身弱财旺」，单禄不任庞大克泄'
        : `身弱力薄，克泄耗达${kePercent}% · 需印比生扶`;
    }
  }

  // 8. 传统格局判定（《子平真诠》月令真神透藏定格）
  const formalPatternResult = determineFormalPattern(baziData);
  const pattern = externalVerdict?.formalPattern || formalPatternResult.pattern;
  const patternReason = formalPatternResult.reason;

  // 9. 构造四要素矩阵卡片描述
  const deLingDesc = deLing
    ? `${riGan}水生于${yueZhi}月，为${diShi === '临官' ? '临官建禄' : diShi}当令，提纲本气当权，占天时旺相。`
    : `${riGan}${riGanWx}生于${yueZhi}月，处于${lingLevel}地，不得月令天时。`;

  const rootSummaryStrs = roots.map(
    (r) => `${r.pillar}${r.zhi}藏${r.gan}(${r.type}${r.damageNote ? `·${r.damageNote}` : ''})`
  );
  const deDiDesc = roots.length > 0
    ? `四柱地支见${roots.length}处通根：${rootSummaryStrs.join('、')}。${
        roots.some((r) => r.isDamaged) ? '部分根气逢合泄冲损，折损生扶之力。' : '通根稳固。'
      }`
    : `地支无日主同气通根，虚浮无根。`;

  const deShengDesc = deSheng
    ? `原局印星：${validYinStems.concat(validYinZhis).join('、')}，可生身化阻。`
    : `原局天干无明透印星（${shengWo}星），缺少长流水源生身。`;

  const deZhuDesc = validBijieStems.length > 0
    ? `天干透出比劫帮身：${validBijieStems.join('、')}。${
        validBijieStems.some((s) => s.includes('合羁绊'))
          ? '但因天干合绊，帮身力量大打折扣。'
          : '帮身有力。'
      }`
    : `天干无比劫透出相助，日主孤力支应。`;

  // 10. 智能生成裁决词 (refereeSummary)
  const isWeakVerdict = verdictLevel === '身弱' || verdictLevel === '中和偏弱';
  const isStrongVerdict = verdictLevel === '身强' || verdictLevel === '中和偏强';

  let refereeSummary = '';
  if (isWeakVerdict) {
    const drainReason = heavyPatterns.length > 0 ? heavyPatterns.join('、') : '财官食伤势众';
    const boundNote = validBijieStems.some((s) => s.includes('合羁绊')) ? '天干比劫被合绊羁绊，' : '';
    refereeSummary = `原局${drainReason}，克泄耗力量高达 ${kePercent}%。${boundNote}日主通根受克泄大势牵制，${deLing ? '虽占天时真神生旺，但单禄难抗重财大势，' : '失令休囚且克泄占优，'}综合裁决为【${finalVerdict}】（${verdictDetail}）。`;
  } else if (isStrongVerdict) {
    refereeSummary = `日主在月令${deLing ? '得天时生旺' : '虽处休囚'}，四柱通根与印比党羽力量达 ${shengPercent}%，足以任重财抗官杀，综合定调为【${finalVerdict}】（${verdictDetail}）。`;
  } else {
    refereeSummary = `原局生扶党羽（${shengPercent}%）与克泄耗力量（${kePercent}%）基本势均力敌，日主进退有据，综合裁决为【${finalVerdict}】。`;
  }

  // 11. 喜用神指引与调候用神提取
  const tiaohouGods = getTiaoHouYongShen(riGan, yueZhi);
  let fuyongXi: string[] = [];
  let fuyongJi: string[] = [];
  let tiaohouAdvice = '';

  if (isWeakVerdict) {
    fuyongXi = [
      `${shengWo} (印星 · 生身化杀)`,
      `${riGanWx} (比劫 · 帮身担财)`,
    ];
    fuyongJi = [
      `${woKe} (财星 · 耗气伤身)`,
      `${keWo} (官杀 · 克身攻禄)`,
    ];
    tiaohouAdvice = `原局克泄过甚，首取${shengWo}印星生身兼制食伤，辅以${riGanWx}比劫助身，忌再行${woKe}财运耗气。`;
  } else if (verdictLevel === '从格') {
    fuyongXi = [
      `${woKe} (财星 · 顺局)`,
      `${keWo} (官杀 · 顺局)`,
      `${woSheng} (食伤 · 顺局)`,
    ];
    fuyongJi = [
      `${shengWo} (印星 · 逆局)`,
      `${riGanWx} (比劫 · 逆局)`,
    ];
    tiaohouAdvice = `局成从格，喜顺应旺神克泄，忌印比逆局破格。`;
  } else if (verdictLevel === '专旺') {
    fuyongXi = [
      `${riGanWx} (比劫 · 聚气)`,
      `${shengWo} (印星 · 涵养)`,
      `${woSheng} (食伤 · 泄秀)`,
    ];
    fuyongJi = [
      `${keWo} (官杀 · 犯旺逆局)`,
      `${woKe} (财星 · 耗损)`,
    ];
    tiaohouAdvice = `一气专旺，喜印比同党与食伤顺泄，严忌官杀犯旺破格。`;
  } else {
    fuyongXi = [
      `${woKe} (财星 · 展现身手)`,
      `${keWo} (官杀 · 雕琢贵气)`,
      `${woSheng} (食伤 · 秀气生财)`,
    ];
    fuyongJi = [
      `${shengWo} (印星 · 壅塞生滞)`,
      `${riGanWx} (比劫 · 争财夺禄)`,
    ];
    tiaohouAdvice = `身强有力，喜见财官食伤泄秀发越，不宜再见重印比助身。`;
  }

  // 12. 提取面板专用的五行喜用神 (joyGods) 与吉利方位 (luckyDirections)
  let joyGods: string[] = [];
  let jiGods: string[] = [];
  if (isWeakVerdict) {
    joyGods = [shengWo, riGanWx];
    jiGods = [woKe, keWo];
  } else if (verdictLevel === '从格') {
    joyGods = [woKe, keWo, woSheng];
    jiGods = [shengWo, riGanWx];
  } else if (verdictLevel === '专旺') {
    joyGods = [shengWo, riGanWx, woSheng];
    jiGods = [keWo, woKe];
  } else {
    joyGods = [woKe, keWo, woSheng];
    jiGods = [shengWo, riGanWx];
  }

  // 融合《穷通宝鉴》调候用神五行
  const tiaohouWuxings = tiaohouGods.map((g) => GAN_WUXING[g]).filter(Boolean);
  tiaohouWuxings.forEach((twx) => {
    if (!joyGods.includes(twx) && joyGods.length < 3) {
      joyGods.push(twx);
    }
  });

  joyGods = Array.from(new Set(joyGods));
  jiGods = Array.from(new Set(jiGods)).filter((g) => !joyGods.includes(g));

  const luckyDirections = Array.from(
    new Set(joyGods.map((el) => DIRECTION_MAP[el]).filter(Boolean))
  );

  // 13. 构造逐步离散推演日志 (physicsLog)
  // 序号由渲染层按数组下标输出，此处正文只保留【步骤标题】，避免序号双写。
  const physicsLog: string[] = [
    `【提纲月令】${riGan}${riGanWx}生于${yueZhi}月（${yueZhiWx}令 · ${lingLevel}地 · ${diShi}），日主${deLing ? '得月令真神生旺当权（得令）' : '失令休囚（失令）'}。`,
    `【地支通根】四柱地支检得 ${roots.length} 处同气通根：${roots.length > 0 ? roots.map((r) => `${r.pillar}${r.zhi}藏${r.gan}(${r.type}，气量${r.power}${r.damageNote ? `，${r.damageNote}` : ''})`).join('；') : '无同气通根，日主虚浮'}。`,
    `【干支生助】印星（生身）：${validYinStems.concat(validYinZhis).length > 0 ? validYinStems.concat(validYinZhis).join('、') : '无明透印星'}；比劫（帮身）：${validBijieStems.length > 0 ? validBijieStems.join('、') : '无比劫透出'}。`,
    `【天干羁绊】${stemBindings.length > 0 ? stemBindings.map((b) => b.desc).join('；') : '天干干气清纯，无合绊羁绊，生克权流通自在'}。`,
    `【局势大象】${heavyPatterns.length > 0 ? heavyPatterns.join('、') : '地支无三合三会大局'}；${clashCombinations.length > 0 ? clashCombinations.join('、') : '地支无严重刑冲'}。`,
    `【能量天平】生扶党（印比）${shengScore}分（${shengPercent}%） vs 克泄耗党（财官食伤）${keScore}分（${kePercent}%），综合判定：【${finalVerdict}】（${verdictDetail}）。`,
    `【月令定格】根据《子平真诠》月令真神透藏：${patternReason}，定格为【${pattern}】。`,
    `【调候金规】《穷通宝鉴》：${riGan}生于${yueZhi}月，以【${tiaohouGods.join('、')}】为核心调候用神。${tiaohouAdvice}`,
    `【裁判决断】${refereeSummary}`,
  ];

  return {
    dayMaster: riGan + riGanWx,
    dayMasterWx: riGanWx,
    yueZhi,
    yueZhiWx,
    diShi,
    pattern,
    finalVerdict,
    verdictDetail,
    verdictLevel,
    energyBalance: {
      shengPercent,
      kePercent,
      shengScore,
      keScore,
      shengTags,
      keTags,
    },
    fourPillars: {
      deLing: {
        passed: deLing,
        tag: deLing ? `得令 (${yueZhi}月${yueZhiWx}令)` : `失令 (${yueZhi}月${yueZhiWx}令)`,
        desc: deLingDesc,
        level: lingLevel,
      },
      deDi: {
        passed: deDi,
        tag: deDi ? `得地 (${roots.length}处通根)` : '无根 (虚浮)',
        roots,
        desc: deDiDesc,
      },
      deSheng: {
        passed: deSheng,
        tag: deSheng ? '得生 (有印星)' : '不得生 (无明印)',
        desc: deShengDesc,
      },
      deZhu: {
        passed: deZhu,
        tag: deZhu ? (validBijieStems.some((s) => s.includes('合羁绊')) ? '得助受羁' : '得助有援') : '不得助',
        desc: deZhuDesc,
      },
    },
    heavyPatterns,
    clashCombinations,
    refereeSummary,
    godsGuide: {
      fuyongXi,
      fuyongJi,
      tiaohouAdvice,
      tiaohouGods,
    },
    joyGods,
    jiGods,
    luckyDirections,
    physicsLog,
  };
}

/**
 * 跃渊子平旺衰与格局一站式计算（替代旧版 V35 calculateWangShuai）
 */
export function calculateYueyuanWangShuai(baziData: BaziApiResponse): YueyuanWangShuaiResult {
  const dashboard = calculateWangShuaiDashboard(baziData);
  return {
    bodyStrength: dashboard.finalVerdict,
    formalPattern: dashboard.pattern,
    joyGods: dashboard.joyGods,
    luckyDirections: dashboard.luckyDirections,
    physicsLog: dashboard.physicsLog,
    dashboardData: dashboard,
  };
}

/**
 * 构造注入跃渊断旺衰专业规范的 System Prompt
 */
export function getYueyuanSystemPrompt(): string {
  return `你是由正统子平命理学融合《渊海子平》《子平真诠》《滴天髓》《穷通宝鉴》构建的【跃渊 · 专业八字命理研究专家】。
你当前负责为命盘进行【断旺衰】专项深度推导分析。

【防幻觉与干支层级铁律（P0 优先级，所有大模型与轻量模型必须严格遵守）】
1. 天干与藏干层级分明，严禁混淆：
   - 只能以系统在 Prompt 中锁定的【真实天干 4 字】论天干透出与得势；
   - 地支藏干仅为地支内气/通根，【绝对不是天干透出】！严禁将藏干误判为天干透出（例如藏干有比肩/劫财，只能算地支通根，绝对不可在分析天干时算作“天干两水或三水并透”；藏干有七杀，绝对不可误称“年干透杀”）。
2. 地支四柱完整性，严禁漏看时支或捏造地支：
   - 地支严格由【年支、月支、日支、时支】四位构成，严禁遗漏时支，严禁擅自捏造多余地支；
   - 必须结合系统锁定的三合/三会/半合/六合/六冲客观格局进行推演，不可降格或视而不见。
3. 严格实事求是：
   - 推导必须完全基于锁定的四柱真实干支与十神，严禁在长推理中发生干支漂移或自行修改八字！

【输出语言铁律（P0 优先级，与干支铁律同级，必须严格遵守）】
1. 正式输出从第一个字到最后一个字必须全部使用简体中文，严禁出现英文句子、英文段落或英文推导过程（唯一例外：json:verdict 代码块内的字段名与 Markdown 语法符号）；
2. 严禁以 "Analyzing..."、"The chart..."、"Looking at..." 等任何英文起笔，输出的第一个可见字符必须是汉字；内部思考语种不限，但呈现给用户的正文一个英文词都不允许；
3. 定调结论、论据、标题与标签必须使用简体中文命理术语（身强、身弱、得令、通根、官印相生等），严禁使用 Body Strong / Officer Star / Resource 等英文译名。

【核心推导哲学与规则分层】
1. 条件变量框架：旺衰判断严禁机械打分（如“月令占50%”等伪量化），必须按条件变量综合论证：得令 → 得地（通根） → 得势（干透帮扶） → 印星闸门 → 制化自救与全局克泄权衡。
2. 提纲与克泄合局权衡原则（极关键）：
   - 当原局地支成三合/三会克泄之势（如寅午戌三合财局、巳午未火势、亥卯未伤官局），即使日主得令（如建禄），必须严格核算“单令真神是否足任庞大克泄局”；
   - 若原局无印星明透生发水源、地支唯一之禄又遭化泄或贴身克阻，不可机械断身强，而应按“单禄不胜重财/食伤，身弱财旺”定为中和偏弱。
3. 通根双维分离原则：
   - 气量深度：月令提纲秉令最重，坐支/时支次之，年支再次；
   - 贴身感应：日支（坐支）离日主最近感应最切，受邻支冲克合化者需论折损。
4. 印星成势裁决闸门（P0 级规则）：
   - 印星多透或成局时，过日主根气与财官克耗两道闸门，裁决是“印多为病喜财损印”，还是“身弱佩印化杀为用”。
5. 输出要求：
   - 给出清晰定调结论：「中和偏弱（身弱财旺）/ 偏强 / 中和」等精准倾向与程度；
   - 明确标出关键争议、一级用神与二级用神喜忌。
6. Markdown 排版规范：
   - 若输出表格，必须严格使用标准多行格式，每一行必须以独立的换行符分隔，严禁将多行表格数据挤在同一行；表格与前后文本之间必须保留空行；
   - 标题与正文段落之间保持独立换行。

请使用结构严谨、逻辑紧凑的标准 Markdown 格式输出。`;
}

/**
 * 构造用户提示词（传入命盘与指标数据）
 * 强制执行全八字通用的干支锚定与防实体混淆机制
 */
export function buildYueyuanUserPrompt(baziData: BaziApiResponse, indicators: WangShuaiIndicators): string {
  const { pillars, gender, solarDate, lunarDate } = baziData;

  const yearP = pillars?.[0] || ({} as PillarData);
  const monthP = pillars?.[1] || ({} as PillarData);
  const dayP = pillars?.[2] || ({} as PillarData);
  const hourP = pillars?.[3] || ({} as PillarData);

  const tianGans = [
    { label: '年干', gan: yearP.tiangan || '未知', shiShen: yearP.tianganShiShen || '未知' },
    { label: '月干', gan: monthP.tiangan || '未知', shiShen: monthP.tianganShiShen || '未知' },
    { label: '日干', gan: dayP.tiangan || indicators.riGan, shiShen: '日主' },
    { label: '时干', gan: hourP.tiangan || '未知', shiShen: hourP.tianganShiShen || '未知' },
  ];

  const helpGans = tianGans
    .filter((g, idx) => idx !== 2 && (
      BIJIE_SHISHEN.some((b) => g.shiShen.includes(b)) ||
      YIN_SHISHEN.some((y) => g.shiShen.includes(y))
    ))
    .map((g) => `${g.label}【${g.gan}·${g.shiShen}】`);

  const drainGans = tianGans
    .filter((g, idx) => idx !== 2 && !(
      BIJIE_SHISHEN.some((b) => g.shiShen.includes(b)) ||
      YIN_SHISHEN.some((y) => g.shiShen.includes(y))
    ))
    .map((g) => `${g.label}【${g.gan}·${g.shiShen}】`);

  const formatZg = (p: PillarData) => {
    return (p.zanggan || []).map((zg) => `${zg.gan}(${zg.shiShen})`).join('、') || '无';
  };

  const structureNote = indicators.specialStructures.length > 0
    ? indicators.specialStructures.map((s) => `  - ${s}`).join('\n')
    : '  - 无明显三合三会全局，按四柱邻支生克常态论';

  return `请根据跃渊八字研究体系，对以下命盘进行【旺衰判断】深度推导分析：

============================================================
【排盘真值绝对锁定区（系统法定锚定，所有分析必须严格以此为准）】
============================================================
一、真实天干透出（严格仅此 4 字，绝对无其他天干透出）：
1. 年干：【${yearP.tiangan}】（十神：${yearP.tianganShiShen || '未知'}）
2. 月干：【${monthP.tiangan}】（十神：${monthP.tianganShiShen || '未知'}）
3. 日干：【${dayP.tiangan}】（日主自身）
4. 时干：【${hourP.tiangan}】（十神：${hourP.tianganShiShen || '未知'}）
- 天干透出帮扶日主之字（比劫/印星）：${helpGans.length > 0 ? helpGans.join('，') : '无（原局天干全无印比透出帮扶）'}
- 天干透出克泄耗日主之字（食伤/财星/官杀）：${drainGans.length > 0 ? drainGans.join('，') : '无'}
【铁律】：严禁将地支藏干当作天干透出！天干帮扶仅以此处的字为准，切勿捏造“两透或三透”！

二、真实地支四位（严格仅此 4 支，必须完整核算，切勿遗漏时支）：
1. 年支：【${yearP.dizhi}】（星运：${yearP.diShi || '-'}）
2. 月支：【${monthP.dizhi}】（月令提纲真神）
3. 日支：【${dayP.dizhi}】（日主坐支/夫妻宫）
4. 时支：【${hourP.dizhi}】（时柱门户，切勿遗漏！）
- 四柱地支序列：[年支${yearP.dizhi}，月支${monthP.dizhi}，日支${dayP.dizhi}，时支${hourP.dizhi}]
- 地支客观合会冲刑结构：
${structureNote}

三、地支藏干归属（仅为通根与地支暗藏之气，绝非天干透出）：
- 年支【${yearP.dizhi}】藏干：${formatZg(yearP)}
- 月支【${monthP.dizhi}】藏干：${formatZg(monthP)}
- 日支【${dayP.dizhi}】藏干：${formatZg(dayP)}
- 时支【${hourP.dizhi}】藏干：${formatZg(hourP)}
============================================================

【命盘基础信息】
- 性别：${gender || '未知'}
- 阳历：${solarDate || '未知'}
- 农历：${lunarDate || '未知'}
- 日主：${indicators.riGan}（五行：${indicators.riGanWx}）
- 提纲：${indicators.yueZhi}月（月令令星：${indicators.yueZhiWx}）

【确定性前置指标核定】
- 得令：${indicators.deLing ? '得令（月令生扶或同气）' : '失令'}
- 得地：${indicators.deDi ? `得地（通根：${indicators.rootsSummary.join('；') || '有根'}）` : '不得地（无根）'}
- 得生：${indicators.deSheng ? '得生（有印星生扶）' : '不得生（无明印或印星无力）'}
- 得助：${indicators.deZhu ? '得助（天干透比劫帮扶或有同气）' : '不得助'}

请严格基于上方【排盘真值绝对锁定区】的客观事实进行独立推导（注意：秉持独立推导，若见官杀透干且紧邻强印，须审视是否存在“官印相生、化杀为印”之流通转化，严禁机械死守失令而断弱）。

【强制输出规范：大模型自主研判提炼卡片】：
为了让命理结论一目了然，你必须在回答的最开始，首先输出且仅输出一个专属的【研判结论卡片 JSON 块】，格式必须严格遵循如下规范（程序将直接读取此 JSON 渲染卡片，无需人工在长文中搜寻）：
\`\`\`json:verdict
{
  "verdict": "中和偏弱",
  "reason": "此处由你提炼50-100字精炼核心断语，点出失令/得令、印比成势或克泄耗关键依据",
  "joyGods": ["土", "金"],
  "jiGods": ["木", "火"],
  "tags": ["官印相生", "印比成势"]
}
\`\`\`
注意约束：
1. "verdict" 必须具有明确倾向，仅限：中和偏强 / 中和偏弱 / 身强 / 身弱 / 从格 / 专旺；
2. "reason" 必须提炼具体命理依据（50-100字，点明月令得令/失令、三合三会局、关键干支生克与印比克泄组合），严禁输出"已完成推演""综合研判"等空泛套话；
3. "joyGods"（喜用五行，1-2个）与 "jiGods"（忌仇五行，1-2个）必须严格互斥，切勿通盘罗列；
4. "tags" 为 2-3 个核心格局或流通特征标签；
5. 在输出完上述 JSON 块后，空一行，再详细展开你的正文深度推导演绎（正文中切勿重复输出该 JSON），且全文必须为简体中文——从输出的第一个字起就是汉字，严禁任何英文推导过程或英文结论：

### 最优假设与旺衰定调
- **定调结论**：【中和偏强 / 中和偏弱 / 身强 / 身弱 / 从格 / 专旺】
- **核心论据**：[学术论据详细展开]
- **条件变量核验**：（逐项核验得令、得地、得生、得助、克泄耗之实）

### 关键争议：提纲气量 vs 地支合局克泄（如单禄能否任重财/官伤，印比转化）
### 通根深度与受损情况（各支冲合克刑的折损核算）
### 用神取用与喜忌方向
- **喜用五行**：【明确写出具体五行字，如：土、金】（一级用神、二级用神简述）
- **忌仇五行**：【明确写出具体五行字，如：木、火】（简述克泄耗之害）`;
}

/**
 * 结构化提炼大模型推演输出的定调结论、核心断语、特征标签及喜忌神
 */
export interface ParsedAiVerdict {
  verdict: string;
  verdictType: 'strong' | 'weak' | 'neutral' | 'special';
  reason: string;
  tags: string[];
  joyGods?: string[];
  jiGods?: string[];
}

/**
 * 从推演长文中挖掘核心论据/断语。
 * 供两个通道复用：① JSON 结论卡缺失 reason 字段时的正文补充来源；② 无 JSON 时的二级回退通道。
 * 形式1: 「核心论据/核心断语」等显式标注行；形式2: 定调结论行后续句；形式3: 含定调结论词的首个中文段落。
 */
function extractReasonFromBody(text: string, verdict: string): string {
  let reason = '';
  // 若开头是 json:verdict 围栏块（结论卡），先跳过它，避免「核心论据」匹配撞进卡片内部
  let body = text;
  const fenceMatch = text.match(/```[\s\S]*?```/);
  if (fenceMatch && fenceMatch.index !== undefined && fenceMatch.index < 200) {
    body = text.slice(fenceMatch.index + fenceMatch[0].length);
  }
  const headerSlice = body.slice(0, 3500);

  // 形式 1: 显式标注的核心论据/核心断语
  const matchReason = headerSlice.match(/(?:核心论据|核心断语|核心理由|判定依据|核心断调)[*_\s：:]+([^\n\r]+)/);
  if (matchReason && matchReason[1]) {
    reason = matchReason[1].replace(/^[【[\s*]+|[】\]\s*]+$/g, '').trim();
  }

  // 形式 2: 紧跟在定调结论之后的一句话 (如：定调结论：中和偏强，印比成势，官印相生...)
  if (!reason) {
    const lineMatch = headerSlice.match(/定调结论[：:\s*]+[^\n\r]+/);
    if (lineMatch) {
      const fullLine = lineMatch[0];
      let cleaned = fullLine.replace(/定调结论[：:\s*]+[【[]?[\u4e00-\u9fa5]+[】\]]?[，,；;、\s]*/, '').trim();
      cleaned = cleaned.replace(/^[，,；;。、\s*]+/, '').trim();
      if (cleaned.length > 5) {
        reason = cleaned;
      }
    }
  }

  // 形式 3: 回退取包含定调词的第一段实质内容
  if (!reason) {
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    for (const p of paragraphs) {
      if (p.includes(verdict) && p.length > 10) {
        const clean = p.replace(/[#*`_]/g, '').trim();
        reason = clean.slice(0, 130);
        break;
      }
    }
  }

  if (reason.length > 140) {
    reason = reason.slice(0, 138) + '...';
  }
  return reason;
}

export function parseAiVerdict(text: string): ParsedAiVerdict | null {
  if (!text || text.trim().length === 0) return null;

  // 1. 【核心通道：大模型自主结构化提炼】优先解析大模型在推演开头直接输出的 json:verdict 卡片块
  const jsonBlockMatch = text.match(/```(?:json:verdict|json)?\s*([\s\S]*?)(?:```|$)/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    const rawSnippet = jsonBlockMatch[1].trim();
    if (rawSnippet.includes('{')) {
      const openIdx = rawSnippet.indexOf('{');
      const closeIdx = rawSnippet.lastIndexOf('}');
      if (closeIdx > openIdx) {
        try {
          const parsed = JSON.parse(rawSnippet.slice(openIdx, closeIdx + 1));
          if (parsed && typeof parsed.verdict === 'string' && parsed.verdict.trim()) {
            const v = parsed.verdict.trim();
            let verdictType: ParsedAiVerdict['verdictType'] = 'neutral';
            if (v.includes('强') || v.includes('旺')) verdictType = 'strong';
            else if (v.includes('弱')) verdictType = 'weak';
            else if (v.includes('从') || v.includes('专')) verdictType = 'special';

            const joys = Array.isArray(parsed.joyGods)
              ? (parsed.joyGods as unknown[]).filter((w): w is string => typeof w === 'string' && ['木', '火', '土', '金', '水'].includes(w))
              : [];
            let jis = Array.isArray(parsed.jiGods)
              ? (parsed.jiGods as unknown[]).filter((w): w is string => typeof w === 'string' && ['木', '火', '土', '金', '水'].includes(w))
              : [];
            // 喜忌绝对互斥
            jis = jis.filter((g) => !joys.includes(g));

            return {
              verdict: v,
              verdictType,
              reason: typeof parsed.reason === 'string' && parsed.reason.trim()
                ? parsed.reason.trim()
                : (extractReasonFromBody(text, v) || '大模型已完成全息命局综合推演。'),
              tags: Array.isArray(parsed.tags) ? (parsed.tags as unknown[]).filter((t): t is string => typeof t === 'string' && Boolean(t.trim())) : [],
              joyGods: joys.length > 0 ? joys : undefined,
              jiGods: jis.length > 0 ? jis : undefined,
            };
          }
        } catch {
          // JSON 尚未完全闭合时的流式容错
        }
      }

      // 流式进行中（JSON 尚未闭合花括号），提取已生成的字段以实现秒级实时呈现
      const vMatch = rawSnippet.match(/"verdict"\s*:\s*"([^"]+)"/);
      if (vMatch && vMatch[1]) {
        const v = vMatch[1].trim();
        let verdictType: ParsedAiVerdict['verdictType'] = 'neutral';
        if (v.includes('强') || v.includes('旺')) verdictType = 'strong';
        else if (v.includes('弱')) verdictType = 'weak';
        else if (v.includes('从') || v.includes('专')) verdictType = 'special';

        const rMatch = rawSnippet.match(/"reason"\s*:\s*"([^"]+)"/);
        return {
          verdict: v,
          verdictType,
          reason: rMatch ? rMatch[1].trim() : '大模型正在实时提炼核心研判断语...',
          tags: [],
        };
      }
    }
  }

  // 2. 【二级兼容回退】：若大模型未按规范输出 JSON，走长文标题扫描回退
  let verdict = '';
  const tags: string[] = [];

  const headerSlice = text.slice(0, 1500);

  // 匹配形式 1: - **定调结论**：【中和偏强】 或 **定调结论**：中和偏强
  const matchExplicit = headerSlice.match(/(?:定调结论|定调倾向|旺衰定调|核心结论|判定结论)[*_\s：:]+([【[]?[\u4e00-\u9fa5A-Za-z0-9]+[】\]]?)/);
  if (matchExplicit && matchExplicit[1]) {
    const rawV = matchExplicit[1].replace(/[【】\][*]/g, '').trim();
    if (['身强', '偏强', '中和偏强', '身弱', '偏弱', '中和偏弱', '中和', '从格', '专旺', '从财格', '从杀格', '从儿格', '从势格'].includes(rawV)) {
      verdict = rawV;
    }
  }

  // 匹配形式 2: 定调结论：中和偏强，印比成势... (兼容常见单行带标点输出)
  if (!verdict) {
    const matchSentence = headerSlice.match(/定调结论[：:\s*]+([^\n\r，,；;。]+)/);
    if (matchSentence && matchSentence[1]) {
      const candidate = matchSentence[1].replace(/[【】\][*]/g, '').trim();
      if (['身强', '偏强', '中和偏强', '身弱', '偏弱', '中和偏弱', '中和', '从格', '专旺', '从财格', '从杀格'].includes(candidate)) {
        verdict = candidate;
      }
    }
  }

  // 匹配形式 3: 前部关键词回退扫描
  if (!verdict) {
    const keywords = ['中和偏强', '中和偏弱', '身强', '身弱', '偏强', '偏弱', '中和', '从杀格', '从财格', '从儿格', '从势格', '从格', '专旺'];
    for (const kw of keywords) {
      if (headerSlice.includes(kw)) {
        verdict = kw;
        break;
      }
    }
  }

  if (!verdict) return null;

  // 提取核心论据/理由（与 JSON 通道缺 reason 时的正文挖掘共用同一实现）
  const reason = extractReasonFromBody(text, verdict);

  // 提取子平流通与命理特征标签
  const candidateTags = [
    { name: '官印相生', keywords: ['官印相生', '官化为印', '化官为印'] },
    { name: '杀印相生', keywords: ['杀印相生', '化杀为印', '化杀生身'] },
    { name: '印比成势', keywords: ['印比成势', '印比两旺', '印比有力', '生扶众多'] },
    { name: '通根深厚', keywords: ['通根深厚', '坐支帝旺', '坐下强根', '本气通根'] },
    { name: '身弱财旺', keywords: ['身弱财旺', '财多身弱', '财重身轻'] },
    { name: '食伤泄秀', keywords: ['食伤泄秀', '秀气发越', '伤官生财'] },
    { name: '食神制杀', keywords: ['食神制杀', '食神驭杀'] },
    { name: '月令当权', keywords: ['得令当权', '提纲生旺', '月令当令'] },
    { name: '失令休囚', keywords: ['失令休囚', '不得月令', '先天下失令'] },
  ];

  for (const c of candidateTags) {
    if (c.keywords.some((kw) => text.includes(kw))) {
      tags.push(c.name);
      if (tags.length >= 3) break;
    }
  }

  // 提取大模型正文中阐述的喜用神与忌神
  let extractedJoyGods: string[] = [];
  let extractedJiGods: string[] = [];

  // 安全五行提取：仅从紧跟冒号的前半短句中提取（限前 35 字符），遇到标点立刻截断，防止通盘抓取整行辩证长文
  const extractWuxingsSafe = (sliceText: string): string[] => {
    if (!sliceText) return [];
    const firstClause = sliceText.slice(0, 35).split(/[；;。！!\n\r]/)[0] || '';
    return ['木', '火', '土', '金', '水'].filter((wx) => firstClause.includes(wx));
  };

  const joyMatch = text.match(/(?:喜用五行|喜用神|喜用|一级用神|用神|喜神)[*_\s：:]+([^\n\r]+)/);
  if (joyMatch && joyMatch[1]) {
    extractedJoyGods = extractWuxingsSafe(joyMatch[1]);
  }

  const jiMatch = text.match(/(?:忌仇五行|忌仇|忌神|忌用|大忌|仇神)[*_\s：:]+([^\n\r]+)/);
  if (jiMatch && jiMatch[1]) {
    extractedJiGods = extractWuxingsSafe(jiMatch[1]);
  }

  // 命理铁律 1: 喜用与忌仇绝对互斥，忌神绝不能包含已确定的喜用神
  if (extractedJoyGods.length > 0) {
    extractedJiGods = extractedJiGods.filter((g) => !extractedJoyGods.includes(g));
  }

  // 命理铁律 2: 喜忌五行数量常理不超过 3 个；若提取出超过 3 个，说明抓取到全盘排比，清空以交给确定性算法保底
  if (extractedJoyGods.length > 3) {
    extractedJoyGods = [];
  }
  if (extractedJiGods.length > 3) {
    extractedJiGods = [];
  }

  let verdictType: ParsedAiVerdict['verdictType'] = 'neutral';
  if (verdict.includes('强') || verdict.includes('旺')) {
    verdictType = 'strong';
  } else if (verdict.includes('弱')) {
    verdictType = 'weak';
  } else if (verdict.includes('从') || verdict.includes('专')) {
    verdictType = 'special';
  }

  return {
    verdict,
    verdictType,
    reason: reason || '大模型已完成条件变量与生克流通综合推导。',
    tags,
    joyGods: extractedJoyGods.length > 0 ? extractedJoyGods : undefined,
    jiGods: extractedJiGods.length > 0 ? extractedJiGods : undefined,
  };
}
