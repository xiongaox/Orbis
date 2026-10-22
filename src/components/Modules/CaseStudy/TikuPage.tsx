import { useCallback, useMemo, useRef, useState } from 'react';
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
 * 题库页：题库 → 届次 → 命例卷，第四级是命例卷里的题目。
 * 第一级含「每日一题」：从全部题库按日期抽一个命例卷，当天固定、次日更换。
 * 与断法同构的三级侧栏，右侧是排盘（八字 / 奇门可切换）。
 */
export default function TikuPage() {
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

    const [isLeftOpen, setIsLeftOpen] = useState(false);
    const [isChartOpen, setIsChartOpen] = useState(false);

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
            setIsLeftOpen(false);
            contentScrollRef.current?.scrollTo({ top: 0 });
        },
        [tiku],
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
                        {/* 答题工具条：左侧切模式，右侧进度与主操作 */}
                        <div className="px-4 py-4 border-b border-border/40">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1">
                                    {(isDaily ? QUIZ_MODES.filter((m) => m.id !== 'edition') : QUIZ_MODES).map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => quiz.changeMode(m.id)}
                                            className={`text-[12px] px-2 py-1 rounded border transition-colors ${
                                                quiz.mode === m.id
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-background text-muted-foreground border-border hover:bg-muted/40'
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                                        {quiz.mode === 'instant' || quiz.submitted
                                            ? `已答 ${quiz.stats.revealed}/${quiz.stats.total} · 答对 ${quiz.stats.right}`
                                            : `已答 ${quiz.stats.answered}/${quiz.stats.total}`}
                                    </span>
                                    {isDaily && (
                                        <button
                                            type="button"
                                            onClick={handleDailyNext}
                                            className="text-[12px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
                                        >
                                            换一题
                                        </button>
                                    )}
                                    {quiz.mode === 'instant' ? (
                                        quiz.stats.revealed > 0 && (
                                            <button
                                                type="button"
                                                onClick={quiz.reset}
                                                className="text-[12px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
                                            >
                                                清空作答
                                            </button>
                                        )
                                    ) : quiz.submitted ? (
                                        <button
                                            type="button"
                                            onClick={quiz.reset}
                                            className="text-[12px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
                                        >
                                            重做
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={quiz.submit}
                                            disabled={quiz.stats.answered === 0}
                                            className="text-[12px] px-2 py-1 rounded border border-primary bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    const mobileHeader = (
        <div className="flex-shrink-0 h-11 px-2 border-b border-border/40 bg-card/40 flex items-center gap-2">
            <button
                type="button"
                onClick={() => setIsLeftOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40"
                aria-label="打开题库目录"
            >
                ☰
            </button>
            <div className="flex-1 min-w-0">
                <div className="text-[11px] text-muted-foreground leading-none">学习 / 题库</div>
                <div className="text-[13px] font-serif font-semibold text-foreground truncate mt-0.5">
                    {isDaily
                        ? `每日一题 · ${todayKey()}`
                        : `${bank?.name ?? '题库'}${edition ? ` · ${edition.name}` : ''}`}
                </div>
            </div>
            <button
                type="button"
                onClick={() => setIsChartOpen(true)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-[12px] text-foreground hover:bg-muted/40"
            >
                排盘
            </button>
        </div>
    );

    return (
        <div className="flex flex-col w-full h-full overflow-hidden bg-background">
            {mobileHeader}
            {content}

            <SideDrawer
                open={isLeftOpen}
                title="题库目录"
                side="left"
                onClose={() => setIsLeftOpen(false)}
            >
                <div className="h-full min-h-0 flex flex-col overflow-hidden">
                    <NavSidebar
                        title="题库"
                        widthClass="w-full"
                        items={bankItems}
                        selectedId={isDaily ? DAILY_ID : tiku.selectedBankId}
                        onSelect={handleSelectBank}
                        variant="drawer"
                        showActiveBar
                    />
                    {!isDaily && (
                        <>
                            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                <NavSidebar
                                    title="届次"
                                    widthClass="w-full"
                                    items={editionItems}
                                    selectedId={tiku.selectedEditionId}
                                    onSelect={tiku.handleSelectEdition}
                                    variant="drawer"
                                />
                            </div>
                            <div className="flex-[1.4] min-h-0 overflow-hidden flex flex-col">
                                <NavSidebar
                                    title="命例"
                                    widthClass="w-full"
                                    items={volumeItems}
                                    selectedId={tiku.selectedVolumeId}
                                    onSelect={handleSelectVolume}
                                    variant="drawer"
                                />
                            </div>
                        </>
                    )}
                </div>
            </SideDrawer>

            <SideDrawer
                open={isChartOpen}
                title="排盘信息"
                side="right"
                onClose={() => setIsChartOpen(false)}
            >
                <div className="h-full min-h-0 overflow-hidden">
                    <TikuChartPanel volume={shownVolume} isMobile />
                </div>
            </SideDrawer>
        </div>
    );
}
