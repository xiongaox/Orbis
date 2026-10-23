import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import NavSidebar from './components/NavSidebar';
import SideDrawer from '../../UI/SideDrawer';
import TikuVolumeHead from './components/TikuVolumeHead';
import TikuQuestionList from './components/TikuQuestionList';
import TikuChartPanel from './components/TikuChartPanel';
import { useTiku } from './hooks/useTiku';
import { useTikuQuiz, type TikuQuizMode } from './hooks/useTikuQuiz';
import { TIKU_BANKS } from '../../../lib/caseStudy/tikuData';
import { pickDailyTiku, todayKey } from '../../../lib/caseStudy/dailyTiku';

/** 每日一题的虚拟题库 id：不进 TIKU_BANKS，只作为侧栏第一级的一项 */
const DAILY_ID = '__daily__';

const QUIZ_MODES: Array<{ id: TikuQuizMode; label: string }> = [
    { id: 'instant', label: '逐题批改' },
    { id: 'exam', label: '交卷评分' },
    { id: 'edition', label: '整届模考' },
];

/**
 * 移动端抽屉接管：题库与断法/常识同级，目录（左）与排盘（右）一律由底栏插槽打开，
 * 页面自己不再造打开方式。open 状态与平移让位量由 CaseStudyMobileLayout 持有并注册。
 * portalTarget 为不平移的宿主节点：正文在 translate 卡片内，抽屉必须挂到卡片外才不跟着平移。
 */
export interface TikuPageDrawers {
    catalogOpen: boolean;
    chartOpen: boolean;
    onCloseCatalog: () => void;
    onCloseChart: () => void;
    portalTarget?: HTMLElement | null;
    /** 目录抽屉顶部的分类切换条（移动端与断法/常识同款，由布局层传入） */
    catalogHeader?: ReactNode;
    /** 排盘抽屉宽度档：必须与布局层算 inlineDrawerOffset 用的 panelSize 同值，否则让位量对不上 */
    chartSize?: 'xxs' | 'xs' | 'sm' | 'ms' | 'md' | 'lg' | 'full';
}

/**
 * 题库页：题库 → 届次 → 命例卷，第四级是命例卷里的题目。
 * 第一级含「每日一题」：从全部题库按日期抽一个命例卷，当天固定、次日更换。
 * 与断法同构的三级侧栏，右侧是排盘（八字 / 奇门可切换）。
 */
