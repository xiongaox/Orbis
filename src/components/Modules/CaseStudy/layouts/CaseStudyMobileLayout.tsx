
import { useState } from 'react';
import { Compass, Dices } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { CATEGORIES } from '../../../../lib/caseStudy/constants';
import { KNOWLEDGE_ITEMS } from '../../../../lib/caseStudy/knowledgeData';
import SideDrawer from '../../../UI/SideDrawer';
import { INLINE_DRAWER_WIDTH, inlineDrawerOffset } from '../../../UI/inlineDrawerLayout';
import CategoryTabs from '../components/CategoryTabs';
import CaseListSidebar from '../components/CaseListSidebar';
import { caseMarkdownComponents, authorMarkdownComponents } from '../components/MarkdownRenderers';
import { filterContentForDisplay } from '../../../../lib/caseStudy/parsers';
import CaseStudyBaziChart from '../components/CaseStudyBaziChart';
import CaseStudyDayunPanel from '../components/CaseStudyDayunPanel';
import CaseStudyQimenChart from '../components/CaseStudyQimenChart';
import CasePreviewUnlock from '../components/CasePreviewUnlock';
import DuanFaContent from '../components/DuanFaContent';
import TikuPage from '../TikuPage';
import KnowledgePage from '../knowledge/KnowledgePage';
import NavSidebar from '../components/NavSidebar';
import { SHU_SHU_CATEGORIES } from '../../../../lib/caseStudy/duanfaCategories';
import DuanFaOutline from '../components/DuanFaOutline';
import LearningPanelFAB from '../components/LearningPanelFAB';
import FavoriteButton from '../components/FavoriteButton';
import ReadingProgressButton from '../components/ReadingProgressButton';
import ArticleContentLoading from '../components/ArticleContentLoading';
import { type CaseStudyLayoutProps } from './CaseStudyLayoutProps';
import { useRegisterMobileDrawers } from '../../../../contexts/MobileNavContext';

// 移动端底栏已接管「目录 / 排盘信息」入口，边缘竖线把手默认隐藏；需要恢复入口时置 true
const SHOW_EDGE_HANDLES = false;

const toChineseNum = (num: number) => {
    const chineseRaw = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    return chineseRaw[num] || num.toString();
};

