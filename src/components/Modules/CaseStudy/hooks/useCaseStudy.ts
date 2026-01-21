/**
 * CaseStudy 页面状态管理 Hook
 * 封装所有 useState 和 useMemo 逻辑
 */
import { useState, useMemo } from 'react';
import { extractBazi } from '../../../../lib/caseStudy/parsers';
import { AUTHOR_MAP } from '../../../../lib/caseStudy/types';

// 加载案例文件
const rawCasesLishuanglin = import.meta.glob('../../../../data/cases/lishuanglin/**/*.md', { query: '?raw', import: 'default', eager: true });
const rawCasesNanxuanzi = import.meta.glob('../../../../data/cases/nanxuanzi/**/*.md', { query: '?raw', import: 'default', eager: true });

// 加载作者介绍文件
const authorIntroFiles = import.meta.glob('../../../../data/cases/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// 合并所有案例
const rawCases = { ...rawCasesLishuanglin, ...rawCasesNanxuanzi };

export interface CaseItem {
    id: string;
    title: string;
    bazi: string;
    content: string;
    dayMaster: string;
    author: string;
}

const ALL_CASES: CaseItem[] = Object.entries(rawCases)
    .filter(([path, content]) => {
        const c = content as string;
        return c.trim().length > 0 && path.includes('/');
    })
    .map(([path, content]) => {
        const pathParts = path.split('/');
        const filename = pathParts.pop()?.replace('.md', '') || '无标题';
        const dayMasterCategory = pathParts[pathParts.length - 1] || '未分类';
        const authorKey = path.includes('lishuanglin') ? 'lishuanglin' : path.includes('nanxuanzi') ? 'nanxuanzi' : '';
        const author = AUTHOR_MAP[authorKey] || '未知';
        const bazi = extractBazi(content as string);
        return {
            id: path,
            title: filename,
            bazi: bazi,
            content: content as string,
            dayMaster: dayMasterCategory,
            author: author
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

    // 大运/流年状态
    const [daYunPage, setDaYunPage] = useState(0);
    const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number | null>(null);
    const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number | null>(null);

    // 作者状态
    const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
            const matchDayMaster = selectedDayMaster === 'all' || c.dayMaster === selectedDayMaster;
            const matchSearch = searchTerm === '' || c.title.includes(searchTerm) || c.content.includes(searchTerm);
            return matchDayMaster && matchSearch;
        });
    }, [searchTerm, selectedDayMaster]);

    const totalPages = Math.ceil(filteredCases.length / ITEMS_PER_PAGE);
    const displayCases = filteredCases.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // 当前选中的案例
    const activeCase = useMemo(() => {
        return ALL_CASES.find(c => c.id === selectedCaseId);
    }, [selectedCaseId]);

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
    };
}

export { ALL_CASES, authorIntroFiles };
