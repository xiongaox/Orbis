/**
 * CaseStudy 页面 - 重构后的精简版本
 * 所有状态管理已移至 useCaseStudy hook
 * UI 组件已提取到 components/ 目录
 */
import { Compass } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import SideDrawer from '../../UI/SideDrawer';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useIsPadLandscape } from '../../../hooks/useIsPadLandscape';

// 认证上下文
import { useAuth } from '../../../contexts/AuthContext';

// 从提取的模块导入
// 从提取的模块导入
import { CATEGORIES, TIAN_GAN, DI_ZHI } from '../../../lib/caseStudy/types';
import { parseBaziInfo, parseAllBaziInfo, extendDaYun, computePillarDetails } from '../../../lib/caseStudy/parsers';

// 子组件导入
import CategoryTabs from './components/CategoryTabs';
import CaseListSidebar from './components/CaseListSidebar';
import { caseMarkdownComponents, authorMarkdownComponents } from './components/MarkdownRenderers';

// 案例学习专用八字组件
import CaseStudyBaziChart from './components/CaseStudyBaziChart';
import CaseStudyDayunPanel from './components/CaseStudyDayunPanel';

// 案例学习专用奇门组件 - 精简版
import CaseStudyQimenChart from './components/CaseStudyQimenChart';
import JuSelectDialog from './components/JuSelectDialog';
import type { BaziApiResponse, DaYunPeriod, PillarData } from '../../../types/bazi';

// 断法模块
import DuanFaPage from './DuanFaPage';

// Hook 导入
import { useCaseStudy, ALL_CASES } from './hooks/useCaseStudy';
import { useReadingProgress } from './hooks/useReadingProgress';

// 学习面板组件
import LearningPanelFAB from './components/LearningPanelFAB';
import LearningPanelModal from './components/LearningPanelModal';
import FavoriteButton from './components/FavoriteButton';
import ReadingProgressButton from './components/ReadingProgressButton';


