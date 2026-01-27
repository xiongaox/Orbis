/**
 * 八字案例导入 Modal
 * 封装了通用的 JsonImportModal
 */
import { baziCaseService, type CreateCaseInput } from '../../../services/baziCaseService';
import { parseBaziImportData } from '../../../utils/baziImportUtils';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import JsonImportModal from '../../Common/JsonImportModal';

interface ImportCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImported: () => void;
}

// 导入模板 (包含两个测试案例)
const IMPORT_TEMPLATE = [
    {
        "姓名": "张三",
        "性别": "男",
        "出生时间": "1990-05-20 10:30",
        "标签": "客户",
        "备注": "事业咨询案例"
    },
    {
        "姓名": "李四",
        "性别": "坤造",
        "出生时间": "1995-08-15 14:00",
        "标签": "朋友",
        "备注": "感情咨询案例"
    }
];

export default function ImportCaseModal({ isOpen, onClose, onImported }: ImportCaseModalProps) {

    // 解析逻辑适配
    const handleParse = (jsonData: any) => {
        return parseBaziImportData(jsonData);
    };

    // 保存逻辑适配
    const handleSave = async (data: CreateCaseInput[]) => {
        const result = await baziCaseService.createCases(data);
        return result.length;
    };

    // 完成回调
    const handleFinish = () => {
        window.dispatchEvent(new CustomEvent(BAZI_CASES_CHANGED_EVENT));
        onImported();
    };

    // 卡片渲染器 (Compact Grid View)
    const renderCard = (item: CreateCaseInput, index: number) => {
        const isMale = item.gender === 'male';
        return (
            <div className="group relative p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted hover:border-primary/50 transition-all duration-200">
                {/* Header: Name + Index */}
                <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">{item.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                </div>

                {/* Date */}
                <div className="text-xs text-muted-foreground font-mono mb-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                    {item.birth_date.replace('T', ' ').substring(0, 16)}
                </div>

                {/* Footer: Gender (Left) + Tags (Right) */}
                <div className="flex justify-between items-center pt-2 border-t border-border/50 min-h-[29px]">
                    <span className={`text-xs font-bold tracking-wider ${isMale ? 'text-blue-500 dark:text-blue-400' : 'text-pink-500 dark:text-pink-400'}`}>
                        {isMale ? '男命' : '女命'}
                    </span>

                    {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-1 overflow-hidden justify-end ml-auto">
                            {item.tags.slice(0, 2).map((tag, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs border border-border/50 whitespace-nowrap">
                                    {tag}
                                </span>
                            ))}
                            {item.tags.length > 2 && (
                                <span className="text-xs text-muted-foreground self-center">+{item.tags.length - 2}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <JsonImportModal<CreateCaseInput>
            isOpen={isOpen}
            onClose={onClose}
            title="导入八字案例"
            onParse={handleParse}
            onSave={handleSave}
            onFinish={handleFinish}
            templateData={IMPORT_TEMPLATE}
            renderCard={renderCard}
            // Fallback columns if needed (though renderCard takes precedence now)
            previewColumns={[]}
        />
    );
}
