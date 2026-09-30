import { useState, useMemo, useEffect } from 'react';
import { AUTHOR_MAP } from '../../../../lib/caseStudy/constants';
import {
    CASE_LIBRARY_TOTAL,
    CASE_PREVIEWS,
    CASE_PREVIEWS_PER_GROUP,
    CASE_TOTALS_BY_GROUP,
} from '../../../../lib/caseStudy/casePreviews.generated';
import type { PaiPanMethod } from '../../../../lib/csp-qimen/qimenService';
import { TIAN_GAN } from '../../../../constants/ganZhi';
import { publicCaseLibraryService, type CasePackProgress } from '../../../../services/publicCaseLibraryService';

import { calculateQimen, type QimenResult } from '../../../../lib/csp-qimen/qimenService';

export type ActivationState = 'loading' | 'locked' | 'ready';

export interface CaseItem {
    id: string;
    title: string;
    bazi: string;
    content: string;
    dayMaster: string;
    author: string;
    category: 'bazi' | 'qimen';
    /** 试读条目：content 为截断片段，激活后由同 id 的完整正文替换 */
    isPreview?: boolean;
    /** 试读字数与全文约字数（仅试读条目） */
    previewChars?: number;
    fullChars?: number;
}

export const ALL_CASES: CaseItem[] = [];

function sortCases(cases: CaseItem[]): CaseItem[] {
    return [...cases].sort((a, b) => {
        const getTianganIndex = (str: string) => {
            for (let i = 0; i < TIAN_GAN.length; i++) {
                if (str.includes(TIAN_GAN[i])) return i;
            }
            return 999;
        };

        const idxA = getTianganIndex(a.dayMaster);
        const idxB = getTianganIndex(b.dayMaster);

        if (idxA !== idxB) {
            return idxA - idxB;
        }

        return a.title.localeCompare(b.title, 'zh-CN');
    });
}

const ITEMS_PER_PAGE = 12;

/** 未激活时的试读条目：id 与加密包一致，激活后同一 id 直接切换为完整正文 */
const PREVIEW_CASES: CaseItem[] = sortCases(CASE_PREVIEWS.map((preview) => ({
    id: preview.id,
    title: preview.title,
    bazi: preview.summary,
    content: preview.excerpt,
    dayMaster: preview.group,
    author: preview.authorName || AUTHOR_MAP[preview.authorKey] || '未知',
    category: preview.domain,
    isPreview: true,
    previewChars: preview.excerptChars,
    fullChars: preview.fullChars,
})));



