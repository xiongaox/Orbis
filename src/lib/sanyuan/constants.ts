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

/**
 * 山星×向星组合断语（宫位详情用）。
 * 断语为通则概述，实际吉凶须结合元运旺衰与峦头动静综合判断；
 * 仅收录有传统出处的组合，未列组合不强行下结论。
 */
export const STAR_PAIR_INSIGHTS: ReadonlyArray<{
    mountainStar: number;
    facingStar: number;
    name: string;
    meaning: string;
}> = [
    { mountainStar: 1, facingStar: 1, name: '一一同宫', meaning: '双一到宫，文贵之气相聚；须辨元运旺衰，失运则文而不发。' },
    { mountainStar: 1, facingStar: 4, name: '一四同宫', meaning: '准发科名之显，利文职学业；亦须形峦配合，水口清秀方验。' },
    { mountainStar: 4, facingStar: 1, name: '四一同宫', meaning: '同主科名文显，与一四互为体用。' },
    { mountainStar: 1, facingStar: 6, name: '一六共宗', meaning: '启八代之文章，利官贵；水法合局尤验。' },
    { mountainStar: 6, facingStar: 1, name: '一六共宗', meaning: '金水相生，同主文章官贵。' },
    { mountainStar: 3, facingStar: 8, name: '三八为朋', meaning: '旺丁旺财，家业兴隆；当运得令更验。' },
    { mountainStar: 8, facingStar: 3, name: '三八为朋', meaning: '木土相成，同主丁财两旺。' },
    { mountainStar: 9, facingStar: 1, name: '九一同宫', meaning: '水火既济，文采风流；形峦不破则吉。' },
    { mountainStar: 1, facingStar: 9, name: '九一同宫', meaning: '水火互济，同主聪明文秀。' },
    { mountainStar: 2, facingStar: 5, name: '二五交加', meaning: '病符瘟毒同宫，传统论疾病灾滞风险；宜静宜化，忌坐卧行事动土，须核峦头。' },
    { mountainStar: 5, facingStar: 2, name: '二五交加', meaning: '同主病符交叠，宜静不宜动。' },
    { mountainStar: 5, facingStar: 5, name: '五黄伏吟位', meaning: '五黄叠至，疾病灾滞之象尤重；绝对宜静，动土大忌。' },
    { mountainStar: 2, facingStar: 3, name: '二三斗牛', meaning: '斗牛煞：木克土，主官非口舌、肠胃腹疾、人际争斗。' },
    { mountainStar: 3, facingStar: 2, name: '二三斗牛', meaning: '同主斗牛煞，是非缠身，宜静化。' },
    { mountainStar: 2, facingStar: 4, name: '二四交加', meaning: '传统论家宅是非不宁，主婆媳阻力、文书阻滞，宜以峦头动静核验。' },
    { mountainStar: 3, facingStar: 7, name: '三七穿心', meaning: '劫盗官非，破财损丁；儿孙悖逆之象，须形峦化解。' },
    { mountainStar: 7, facingStar: 3, name: '三七穿心', meaning: '金木相战，同主劫财官非。' },
    { mountainStar: 3, facingStar: 5, name: '三五加会', meaning: '木克土而带病符，主是非兼健康隐患，宜静。' },
    { mountainStar: 5, facingStar: 3, name: '三五加会', meaning: '同主是非病符交叠。' },
    { mountainStar: 6, facingStar: 7, name: '六七交剑', meaning: '交剑煞：金金相并，传统论劫财争斗、肺骨之疾。' },
    { mountainStar: 7, facingStar: 6, name: '六七交剑', meaning: '同主交剑煞，破财损器。' },
    { mountainStar: 6, facingStar: 9, name: '六九同宫', meaning: '火照天门，火克金，传统论丁财两败、老翁受损。' },
    { mountainStar: 9, facingStar: 6, name: '六九同宫', meaning: '同主火炼乾金，宜静宜化。' },
    { mountainStar: 7, facingStar: 9, name: '七九合辙', meaning: '常招回禄之灾，火金相激；忌动火动土，宜水气调和。' },
    { mountainStar: 9, facingStar: 7, name: '七九合辙', meaning: '同主火患口舌，宜静。' },
    { mountainStar: 8, facingStar: 1, name: '八一合化', meaning: '土水相济，财源渐聚；当运更主发富。' },
    { mountainStar: 1, facingStar: 8, name: '八一合化', meaning: '水土相成，同主财气顺遂。' },
    { mountainStar: 9, facingStar: 5, name: '九五加会', meaning: '火炎土燥而带病符，健康隐忧，宜静宜化。' },
    { mountainStar: 5, facingStar: 9, name: '九五加会', meaning: '同主火土燥烈之患。' },
];
