/**
 * 奇门遁甲模块 - 案例列表组件
 * 左侧显示案例列表，支持分类筛选
 */
import { useState } from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';

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
        date: '2026-01-15',
        preview: '看看此人丢了啥东西，能否找到【在哪里谁找...】',
    },
    {
        id: '2',
        title: '一朋友问存折找不到了，看看在哪里？',
        category: 'lost',
        author: '不吹牛',
        date: '2026-01-14',
        preview: '问测寻找失物方位',
    },
    {
        id: '3',
        title: '掉了一份筆記，能不能找到？',
        category: 'lost',
        author: '不吹牛',
        date: '2026-01-13',
        preview: '办公室物品遗失',
    },
    {
        id: '4',
        title: '我的银行卡不记得放哪去了',
        category: 'lost',
        author: '不吹牛',
        date: '2026-01-12',
        preview: '现在怎么找也找不到...',
    },
    {
        id: '5',
        title: '问今年事业运势如何',
        category: 'work',
        author: '易学研究',
        date: '2026-01-10',
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
        <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col min-h-0 flex-shrink-0">
            {/* 标题栏 */}
            <div className="p-4 border-b border-sidebar-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display text-base font-medium text-sidebar-foreground">奇门案例</h2>
                    <button
                        type="button"
                        className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
                        title="新建案例"
                    >
                        <Plus className="w-4 h-4 text-sidebar-foreground" />
                    </button>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="搜索案例..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-sidebar-accent/50 border border-transparent rounded-md focus:border-primary/50 focus:outline-none text-sidebar-foreground placeholder:text-muted-foreground"
                    />
                </div>
            </div>

            {/* 分类选择 */}
            <div className="px-4 py-2 border-b border-sidebar-border">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-sm bg-sidebar-accent/30 rounded-md hover:bg-sidebar-accent/50 transition-colors"
                    >
                        <span className="text-sidebar-foreground">{currentCategoryName}</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCategoryOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-10 py-1">
                            {QIMEN_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory(cat.id);
                                        setIsCategoryOpen(false);
                                    }}
                                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors ${selectedCategory === cat.id ? 'text-primary' : 'text-foreground'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}
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
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>作者: {caseItem.author}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