// 构造 BaziApiResponse 的辅助函数
const getBaziData = (baziInfo: ReturnType<typeof parseBaziInfo>): BaziApiResponse | null => {
    if (baziInfo.baziData) return baziInfo.baziData;
    if (baziInfo.pillars.length < 4) return null;

    const dayGan = baziInfo.pillars[2].tiangan;

    // 构造 Pillars
    const pillars: PillarData[] = baziInfo.pillars.map((p) => {
        // 如果没有详细数据，尝试计算
        const details = computePillarDetails(p.ganZhi, dayGan);
        return {
            label: p.label,
            ganZhi: p.ganZhi,
            tiangan: p.tiangan,
            dizhi: p.dizhi,
            tianganElement: '', // 可选: 即使这里为空，UI组件似乎主要是用颜色区分，或者后续再补全
            dizhiElement: '',
            tianganShiShen: details.tianganShiShen,
            dizhiShiShen: [], // UI组件如果不直接使用此字段而是用 zanggan 显示，则可保留空；但检查 SimplePillarCard 发现没用到 dizhiShiShen
            zanggan: details.zanggan,
            diShi: details.diShi,
            naYin: details.naYin,
            kongWang: details.kongWang,
            ziZuo: details.ziZuo, // 添加自坐
        };
    });

    // 获取出生年份
    let birthYear = baziInfo.birthYear;
    if (!birthYear) {
        const currentYear = new Date().getFullYear();
        birthYear = currentYear - 30;
    }

    // 构造 DaYun
    // 如果 baziInfo.daYun 为空，但我们有性别和年/月柱，可以尝试推算
    let fullDaYun: string[] = [];
    if (baziInfo.daYun.length > 0) {
        const yearGan = pillars[0].tiangan;
        fullDaYun = extendDaYun(baziInfo.daYun[0], baziInfo.gender, yearGan, 14);
    } else if (baziInfo.gender && pillars.length >= 2) {
        // 自动推算大运: 月柱为起点
        // 阳年男、阴年女顺行；阴年男、阳年女逆行
        const yearGan = pillars[0].tiangan;
        const monthPillar = pillars[1].ganZhi;

        const yangGan = ['甲', '丙', '戊', '庚', '壬'];
        const isYangYear = yangGan.includes(yearGan);
        const isMale = baziInfo.gender === '乾造';
        const isForward = (isYangYear && isMale) || (!isYangYear && !isMale);

        // 计算第一步大运
        const ganIndex = TIAN_GAN.indexOf(monthPillar[0]);
        const zhiIndex = DI_ZHI.indexOf(monthPillar[1]);

        let nextGanIndex, nextZhiIndex;
        if (isForward) {
            nextGanIndex = (ganIndex + 1) % 10;
            nextZhiIndex = (zhiIndex + 1) % 12;
        } else {
            nextGanIndex = (ganIndex - 1 + 10) % 10;
            nextZhiIndex = (zhiIndex - 1 + 12) % 12;
        }
        const firstDaYun = TIAN_GAN[nextGanIndex] + DI_ZHI[nextZhiIndex];

        fullDaYun = extendDaYun(firstDaYun, baziInfo.gender, yearGan, 14);
    }

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
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const isPadLandscape = useIsPadLandscape();
    const useDesktopLayout = isDesktop && !isPadLandscape;
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
        qimenResult, // Get result
        customJu,
        setCustomJu,
        activeChartIndex,
        setActiveChartIndex,
        chartCount,
    } = useCaseStudy();

    // 局数选择弹窗状态
    const [isJuDialogOpen, setIsJuDialogOpen] = useState(false);

    // 认证状态
    const { isAuthenticated } = useAuth();

    // 学习面板状态
    const [isLearningPanelOpen, setIsLearningPanelOpen] = useState(false);

    // Pad/移动端抽屉状态
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
    const [isChartPanelOpen, setIsChartPanelOpen] = useState(false);

    // 内容区滚动容器 ref（用于进度追踪）
    const contentScrollRef = useRef<HTMLDivElement>(null);

    // 阅读进度同步
    const { savedProgress, restoreProgress, currentProgress } = useReadingProgress({
        articleId: activeCase?.id || null,
        scrollContainerRef: contentScrollRef,
        enabled: isAuthenticated,
    });

    // 进入文章时重置滚动位置到顶部
    useEffect(() => {
        if (activeCase && contentScrollRef.current) {
            contentScrollRef.current.scrollTo({ top: 0 });
        }
    }, [activeCase?.id]);

    // 获取文章信息的辅助函数（供学习面板使用）
    const getArticleInfo = useCallback((articleId: string): { title: string; author: string } => {
        const caseItem = ALL_CASES.find(c => c.id === articleId);
        return {
            title: caseItem?.title || '未知标题',
            author: caseItem?.author || '未知作者',
        };
    }, []);

    // 构造 BaziData
    const baziData = useMemo(() => {
        if (!activeCase?.content) return null;
        // 如果 activeChartIndex >= 0，尝试获取第 N 个八字
        // 为了支持多八字，这里使用 parseAllBaziInfo
        const infos = parseAllBaziInfo(activeCase.content);
        const index = activeChartIndex >= infos.length ? 0 : activeChartIndex;
        // 确保 info 存在
        const info = infos[index] || parseBaziInfo(activeCase.content);
        return getBaziData(info);
    }, [activeCase?.content, activeChartIndex]);

    // 数字转中文数字辅助函数
    const toChineseNum = (num: number) => {
        const chineseRaw = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
        return chineseRaw[num] || num.toString();
    };

    // 断法模块使用独立布局
    if (selectedCategory === 'duanfa') {
        return (
            <div className="flex w-full h-full overflow-hidden bg-background relative">
                {/* 1. 术数分类 (5%) */}
                <CategoryTabs
                    categories={CATEGORIES}
                    selectedId={selectedCategory}
                    onSelect={setSelectedCategory}
                />
                {/* 断法独立布局 */}
                <div className="flex-1 flex overflow-hidden">
                    <DuanFaPage />
                </div>
            </div>
        );
    }

    const contentColumn = (
        <div className="flex-1 flex flex-col bg-background/50 relative overflow-hidden">
            {activeCase ? (
                <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                        {/* 标题行：标题 + 收藏按钮 */}
                        <div className="flex items-center justify-center gap-3 pb-4 border-b border-border/40">
                            <h1 className="text-2xl font-serif font-bold text-primary/90">
                                {activeCase.title}
                            </h1>
                            {isAuthenticated && (
                                <FavoriteButton articleId={activeCase.id} />
                            )}
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[18px]">
                            <ReactMarkdown
                                rehypePlugins={[rehypeRaw]}
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                components={caseMarkdownComponents}
                            >
                                {activeCase.content.replace(/^(命主生辰|性别|日主|格局|令地)[：:][^\n]*\n?/gm, '').replace(/^#\s+[^\n]+\n?/, '').replace(/^\n+/, '')}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            ) : selectedAuthor && authorIntroContent ? (
                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <h1 className="text-2xl font-serif font-bold text-center text-primary/90 pb-4 border-b border-border/40">
                            {selectedAuthor}
                        </h1>
                        <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[18px]">
                            <ReactMarkdown
                                rehypePlugins={[rehypeRaw]}
                                remarkPlugins={[remarkGfm, remarkBreaks]}
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

            {/* 学习面板 FAB - 仅登录用户可见 */}
            {isAuthenticated && (
                <div className="absolute right-4 bottom-4 z-10 flex flex-col items-center gap-3">
                    {/* 进度环按钮 - 点击跳转进度 */}
                    <ReadingProgressButton
                        progress={currentProgress}
                        savedProgress={savedProgress}
                        isFinished={currentProgress > 0 ? currentProgress >= 90 : savedProgress >= 90}
                        onRestore={restoreProgress}
                    />
                    <LearningPanelFAB onClick={() => setIsLearningPanelOpen(true)} />
                </div>
            )}
        </div>
    );

    const chartPanel = (
        <div className="h-full bg-muted/10 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-border bg-muted/20 flex justify-between items-center h-[40px]">
                <span className="text-xs font-medium text-muted-foreground">排盘信息</span>

                {/* 多排盘切换按钮 */}
                {activeCase && chartCount > 1 && (
                    <div className="flex space-x-1">
                        {Array.from({ length: chartCount }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveChartIndex(i)}
                                className={`
                                        text-[10px] px-2 py-0.5 rounded border transition-colors
                                        ${activeChartIndex === i
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                    }
                                    `}
                            >
                                盘式{toChineseNum(i + 1)}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent flex flex-col">
                {selectedCategory === 'bazi' && activeCase ? (
                    <>
                        {/* 八字盘面 - 移除 min-h 限制，自适应高度 */}
                        <div className="flex-shrink-0">
                            <CaseStudyBaziChart
                                data={baziData}
                                selectedDaYunIndex={selectedDaYunIndex}
                                selectedLiuNianYear={selectedLiuNianYear}
                            />
                        </div>

                        {/* 大运流年面板 - 顶部边框连接 */}
                        <div className="flex-1 border-t border-border">
                            <CaseStudyDayunPanel
                                data={baziData}
                                selectedDaYunIndex={selectedDaYunIndex}
                                selectedLiuNianYear={selectedLiuNianYear}
                                onSelectDaYun={setSelectedDaYunIndex}
                                onSelectLiuNian={setSelectedLiuNianYear}
                            />
                        </div>
                    </>
                ) : selectedCategory === 'bazi' ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Compass className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">选择案例查看排盘</p>
                    </div>
                ) : selectedCategory === 'qimen' && activeCase ? (
                    /* 使用真实数据 */
                    qimenResult ? (
                        <div className="flex-shrink-0 flex flex-col">
                            <CaseStudyQimenChart
                                palaces={qimenResult.palaces}
                                selectedPalace={null}
                                onSelectPalace={() => { }}
                                header={qimenResult.header}
                                globalPatterns={qimenResult.globalPatterns}
                                onJuClick={() => setIsJuDialogOpen(true)}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <p className="text-sm">排盘计算中或无时间信息...</p>
                        </div>
                    )
                ) : selectedCategory === 'qimen' ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Compass className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">选择案例查看排盘</p>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Compass className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">排盘区域</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex w-full h-full overflow-hidden bg-background relative">
            {useDesktopLayout ? (
                <>
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
                        selectedCategory={selectedCategory}
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
                    <div className="w-[55%] h-full flex flex-col overflow-hidden">
                        {contentColumn}
                    </div>

                    {/* 4. 排盘区 (25%) */}
                    <div className="w-[25%] h-full flex flex-col overflow-hidden border-l border-border/50">
                        {chartPanel}
                    </div>
                </>
            ) : isPadLandscape ? (
                /* ========== Pad 横屏：竖线触发抽屉布局 ========== */
                <>
                    {/* 术数分类标签（始终可见）*/}
                    <CategoryTabs
                        categories={CATEGORIES}
                        selectedId={selectedCategory}
                        onSelect={setSelectedCategory}
                    />

                    {/* 主内容区域 */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                        {/* 左侧贴边竖线触发按钮 - 复用统一样式 */}
                        <button
                            type="button"
                            onClick={() => setIsLeftPanelOpen(true)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-start group focus:outline-none"
                            aria-label="打开目录"
                        >
                            <span className="w-[3px] h-20 rounded-r bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">
                                    目录
                                </span>
                            </span>
                        </button>

                        {/* 右侧贴边竖线触发按钮 */}
                        <button
                            type="button"
                            onClick={() => setIsChartPanelOpen(true)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-end group focus:outline-none"
                            aria-label="打开排盘"
                        >
                            <span className="w-[3px] h-20 rounded-l bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">
                                    排盘
                                </span>
                            </span>
                        </button>

                        {contentColumn}
                    </div>

                    {/* 左侧目录抽屉 */}
                    <SideDrawer
                        open={isLeftPanelOpen}
                        title="目录"
                        side="left"
                        onClose={() => setIsLeftPanelOpen(false)}
                    >
                        <div className="h-full min-h-0 overflow-hidden flex flex-col">
                            <CaseListSidebar
                                allCases={allCases}
                                displayCases={displayCases}
                                selectedCategory={selectedCategory}
                                selectedCaseId={selectedCaseId}
                                selectedDayMaster={selectedDayMaster}
                                searchTerm={searchTerm}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onSelectCase={(id) => {
                                    handleSelectCase(id);
                                    setIsLeftPanelOpen(false);
                                }}
                                onSelectDayMaster={(id) => {
                                    handleSelectDayMaster(id);
                                }}
                                onSearchChange={setSearchTerm}
                                onPageChange={setCurrentPage}
                                onSelectAuthor={(author) => {
                                    handleSelectAuthor(author);
                                    setIsLeftPanelOpen(false);
                                }}
                                variant="drawer"
                            />
                        </div>
                    </SideDrawer>

                    {/* 右侧排盘抽屉 */}
                    <SideDrawer
                        open={isChartPanelOpen}
                        title="排盘信息"
                        side="right"
                        size="lg"
                        onClose={() => setIsChartPanelOpen(false)}
                    >
                        {chartPanel}
                    </SideDrawer>
                </>
            ) : (
                <>
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-3 py-2 border-b border-border/40 bg-background/70 backdrop-blur-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLeftPanelOpen(true)}
                                    className="px-3 py-1.5 rounded-lg border border-border bg-card/60 text-sm text-foreground hover:bg-muted/40 transition-colors"
                                >
                                    目录
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsChartPanelOpen(true)}
                                    className="px-3 py-1.5 rounded-lg border border-border bg-card/60 text-sm text-foreground hover:bg-muted/40 transition-colors"
                                >
                                    排盘
                                </button>
                            </div>
                        </div>

                        {contentColumn}
                    </div>

                    <SideDrawer
                        open={isLeftPanelOpen}
                        title="目录"
                        side="left"
                        onClose={() => setIsLeftPanelOpen(false)}
                    >
                        <div className="h-full min-h-0 overflow-hidden flex flex-col">
                            <CategoryTabs
                                categories={CATEGORIES}
                                selectedId={selectedCategory}
                                onSelect={(id) => {
                                    setSelectedCategory(id);
                                }}
                                variant="drawer"
                            />
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <CaseListSidebar
                                    allCases={allCases}
                                    displayCases={displayCases}
                                    selectedCategory={selectedCategory}
                                    selectedCaseId={selectedCaseId}
                                    selectedDayMaster={selectedDayMaster}
                                    searchTerm={searchTerm}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onSelectCase={(id) => {
                                        handleSelectCase(id);
                                        setIsLeftPanelOpen(false);
                                    }}
                                    onSelectDayMaster={(id) => {
                                        handleSelectDayMaster(id);
                                    }}
                                    onSearchChange={setSearchTerm}
                                    onPageChange={setCurrentPage}
                                    onSelectAuthor={(author) => {
                                        handleSelectAuthor(author);
                                        setIsLeftPanelOpen(false);
                                    }}
                                    variant="drawer"
                                />
                            </div>
                        </div>
                    </SideDrawer>

                    <SideDrawer
                        open={isChartPanelOpen}
                        title="排盘信息"
                        side="right"
                        onClose={() => setIsChartPanelOpen(false)}
                    >
                        {chartPanel}
                    </SideDrawer>
                </>
            )}

            {/* 局数选择弹窗 */}
            <JuSelectDialog
                isOpen={isJuDialogOpen}
                onClose={() => setIsJuDialogOpen(false)}
                currentJu={customJu}
                onSelectJu={setCustomJu}
            />

            {/* 学习面板弹窗 */}
            <LearningPanelModal
                isOpen={isLearningPanelOpen}
                onClose={() => setIsLearningPanelOpen(false)}
                onSelectArticle={handleSelectCase}
                getArticleInfo={getArticleInfo}
            />
        </div>
    );
}
