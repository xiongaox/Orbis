/**
 * useCaseStudy - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `CaseItem`, `useCaseStudy`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `parsers`、内部模块 `constants` 等 5 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState, useMemo, useEffect } from 'react';
import { AUTHOR_MAP } from '../../../../lib/caseStudy/constants';
import type { PaiPanMethod } from '../../../../lib/csp-qimen/qimenService';
import { TIAN_GAN } from '../../../../constants/ganZhi';
import { publicCaseLibraryService } from '../../../../services/publicCaseLibraryService';

import { calculateQimen, type QimenResult } from '../../../../lib/csp-qimen/qimenService';

export interface CaseItem {
    id: string;
    title: string;
    bazi: string;
    content: string;
    dayMaster: string;
    author: string;
    category: 'bazi' | 'qimen';
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

    useEffect(() => {
        let cancelled = false;
        void publicCaseLibraryService.getEntries().then((entries) => {
            if (cancelled) return;
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
            console.error('加载公共案例目录失败', cause);
            if (!cancelled) setAllCases([]);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!selectedCaseId) return;
        const selected = allCases.find((caseItem) => caseItem.id === selectedCaseId);
        if (!selected || selected.content) return;
        let cancelled = false;
        void publicCaseLibraryService.getContent(selected.id).then((content) => {
            if (cancelled) return;
            setAllCases((previous) => previous.map((caseItem) => caseItem.id === selected.id ? { ...caseItem, content } : caseItem));
            const globalCase = ALL_CASES.find((caseItem) => caseItem.id === selected.id);
            if (globalCase) globalCase.content = content;
        }).catch((cause: unknown) => console.error('加载案例正文失败', cause));
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
            if (!activeCase) {
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
        // 从静态 ALL_CASES 中查找该分类的第一篇，避免页面空白
        const firstCase = allCases.find(c => c.category === selectedCategory);
        setSelectedCaseId(firstCase?.id ?? null);
        setQimenResult(null);
        setCustomJu(0);  // 重置自定义局数
        setActiveChartIndex(0);
    }, [allCases, selectedCategory]);




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