export default function CaseStudyMobileLayout(props: CaseStudyLayoutProps) {
    const {
        allCases, filteredCases, activeCase, authorIntroContent, isCaseContentLoading,
        currentPage, totalPages, setCurrentPage,
        selectedCategory, setSelectedCategory, selectedDayMaster, handleSelectDayMaster,
        searchTerm, setSearchTerm, selectedCaseId, handleSelectCase, handleSelectRandomCase,
        selectedAuthor, handleSelectAuthor,
        activeChartIndex, setActiveChartIndex, chartCount,
        baziData, selectedDaYunIndex, setSelectedDaYunIndex,
        selectedLiuNianYear, setSelectedLiuNianYear,
        qimenResult, qimenMethod, setQimenMethod,
        setIsJuDialogOpen, setIsLearningPanelOpen,
        contentScrollRef, savedProgress, currentProgress, restoreProgress,
        isLeftPanelOpen, setIsLeftPanelOpen, isChartPanelOpen, setIsChartPanelOpen,
        duanFa, duanFaContentRef, duanFaSavedProgress, duanFaCurrentProgress, duanFaRestoreProgress,
        isPreviewMode, libraryTotal, libraryGroupTotals, previewsPerGroup, openActivation, removeActivation, isRemoving,
        changshiItemId, setChangshiItemId,
    } = props;

    // 移动端底栏注册：目录（左抽屉）与 排盘信息/大纲（右抽屉）由底部导航槽位打开。
    // 文案跟随分类：八字/奇门/题库是排盘类 → 左「案例/题库」右「排盘信息」；
    // 常识/断法是阅读类 → 左为分类名（2 字），右为「大纲总览」
    const hasChartPanel = selectedCategory === 'bazi' || selectedCategory === 'qimen' || selectedCategory === 'tiku';
    const caseDrawerLabel = hasChartPanel
        ? (selectedCategory === 'tiku' ? '题库' : '案例')
        : (CATEGORIES.find((cat) => cat.id === selectedCategory)?.name ?? '常识');
    useRegisterMobileDrawers('xiaoliuren', {
        // 底栏槽位点击：左右抽屉互斥——打开一侧时先关掉另一侧，
        // 否则两个并排式抽屉同时打开会互相挤压主内容的让位量。
        // 这里的 setter 来自 props 且声明为 (v: boolean) => void，不能传函数式更新
        openCase: () => {
            const next = !isLeftPanelOpen;
            setIsChartPanelOpen(false);
            setIsLeftPanelOpen(next);
        },
        openPanel: () => {
            const next = !isChartPanelOpen;
            setIsLeftPanelOpen(false);
            setIsChartPanelOpen(next);
        },
        caseLabel: caseDrawerLabel,
        // 底栏第二页据此高亮当前分类槽
        caseCategory: selectedCategory,
        panelLabel: hasChartPanel ? '排盘信息' : '大纲总览',
        // 并排式抽屉状态：打开时滑动改为「关闭」，而不是再开一层
        inlineOpen: isLeftPanelOpen || isChartPanelOpen,
        inlineSide: isLeftPanelOpen ? 'left' : isChartPanelOpen ? 'right' : undefined,
        closeInline: () => {
            setIsLeftPanelOpen(false);
            setIsChartPanelOpen(false);
        },
    });

    // 并排式抽屉的宿主节点：主内容会被 translate 平移，而 transform 会让它成为
    // 绝对定位后代的包含块——常识分类的「大纲」抽屉由 KnowledgePage 渲染在主内容内部，
    // 不 portal 出来就会跟着一起被推出屏幕。这个外层容器不平移、尺寸与主内容一致，
    // 抽屉挂在这里就和八字/奇门一样贴边对齐。
    const [drawerHost, setDrawerHost] = useState<HTMLDivElement | null>(null);

    // 并排式抽屉：主内容平移量与侧栏宽度共用 INLINE_DRAWER_WIDTH。
    // 左栏固定 xxs（目录/案例列表）；右栏断法大纲与常识大纲是窄目录用 xxs，八字盘用 sm。
    // 奇门盘用 full：九宫格字段密集，窄栏会把宫格挤到换行、看不清，
    // 这里宁可把主界面整个挤出去也要给盘面足够宽度（抽屉两侧仍各留 8px 内缩）。
    // 排盘类（八字 / 奇门 / 题库）统一取 full：盘面字段密集，窄栏会把内容挤到换行，
    // 三者同宽便于切换时视觉一致（主界面整体让出，抽屉两侧仍各留 8px）
    const panelSize = selectedCategory === 'qimen' || selectedCategory === 'bazi' || selectedCategory === 'tiku' ? 'full' : 'xxs';
    const inlineOffset = isLeftPanelOpen
        ? inlineDrawerOffset(INLINE_DRAWER_WIDTH.xxs, 'left')
        : isChartPanelOpen
            ? inlineDrawerOffset(INLINE_DRAWER_WIDTH[panelSize], 'right')
            : undefined;

    const contentColumn = (
        <div className="flex-1 flex flex-col bg-background/50 relative overflow-hidden">
            {activeCase ? (
                <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-2.5 pb-3 lg:pb-4 border-b border-border/40">
                            <h1 className="text-center text-2xl font-serif font-bold text-primary/90">{activeCase.title}</h1>
                            <div className="flex items-center justify-center gap-2.5">
                                <span className="text-xs text-muted-foreground">{activeCase.author}</span>
                                {(activeCase.isPreview || activeCase.content.length > 0) && (
                                    <span className="text-xs text-muted-foreground/40">·</span>
                                )}
                                {activeCase.isPreview ? (
                                    <span className="shrink-0 text-[10px] leading-none px-1.5 py-1 rounded border border-primary/30 bg-primary/10 text-primary">试读</span>
                                ) : (
                                    activeCase.content.length > 0 && (
                                        <span className="text-xs text-muted-foreground">全文约 {activeCase.content.replace(/\s/g, '').length} 字</span>
                                    )
                                )}
                                <FavoriteButton articleId={activeCase.id} />
                            </div>
                        </div>
                        {isCaseContentLoading ? (
                            <ArticleContentLoading />
                        ) : (
                            <div
                                    onContextMenu={(event) => event.preventDefault()}
                                    className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[16px] lg:text-[18px]"
                                >
                                <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm, remarkBreaks]} components={caseMarkdownComponents}>
                                    {filterContentForDisplay(activeCase.content)}
                                </ReactMarkdown>
                            </div>
                        )}
                        {activeCase.isPreview && (
                            <CasePreviewUnlock
                                previewChars={activeCase.previewChars}
                                fullChars={activeCase.fullChars}
                                libraryTotal={libraryTotal}
                                onActivate={openActivation}
                            />
                        )}
                    </div>
                </div>
            ) : selectedAuthor && authorIntroContent ? (
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <h1 className="text-2xl font-serif font-bold text-center text-primary/90 pb-3 lg:pb-4 border-b border-border/40">{selectedAuthor}</h1>
                        <div
                                    onContextMenu={(event) => event.preventDefault()}
                                    className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[16px] lg:text-[18px]"
                                >
                            <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm, remarkBreaks]} components={authorMarkdownComponents}>
                                {filterContentForDisplay(authorIntroContent)}
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

            <div className="absolute right-4 bottom-4 z-10 flex flex-col items-center gap-3">
                <ReadingProgressButton progress={currentProgress} savedProgress={savedProgress} isFinished={currentProgress > 0 ? currentProgress >= 90 : savedProgress >= 90} onRestore={restoreProgress} />
                {activeCase && (
                    <button type="button" onClick={handleSelectRandomCase} className="w-12 h-12 rounded-full bg-card border border-border text-foreground shadow-sm flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label="随机选择案例" title="随机选择案例">
                        <Dices className="w-5 h-5" />
                    </button>
                )}
                <LearningPanelFAB onClick={() => setIsLearningPanelOpen(true)} />
            </div>
        </div>
    );

    const chartPanel = (
        <div className="h-full bg-muted/10 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col">
                {isPreviewMode ? (
                    <CasePreviewUnlock variant="panel" libraryTotal={libraryTotal} onActivate={openActivation} />
                ) : selectedCategory === 'bazi' && activeCase ? (
                    <>
                        <div className="flex-shrink-0"><CaseStudyBaziChart data={baziData} selectedDaYunIndex={selectedDaYunIndex} selectedLiuNianYear={selectedLiuNianYear} isMobile={true} /></div>
                        <div className="flex-1 border-t border-border"><CaseStudyDayunPanel data={baziData} selectedDaYunIndex={selectedDaYunIndex} selectedLiuNianYear={selectedLiuNianYear} onSelectDaYun={setSelectedDaYunIndex} onSelectLiuNian={setSelectedLiuNianYear} isMobile={true} /></div>
                    </>
                ) : selectedCategory === 'bazi' ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground"><Compass className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-sm">选择案例查看排盘</p></div>
                ) : selectedCategory === 'qimen' && activeCase ? (
                    qimenResult ? (
                        <div className="h-full flex flex-col"><CaseStudyQimenChart palaces={qimenResult.palaces} header={qimenResult.header} globalPatterns={qimenResult.globalPatterns} onJuClick={() => setIsJuDialogOpen(true)} isMobile={true} method={qimenMethod} onMethodChange={setQimenMethod} /></div>
                    ) : (<div className="h-full flex flex-col items-center justify-center text-muted-foreground"><p className="text-sm">排盘计算中或无时间信息...</p></div>)
                ) : selectedCategory === 'qimen' ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground"><Compass className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-sm">选择案例查看排盘</p></div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground"><Compass className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-sm">排盘区域</p></div>
                )}
            </div>

            {activeCase && chartCount > 1 && !isPreviewMode && (
                <div className="flex-shrink-0 flex border-t border-border">
                    {Array.from({ length: chartCount }).map((_, i) => (
                        <button key={i} onClick={() => setActiveChartIndex(i)} className={`flex-1 text-xs py-2.5 font-medium transition-colors border-0 ${activeChartIndex === i ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'} ${i > 0 ? 'border-l border-border' : ''}`}>
                            盘式{toChineseNum(i + 1)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div ref={setDrawerHost} className="relative flex-1 min-h-0 min-w-0 flex flex-col">
            {/* 并排式抽屉：主内容整体平移让位（宽度不变、不重排），侧栏从侧边推出。
                只移动不缩放，正文可读性不受影响；关闭后 transform 归零。
                主内容不再包内缩圆角外框（那圈 m-2 + 边框白占 16px 间距），
                侧栏仍是浮起圆角卡片，与八字/奇门移动端同款。 */}
            <div
                className="relative flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col transition-transform duration-300 ease-out bg-background"
                style={inlineOffset ? { transform: inlineOffset } : undefined}
            >
                {/* 并排式抽屉打开时，主内容上的透明点击区负责关闭（无遮罩，不影响观感） */}
                {(isLeftPanelOpen || isChartPanelOpen) && (
                    <button
                        type="button"
                        aria-label="关闭侧栏"
                        onClick={() => {
                            setIsLeftPanelOpen(false);
                            setIsChartPanelOpen(false);
                        }}
                        className="absolute inset-0 z-40"
                    />
                )}
                {/* 左右竖线把手（已由底栏接管，默认隐藏） */}
                {SHOW_EDGE_HANDLES && (
                    <button type="button" onClick={() => setIsLeftPanelOpen(true)} className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-start group focus:outline-none" aria-label="打开目录">
                        <span className="w-[3px] h-20 rounded-r bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">目录</span></span>
                    </button>
                )}
                {SHOW_EDGE_HANDLES && (
                    <button type="button" onClick={() => setIsChartPanelOpen(true)} className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-end group focus:outline-none" aria-label={selectedCategory === 'duanfa' ? '打开大纲' : '打开排盘'}>
                        <span className="w-[3px] h-20 rounded-l bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">{selectedCategory === 'duanfa' ? '大纲' : '排盘'}</span></span>
                    </button>
                )}

                {selectedCategory === 'tiku' ? (
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {/* 题库与断法/常识同级：目录与排盘都由底栏插槽打开，状态仍归本布局管，
                            抽屉经 portalTarget 挂到不平移的宿主节点上 */}
                        <TikuPage
                            drawers={{
                                catalogOpen: isLeftPanelOpen,
                                chartOpen: isChartPanelOpen,
                                onCloseCatalog: () => setIsLeftPanelOpen(false),
                                onCloseChart: () => setIsChartPanelOpen(false),
                                portalTarget: drawerHost,
                                chartSize: panelSize,
                                catalogHeader: (
                                    <CategoryTabs
                                        categories={CATEGORIES}
                                        selectedId={selectedCategory}
                                        onSelect={(id) => { setSelectedCategory(id); }}
                                        variant="drawer"
                                    />
                                ),
                            }}
                        />
                    </div>
                ) : selectedCategory === 'duanfa' ? (
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        <DuanFaContent ref={duanFaContentRef} content={duanFa.selectedFile?.content || ''} title={duanFa.selectedFile?.name || '奇门断法'} onOutlineChange={duanFa.setOutline} />
                        <div className="absolute right-4 bottom-4 z-10 flex flex-col items-center gap-3">
                            {duanFa.selectedFileId && (
                                <ReadingProgressButton progress={duanFaCurrentProgress} savedProgress={duanFaSavedProgress} isFinished={duanFaCurrentProgress > 0 ? duanFaCurrentProgress >= 90 : duanFaSavedProgress >= 90} onRestore={duanFaRestoreProgress} />
                            )}
                            <LearningPanelFAB onClick={() => setIsLearningPanelOpen(true)} />
                        </div>
                    </div>
                ) : selectedCategory === 'changshi' ? (
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        <KnowledgePage
                            initialItemId={props.changshiItemId}
                            onItemChange={props.setChangshiItemId}
                            outlineDrawer={{ open: isChartPanelOpen, onClose: () => setIsChartPanelOpen(false), inline: true, portalTarget: drawerHost }}
                        />
                    </div>
                ) : (
                    contentColumn
                )}
            </div>

            {selectedCategory !== 'tiku' && (
            <SideDrawer open={isLeftPanelOpen} title="目录" side="left" size="xxs" inline onClose={() => setIsLeftPanelOpen(false)}>
                <div className="h-full min-h-0 overflow-hidden flex flex-col">
                    <CategoryTabs categories={CATEGORIES} selectedId={selectedCategory} onSelect={(id) => { setSelectedCategory(id); }} variant="drawer" />
                    {selectedCategory === 'duanfa' ? (
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-row">
                            <NavSidebar title="术数" widthClass="w-[100px] min-w-[100px]" items={SHU_SHU_CATEGORIES} selectedId={duanFa.selectedShuShuId} onSelect={duanFa.handleSelectShuShu} showActiveBar />
                            <div className="flex-1 min-w-0 h-full overflow-hidden">
                                <NavSidebar title="断法列表" widthClass="w-[160px] min-w-[160px]" items={duanFa.files.map((f) => ({ id: f.id, label: f.name }))} selectedId={duanFa.selectedFileId} onSelect={(id) => { duanFa.handleSelectFile(id); setIsLeftPanelOpen(false); }} variant="drawer" />
                            </div>
                        </div>
                    ) : selectedCategory === 'changshi' ? (
                        <div className="flex-1 min-h-0 overflow-y-auto p-2 scrollbar-thin knowledge-drawer-content">
                            <div className="l2-list">
                                {KNOWLEDGE_ITEMS.map((item) => {
                                    const isActive = item.id === (changshiItemId || 'shichen');
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`l2-item-btn ${isActive ? 'active' : ''}`}
                                            onClick={() => {
                                                setChangshiItemId?.(item.id);
                                                setIsLeftPanelOpen(false);
                                            }}
                                        >
                                            <span>{item.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-hidden">
                            <CaseListSidebar allCases={allCases} displayCases={filteredCases} selectedCategory={selectedCategory} selectedCaseId={selectedCaseId} selectedDayMaster={selectedDayMaster} searchTerm={searchTerm} currentPage={currentPage} totalPages={totalPages} onSelectCase={(id) => { handleSelectCase(id); setIsLeftPanelOpen(false); }} onSelectDayMaster={(id) => { handleSelectDayMaster(id); }} onSearchChange={setSearchTerm} onPageChange={setCurrentPage} onSelectAuthor={(author) => { handleSelectAuthor(author); setIsLeftPanelOpen(false); }} variant="drawer" hidePagination isPreviewMode={isPreviewMode} onRequestActivate={openActivation} onRemoveActivation={removeActivation} isRemoving={isRemoving} libraryGroupTotals={libraryGroupTotals} libraryTotal={libraryTotal} previewsPerGroup={previewsPerGroup} />
                        </div>
                    )}
                </div>
            </SideDrawer>
            )}

            {/* 常识分类的「大纲」抽屉由 KnowledgePage 自己渲染，题库自带排盘抽屉；这里只管断法与八字/奇门的排盘 */}
            {selectedCategory !== 'changshi' && selectedCategory !== 'tiku' && (
                <SideDrawer open={isChartPanelOpen} title={selectedCategory === 'duanfa' ? '大纲' : '排盘信息'} side="right" size={panelSize} inline onClose={() => setIsChartPanelOpen(false)}>
                    {selectedCategory === 'duanfa' ? (
                        <DuanFaOutline outline={duanFa.outline} activeSectionId={duanFa.activeSectionId} onItemClick={(id) => { duanFa.handleOutlineClick(id); setIsChartPanelOpen(false); }} variant="drawer" />
                    ) : (
                        chartPanel
                    )}
                </SideDrawer>
            )}
        </div>
    );
}
