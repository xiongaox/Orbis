import { Compass } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { CATEGORIES } from '../../../../lib/caseStudy/types';
import SideDrawer from '../../../UI/SideDrawer';
import CategoryTabs from '../components/CategoryTabs';
import CaseListSidebar from '../components/CaseListSidebar';
import { caseMarkdownComponents, authorMarkdownComponents } from '../components/MarkdownRenderers';
import CaseStudyBaziChart from '../components/CaseStudyBaziChart';
import CaseStudyDayunPanel from '../components/CaseStudyDayunPanel';
import CaseStudyQimenChart from '../components/CaseStudyQimenChart';
import DuanFaContent from '../components/DuanFaContent';
import ShuShuSidebar from '../components/ShuShuSidebar';
import DuanFaSidebar from '../components/DuanFaSidebar';
import DuanFaOutline from '../components/DuanFaOutline';
import LearningPanelFAB from '../components/LearningPanelFAB';
import FavoriteButton from '../components/FavoriteButton';
import ReadingProgressButton from '../components/ReadingProgressButton';
import { type CaseStudyLayoutProps } from './CaseStudyLayoutProps';

const toChineseNum = (num: number) => {
    const chineseRaw = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    return chineseRaw[num] || num.toString();
};

export default function CaseStudyMobileLayout(props: CaseStudyLayoutProps) {
    const {
        isAuthenticated, allCases, filteredCases, activeCase, authorIntroContent,
        currentPage, totalPages, setCurrentPage,
        selectedCategory, setSelectedCategory, selectedDayMaster, handleSelectDayMaster,
        searchTerm, setSearchTerm, selectedCaseId, handleSelectCase,
        selectedAuthor, handleSelectAuthor,
        activeChartIndex, setActiveChartIndex, chartCount,
        baziData, selectedDaYunIndex, setSelectedDaYunIndex,
        selectedLiuNianYear, setSelectedLiuNianYear,
        qimenResult, qimenMethod, setQimenMethod,
        setIsJuDialogOpen, setIsLearningPanelOpen,
        contentScrollRef, savedProgress, currentProgress, restoreProgress,
        isLeftPanelOpen, setIsLeftPanelOpen, isChartPanelOpen, setIsChartPanelOpen,
        duanFa, duanFaContentRef, duanFaSavedProgress, duanFaCurrentProgress, duanFaRestoreProgress
    } = props;

    const contentColumn = (
        <div className="flex-1 flex flex-col bg-background/50 relative overflow-hidden">
            {activeCase ? (
                <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-center gap-3 pb-3 lg:pb-4 border-b border-border/40">
                            <h1 className="text-lg lg:text-2xl font-serif font-bold text-primary/90">{activeCase.title}</h1>
                            {isAuthenticated && <FavoriteButton articleId={activeCase.id} />}
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[16px] lg:text-[18px]">
                            <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm, remarkBreaks]} components={caseMarkdownComponents}>
                                {activeCase.content.replace(/^(命主生辰|性别|日主|格局|令地)[：:][^\n]*\n?/gm, '').replace(/^#\s+[^\n]+\n?/, '').replace(/^\n+/, '')}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            ) : selectedAuthor && authorIntroContent ? (
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <h1 className="text-lg lg:text-2xl font-serif font-bold text-center text-primary/90 pb-3 lg:pb-4 border-b border-border/40">{selectedAuthor}</h1>
                        <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[16px] lg:text-[18px]">
                            <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm, remarkBreaks]} components={authorMarkdownComponents}>
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

            {isAuthenticated && (
                <div className="absolute right-4 bottom-4 z-10 flex flex-col items-center gap-3">
                    <ReadingProgressButton progress={currentProgress} savedProgress={savedProgress} isFinished={currentProgress > 0 ? currentProgress >= 90 : savedProgress >= 90} onRestore={restoreProgress} />
                    <LearningPanelFAB onClick={() => setIsLearningPanelOpen(true)} />
                </div>
            )}
        </div>
    );

    const chartPanel = (
        <div className="h-full bg-muted/10 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent flex flex-col">
                {selectedCategory === 'bazi' && activeCase ? (
                    <>
                        <div className="flex-shrink-0"><CaseStudyBaziChart data={baziData} selectedDaYunIndex={selectedDaYunIndex} selectedLiuNianYear={selectedLiuNianYear} isMobile={true} /></div>
                        <div className="flex-1 border-t border-border"><CaseStudyDayunPanel data={baziData} selectedDaYunIndex={selectedDaYunIndex} selectedLiuNianYear={selectedLiuNianYear} onSelectDaYun={setSelectedDaYunIndex} onSelectLiuNian={setSelectedLiuNianYear} isMobile={true} /></div>
                    </>
                ) : selectedCategory === 'bazi' ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground"><Compass className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-sm">选择案例查看排盘</p></div>
                ) : selectedCategory === 'qimen' && activeCase ? (
                    qimenResult ? (
                        <div className="flex-shrink-0 flex flex-col"><CaseStudyQimenChart palaces={qimenResult.palaces} selectedPalace={null} onSelectPalace={() => { }} header={qimenResult.header} globalPatterns={qimenResult.globalPatterns} onJuClick={() => setIsJuDialogOpen(true)} isMobile={true} method={qimenMethod} onMethodChange={setQimenMethod} /></div>
                    ) : (<div className="h-full flex flex-col items-center justify-center text-muted-foreground"><p className="text-sm">排盘计算中或无时间信息...</p></div>)
                ) : selectedCategory === 'qimen' ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground"><Compass className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-sm">选择案例查看排盘</p></div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground"><Compass className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-sm">排盘区域</p></div>
                )}
            </div>

            {activeCase && chartCount > 1 && (
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
        <>
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <button type="button" onClick={() => setIsLeftPanelOpen(true)} className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-start group focus:outline-none" aria-label="打开目录">
                    <span className="w-[3px] h-20 rounded-r bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">目录</span></span>
                </button>
                <button type="button" onClick={() => setIsChartPanelOpen(true)} className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-end group focus:outline-none" aria-label={selectedCategory === 'duanfa' ? '打开大纲' : '打开排盘'}>
                    <span className="w-[3px] h-20 rounded-l bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">{selectedCategory === 'duanfa' ? '大纲' : '排盘'}</span></span>
                </button>

                {selectedCategory === 'duanfa' ? (
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        <DuanFaContent ref={duanFaContentRef} content={duanFa.selectedFile?.content || ''} title={duanFa.selectedFile?.name || '奇门断法'} onOutlineChange={duanFa.setOutline} />
                        {isAuthenticated && (
                            <div className="absolute right-4 bottom-4 z-10 flex flex-col items-center gap-3">
                                {duanFa.selectedFileId && (
                                    <ReadingProgressButton progress={duanFaCurrentProgress} savedProgress={duanFaSavedProgress} isFinished={duanFaCurrentProgress > 0 ? duanFaCurrentProgress >= 90 : duanFaSavedProgress >= 90} onRestore={duanFaRestoreProgress} />
                                )}
                                <LearningPanelFAB onClick={() => setIsLearningPanelOpen(true)} />
                            </div>
                        )}
                    </div>
                ) : (
                    contentColumn
                )}
            </div>

            <SideDrawer open={isLeftPanelOpen} title="目录" side="left" size="xxs" onClose={() => setIsLeftPanelOpen(false)}>
                <div className="h-full min-h-0 overflow-hidden flex flex-col">
                    <CategoryTabs categories={CATEGORIES} selectedId={selectedCategory} onSelect={(id) => { setSelectedCategory(id); }} variant="drawer" />
                    {selectedCategory === 'duanfa' ? (
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-row">
                            <ShuShuSidebar selectedId={duanFa.selectedShuShuId} onSelect={duanFa.handleSelectShuShu} />
                            <div className="flex-1 min-w-0 h-full overflow-hidden">
                                <DuanFaSidebar files={duanFa.files} selectedFileId={duanFa.selectedFileId} onSelectFile={(id) => { duanFa.handleSelectFile(id); setIsLeftPanelOpen(false); }} variant="drawer" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-hidden">
                            <CaseListSidebar allCases={allCases} displayCases={filteredCases} selectedCategory={selectedCategory} selectedCaseId={selectedCaseId} selectedDayMaster={selectedDayMaster} searchTerm={searchTerm} currentPage={currentPage} totalPages={totalPages} onSelectCase={(id) => { handleSelectCase(id); setIsLeftPanelOpen(false); }} onSelectDayMaster={(id) => { handleSelectDayMaster(id); }} onSearchChange={setSearchTerm} onPageChange={setCurrentPage} onSelectAuthor={(author) => { handleSelectAuthor(author); setIsLeftPanelOpen(false); }} variant="drawer" hidePagination />
                        </div>
                    )}
                </div>
            </SideDrawer>

            <SideDrawer open={isChartPanelOpen} title={selectedCategory === 'duanfa' ? '大纲' : '排盘信息'} side="right" size={selectedCategory === 'duanfa' ? 'xxs' : 'full'} onClose={() => setIsChartPanelOpen(false)}>
                {selectedCategory === 'duanfa' ? (
                    <DuanFaOutline outline={duanFa.outline} activeSectionId={duanFa.activeSectionId} onItemClick={(id) => { duanFa.handleOutlineClick(id); setIsChartPanelOpen(false); }} variant="drawer" />
                ) : (
                    chartPanel
                )}
            </SideDrawer>
        </>
    );
}
