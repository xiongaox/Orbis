/**
 * CaseStudy 页面状态管理 Hook
 * 封装所有 useState 和 useMemo 逻辑
 */
import { useState, useMemo } from 'react';
import { extractBazi } from '../../../../lib/caseStudy/parsers';
import { AUTHOR_MAP } from '../../../../lib/caseStudy/types';

// 加载案例文件
// 加载案例文件
const rawCasesLishuanglin = import.meta.glob('../../../../data/cases/study/bazi/lishuanglin/**/*.md', { query: '?raw', import: 'default', eager: true });
const rawCasesNanxuanzi = import.meta.glob('../../../../data/cases/study/bazi/nanxuanzi/**/*.md', { query: '?raw', import: 'default', eager: true });
const rawCasesBuchuiniu = import.meta.glob('../../../../data/cases/study/qimen/buchuiniu/**/*.md', { query: '?raw', import: 'default', eager: true });
const rawCasesZhangzhichun = import.meta.glob('../../../../data/cases/study/qimen/zhangzhichun/**/*.md', { query: '?raw', import: 'default', eager: true });

// 加载作者介绍文件
const authorIntroFiles = import.meta.glob('../../../../data/cases/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// 合并所有案例
const rawCases = { ...rawCasesLishuanglin, ...rawCasesNanxuanzi, ...rawCasesBuchuiniu, ...rawCasesZhangzhichun };

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

const ALL_CASES: CaseItem[] = Object.entries(rawCases)
    .filter(([path, content]) => {
        const c = content as string;
        // Filter empty files
        if (c.trim().length === 0 || !path.includes('/')) return false;

        // Filter author profile files (e.g. "李双林.md", "不吹牛.md")
        const pathParts = path.split('/');
        const filename = pathParts.pop()?.replace('.md', '');

        // Check if filename matches any author name
        const isAuthorProfile = Object.values(AUTHOR_MAP).some(authorName => filename === authorName);

        return !isAuthorProfile;
    })
    .map(([path, content]) => {
        const strContent = content as string;
        const pathParts = path.split('/');
        const filename = pathParts.pop()?.replace('.md', '') || '无标题';
        const dayMasterCategory = pathParts[pathParts.length - 1] || '未分类';
        const authorKey = path.includes('lishuanglin') ? 'lishuanglin' :
            path.includes('nanxuanzi') ? 'nanxuanzi' :
                path.includes('buchuiniu') ? 'buchuiniu' :
                    path.includes('zhangzhichun') ? 'zhangzhichun' : '';
        const author = AUTHOR_MAP[authorKey] || '未知';

        // Determine category based on author/path
        const category = (path.includes('buchuiniu') || path.includes('zhangzhichun')) ? 'qimen' : 'bazi';

        let bazi = extractBazi(strContent);
        if (category === 'qimen') {
            const match = strContent.match(/(?:\*\*)?公元(?:\*\*)?[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日\d{1,2}时)/);
            if (match) {
                bazi = match[1];
            } else {
                bazi = '未知时间';
            }
        }

        return {
            id: path,
            title: filename,
            bazi: bazi,
            content: strContent,
            dayMaster: dayMasterCategory,
            author: author,
            category: category
        };
    });

const ITEMS_PER_PAGE = 13;



export function useCaseStudy() {
    // 基础状态
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
    const [customJu, setCustomJu] = useState<number>(0);  // 0=自动计算, 正数=阳遏, 负数=阴遏
    const [chartCount, setChartCount] = useState<number>(0); // 当前案例包含的排盘数量

    // 获取作者介绍内容
    const authorIntroContent = useMemo(() => {
        if (!selectedAuthor) return null;
        const introPath = Object.keys(authorIntroFiles).find(path =>
            path.includes(`/${selectedAuthor}.md`) && !path.includes('/')
        ) || Object.keys(authorIntroFiles).find(path =>
            path.endsWith(`${selectedAuthor}.md`)
        );
        if (introPath && authorIntroFiles[introPath]) {
            return authorIntroFiles[introPath];
        }
        return null;
    }, [selectedAuthor]);

    // 筛选案例
    const filteredCases = useMemo(() => {
        return ALL_CASES.filter(c => {
            // Filter by selected category (tab)
            if (c.category !== selectedCategory) return false;

            const matchDayMaster = selectedDayMaster === 'all' || c.dayMaster === selectedDayMaster;
            const matchSearch = searchTerm === '' || c.title.includes(searchTerm) || c.content.includes(searchTerm);
            return matchDayMaster && matchSearch;
        });
    }, [searchTerm, selectedDayMaster, selectedCategory]);

    const totalPages = Math.ceil(filteredCases.length / ITEMS_PER_PAGE);
    const displayCases = filteredCases.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // 当前选中的案例
    const activeCase = useMemo(() => {
        return ALL_CASES.find(c => c.id === selectedCaseId);
    }, [selectedCaseId]);

    // 当选中案例改变时，重置排盘索引
    useMemo(() => {
        setActiveChartIndex(0);
        setCustomJu(0);
    }, [selectedCaseId]);

    // 计算排盘数量和当前结果
    useMemo(async () => {
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
                const result = await calculateQimen(time, 'zhirun', customJu);
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
    }, [activeCase, activeChartIndex, customJu]);

    // 搜索重置页码
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // 案例切换时重置大运/流年
    useMemo(() => {
        setSelectedDaYunIndex(null);
        setSelectedLiuNianYear(null);
        setDaYunPage(0);
    }, [selectedCaseId]);

    // 分类切换时重置筛选
    useMemo(() => {
        setSelectedDayMaster('all');
        setSelectedAuthor(null);
        setSearchTerm('');
        setCurrentPage(1);
        setSelectedCaseId(null);
        setQimenResult(null);
        setCustomJu(0);  // 重置自定义局数
        setActiveChartIndex(0);
    }, [selectedCategory]);

    // 选择案例时清除作者
    const handleSelectCase = (id: string) => {
        setSelectedCaseId(id);
        setSelectedAuthor(null);
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
        allCases: ALL_CASES,
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
        customJu,
        setCustomJu,

        // 多排盘支持
        activeChartIndex,
        setActiveChartIndex,
        chartCount,
    };
}

export { ALL_CASES, authorIntroFiles };
