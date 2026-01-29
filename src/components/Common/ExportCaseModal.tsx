/**
 * 通用案例导出弹窗组件
 * 支持按标签/分类筛选后导出为 JSON 格式
 */
import { useState, useMemo } from 'react';
import { Download, Check } from 'lucide-react';
import BaseModal from '../UI/BaseModal';

interface ExportOption {
    id: string;
    name: string;
}

interface ExportCaseModalProps<T extends object> {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    options: ExportOption[];
    cases: T[];
    /** 获取案例的标签/分类字段值 */
    getCaseFilter: (caseItem: T) => string | string[] | undefined;
    /** 可选：自定义导出格式转换函数 */
    formatCase?: (caseItem: T) => Record<string, unknown>;
    filename?: string;
}

export default function ExportCaseModal<T extends object>({
    isOpen,
    onClose,
    title = '导出案例',
    options,
    cases,
    getCaseFilter,
    formatCase,
    filename = 'cases_export',
}: ExportCaseModalProps<T>) {
    // 选中的标签/分类 ID
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // 根据筛选条件过滤案例
    const filteredCases = useMemo(() => {
        if (selectedIds.size === 0) {
            // 未选择任何标签时导出全部
            return cases;
        }

        return cases.filter((caseItem) => {
            const filterValue = getCaseFilter(caseItem);
            if (!filterValue) return false;

            // 支持单值字符串或数组
            if (Array.isArray(filterValue)) {
                return filterValue.some((v) => selectedIds.has(v));
            }
            return selectedIds.has(filterValue);
        });
    }, [cases, selectedIds, getCaseFilter]);

    // 切换选中状态
    const toggleOption = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // 全选/取消全选
    const toggleAll = () => {
        if (selectedIds.size === options.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(options.map((o) => o.id)));
        }
    };

    // 执行导出
    const handleExport = () => {
        // 使用自定义格式转换，或默认清理敏感字段
        const exportData = filteredCases.map((c) => {
            if (formatCase) {
                return formatCase(c);
            }
            // 默认：清理敏感字段（如 user_id）
            const { user_id, ...rest } = c as T & { user_id?: string };
            return rest;
        });

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onClose();
    };

    // 关闭时重置选中状态
    const handleClose = () => {
        setSelectedIds(new Set());
        onClose();
    };

    // Footer
    const footerContent = (
        <>
            <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-border hover:bg-muted text-foreground"
            >
                取消
            </button>
            <button
                type="button"
                onClick={handleExport}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-sm"
            >
                <Download className="w-4 h-4" />
                导出 ({filteredCases.length})
            </button>
        </>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={title}
            titleIcon={<Download className="w-5 h-5" />}
            footer={footerContent}
            maxWidth="max-w-sm"
        >
            <div className="space-y-4">
                {/* 提示信息 */}
                <p className="text-sm text-muted-foreground">
                    选择要导出的分类，不选则导出全部。
                </p>

                {/* 全选按钮 */}
                <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs text-primary hover:underline"
                >
                    {selectedIds.size === options.length ? '取消全选' : '全选'}
                </button>

                {/* 选项列表 */}
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {options.map((option) => {
                        const isChecked = selectedIds.has(option.id);
                        const count = cases.filter((c) => {
                            const v = getCaseFilter(c);
                            if (Array.isArray(v)) return v.includes(option.id);
                            return v === option.id;
                        }).length;

                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => toggleOption(option.id)}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${isChecked
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border hover:border-primary/50 text-foreground'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked
                                            ? 'bg-primary border-primary'
                                            : 'border-muted-foreground'
                                            }`}
                                    >
                                        {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                                    </div>
                                    <span>{option.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{count}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 预览数量 */}
                <div className="text-sm text-muted-foreground border-t border-border pt-3">
                    将导出 <span className="font-medium text-foreground">{filteredCases.length}</span> 个案例
                </div>
            </div>
        </BaseModal>
    );
}
