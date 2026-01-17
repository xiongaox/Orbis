/**
 * 奇门遁甲模块 - 宫位详情面板
 * 右侧显示选中宫位的完整信息
 */
import { BookOpen } from 'lucide-react';
import type { QimenPalace } from './QimenChart';

// 九星详解
const XING_DETAILS: Record<string, { nature: string; description: string }> = {
    '天蓬': { nature: '凶星', description: '天蓬为北方坎宫之星，主智谋、阴私、盗贼。宜守不宜攻。' },
    '天芮': { nature: '凶星', description: '天芮为西南坤宫之星，主疾病、阴小人。不利行事。' },
    '天冲': { nature: '吉星', description: '天冲为东方震宫之星，主开创、冲动、武勇。利出行征伐。' },
    '天辅': { nature: '吉星', description: '天辅为东南巽宫之星，主文书、学业、贵人。利求学求名。' },
    '天禽': { nature: '中平', description: '天禽为中央之星，随天干而论吉凶，主变化。' },
    '天心': { nature: '吉星', description: '天心为西北乾宫之星，主谋略、医药。利求医问药、谋事策划。' },
    '天柱': { nature: '凶星', description: '天柱为西方兑宫之星，主口舌、争讼。不利行动。' },
    '天任': { nature: '吉星', description: '天任为东北艮宫之星，主稳重、地产。利置业求财。' },
    '天英': { nature: '吉星', description: '天英为南方离宫之星，主文明、光彩。利文化艺术。' },
};

// 八门详解
const MEN_DETAILS: Record<string, { nature: string; description: string }> = {
    '开门': { nature: '吉门', description: '利开业、出行、求财、见贵。百事皆宜。' },
    '休门': { nature: '吉门', description: '利休养、见贵、求财。适合休息调整。' },
    '生门': { nature: '吉门', description: '利生财、求嗣、开业。最利求财置业。' },
    '伤门': { nature: '凶门', description: '主伤害、口舌、刑伤。宜防小人暗害。' },
    '杜门': { nature: '中平', description: '主闭塞、隐藏。利躲避、藏匿，不利开放求事。' },
    '景门': { nature: '中平', description: '主血光、文书。利考试、发文书，不利求财。' },
    '死门': { nature: '凶门', description: '主死亡、停滞。诸事不宜，宜静守。' },
    '惊门': { nature: '凶门', description: '主惊恐、口舌、官非。宜安静守成。' },
};

// 八神详解
const SHEN_DETAILS: Record<string, { nature: string; description: string }> = {
    '值符': { nature: '吉神', description: '诸神之首，贵人临门，凡事皆利。' },
    '腾蛇': { nature: '凶神', description: '主惊恐、怪异、虚惊。防火灾口舌。' },
    '太阴': { nature: '吉神', description: '主阴私、暗昧、女贵人。利求阴人相助。' },
    '六合': { nature: '吉神', description: '主和合、婚姻、中介。利求合作。' },
    '白虎': { nature: '凶神', description: '主凶险、血光、丧事。宜防意外伤害。' },
    '玄武': { nature: '凶神', description: '主盗贼、欺骗、阴私。宜防失窃欺诈。' },
    '九地': { nature: '吉神', description: '主柔顺、伏藏、守静。利隐藏守成。' },
    '九天': { nature: '吉神', description: '主威扬、刚健、高远。利远行、升迁。' },
};

interface QimenPalaceDetailProps {
    palace: QimenPalace | null;
}

export default function QimenPalaceDetail({ palace }: QimenPalaceDetailProps) {
    if (!palace) {
        return (
            <aside className="w-96 bg-card border-l border-border flex flex-col min-h-0 flex-shrink-0">
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">点击宫位查看详情</p>
                    </div>
                </div>
            </aside>
        );
    }

    const xingDetail = XING_DETAILS[palace.xing] || { nature: '未知', description: '' };
    const menDetail = MEN_DETAILS[palace.men] || { nature: '未知', description: '' };
    const shenDetail = SHEN_DETAILS[palace.shen] || { nature: '未知', description: '' };

    return (
        <aside className="w-96 bg-card border-l border-border flex flex-col min-h-0 flex-shrink-0 overflow-hidden">
            {/* 标题 */}
            <div className="p-4 border-b border-border">
                <h2 className="font-display text-lg font-medium text-foreground">
                    {palace.gongName}{palace.position}宫全解
                </h2>
            </div>

            {/* 详情内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* 基础信息 */}
                <section>
                    <h3 className="text-sm font-medium text-primary mb-3">基础信息</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-muted/30 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">天盘干</div>
                            <div className="text-lg font-serif text-primary">{palace.tianPan}</div>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">地盘干</div>
                            <div className="text-lg font-serif text-foreground">{palace.diPan}</div>
                        </div>
                    </div>
                </section>

                {/* 九星 */}
                {palace.xing && (
                    <section>
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-medium text-foreground">{palace.xing}</h3>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${xingDetail.nature === '吉星' ? 'bg-green-500/10 text-green-500' :
                                xingDetail.nature === '凶星' ? 'bg-red-500/10 text-red-500' :
                                    'bg-yellow-500/10 text-yellow-500'
                                }`}>
                                {xingDetail.nature}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {xingDetail.description}
                        </p>
                    </section>
                )}

                {/* 八门 */}
                {palace.men && (
                    <section>
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-medium text-foreground">{palace.men}</h3>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${menDetail.nature === '吉门' ? 'bg-green-500/10 text-green-500' :
                                menDetail.nature === '凶门' ? 'bg-red-500/10 text-red-500' :
                                    'bg-yellow-500/10 text-yellow-500'
                                }`}>
                                {menDetail.nature}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {menDetail.description}
                        </p>
                    </section>
                )}

                {/* 八神 */}
                {palace.shen && (
                    <section>
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-medium text-foreground">{palace.shen}</h3>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${shenDetail.nature === '吉神' ? 'bg-green-500/10 text-green-500' :
                                shenDetail.nature === '凶神' ? 'bg-red-500/10 text-red-500' :
                                    'bg-yellow-500/10 text-yellow-500'
                                }`}>
                                {shenDetail.nature}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {shenDetail.description}
                        </p>
                    </section>
                )}

                {/* 格局分析 */}
                <section>
                    <h3 className="text-sm font-medium text-primary mb-3">格局分析</h3>
                    <div className="space-y-2">
                        <div className="bg-muted/30 rounded-lg p-3">
                            <div className="text-sm text-foreground mb-1">
                                {palace.tianPan}+{palace.diPan}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                天地盘奇仪格局，详细解析待完善...
                            </div>
                        </div>
                        {palace.men && (
                            <div className="bg-muted/30 rounded-lg p-3">
                                <div className="text-sm text-foreground mb-1">
                                    {palace.men}+{palace.xing}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    门星组合格局，详细解析待完善...
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </aside>
    );
}
