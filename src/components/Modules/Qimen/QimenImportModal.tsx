import { useCallback } from 'react';
import JsonImportModal from '../../Common/JsonImportModal';
import { qimenCaseService, type CreateQimenCaseInput, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';

interface QimenImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImported: () => void;
}

const TEMPLATE_DATA = [
    {
        "title": "工作调动预测",
        "test_date": "2024-03-20T10:30:00.000Z",
        "category": "work",
        "description": "想问一下下个月能否顺利调动到总公司？",
        "feedback": "已成功调动",
        "analysis": "值符落宫..."
    },
    {
        "title": "丢手机",
        "test_date": "2024-03-21T15:20:00.000Z",
        "category": "lost",
        "description": "在商场丢失 iPhone 15",
        "feedback": "没找到",
        "analysis": "玄武临门..."
    }
];

export default function QimenImportModal({ isOpen, onClose, onImported }: QimenImportModalProps) {

    // 解析并验证 JSON 数据
    const handleParse = useCallback((jsonData: any): CreateQimenCaseInput[] => {
        if (!Array.isArray(jsonData)) {
            throw new Error('JSON 数据必须是数组格式');
        }

        return jsonData.map((item: any, index: number) => {
            if (!item.title) {
                throw new Error(`第 ${index + 1} 条数据缺少标题 (title)`);
            }
            if (!item.test_date) {
                throw new Error(`第 ${index + 1} 条数据缺少时间 (test_date)`);
            }

            // 验证并修正分类
            let category = item.category;
            const validCategory = QIMEN_CATEGORIES.find(c => c.id === category);
            if (!validCategory) {
                category = 'other'; // 默认归为其他
            }

            return {
                title: String(item.title),
                test_date: String(item.test_date),
                category: category,
                description: item.description ? String(item.description) : undefined,
                feedback: item.feedback ? String(item.feedback) : undefined,
                analysis: item.analysis ? String(item.analysis) : undefined,
                qimen_data: item.qimen_data || undefined,
            };
        });
    }, []);

    // 保存数据
    const handleSave = useCallback(async (data: CreateQimenCaseInput[]) => {
        return await qimenCaseService.createCases(data);
    }, []);

    // 渲染卡片预览
    const renderCard = (item: CreateQimenCaseInput, index: number) => {
        const categoryName = QIMEN_CATEGORIES.find(c => c.id === item.category)?.name || '未知';

        return (
            <div className="group relative p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted hover:border-primary/50 transition-all duration-200">
                {/* Header: Title + Index */}
                <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">
                        {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                </div>

                {/* Date */}
                <div className="text-xs text-muted-foreground font-mono mb-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                    {item.test_date.replace('T', ' ').substring(0, 16)}
                </div>

                {/* Footer: Category */}
                <div className="flex justify-between items-center pt-2 border-t border-border/50 min-h-[29px]">
                    <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs border border-border/50 whitespace-nowrap">
                        {categoryName}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <JsonImportModal
            isOpen={isOpen}
            title="导入奇门案例"
            onClose={onClose}
            onParse={handleParse}
            onSave={handleSave}
            onFinish={onImported}
            templateData={TEMPLATE_DATA}
            renderCard={renderCard}
            gridClassName="grid-cols-2"
        />
    );
}
