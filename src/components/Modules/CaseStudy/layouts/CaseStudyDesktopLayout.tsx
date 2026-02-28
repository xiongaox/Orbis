import { Compass } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { CATEGORIES } from '../../../../lib/caseStudy/types';
import CategoryTabs from '../components/CategoryTabs';
import CaseListSidebar from '../components/CaseListSidebar';
import { caseMarkdownComponents, authorMarkdownComponents } from '../components/MarkdownRenderers';
import CaseStudyBaziChart from '../components/CaseStudyBaziChart';
import CaseStudyDayunPanel from '../components/CaseStudyDayunPanel';
import CaseStudyQimenChart from '../components/CaseStudyQimenChart';
import DuanFaPage from '../DuanFaPage';
import LearningPanelFAB from '../components/LearningPanelFAB';
import FavoriteButton from '../components/FavoriteButton';
import ReadingProgressButton from '../components/ReadingProgressButton';
import { type CaseStudyLayoutProps } from './CaseStudyLayoutProps';

const toChineseNum = (num: number) => {
    const chineseRaw = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    return chineseRaw[num] || num.toString();
};

export default function CaseStudyDesktopLayout(props: CaseStudyLayoutProps) {
    const {
        isAuthenticated, allCases, displayCases, activeCase, authorIntroContent,
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
    } = props;

    // 断法模块使用独立布局（仅桌面和 Pad）
    if (selectedCategory === 'duanfa') {
        return (
            <div className="flex w-full h-full overflow-hidden bg-background relative">
                <CategoryTabs
                    categories={CATEGORIES}
                    selectedId={selectedCategory}
                    onSelect={setSelectedCategory}
                />
                <div className="flex-1 flex overflow-hidden">
                    <DuanFaPage />
                </div>
            </div>
        );
    }

    const contentColumn = (
        <div className="flex-1 flex flex-col bg-background/50 relative overflow-hidden">
            {activeCase ? (
                <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-center gap-3 pb-3 lg:pb-4 border-b border-border/40">
                            <h1 className="text-lg lg:text-2xl font-serif font-bold text-primary/90">
                                {activeCase.title}
                            </h1>
                            {isAuthenticated && (
                                <FavoriteButton articleId={activeCase.id} />
                            )}
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[16px] lg:text-[18px]">
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
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <h1 className="text-lg lg:text-2xl font-serif font-bold text-center text-primary/90 pb-3 lg:pb-4 border-b border-border/40">
                            {selectedAuthor}
                        </h1>
                        <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[16px] lg:text-[18px]">
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

            {isAuthenticated && (
                <div className="absolute right-4 bottom-4 z-10 flex flex-col items-center gap-3">
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
            {(activeCase && chartCount > 1) ? (
                <div className="p-2 border-b border-border bg-muted/20 flex justify-between items-center h-[40px]">
                    <span className="text-xs font-medium text-muted-foreground">排盘信息</span>
                    <div className="flex space-x-1">
                        {Array.from({ length: chartCount }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveChartIndex(i)}
                                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${activeChartIndex === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
                            >
                                盘式{toChineseNum(i + 1)}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-2 border-b border-border bg-muted/20 flex justify-between items-center h-[40px]">
                    <span className="text-xs font-medium text-muted-foreground">排盘信息</span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent flex flex-col">
                {selectedCategory === 'bazi' && activeCase ? (
                    <>
                        <div className="flex-shrink-0">
                            <CaseStudyBaziChart data={baziData} selectedDaYunIndex={selectedDaYunIndex} selectedLiuNianYear={selectedLiuNianYear} isMobile={false} />
                        </div>
                        <div className="flex-1 border-t border-border">
                            <CaseStudyDayunPanel data={baziData} selectedDaYunIndex={selectedDaYunIndex} selectedLiuNianYear={selectedLiuNianYear} onSelectDaYun={setSelectedDaYunIndex} onSelectLiuNian={setSelectedLiuNianYear} isMobile={false} />
                        </div>
                    </>
                ) : selectedCategory === 'bazi' ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Compass className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">选择案例查看排盘</p>
                    </div>
                ) : selectedCategory === 'qimen' && activeCase ? (
                    qimenResult ? (
                        <div className="flex-shrink-0 flex flex-col">
                            <CaseStudyQimenChart palaces={qimenResult.palaces} selectedPalace={null} onSelectPalace={() => { }} header={qimenResult.header} globalPatterns={qimenResult.globalPatterns} onJuClick={() => setIsJuDialogOpen(true)} isMobile={false} method={qimenMethod} onMethodChange={setQimenMethod} />
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
        <>
            <CategoryTabs categories={CATEGORIES} selectedId={selectedCategory} onSelect={setSelectedCategory} />
            <CaseListSidebar
                allCases={allCases} displayCases={displayCases} selectedCategory={selectedCategory}
                selectedCaseId={selectedCaseId} selectedDayMaster={selectedDayMaster}
                searchTerm={searchTerm} currentPage={currentPage} totalPages={totalPages}
                onSelectCase={handleSelectCase} onSelectDayMaster={handleSelectDayMaster}
                onSearchChange={setSearchTerm} onPageChange={setCurrentPage} onSelectAuthor={handleSelectAuthor}
            />
            <div className="w-[55%] h-full flex flex-col overflow-hidden">
                {contentColumn}
            </div>
            <div className="w-[25%] h-full flex flex-col overflow-hidden border-l border-border/50">
                {chartPanel}
            </div>
        </>
    );
}
