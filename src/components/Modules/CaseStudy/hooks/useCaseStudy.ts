/**
 * CaseStudy 页面状态管理 Hook
 * 封装所有 useState 和 useMemo 逻辑
 */
import { useState, useMemo } from 'react';
import { extractBazi } from '../../../../lib/caseStudy/parsers';
import { AUTHOR_MAP } from '../../../../lib/caseStudy/types';

// 加载案例文件
// 加载案例文件
const rawCasesLishuanglin = import.meta.glob('../../../../data/cases/lishuanglin/**/*.md', { query: '?raw', import: 'default', eager: true });
const rawCasesNanxuanzi = import.meta.glob('../../../../data/cases/nanxuanzi/**/*.md', { query: '?raw', import: 'default', eager: true });
const rawCasesBuchuiniu = import.meta.glob('../../../../data/cases/buchuiniu/**/*.md', { query: '?raw', import: 'default', eager: true });
const rawCasesZhangzhichun = import.meta.glob('../../../../data/cases/zhangzhichun/**/*.md', { query: '?raw', import: 'default', eager: true });

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

// Helper to parse Qimen time from content
// Format example: 公元：2009年7月9日20时43分47秒
function parseQimenTime(content: string): { year: number, month: number, day: number, hour: number, minute: number } | null {
    const match = content.match(/(?:\*\*)?公元(?:\*\*)?[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2})时(\d{1,2})分/);
    if (match) {
        return {
            year: parseInt(match[1]),
            month: parseInt(match[2]),
            day: parseInt(match[3]),
            hour: parseInt(match[4]),
            minute: parseInt(match[5])
        };
    }
    return null;
}

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

    // 奇门排盘结果和自定义局数
    const [qimenResult, setQimenResult] = useState<QimenResult | null>(null);
    const [customJu, setCustomJu] = useState<number>(0);  // 0=自动计算, 正数=阳遏, 负数=阴遏

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

    // 当选中案例或自定义局数变化时，如果是奇门案例，进行排盘计算
    useMemo(async () => {
        if (activeCase && activeCase.category === 'qimen') {
            const time = parseQimenTime(activeCase.content);
            if (time) {
                const result = await calculateQimen(time, 'zhirun', customJu);
                setQimenResult(result);
            } else {
                setQimenResult(null);
            }
        } else {
            setQimenResult(null);
        }
    }, [activeCase, customJu]);

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
    };
}

export { ALL_CASES, authorIntroFiles };
