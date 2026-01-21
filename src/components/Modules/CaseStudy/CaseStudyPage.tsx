/**
 * CaseStudy 页面 - 重构后的精简版本
 * 所有状态管理已移至 useCaseStudy hook
 * UI 组件已提取到 components/ 目录
 */
import { Compass, Grid3X3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { useMemo } from 'react';

// 从提取的模块导入
import { CATEGORIES, TIAN_GAN, DI_ZHI } from '../../../lib/caseStudy/types';
import { parseBaziInfo, extendDaYun } from '../../../lib/caseStudy/parsers';

// 子组件导入
import CategoryTabs from './components/CategoryTabs';
import CaseListSidebar from './components/CaseListSidebar';
import { caseMarkdownComponents, authorMarkdownComponents } from './components/MarkdownRenderers';

// 八字模块组件复用
import BaziChart from '../../Modules/Bazi/BaziChart';
import DayunLiunianPanel from '../../Modules/Bazi/DayunLiunianPanel';
import type { BaziApiResponse, DaYunPeriod, PillarData } from '../../../types/bazi';

// Hook 导入
import { useCaseStudy } from './hooks/useCaseStudy';

// 构造 BaziApiResponse 的辅助函数
const getBaziData = (baziInfo: ReturnType<typeof parseBaziInfo>): BaziApiResponse | null => {
    if (baziInfo.baziData) return baziInfo.baziData;
    if (baziInfo.pillars.length < 4) return null;

    // 构造 Pillars
    const pillars: PillarData[] = baziInfo.pillars.map(p => ({
        label: p.label,
        ganZhi: p.ganZhi,
        tiangan: p.tiangan,
        dizhi: p.dizhi,
        tianganElement: '', // 简化
        dizhiElement: '',
        tianganShiShen: '',
        dizhiShiShen: [],
        zanggan: [],
        diShi: '',
        naYin: '',
        kongWang: '',
    }));

    // 获取出生年份 (优先从 baziInfo 获取，否则尝试推算)
    let birthYear = baziInfo.birthYear;
    if (!birthYear) {
        // 如果没有出生年份，尝试从 pillars 推算（这里暂且保持当前年倒推的兜底逻辑，但在案例数据完善的情况下应该总是有 birthYear）
        const currentYear = new Date().getFullYear();
        birthYear = currentYear - 30;
    }

    // 构造 DaYun
    const yearGan = pillars[0].tiangan;
    const fullDaYun = baziInfo.daYun.length > 0
        ? extendDaYun(baziInfo.daYun[0], baziInfo.gender, yearGan, 12)
        : [];

    // 假设起运岁数为 1 岁 (如果没有具体信息)
    const startYunAge = 1;

    const daYun: DaYunPeriod[] = fullDaYun.map((ganZhi, i) => {
        const index = i + 1;
        const startAge = startYunAge + i * 10;
        const endAge = startAge + 9;
        const startYear = birthYear! + startAge - 1;
        const endYear = birthYear! + endAge - 1;

        return {
            index,
            startYear,
            endYear,
            startAge,
            endAge,
            ganZhi,
            tiangan: ganZhi[0],
            dizhi: ganZhi[1],
        };
    });

    // 构造 LiuNian
    // 基于 birthYear 生成 100 年的流年
    const liuNian = [];
    if (birthYear) {
        for (let i = 0; i < 100; i++) {
            const year = birthYear + i;
            // 计算流年的干支
            // 假设 1984 是甲子年 (基准)
            // 甲子(1984) -> index 0
            const offset = year - 1984;
            const ganIndex = (0 + offset) % 10; // 甲子年干 index 0
            const zhiIndex = (0 + offset) % 12; // 甲子年支 index 0

            // 处理负数取模
            const normalizedGanIndex = ganIndex >= 0 ? ganIndex : ganIndex + 10;
            const normalizedZhiIndex = zhiIndex >= 0 ? zhiIndex : zhiIndex + 12;

            const gan = TIAN_GAN[normalizedGanIndex];
            const zhi = DI_ZHI[normalizedZhiIndex];

            // 查找所属大运
            // 简单逻辑：根据年龄匹配大运
            const age = i + 1;
            const currentDaYun = daYun.find(dy => age >= dy.startAge && age <= dy.endAge);

            liuNian.push({
                year,
                age,
                ganZhi: gan + zhi,
                tiangan: gan,
                dizhi: zhi,
                dayunIndex: currentDaYun ? currentDaYun.index : -1,
            });
        }
    }

    return {
        solarDate: '',
        lunarDate: '',
        zodiac: '',
        gender: baziInfo.gender === '乾造' ? 'male' : 'female',
        pillars,
        yunInfo: { startYear: birthYear || 0, startMonth: 0, startDay: 0, startSolarDate: '', isForward: true },
        daYun,
        liuNian,
        currentXiaoYun: [],
        extra: { taiYuan: '', mingGong: '', shenGong: '' },
    };
};

export default function CaseStudyPage() {
    const {
        allCases,
        displayCases,
        activeCase,
        authorIntroContent,
        currentPage,
        totalPages,
        setCurrentPage,
        selectedCategory,
        setSelectedCategory,
        selectedDayMaster,
        handleSelectDayMaster,
        selectedCaseId,
        handleSelectCase,
        searchTerm,
        setSearchTerm,
        selectedAuthor,
        handleSelectAuthor,
        // daYunPage, // 不再需要手动管理分页
        // setDaYunPage,
        selectedDaYunIndex,
        setSelectedDaYunIndex,
        selectedLiuNianYear,
        setSelectedLiuNianYear,
    } = useCaseStudy();

    // 构造 BaziData
    const baziData = useMemo(() => {
        if (!activeCase?.content) return null;
        const info = parseBaziInfo(activeCase.content);
        return getBaziData(info);
    }, [activeCase?.content]);

    return (
        <div className="flex w-full h-full overflow-hidden bg-background relative">
            {/* 1. 术数分类 (5%) */}
            <CategoryTabs
                categories={CATEGORIES}
                selectedId={selectedCategory}
                onSelect={setSelectedCategory}
            />

            {/* 2. 案例列表 (15%) */}
            <CaseListSidebar
                allCases={allCases}
                displayCases={displayCases}
                selectedCaseId={selectedCaseId}
                selectedDayMaster={selectedDayMaster}
                searchTerm={searchTerm}
                currentPage={currentPage}
                totalPages={totalPages}
                onSelectCase={handleSelectCase}
                onSelectDayMaster={handleSelectDayMaster}
                onSearchChange={setSearchTerm}
                onPageChange={setCurrentPage}
                onSelectAuthor={handleSelectAuthor}
            />

            {/* 3. 内容区 (55%) */}
            <div className="w-[55%] flex flex-col bg-background/50 relative overflow-hidden">
                {activeCase ? (
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                            <h1 className="text-2xl font-serif font-bold text-center text-primary/90 pb-4 border-b border-border/40">
                                {activeCase.title}
                            </h1>
                            <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[18px]">
                                <ReactMarkdown
                                    rehypePlugins={[rehypeRaw]}
                                    remarkPlugins={[remarkGfm]}
                                    components={caseMarkdownComponents}
                                >
                                    {activeCase.content.replace(/^(命主生辰|性别|日主|格局|令地)[：:][^\n]*\n?/gm, '').replace(/^#\s+[^\n]+\n?/, '').replace(/^\n+/, '')}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ) : selectedAuthor && authorIntroContent ? (
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                            <h1 className="text-2xl font-serif font-bold text-center text-primary/90 pb-4 border-b border-border/40">
                                {selectedAuthor}
                            </h1>
                            <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[18px]">
                                <ReactMarkdown
                                    rehypePlugins={[rehypeRaw]}
                                    remarkPlugins={[remarkGfm]}
                                    components={authorMarkdownComponents}
                                >
                                    {authorIntroContent.replace(/^(命主生辰|性别|日主|格局|令地)[：:][^\n]*\n?/gm, '').replace(/^#\s+[^\n]+\n?/, '').replace(/^\n+/, '')}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40">
                        <Compass className="w-16 h-16 mb-4 opacity-20" />
                        <span className="text-sm font-serif">请选择左侧案例查看详情</span>
                    </div>
                )}
            </div>

            {/* 4. 排盘区 (25%) */}
            <div className="w-[25%] bg-muted/10 flex flex-col overflow-hidden border-l border-border/50">
                <div className="p-2 border-b border-border bg-muted/20">
                    <span className="text-xs font-medium text-muted-foreground">排盘信息</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent flex flex-col">
                    {selectedCategory === 'bazi' && activeCase ? (
                        <>
                            {/* 八字盘面 - 移除 min-h 限制，自适应高度 */}
                            <div className="flex-shrink-0">
                                <BaziChart
                                    data={baziData}
                                    selectedDaYunIndex={selectedDaYunIndex}
                                    selectedLiuNianYear={selectedLiuNianYear}
                                    showTaiMingShen={false}
                                />
                            </div>

                            {/* 大运流年面板 - 填充剩余空间 */}
                            <div className="flex-1 mt-2">
                                <DayunLiunianPanel
                                    data={baziData}
                                    selectedDaYunIndex={selectedDaYunIndex}
                                    selectedLiuNianYear={selectedLiuNianYear}
                                    onSelectDaYun={setSelectedDaYunIndex}
                                    onSelectLiuNian={setSelectedLiuNianYear}
                                    onSelectLiuYue={() => { }}
                                />
                            </div>
                        </>
                    ) : selectedCategory === 'bazi' ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <Compass className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">选择案例查看排盘</p>
                        </div>
                    ) : selectedCategory === 'qimen' ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <Grid3X3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">奇门排盘区域</p>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <Compass className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">排盘区域</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
