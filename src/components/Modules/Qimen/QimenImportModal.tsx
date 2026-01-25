/**
 * 奇门案例导入 Modal
 * 封装了通用的 JsonImportModal，使用单列布局以适应详细信息
 */
import { qimenCaseService, type CreateQimenCaseInput, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';
import { parseQimenImportData } from '../../../utils/qimenImportUtils';
// Avoid circular dependency by defining event string locally
const QIMEN_CASES_CHANGED_EVENT = 'qimen_cases_changed';
import JsonImportModal from '../../Common/JsonImportModal';

interface QimenImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImported: () => void;
}

// 导入模板
const IMPORT_TEMPLATE = [
    {
        "标题": "失物占测",
        "分类": "失物",
        "公历时间": "2024-03-20 15:30",
        "事情描述": "丢失了钱包，黑色...",
        "局式": "阴遁三局" // Optional
    },
    {
        "标题": "事业发展咨询",
        "分类": "事业",
        "公历时间": "2024-04-15 09:00",
        "事情描述": "近期有个跳槽机会...",
    }
];

export default function QimenImportModal({ isOpen, onClose, onImported }: QimenImportModalProps) {

    // 解析逻辑适配
    const handleParse = (jsonData: any) => {
        return parseQimenImportData(jsonData);
    };

    // 保存逻辑适配
    const handleSave = async (data: CreateQimenCaseInput[]) => {
        let successCount = 0;
        for (const input of data) {
            try {
                await qimenCaseService.createCase(input);
                successCount++;
            } catch (err) {
                console.error("Failed to save case", input, err);
            }
        }
        return successCount;
    };

    // 完成回调
    const handleFinish = () => {
        window.dispatchEvent(new CustomEvent(QIMEN_CASES_CHANGED_EVENT));
        onImported();
    };

    // 卡片渲染器 (Single Column View)
    const renderCard = (item: CreateQimenCaseInput, index: number) => {
        const categoryName = QIMEN_CATEGORIES.find(c => c.id === item.category)?.name || item.category;

        return (
            <div className="group relative p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-primary/50 transition-all duration-200">
                <div className="flex flex-col gap-2">
                    {/* Header: Title + Category + Index */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-sm text-zinc-100 group-hover:text-primary transition-colors truncate">{item.title}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium whitespace-nowrap">
                                {categoryName}
                            </span>
                        </div>
                        <span className="text-xs text-zinc-600 font-mono flex-shrink-0">#{index + 1}</span>
                    </div>

                    {/* Description */}
                    {item.description && (
                        <div className="text-xs text-zinc-400 line-clamp-2 leading-relaxed bg-zinc-950/30 p-2 rounded border border-zinc-800/50">
                            {item.description}
                        </div>
                    )}

                    {/* Footer: Date */}
                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/50 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                        <div className="text-xs text-zinc-500 font-mono">
                            {item.test_date.replace('T', ' ').substring(0, 16)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <JsonImportModal<CreateQimenCaseInput>
            isOpen={isOpen}
            onClose={onClose}
            title="导入奇门案例"
            onParse={handleParse}
            onSave={handleSave}
            onFinish={handleFinish}
            templateData={IMPORT_TEMPLATE}
            renderCard={renderCard}
            gridClassName="grid-cols-1" // Use single column layout
        />
    );
}
