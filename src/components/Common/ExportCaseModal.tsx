/**
 * 通用案例导出弹窗组件
 * 支持按标签/分类筛选后导出为 JSON 格式
 */
import { useState, useMemo } from 'react';
import { Download, Check, X } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import { useMediaQuery } from '../../hooks/useMediaQuery';

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
    const isMobile = !useMediaQuery('(min-width: 768px)');

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
            const rest = { ...(c as T & { user_id?: string }) };
            delete rest.user_id;
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
            title={isMobile ? null : title}
            titleIcon={isMobile ? undefined : <Download className="w-5 h-5" />}
            footer={isMobile ? undefined : footerContent}
            maxWidth={isMobile ? 'max-w-full' : 'max-w-md'}
            fullScreen={isMobile}
            showCloseButton={!isMobile}
            className={isMobile ? 'p-0' : ''}
            bodyClassName={isMobile ? 'p-0 flex flex-col h-full overflow-hidden' : ''}
        >
            {/* 移动端：自定义顶部标题栏 */}
            {isMobile && (
                <div className="bg-muted/30 border-b border-border px-4 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
                                <Download className="w-4 h-4 text-primary" />
                            </div>
                            <h2 className="text-lg font-bold text-foreground">{title}</h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className={`${isMobile ? 'flex-1 overflow-y-auto px-4 py-4' : ''} space-y-4`}>
                {/* 头部控制栏 */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        选择分类（默认导出全部）
                    </p>
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/5"
                    >
                        {selectedIds.size === options.length ? '取消全选' : '全选所有'}
                    </button>
                </div>

                {/* 选项列表 */}
                <div className={`grid grid-cols-2 gap-3 ${isMobile ? '' : 'max-h-[60vh] overflow-y-auto'} p-1`}>
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
                                className={`group relative flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all duration-200 ${isChecked
                                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                    : 'border-border hover:border-primary/50 hover:bg-secondary/30 bg-card'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all duration-200 ${isChecked
                                            ? 'bg-primary border-primary shadow-sm scale-110'
                                            : 'border-muted-foreground/50 group-hover:border-primary/50 bg-background'
                                            }`}
                                    >
                                        {isChecked && <Check className="w-2.5 h-2.5 text-primary-foreground stroke-[3]" />}
                                    </div>
                                    <span className={`font-medium ${isChecked ? 'text-primary' : 'text-foreground'}`}>
                                        {option.name}
                                    </span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isChecked
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 状态统计 */}
                <div className="flex items-center justify-between border-t border-border/50 pt-4 px-1">
                    <span className="text-sm text-muted-foreground">已选择分类：{selectedIds.size || '全部'}</span>
                    <div className="text-sm">
                        将导出 <span className="font-semibold text-primary">{filteredCases.length}</span> 个案例
                    </div>
                </div>
            </div>

            {/* 移动端：底部固定操作栏 */}
            {isMobile && (
                <div className="flex-shrink-0 border-t border-border px-4 py-4 flex justify-end gap-3 bg-background">
                    {footerContent}
                </div>
            )}
        </BaseModal>
    );
}
