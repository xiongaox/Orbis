/**
 * 奇门遁甲模块 - 案例列表组件
 * 左侧显示案例列表，支持分类筛选
 */
import { useState } from 'react';
import { Search, Plus, ChevronDown, Upload } from 'lucide-react';

// 奇门案例分类
const QIMEN_CATEGORIES = [
    { id: 'all', name: '全部' },
    { id: 'work', name: '工作事业' },
    { id: 'study', name: '求学考试' },
    { id: 'love', name: '恋爱婚姻' },
    { id: 'wealth', name: '生意财运' },
    { id: 'lost', name: '失物失人' },
    { id: 'travel', name: '出行出国' },
    { id: 'health', name: '疾病身体' },
] as const;

type CategoryId = typeof QIMEN_CATEGORIES[number]['id'];

// Mock 案例数据
interface QimenCase {
    id: string;
    title: string;
    category: CategoryId;
    author: string;
    date: string;
    preview: string;
}

const MOCK_CASES: QimenCase[] = [
    {
        id: '1',
        title: '钱包丢了吗？',
        category: 'lost',
        author: '不吹牛',
        date: '2026-01-15 14:30',
        preview: '看看此人丢了啥东西，能否找到【在哪里谁找...】',
    },
    {
        id: '2',
        title: '一朋友问存折找不到了，看看在哪里？',
        category: 'lost',
        author: '不吹牛',
        date: '2026-01-14 09:15',
        preview: '问测寻找失物方位',
    },
    {
        id: '3',
        title: '掉了一份筆記，能不能找到？',
        category: 'lost',
        author: '不吹牛',
        date: '2026-01-13 16:45',
        preview: '办公室物品遗失',
    },
    {
        id: '4',
        title: '我的银行卡不记得放哪去了',
        category: 'lost',
        author: '不吹牛',
        date: '2026-01-12 11:20',
        preview: '现在怎么找也找不到...',
    },
    {
        id: '5',
        title: '问今年事业运势如何',
        category: 'work',
        author: '易学研究',
        date: '2026-01-10 20:05',
        preview: '2026年事业发展方向',
    },
];

interface QimenCaseListProps {
    selectedCaseId: string | null;
    onSelectCase: (id: string) => void;
    onLoginClick?: () => void;
}

export default function QimenCaseList({
    selectedCaseId,
    onSelectCase,
}: QimenCaseListProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    // 筛选案例
    const filteredCases = MOCK_CASES.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const currentCategoryName = QIMEN_CATEGORIES.find(c => c.id === selectedCategory)?.name || '全部';

    return (
        <aside className="w-96 bg-sidebar border-r border-sidebar-border flex flex-col min-h-0 flex-shrink-0">
            {/* 标题栏与操作 */}
            <div className="p-4 border-b border-sidebar-border space-y-3">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        className="font-display text-base font-medium text-foreground hover:text-primary transition-colors"
                    >
                        案例库
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            {currentCategoryName}
                            <span className="text-muted-foreground/60">({filteredCases.length})</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isCategoryOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-sidebar border border-sidebar-border rounded-lg shadow-lg p-2 z-20">
                                {QIMEN_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedCategory(cat.id);
                                            setIsCategoryOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors ${selectedCategory === cat.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-foreground hover:bg-sidebar-accent/60'
                                            }`}
                                    >
                                        <span>{cat.name}</span>
                                        <span className="text-muted-foreground/60">
                                            {MOCK_CASES.filter(c => c.category === cat.id || cat.id === 'all').length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="搜索案例..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:border-primary/50 focus:outline-none text-foreground placeholder:text-muted-foreground transition-all"
                    />
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-secondary/50 hover:bg-secondary text-foreground/80 hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
                    >
                        <Upload className="w-4 h-4" />
                        导入
                    </button>
                    <button
                        type="button"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/30"
                    >
                        <Plus className="w-4 h-4" />
                        新建
                    </button>
                </div>
            </div>

            {/* 案例列表 */}
            <div className="flex-1 overflow-y-auto p-3">
                {filteredCases.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        暂无案例
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredCases.map((caseItem) => (
                            <button
                                key={caseItem.id}
                                type="button"
                                onClick={() => onSelectCase(caseItem.id)}
                                className={`w-full text-left p-3 rounded-lg transition-all border ${selectedCaseId === caseItem.id
                                    ? 'bg-sidebar-accent border-primary/30'
                                    : 'bg-card border-border/60 hover:border-border hover:shadow-sm dark:bg-sidebar-accent/30 dark:border-sidebar-border/50 dark:hover:bg-sidebar-accent/50'
                                    }`}
                            >
                                <div className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                                    {caseItem.title}
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                    {caseItem.preview}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{caseItem.date}</span>
                                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                        {QIMEN_CATEGORIES.find(cat => cat.id === caseItem.category)?.name}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
