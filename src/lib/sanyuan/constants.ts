import type {
    HumanStarRelation,
    Mountain,
    NineStarName,
    PalaceName,
    SanYuanDirection,
} from './types';

export const PALACE_LABELS: Record<PalaceName, string> = {
    Qian: '乾',
    Dui: '兑',
    Gen: '艮',
    Li: '离',
    Kan: '坎',
    Kun: '坤',
    Zhen: '震',
    Xun: '巽',
};

export const LUOSHU_LAYOUT: ReadonlyArray<ReadonlyArray<PalaceName | null>> = [
    ['Xun', 'Li', 'Kun'],
    ['Zhen', null, 'Dui'],
    ['Gen', 'Kan', 'Qian'],
];

export const PALACE_ORDER: readonly PalaceName[] = ['Qian', 'Dui', 'Gen', 'Li', 'Kan', 'Kun', 'Zhen', 'Xun'];

export const NINE_STAR_NAMES: Record<number, NineStarName> = {
    1: '贪狼',
    2: '巨门',
    3: '禄存',
    4: '文曲',
    5: '廉贞',
    6: '武曲',
    7: '破军',
    8: '辅弼',
};

export const HUMAN_STAR_RELATIONS: Record<number, HumanStarRelation> = {
    1: '生气',
    2: '天医',
    3: '祸害',
    4: '六煞',
    5: '五鬼',
    6: '延年',
    7: '绝命',
    8: '伏位',
};

export const DIRECTIONS: readonly SanYuanDirection[] = [
    ['壬', '丙'], ['子', '午'], ['癸', '丁'], ['丑', '未'], ['艮', '坤'], ['寅', '申'],
    ['甲', '庚'], ['卯', '酉'], ['乙', '辛'], ['辰', '戌'], ['巽', '乾'], ['巳', '亥'],
    ['丙', '壬'], ['午', '子'], ['丁', '癸'], ['未', '丑'], ['坤', '艮'], ['申', '寅'],
    ['庚', '甲'], ['酉', '卯'], ['辛', '乙'], ['戌', '辰'], ['乾', '巽'], ['亥', '巳'],
].map(([mountain, facing]) => ({
    id: `${mountain}-${facing}`,
    label: `${mountain}山${facing}向`,
    mountain: mountain as Mountain,
    facing: facing as Mountain,
}));
