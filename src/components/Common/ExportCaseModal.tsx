import { useState, useMemo } from 'react';
import { Download, Check } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { exportTextFile, type ExportOutcome } from '../../utils/fileExportUtil';

interface ExportOption {
    id: string;
    name: string;
}

/**
 * 生成导出文件名用的时间戳：YYYY-MM-DD_HHmmss（本地时间）。
 *
 * 刻意不用 toISOString()：那是 UTC，UTC+8 的用户在 08:00 之前导出会拿到前一天的日期，
 * 与手机「下载」目录里的显示时间对不上。秒级精度用于避免同日多次导出重名。
 */
function formatExportStamp(date: Date): string {
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
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
    // 导出进行中 / 导出结果回执（安卓端走原生桥落盘，成功与失败都需要可见反馈）
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportResult, setExportResult] = useState<{ name: string; count: number; outcome: ExportOutcome } | null>(null);
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

    // 执行导出：统一走跨端导出工具（安卓 = 原生桥写系统下载目录，桌面 = 原生保存对话框，浏览器 = 下载）
    const handleExport = async () => {
        setExportError(null);
        setExporting(true);
        try {
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
            // 精确到秒的本地时间戳：同一天多次导出不再同名。
            // 此前只到日期，安卓 MediaStore 遇重名会自动加 " (1)" 后缀，而回执显示的仍是原名，
            // 用户会误以为第二次没导出成功。
            // 同时这里只生成一次 baseName 并复用给回执，避免两次 new Date() 跨秒导致名字对不上。
            const exportStamp = formatExportStamp(new Date());
            const baseName = `${filename}_${exportStamp}`;
            const exportName = `${baseName}.json`;
            const outcome = await exportTextFile({
                filename: baseName,
                content: json,
                extension: 'json',
                typeLabel: 'JSON',
            });

            // 用户取消：保持页面，便于再次导出
            if (outcome === 'cancelled') return;

            // 成功：留在页面上给出明确回执（此前直接关页，用户无从判断是否成功）
            setExportResult({ name: exportName, count: exportData.length, outcome });
        } catch (error) {
            setExportError(error instanceof Error ? error.message : '导出失败，请重试');
        } finally {
            setExporting(false);
        }
    };

    // 关闭时重置选中状态与导出回执（回执必须清空，否则下次打开仍是终态）
    const handleClose = () => {
        setSelectedIds(new Set());
        setExportResult(null);
        setExportError(null);
        onClose();
    };

    // 再次导出：清掉上一次的成功回执，回到可继续导出的状态
    const handleExportAgain = () => {
        setExportResult(null);
        setExportError(null);
    };

    // Footer：导出成功回执不再吞掉「导出」按钮。
    // 此前 exportResult 一旦写入就把底部整体替换为单个「完成」，导致导出入口消失、
    // 用户无法二次导出（只能关页面重开）。回执只是提示，导出入口必须常驻。
    const footerContent = exportResult ? (
        <>
            <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-border hover:bg-muted text-foreground"
            >
                完成
            </button>
            <button
                type="button"
                onClick={handleExportAgain}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-sm focus-ring"
            >
                <Download className="w-4 h-4" />
                继续导出
            </button>
        </>
    ) : (
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
                disabled={exporting}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed focus-ring"
            >
                <Download className="w-4 h-4" />
                {exporting ? '导出中…' : `导出 (${filteredCases.length})`}
            </button>
        </>
    );

    // 正文：移动端 SubPage 与桌面端 BaseModal 共用
    const bodyContent = (
        <div className="space-y-4">
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
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${isChecked
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

                {/* 导出成功回执：明确告知产物文件名与去向，避免"点完没反应"的误判 */}
                {exportResult && (
                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-3" role="status">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <Check className="w-4 h-4 shrink-0" />
                            导出成功
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
                            已导出 {exportResult.count} 个案例
                            {exportResult.outcome === 'downloaded'
                                ? '，文件已开始下载。'
                                : exportResult.outcome === 'saved'
                                    ? '，已保存到系统「下载」目录。'
                                    : '。'}
                        </p>
                        <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{exportResult.name}</p>
                    </div>
                )}

                {/* 导出失败提示（安卓原生桥写入失败等） */}
                {exportError && (
                    <p className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive" role="alert">{exportError}</p>
                )}
    </div>
    );

    // 移动端：统一二级页面壳（返回手势 + 统一页头）；桌面端：保留居中弹窗
    if (isMobile) {
        return (
            <SubPage
                isOpen={isOpen}
                onClose={handleClose}
                title={title}
                bodyClassName="p-4"
                footer={<div className="flex justify-end gap-3">{footerContent}</div>}
            >
                {bodyContent}
            </SubPage>
        );
    }

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={title}
            titleIcon={<Download className="w-5 h-5" />}
            footer={footerContent}
            maxWidth="max-w-md"
        >
            {bodyContent}
        </BaseModal>
    );
}