export default function TikuPage({ drawers }: { drawers?: TikuPageDrawers }) {
    const { useDesktopLayout } = useLayoutMode();
    const tiku = useTiku();
    const { bank, edition, editions, volumes, volume } = tiku;

    // 每日一题：选中时接管正文，隐藏届次 / 命例两级
    const [isDaily, setIsDaily] = useState(false);
    // 换一题：沿候选池顺延，切走再回来仍停在换过的那题
    const [dailyOffset, setDailyOffset] = useState(0);
    const daily = useMemo(() => pickDailyTiku(todayKey(), dailyOffset), [dailyOffset]);
    const dailyVolume = isDaily ? daily?.volume ?? null : null;
    const shownVolume = isDaily ? dailyVolume : volume;

    // 逐题 / 交卷模式作用当前命例卷，整届模考作用本届全部命例卷
    const volumeQuestions = useMemo(() => shownVolume?.questions ?? [], [shownVolume]);
    const editionQuestions = useMemo(() => volumes.flatMap((v) => v.questions), [volumes]);
    const quiz = useTikuQuiz(volumeQuestions, isDaily ? undefined : editionQuestions);

    const contentScrollRef = useRef<HTMLDivElement>(null);

    // 目录 / 排盘抽屉：移动端由底栏插槽接管（状态与平移让位量在布局层）；
    // Pad 横屏没有底栏，自持状态并沿用浮层式抽屉，入口留在页头
    const barDriven = Boolean(drawers);
    const [fallbackCatalogOpen, setFallbackCatalogOpen] = useState(false);
    const [fallbackChartOpen, setFallbackChartOpen] = useState(false);
    const catalogOpen = drawers?.catalogOpen ?? fallbackCatalogOpen;
    const chartOpen = drawers?.chartOpen ?? fallbackChartOpen;
    const closeCatalog = useCallback(() => {
        if (drawers) drawers.onCloseCatalog();
        else setFallbackCatalogOpen(false);
    }, [drawers]);
    const closeChart = useCallback(() => {
        if (drawers) drawers.onCloseChart();
        else setFallbackChartOpen(false);
    }, [drawers]);

    const bankItems = useMemo(
        () => [
            { id: DAILY_ID, label: '每日一题' },
            ...TIKU_BANKS.map((b) => ({ id: b.id, label: b.name })),
        ],
        [],
    );

    const editionItems = useMemo(
        () => editions.map((e) => ({ id: e.id, label: `${e.name} ${e.year}` })),
        [editions],
    );

    const volumeItems = useMemo(
        () =>
            volumes.map((v) => ({
                id: v.id,
                label: `${v.gender ?? '命例'} Q${v.questions[0]?.no ?? 0}–Q${v.questions[v.questions.length - 1]?.no ?? 0}`,
            })),
        [volumes],
    );

    const handleSelectVolume = useCallback(
        (id: string) => {
            tiku.handleSelectVolume(id);
            closeCatalog();
            contentScrollRef.current?.scrollTo({ top: 0 });
        },
        [tiku, closeCatalog],
    );

    /** 换一题：顺延候选池，作答随题集变化自动清空，正文回到顶部 */
    const handleDailyNext = useCallback(() => {
        setDailyOffset((n) => n + 1);
        contentScrollRef.current?.scrollTo({ top: 0 });
    }, []);

    /** 第一级切换：每日一题走虚拟项，其余交回题库导航 */
    const handleSelectBank = useCallback(
        (id: string) => {
            if (id === DAILY_ID) {
                setIsDaily(true);
                return;
            }
            setIsDaily(false);
            tiku.handleSelectBank(id);
        },
        [tiku],
    );

    const content = (
        <div ref={contentScrollRef} className="flex-1 flex flex-col overflow-y-auto bg-background/50">
            {shownVolume ? (
                <>
                    {/* 工具条钉最顶，命例信息在其下常驻：滚动做题时两者始终可见 */}
                    <div className="sticky top-0 z-10 bg-background">
                        {/* 答题工具条：手机上分两行——上排模式切换等宽铺满，下排进度与操作。
                            以前挤成一行 flex-wrap，选中答案后多出「清空作答」就换行错位，按钮也被压到
                            只有 py-1；这里按奇门移动端按钮行（py-1.5~2、text-[13px]）的尺寸给足触控面积 */}
                        <div className="px-3 py-2.5 border-b border-border/40 space-y-2">
                            <div className="grid grid-cols-3 gap-1.5">
                                {(isDaily ? QUIZ_MODES.filter((m) => m.id !== 'edition') : QUIZ_MODES).map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => quiz.changeMode(m.id)}
                                        className={`py-2 rounded-lg border text-[13px] transition-colors ${
                                            quiz.mode === m.id
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border bg-card/60 text-muted-foreground'
                                        }`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                            {/* 固定高度：右侧按钮只在特定状态下出现（交卷 / 清空作答 / 重做），
                                不定高会让整块工具条随按钮出现而弹跳一次。留空位代替隐藏 */}
                            <div className="flex items-center justify-between gap-2 h-8">
                                <span className="text-[14px] text-muted-foreground whitespace-nowrap">
                                    {quiz.mode === 'instant' || quiz.submitted
                                        ? `已答 ${quiz.stats.revealed}/${quiz.stats.total} · 答对 ${quiz.stats.right}`
                                        : `已答 ${quiz.stats.answered}/${quiz.stats.total}`}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0 h-full">
                                    {isDaily && (
                                        <button
                                            type="button"
                                            onClick={handleDailyNext}
                                            className="h-full py-0 px-3 rounded-lg border border-border bg-card/60 text-[13px] text-muted-foreground transition-colors"
                                        >
                                            换一题
                                        </button>
                                    )}
                                    {quiz.mode === 'instant' ? (
                                        quiz.stats.revealed > 0 ? (
                                            <button
                                                type="button"
                                                onClick={quiz.reset}
                                                className="h-full py-0 px-3 rounded-lg border border-border bg-card/60 text-[13px] text-muted-foreground transition-colors"
                                            >
                                                清空作答
                                            </button>
                                        ) : null
                                    ) : quiz.submitted ? (
                                        <button
                                            type="button"
                                            onClick={quiz.reset}
                                            className="h-full py-0 px-3 rounded-lg border border-border bg-card/60 text-[13px] text-muted-foreground transition-colors"
                                        >
                                            重做
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={quiz.submit}
                                            disabled={quiz.stats.answered === 0}
                                            className="h-full py-0 px-3 rounded-lg border border-primary bg-primary text-[13px] text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            交卷
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* 整届模考也按卷切换，卷头沿用原版命例卷头；得分卡片落在卷头右下角 */}
                        <TikuVolumeHead
                            volume={shownVolume}
                            index={shownVolume.index}
                            score={
                                quiz.mode !== 'instant' && quiz.submitted
                                    ? { right: quiz.stats.right, total: quiz.stats.total }
                                    : undefined
                            }
                        />
                    </div>
                    <div className="px-4 pb-4">
                        <TikuQuestionList
                            volume={shownVolume}
                            answers={quiz.answers}
                            onPick={quiz.pick}
                        />
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    暂无题库内容
                </div>
            )}
        </div>
    );

    /* ========== 桌面：四栏 ========== */
    if (useDesktopLayout) {
        return (
            <div className="flex w-full h-full overflow-hidden bg-background">
                <NavSidebar
                    title="题库"
                    widthClass="w-[150px] min-w-[150px]"
                    items={bankItems}
                    selectedId={isDaily ? DAILY_ID : tiku.selectedBankId}
                    onSelect={handleSelectBank}
                    showActiveBar
                />
                {/* 每日一题不涉及届次与命例，两级侧栏让位给正文 */}
                {!isDaily && (
                    <>
                        <NavSidebar
                            title="届次"
                            widthClass="w-[120px] min-w-[120px]"
                            items={editionItems}
                            selectedId={tiku.selectedEditionId}
                            onSelect={tiku.handleSelectEdition}
                        />
                        <NavSidebar
                            title="命例"
                            widthClass="w-[150px] min-w-[150px]"
                            items={volumeItems}
                            selectedId={tiku.selectedVolumeId}
                            onSelect={handleSelectVolume}
                        />
                    </>
                )}
                {/* 正文吃剩余宽度；排盘栏与八字案例页等宽：案例页在整页 flex 行里取 w-[25%]，
                    这里的容器已扣掉三个侧栏，用百分比基数会变小，故按视口 25vw 取同一口径 */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">{content}</div>
                <div className="w-[25vw] min-w-[300px] shrink-0 h-full flex flex-col overflow-hidden border-l border-border/50">
                    <TikuChartPanel volume={shownVolume} />
                </div>
            </div>
        );
    }

    /* ========== Pad 横屏 / 移动：单栏 + 抽屉 ========== */
    // 移动端入口统一在底栏（左槽目录、右槽排盘信息），与断法 / 常识同规则，页头不再放按钮；
    // Pad 横屏没有底栏，入口用断法 / 常识同款的贴边竖线把手，页头只留标题
    const mobileHeader = (
        <div className="relative flex-shrink-0 h-12 px-2 border-b border-border/40 flex items-center gap-2">
            {/* 只留主标题并居中：绝对定位横跨整行，不受两侧按钮占位影响 */}
            <div className="absolute inset-x-3 flex justify-center pointer-events-none">
                <div className="font-serif text-[20px] font-semibold text-foreground truncate">
                    {isDaily
                        ? `每日一题 · ${todayKey()}`
                        : `${bank?.name ?? '题库'}${edition ? ` · ${edition.name}` : ''}`}
                </div>
            </div>
        </div>
    );

    /** 贴边竖线把手：与断法 / 常识 pad 端同款（浮层式抽屉由页头按钮改为边缘触发） */
    const padHandles = (
        <>
            <button type="button" onClick={() => setFallbackCatalogOpen(true)} className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-start group focus:outline-none" aria-label="打开题库目录">
                <span className="w-[3px] h-20 rounded-r bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">目录</span></span>
            </button>
            <button type="button" onClick={() => setFallbackChartOpen(true)} className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-end group focus:outline-none" aria-label="打开排盘">
                <span className="w-[3px] h-20 rounded-l bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">排盘</span></span>
            </button>
        </>
    );

    const catalogDrawer = (
        <SideDrawer
            open={catalogOpen}
            title="题库目录"
            side="left"
            // 双栏结构：移动端并排式与断法同档用 xxs，右栏纵向二分后宽度够放「第17届」「女命 Q26–Q30」；
            // Pad 浮层式没有让位约束，按断法 pad 目录抽屉用 sm 多给 72px
            size={barDriven ? 'xxs' : 'sm'}
            inline={barDriven}
            onClose={closeCatalog}
        >
            <div className="h-full min-h-0 flex flex-col overflow-hidden">
                {drawers?.catalogHeader}
                {/* 双栏：左「题库」，右栏上下分「届次 / 命例」。
                    与断法抽屉的双列同构——断法是横排两列并列，这里右栏再纵向二分。
                    每级都要包一层 flex 容器：NavSidebar 的 drawer 变体是 h-full，
                    直接挂在 flex 容器里会撑满并把同级挤成 0 高 */}
                <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
                    {/* 每日一题与届次/命例无关，左栏独占整条抽屉 */}
                    <div className={`${isDaily ? 'flex-1' : 'flex-[1.1]'} min-w-0 h-full overflow-hidden ${isDaily ? '' : 'border-r border-border/40'}`}>
                        <NavSidebar
                            title="题库"
                            widthClass="w-full"
                            items={bankItems}
                            selectedId={isDaily ? DAILY_ID : tiku.selectedBankId}
                            onSelect={handleSelectBank}
                            variant="drawer"
                            showActiveBar
                        />
                    </div>
                {/* 每日一题只抽一道卷，与届次/命例无关：右栏整个不渲染 */}
                {!isDaily && (
                    <div className="flex-[1.6] min-w-0 h-full overflow-hidden flex flex-col">
                        {/* 届次：20 届左右，给 4 成高度够滚动查看 */}
                        <div className="flex-[0.9] min-h-0 overflow-hidden flex flex-col border-b border-border/40">
                            <NavSidebar
                                title="届次"
                                widthClass="w-full"
                                items={editionItems}
                                selectedId={tiku.selectedEditionId}
                                onSelect={tiku.handleSelectEdition}
                                variant="drawer"
                            />
                        </div>
                        {/* 命例：每届最多十几卷，余量都给它 */}
                        <div className="flex-[1.1] min-h-0 overflow-hidden flex flex-col">
                            <NavSidebar
                                title="命例"
                                widthClass="w-full"
                                items={volumeItems}
                                selectedId={tiku.selectedVolumeId}
                                onSelect={handleSelectVolume}
                                variant="drawer"
                            />
                        </div>
                    </div>
                )}
                </div>
            </div>
        </SideDrawer>
    );

    const chartDrawer = (
        <SideDrawer
            open={chartOpen}
            title="排盘信息"
            side="right"
            // 排盘宽度：移动端由布局层传 full；Pad 浮层式与八字案例 pad 端同档 lg
            size={drawers?.chartSize ?? 'lg'}
            inline={barDriven}
            onClose={closeChart}
        >
            <div className="h-full min-h-0 overflow-hidden">
                <TikuChartPanel volume={shownVolume} isMobile />
            </div>
        </SideDrawer>
    );

    // 并排式抽屉必须挂到不平移的宿主节点：正文在 translate 卡片里，直接挂会跟着一起平移
    const mountDrawer = (drawer: ReactNode) =>
        drawers?.portalTarget ? createPortal(drawer, drawers.portalTarget) : drawer;

    return (
        <div className="relative flex flex-col w-full h-full overflow-hidden bg-background">
            {mobileHeader}
            {!barDriven && padHandles}
            {content}
            {mountDrawer(catalogDrawer)}
            {mountDrawer(chartDrawer)}
        </div>
    );
}
