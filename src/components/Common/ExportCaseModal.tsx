import { useState, useMemo } from 'react';
import { Download, Check, ChevronDown } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { exportTextFile, type ExportOutcome } from '../../utils/fileExportUtil';
import {
    isSelected,
    toggleAll as toggleAllSelection,
    toggleGroup,
    toggleOne,
    type ExportSelection,
} from './exportSelection';

interface ExportOption {
    id: string;
    name: string;
}

/** 三态勾选框：分类既可整组选中，也可展开后单篇选中 */
function TriStateBox({ checked, partial }: { checked: boolean; partial?: boolean }) {
    return (
        <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-200 ${checked || partial
                ? 'border-primary bg-primary'
                : 'border-muted-foreground/50 bg-background'
                }`}
        >
            {checked && <Check className="h-2.5 w-2.5 stroke-[3] text-primary-foreground" />}
            {!checked && partial && <span className="h-[2px] w-2 rounded bg-primary-foreground" />}
        </span>
    );
}

/** 案例唯一键：八字/奇门案例都带 id */
function caseKeyOf(item: object): string {
    return String((item as { id?: unknown }).id ?? '');
}

/** 案例显示名：八字用 name，奇门用 title；都没有时给个兜底文案 */
function defaultCaseTitle(item: object): string {
    const record = item as Record<string, unknown>;
    const value = record.name ?? record.title;
    return typeof value === 'string' && value.trim() ? value : '未命名案例';
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
    /**
     * 完整备份：直接序列化原始记录，保留生平时间轴 / 排盘数据 / 正文对话流。
     * formatCase 给的是列表可见的扁平字段（姓名、时间、干支…），
     * life_events、bazi_data、dialog_lines 这些正文与生平会被丢掉。
     * 不传时只有「精简表格」一种导出方式（与旧行为一致）。
     */
    fullCases?: T[];
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
    fullCases,
}: ExportCaseModalProps<T>) {
    // 选中清单：打开时为空（默认不导出任何案例），由用户主动挑分类或单篇。
    // 分类勾选只是「整组加入/移出」的快捷方式，最终导出始终按这份清单算，
    // 否则分类与单篇两套选中态会互相打架。
    const [selection, setSelection] = useState<ExportSelection>(() => new Set());
    // 展开的分类：展开后才显示该组下的单篇案例
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    // 导出形态：精简表格（默认，便于阅读）或完整备份（保留生平与正文）
    const [mode, setMode] = useState<'flat' | 'full'>('flat');
    // 导出进行中 / 导出结果回执（安卓端走原生桥落盘，成功与失败都需要可见反馈）
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportResult, setExportResult] = useState<{ name: string; count: number; outcome: ExportOutcome } | null>(null);
    const isMobile = !useMediaQuery('(min-width: 768px)');

    // 案例唯一键：八字/奇门案例都带 id
    const caseKey = caseKeyOf;
    const allKeys = useMemo(() => cases.map(caseKeyOf), [cases]);
    // 是否已全选：决定「全选所有 / 取消全选」的文案
    const allChecked = allKeys.length > 0 && allKeys.every((key) => selection.has(key));
    // 选中模型是纯函数（见 exportSelection.ts），这里只负责接状态
    const isCaseChecked = (caseItem: T) => isSelected(selection, caseKey(caseItem));

    // 每个分类下的案例，供「组内展开」与角标计数复用
    const casesByOption = useMemo(() => {
        const map = new Map<string, T[]>(options.map((option) => [option.id, []]));
        cases.forEach((caseItem) => {
            const filterValue = getCaseFilter(caseItem);
            if (!filterValue) return;
            const hits = Array.isArray(filterValue) ? filterValue : [filterValue];
            hits.forEach((hit) => map.get(hit)?.push(caseItem));
        });
        return map;
    }, [cases, options, getCaseFilter]);

    // 按清单过滤案例：保留原顺序（Set 只用来判重，不用来排序）
    const filteredCases = useMemo(
        () => cases.filter((caseItem) => selection.has(caseKeyOf(caseItem))),
        [cases, selection],
    );

    // 整组勾选：该组已全选则整组移出，否则整组加入
    const toggleOption = (optionId: string) => {
        const groupKeys = (casesByOption.get(optionId) ?? []).map(caseKeyOf);
        setSelection((prev) => toggleGroup(prev, groupKeys));
    };

    // 单篇勾选
    const toggleCase = (caseItem: T) => {
        setSelection((prev) => toggleOne(prev, caseKey(caseItem)));
    };

    // 展开/收起分组
    const toggleExpand = (optionId: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(optionId)) next.delete(optionId);
            else next.add(optionId);
            return next;
        });
    };

    // 全选/取消全选
    const toggleAll = () => setSelection((prev) => toggleAllSelection(prev, allKeys));

    // 执行导出：统一走跨端导出工具（安卓 = 原生桥写系统下载目录，桌面 = 原生保存对话框，浏览器 = 下载）
    const handleExport = async () => {
        setExportError(null);
        setExporting(true);
        try {
            // 完整备份：原始记录直接序列化，生平时间轴与正文对话流都在里面。
            // 精简表格：走 formatCase 的扁平字段（姓名/时间/干支…），便于人工阅读。
            // 两种形态都只按勾选清单过滤，分类勾选在这里已折算成具体案例。
            const exportData = mode === 'full' && fullCases
                ? fullCases
                    .filter((c) => selection.has(caseKey(c)))
                    .map((c) => {
                        const rest = { ...(c as T & { user_id?: string }) };
                        delete rest.user_id;
                        return rest;
                    })
                : filteredCases.map((c) => {
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
        setSelection(new Set());
        setExpandedIds(new Set());
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
                disabled={exporting || filteredCases.length === 0}
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
                {/* 导出形态：精简表格只含列表可见字段；完整备份保留生平与正文 */}
                {fullCases && (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setMode('flat')}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${mode === 'flat'
                                ? 'border-primary bg-primary/5 text-primary font-medium'
                                : 'border-border text-muted-foreground hover:bg-secondary/30'
                                }`}
                        >
                            精简表格
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('full')}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${mode === 'full'
                                ? 'border-primary bg-primary/5 text-primary font-medium'
                                : 'border-border text-muted-foreground hover:bg-secondary/30'
                                }`}
                        >
                            完整备份
                        </button>
                    </div>
                )}
                {fullCases && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {mode === 'flat'
                            ? '精简表格：仅含姓名、出生时间、干支、标签等列表字段，便于阅读。'
                            : '完整备份：保留生平时间轴、案例正文与排盘数据，可原样导回。'}
                    </p>
                )}
                {/* 头部控制栏 */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        选择要导出的分类或案例
                    </p>
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/5"
                    >
                        {allChecked ? '取消全选' : '全选所有'}
                    </button>
                </div>

                {/* 分类列表：勾选=整组导出，右侧箭头展开后可选具体案例。
                    未展开保持两列密度（与旧界面一致），展开时该组占满整行。 */}
                <div className={`grid grid-cols-2 gap-2.5 ${isMobile ? '' : 'max-h-[60vh] overflow-y-auto'} px-1`}>
                    {options.map((option) => {
                        const groupCases = casesByOption.get(option.id) ?? [];
                        const checkedCount = groupCases.filter(isCaseChecked).length;
                        const groupChecked = groupCases.length > 0 && checkedCount === groupCases.length;
                        const isExpanded = expandedIds.has(option.id);

                        return (
                            <div
                                key={option.id}
                                className={`rounded-xl border bg-card transition-colors duration-200 ${isExpanded ? 'col-span-2' : ''} ${checkedCount > 0
                                    ? 'border-primary/60'
                                    : 'border-border'
                                    }`}
                            >
                                <div className="flex items-center gap-0.5 px-1.5 py-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleOption(option.id)}
                                        disabled={groupCases.length === 0}
                                        className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-sm transition-colors hover:bg-secondary/30 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <TriStateBox checked={groupChecked} partial={checkedCount > 0 && !groupChecked} />
                                        <span className={`truncate font-medium ${checkedCount > 0 ? 'text-primary' : 'text-foreground'}`}>
                                            {option.name}
                                        </span>
                                        <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs ${checkedCount > 0
                                            ? 'bg-primary/10 font-medium text-primary'
                                            : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {groupCases.length}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(option.id)}
                                        disabled={groupCases.length === 0}
                                        aria-expanded={isExpanded}
                                        aria-label={`${isExpanded ? '收起' : '展开'}${option.name}的案例`}
                                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground disabled:opacity-30"
                                    >
                                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="space-y-0.5 border-t border-border/60 px-1.5 py-1.5">
                                        {groupCases.map((caseItem) => {
                                            const checked = isCaseChecked(caseItem);
                                            return (
                                                <button
                                                    key={caseKey(caseItem)}
                                                    type="button"
                                                    onClick={() => toggleCase(caseItem)}
                                                    className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-sm transition-colors ${checked
                                                        ? 'text-foreground hover:bg-secondary/40'
                                                        : 'text-muted-foreground hover:bg-secondary/30'
                                                        }`}
                                                >
                                                    <TriStateBox checked={checked} />
                                                    <span className="truncate">{defaultCaseTitle(caseItem)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 状态统计：空选中时给出操作提示，否则只报「已选 / 总数」 */}
                <div className="flex items-center justify-between border-t border-border/50 pt-4 px-1">
                    <span className="text-sm text-muted-foreground">
                        已选 <span className="font-semibold text-foreground">{filteredCases.length}</span> / {cases.length} 个案例
                    </span>
                    {filteredCases.length === 0 ? (
                        <span className="text-xs text-muted-foreground">勾选分类或展开后选具体案例</span>
                    ) : expandedIds.size === 0 ? (
                        <span className="text-xs text-muted-foreground">展开分类可选单篇</span>
                    ) : null}
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