export function useCaseStudy() {
    // 基础状态
    const [allCases, setAllCases] = useState<CaseItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('bazi');
    const [selectedDayMaster, setSelectedDayMaster] = useState<string>('all');
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // 多排盘支持
    const [activeChartIndex, setActiveChartIndex] = useState<number>(0);

    // 大运/流年状态
    const [daYunPage, setDaYunPage] = useState(0);
    const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number | null>(null);
    const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number | null>(null);

    // 作者状态
    const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // 奇门排盘结果和自定义局数
    const [qimenResult, setQimenResult] = useState<QimenResult | null>(null);
    const [qimenMethod, setQimenMethod] = useState<PaiPanMethod>('zhirun');
    const [customJu, setCustomJu] = useState<number>(0);  // 0=自动计算, 正数=阳遏, 负数=阴遏
    const [chartCount, setChartCount] = useState<number>(0); // 当前案例包含的排盘数量
    const [isCaseContentLoading, setIsCaseContentLoading] = useState(false);

    // 案例库激活状态（一机一码）
    const [activationState, setActivationState] = useState<ActivationState>('loading');
    const [machineId, setMachineId] = useState<string>('');
    const [isActivating, setIsActivating] = useState(false);
    const [activationProgress, setActivationProgress] = useState<CasePackProgress | null>(null);
    const [activationError, setActivationError] = useState<string | null>(null);

    const loadEntries = () => {
        void publicCaseLibraryService.getEntries().then((entries) => {
            const cases = sortCases(entries.map((entry) => ({
                id: entry.id,
                title: entry.title,
                bazi: entry.summary,
                content: '',
                dayMaster: entry.category,
                author: entry.author_name || AUTHOR_MAP[entry.author_key] || '未知',
                category: entry.domain,
            })));
            ALL_CASES.splice(0, ALL_CASES.length, ...cases);
            setAllCases(cases);
        }).catch((cause: unknown) => {
            console.error('加载本地案例目录失败', cause);
            setAllCases([]);
        });
    };

    // 未激活（含非桌面端）时展示内置试读条目，让用户在激活前就能读到每个分类的样章
    const loadPreviewEntries = () => {
        const cases = PREVIEW_CASES.map((item) => ({ ...item }));
        ALL_CASES.splice(0, ALL_CASES.length, ...cases);
        setAllCases(cases);
    };

    useEffect(() => {
        let cancelled = false;
        void publicCaseLibraryService.getStatus().then(async (status) => {
            if (cancelled) return;
            if (status.is_activated) {
                setActivationState('ready');
                loadEntries();
                return;
            }
            const id = await publicCaseLibraryService.getMachineId().catch(() => '');
            if (cancelled) return;
            setMachineId(id);
            setActivationState('locked');
            loadPreviewEntries();
        }).catch((cause: unknown) => {
            console.error('检查案例库状态失败', cause);
            if (cancelled) return;
            setActivationState('locked');
            loadPreviewEntries();
        });
        return () => { cancelled = true; };
    }, []);

    // 激活成功后刷新案例列表（激活码 / 管理密码两种模式共用管线）
    const runActivation = (activation: Promise<number>) => {
        if (isActivating) return;
        setIsActivating(true);
        setActivationError(null);
        setActivationProgress({ phase: 'verifying', percent: null, message: '正在校验...' });
        let unlisten: (() => void) | null = null;
        const cleanup = () => {
            unlisten?.();
            unlisten = null;
        };
        void publicCaseLibraryService.onProgress((progress) => {
            setActivationProgress(progress);
        }).then((stop) => {
            unlisten = stop;
            return activation;
        }).then(() => {
            setActivationState('ready');
            setActivationProgress(null);
            setIsActivating(false);
            cleanup();
            loadEntries();
        }).catch((cause: unknown) => {
            setActivationError(cause instanceof Error ? cause.message : String(cause));
            setIsActivating(false);
            cleanup();
        });
    };

    const activate = (licenseCode: string) => {
        runActivation(publicCaseLibraryService.activate(licenseCode));
    };

    const activateWithMasterPassword = (password: string) => {
        runActivation(publicCaseLibraryService.activateWithMasterPassword(password));
    };

    // 锁定态即为试读态：可浏览每个分类的试读样章，激活入口由各处显式按钮触发
    const isPreviewMode = activationState === 'locked';

    useEffect(() => {
        if (!selectedCaseId) {
            setIsCaseContentLoading(false);
            return;
        }
        const selected = allCases.find((caseItem) => caseItem.id === selectedCaseId);
        if (!selected || selected.isPreview || selected.content) {
            setIsCaseContentLoading(false);
            return;
        }
        setIsCaseContentLoading(true);
        let cancelled = false;
        void publicCaseLibraryService.getContent(selected.id).then((content) => {
            if (cancelled) return;
            setAllCases((previous) => previous.map((caseItem) => caseItem.id === selected.id ? { ...caseItem, content } : caseItem));
            const globalCase = ALL_CASES.find((caseItem) => caseItem.id === selected.id);
            if (globalCase) globalCase.content = content;
            setIsCaseContentLoading(false);
        }).catch((cause: unknown) => {
            console.error('加载案例正文失败', cause);
            if (!cancelled) setIsCaseContentLoading(false);
        });
        return () => { cancelled = true; };
    }, [allCases, selectedCaseId]);

    const [authorIntroContent, setAuthorIntroContent] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedAuthor) {
            setAuthorIntroContent(null);
            return;
        }
        const authorKey = Object.entries(AUTHOR_MAP).find(([, name]) => name === selectedAuthor)?.[0];
        if (!authorKey) return;
        let cancelled = false;
        void publicCaseLibraryService.getAuthorProfile(authorKey).then((content) => {
            if (!cancelled) setAuthorIntroContent(content);
        }).catch(() => {
            if (!cancelled) setAuthorIntroContent(null);
        });
        return () => { cancelled = true; };
    }, [selectedAuthor]);

    // 筛选案例
    const filteredCases = useMemo(() => {
        return allCases.filter(c => {
            // Filter by selected category (tab)
            if (c.category !== selectedCategory) return false;

            const matchDayMaster = selectedDayMaster === 'all' || c.dayMaster === selectedDayMaster;
            const matchSearch = searchTerm === '' || c.title.includes(searchTerm) || c.content.includes(searchTerm);
            return matchDayMaster && matchSearch;
        });
    }, [allCases, searchTerm, selectedDayMaster, selectedCategory]);

    const totalPages = Math.ceil(filteredCases.length / ITEMS_PER_PAGE);
    const displayCases = filteredCases.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // 当前选中的案例
    const activeCase = useMemo(() => {
        return allCases.find(c => c.id === selectedCaseId);
    }, [allCases, selectedCaseId]);

    // 当选中案例改变时，重置排盘索引
    useEffect(() => {
        setActiveChartIndex(0);
        setCustomJu(0);
    }, [selectedCaseId]);

    // 计算排盘数量和当前结果
    useEffect(() => {
        const loadChart = async () => {
            // 试读片段不参与排盘：盘面在激活前不对试读条目开放
            if (!activeCase || activeCase.isPreview) {
                setQimenResult(null);
                setChartCount(0);
                return;
            }

            if (activeCase.category === 'qimen') {
                const { parseAllQimenTime } = await import('../../../../lib/caseStudy/parsers');
                const times = parseAllQimenTime(activeCase.content);
                setChartCount(times.length);

                if (times.length > 0) {
                    // 确保索引在有效范围内
                    const index = activeChartIndex >= times.length ? 0 : activeChartIndex;
                    const time = times[index];
                    const result = await calculateQimen(time, qimenMethod, customJu);
                    setQimenResult(result);
                } else {
                    setQimenResult(null);
                }
            } else {
                // 八字的多排盘逻辑（如果需要支持）
                // 目前主要针对奇门，八字暂保持原样或后续添加 parseAllBaziInfo 支持
                // 如果八字也需要支持多盘，可以在这里调用 parseAllBaziInfo
                const { parseAllBaziInfo } = await import('../../../../lib/caseStudy/parsers');
                const infos = parseAllBaziInfo(activeCase.content);
                setChartCount(infos.length);
                // 八字的数据计算是在 UI 层通过 parseBaziInfo 做的，这里只需更新计数
                // 注意：CaseStudyPage 中的八字数据计算也需要更新以支持 activeChartIndex
                setQimenResult(null);
            }
        };
        loadChart();
    }, [activeCase, activeChartIndex, customJu, qimenMethod]);

    // 搜索重置页码
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // 案例切换时重置大运/流年
    useEffect(() => {
        setSelectedDaYunIndex(null);
        setSelectedLiuNianYear(null);
        setDaYunPage(0);
    }, [selectedCaseId]);

    // 分类切换时重置筛选，并默认选中第一篇文章
    useEffect(() => {
        setSelectedDayMaster('all');
        setSelectedAuthor(null);
        setSearchTerm('');
        setCurrentPage(1);
        // 保留仍在当前分类中的选中项（试读解锁为完整正文时同一 id 继续可读），否则回落到该分类第一篇
        setSelectedCaseId((previous) => {
            const stillVisible = previous && allCases.some((item) => item.id === previous && item.category === selectedCategory);
            if (stillVisible) return previous;
            return allCases.find(c => c.category === selectedCategory)?.id ?? null;
        });
        setQimenResult(null);
        setCustomJu(0);  // 重置自定义局数
        setActiveChartIndex(0);
    }, [allCases.length, selectedCategory]);




    // 选择案例时清除作者
    const handleSelectCase = (id: string) => {
        setSelectedCaseId(id);
        setSelectedAuthor(null);
    };

    // 在当前筛选范围内随机选择一篇不同的案例，并同步目录页码。
    const handleSelectRandomCase = () => {
        if (filteredCases.length === 0) return;

        const candidates = filteredCases.length > 1
            ? filteredCases.filter((caseItem) => caseItem.id !== selectedCaseId)
            : filteredCases;
        const nextCase = candidates[Math.floor(Math.random() * candidates.length)];
        const nextIndex = filteredCases.findIndex((caseItem) => caseItem.id === nextCase.id);

        setSelectedCaseId(nextCase.id);
        setSelectedAuthor(null);
        setCurrentPage(Math.floor(nextIndex / ITEMS_PER_PAGE) + 1);
    };

    // 选择作者时清除案例
    const handleSelectAuthor = (author: string) => {
        setSelectedAuthor(author);
        setSelectedCaseId(null);
    };

    // 选择日主分类
    const handleSelectDayMaster = (id: string) => {
        setSelectedDayMaster(id);
        setCurrentPage(1);
    };

    return {
        // 所有案例数据
        allCases,
        displayCases,
        filteredCases,
        activeCase,
        authorIntroContent,
        isCaseContentLoading,

        // 案例库激活（一机一码 / 作者管理密码）
        activationState,
        isPreviewMode,
        libraryTotal: CASE_LIBRARY_TOTAL,
        libraryGroupTotals: CASE_TOTALS_BY_GROUP,
        previewsPerGroup: CASE_PREVIEWS_PER_GROUP,
        machineId,
        isActivating,
        activationProgress,
        activationError,
        activate,
        activateWithMasterPassword,

        // 分页
        currentPage,
        totalPages,
        setCurrentPage,

        // 分类
        selectedCategory,
        setSelectedCategory,
        selectedDayMaster,
        handleSelectDayMaster,

        // 案例
        selectedCaseId,
        handleSelectCase,
        handleSelectRandomCase,

        // 搜索
        searchTerm,
        setSearchTerm,

        // 作者
        selectedAuthor,
        handleSelectAuthor,

        // 下拉菜单
        isDropdownOpen,
        setIsDropdownOpen,

        // 大运/流年
        daYunPage,
        setDaYunPage,
        selectedDaYunIndex,
        setSelectedDaYunIndex,
        selectedLiuNianYear,
        setSelectedLiuNianYear,

        // 奇门结果和自定义局数
        qimenResult,
        qimenMethod,
        setQimenMethod,
        customJu,
        setCustomJu,

        // 多排盘支持
        activeChartIndex,
        setActiveChartIndex,
        chartCount,
    };
}
