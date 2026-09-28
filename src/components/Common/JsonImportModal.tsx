/**
 * JsonImportModal - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供跨模块的通用 UI 组件
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default JsonImportModal`, `JsonImportModalProps`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `BaseModal`、内部模块 `fileExportUtil` 等 5 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useRef, useState, useCallback, useMemo } from 'react';
import { Upload, FileJson, Check, AlertCircle, LayoutTemplate, X, ClipboardPaste, Download, ChevronRight, Table2, Trash2 } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { exportTextFile } from '../../utils/fileExportUtil';

export interface JsonImportModalProps<T> {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    onParse: (jsonData: unknown) => T[];
    onSave: (data: T[]) => Promise<number>;
    onFinish: () => void;
    templateData: unknown;
    /**
     * Optional card renderer for Grid View.
     * If provided, the preview will default to Card Grid mode.
     */
    renderCard?: (item: T, index: number) => React.ReactNode;
    /**
     * Columns config for Table View (fallback or toggleable)
     */
    previewColumns?: {
        header: string;
        key?: keyof T;
        render?: (item: T) => React.ReactNode;
        width?: string;
    }[];
    /**
     * Optional custom grid class for card layout.
     * Default: "grid-cols-2"
     */
    gridClassName?: string;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

// 移动端分区列表行（方案 B）：图标瓦片 + 主副文案 + 指示箭头，open 传入时箭头随展开旋转
function ActionRow({ icon, title, sub, onClick, open, hero = false, disabled = false }: {
    icon: React.ReactNode;
    title: string;
    sub: string;
    onClick: () => void;
    open?: boolean;
    hero?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-full flex items-center gap-3 px-4 text-left transition-colors focus-ring disabled:opacity-50 disabled:pointer-events-none ${hero ? 'py-4' : 'py-3.5'} ${!disabled ? 'hover:bg-muted/40 active:bg-muted/60' : ''}`}
        >
            <div className={`
                flex items-center justify-center flex-shrink-0
                ${hero
                    ? 'w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary'
                    : 'w-9 h-9 rounded-lg bg-muted/60 border border-border text-muted-foreground'}
            `}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className={`font-semibold text-foreground ${hero ? 'text-[15px]' : 'text-sm'}`}>{title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{sub}</div>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground/50 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        </button>
    );
}

// 预览卡片左滑删除容器：跟手左移露出右侧红色删除区（垃圾桶居中），超过阈值松手即删除。
// 仅监听触摸事件，桌面端鼠标路径不受影响；横竖轴锁定避免与列表纵向滚动打架。
function SwipeToDelete({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
    const SWIPE_THRESHOLD = 96;
    const SWIPE_MAX = 160;
    const [dx, setDx] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [removing, setRemoving] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const axisLocked = useRef(false);
    const active = useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (removing) return;
        active.current = true;
        axisLocked.current = false;
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!active.current || removing) return;
        const mx = e.touches[0].clientX - startX.current;
        const my = e.touches[0].clientY - startY.current;
        if (!axisLocked.current) {
            if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
            axisLocked.current = Math.abs(mx) > Math.abs(my);
            if (!axisLocked.current) {
                active.current = false;
                return;
            }
            setDragging(true);
        }
        setDx(Math.min(0, Math.max(mx, -SWIPE_MAX)));
    };

    const handleTouchEnd = () => {
        if (!active.current) return;
        active.current = false;
        setDragging(false);
        if (-dx >= SWIPE_THRESHOLD) {
            setRemoving(true);
            setDx(-400);
            window.setTimeout(onDelete, 220);
        } else {
            setDx(0);
        }
    };

    return (
        <div className="relative" style={{ touchAction: 'pan-y' }}>
            <div
                className="absolute inset-y-0 right-0 w-24 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 pointer-events-none"
                style={{ opacity: Math.min(-dx / SWIPE_THRESHOLD, 1) }}
            >
                <Trash2 className="w-5 h-5" />
            </div>
            <div
                className={`relative ${removing ? 'opacity-0' : ''} ${dragging ? '' : 'transition-[transform,opacity] duration-200'}`}
                style={{ transform: `translateX(${dx}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
}

export default function JsonImportModal<T>({
    isOpen,
    title,
    onClose,
    onParse,
    onSave,
    onFinish,
    templateData,
    previewColumns,
    renderCard,
    gridClassName = "grid-cols-2"
}: JsonImportModalProps<T>) {
    const [step, setStep] = useState<ImportStep>('upload');
    const [parsedData, setParsedData] = useState<T[]>([]);
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isMobile = !useMediaQuery('(min-width: 768px)');
    // 移动端分区列表（方案 B）的折叠与辅助状态
    const [pasteOpen, setPasteOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [fieldsOpen, setFieldsOpen] = useState(false);
    const [templateBusy, setTemplateBusy] = useState(false);
    const [templateSaved, setTemplateSaved] = useState<string | null>(null);

    // 字段说明表数据：从模板首项的键值对推导，八字/奇门各自展示自己的键名与示例
    const templateFields = useMemo(() => {
        const first = Array.isArray(templateData)
            ? (templateData as unknown[]).find(item => item && typeof item === 'object')
            : null;
        if (!first) return [];
        return Object.entries(first as Record<string, unknown>).map(([key, value]) => ({
            key,
            example: typeof value === 'string' ? value : JSON.stringify(value),
        }));
    }, [templateData]);

    const resetState = useCallback(() => {
        setStep('upload');
        setParsedData([]);
        setImportResult(null);
        setError(null);
        setDragOver(false);
        setPasteOpen(false);
        setPasteText('');
        setFieldsOpen(false);
        setTemplateSaved(null);
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    // 解析并进入预览：文件选择与粘贴解析共用（粘贴路径没有 .json 扩展名校验）
    const parseAndPreview = useCallback((text: string) => {
        setError(null);
        try {
            let jsonData;
            try {
                jsonData = JSON.parse(text);
            } catch {
                throw new Error('JSON 解析失败，请检查内容格式');
            }

            const data = onParse(jsonData);

            if (data.length === 0) {
                throw new Error('未找到有效数据');
            }

            setParsedData(data);
            setStep('preview');
        } catch (err) {
            setError(err instanceof Error ? err.message : '解析错误');
        }
    }, [onParse]);

    const handleFileSelect = useCallback(async (file: File) => {
        if (!file.name.endsWith('.json')) {
            setError('仅支持 JSON 格式文件 (.json)');
            return;
        }

        setError(null);
        const text = await file.text();
        parseAndPreview(text);
    }, [parseAndPreview]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    // 预览列表左滑删除单条：按对象引用过滤（而非索引），避免多条同时滑动时索引漂移误删；
    // 全部删完则回到上传步骤
    const removeParsedItem = (target: T) => {
        const next = parsedData.filter(p => p !== target);
        setParsedData(next);
        if (next.length === 0) resetState();
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;

        setStep('importing');
        setError(null);

        try {
            const successCount = await onSave(parsedData);
            setImportResult({
                success: successCount,
                failed: parsedData.length - successCount,
            });
            setStep('result');
        } catch (err) {
            setError(err instanceof Error ? err.message : '导入失败');
            setStep('preview');
        }
    };

    const handleFinishImport = () => {
        onFinish();
        handleClose();
    };

    // 下载标准模板：统一走跨端导出工具（安卓 WebView 不支持 <a download> 的 blob 下载，
    // 必须经 OrbisNative 桥写入系统「下载」目录；桌面弹原生保存框；浏览器回退 Blob）
    const handleDownloadTemplate = async () => {
        if (templateBusy) return;
        setError(null);
        setTemplateSaved(null);
        setTemplateBusy(true);
        try {
            const outcome = await exportTextFile({
                filename: 'import_template',
                content: JSON.stringify(templateData, null, 2),
                extension: 'json',
                typeLabel: 'JSON',
            });
            if (outcome === 'cancelled') return;
            setTemplateSaved(
                outcome === 'downloaded'
                    ? '已触发浏览器下载 · import_template.json'
                    : '模板已保存 · import_template.json'
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : '模板下载失败，请重试');
        } finally {
            setTemplateBusy(false);
        }
    };

    // Steps configuration for timeline
    const steps = [
        { id: 'upload', label: '上传文件' },
        { id: 'preview', label: '预览数据' },
        { id: 'result', label: '完成导入' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === (step === 'importing' ? 'result' : step));

    // 桌面端左侧栏：竖排步骤 + 模板下载（原样保留）
    const desktopSidebar = (
        <div className="w-[220px] bg-muted/30 border-r border-border flex flex-col p-6 relative overflow-hidden flex-shrink-0">
            {/* Logo/Icon */}
            <div className="mb-8 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm mb-3">
                    <FileJson className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
                <p className="text-xs text-muted-foreground mt-1.5">支持批量导入 JSON 格式数据</p>
            </div>

            {/* Vertical Stepper */}
            <div className="flex-1 space-y-6 relative z-10">
                {steps.map((s, idx) => {
                    const isActive = idx === currentStepIndex;
                    const isCompleted = idx < currentStepIndex;

                    return (
                        <div key={s.id} className="flex gap-3 group">
                            <div className="relative flex flex-col items-center">
                                <div className={`
                                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 z-10
                                    ${isActive
                                        ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                        : isCompleted
                                            ? 'bg-muted border-primary/20 text-muted-foreground'
                                            : 'bg-muted/50 border-border text-muted-foreground/50'
                                    }
                                `}>
                                    {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                                </div>
                                {idx !== steps.length - 1 && (
                                    <div className={`w-0.5 flex-1 mt-1.5 mb-[-1.25rem] transition-colors duration-300 ${isCompleted ? 'bg-primary/20' : 'bg-border'}`} />
                                )}
                            </div>
                            <div className={`pt-0.5 transition-colors duration-300 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                <div className="font-medium text-xs">{s.label}</div>
                                {isActive && s.id === 'upload' && <div className="text-xs text-muted-foreground mt-0.5">请选择或拖拽文件</div>}
                                {isActive && s.id === 'preview' && <div className="text-xs text-muted-foreground mt-0.5">确认数据无误后导入</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Action: Download Template */}
            <div className="mt-auto relative z-10">
                <button
                    onClick={handleDownloadTemplate}
                    disabled={templateBusy}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-left group focus-ring disabled:opacity-50 disabled:pointer-events-none"
                >
                    <div className="p-1.5 rounded-lg bg-background text-muted-foreground group-hover:text-foreground transition-colors border border-border">
                        <LayoutTemplate className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">还没有数据?</div>
                        <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">下载标准模版</div>
                    </div>
                </button>
                {templateSaved && (
                    <div className="mt-2 px-1 text-[11px] leading-relaxed text-green-500" role="status">{templateSaved}</div>
                )}
            </div>
        </div>
    );

    // 工作区：上传/预览/处理/结果各步骤的共享内容（移动端与桌面端共用）
    const workspace = (
        /* RIGHT CONTENT: Workspace */
        <div className="flex-1 bg-background flex flex-col relative w-full overflow-hidden">
                {/* Custom Close Button - 桌面端显示（移动端关闭按钮已在顶部步骤条中） */}
                {!isMobile && (
                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all z-20 focus-ring"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                <div className={`flex-1 ${isMobile ? 'p-4' : 'p-6'} flex flex-col justify-center h-full overflow-hidden`}>

                    {/* 文件输入提升到工作区根部：移动端列表行与桌面端拖拽框共用 */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                            e.target.value = '';
                        }}
                    />

                    {/* Step 1: Upload（移动端 = 分区列表；桌面端 = 拖拽虚线框） */}
                    {step === 'upload' && (
                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                            {!isMobile && <h3 className="text-xl font-semibold text-foreground mb-4">上传文件</h3>}
                            {isMobile ? (
                                <div className="flex-1 min-h-0 overflow-y-auto pb-2 pt-1">
                                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                                        <ActionRow
                                            hero
                                            icon={<FileJson className="w-5 h-5" />}
                                            title="选择 JSON 文件"
                                            sub="从本机文件中选取 · 支持批量导入"
                                            onClick={() => fileInputRef.current?.click()}
                                        />
                                    </div>

                                    <div className="my-3 h-px bg-border" />
                                    <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
                                        <div>
                                            <ActionRow
                                                icon={<ClipboardPaste className="w-[17px] h-[17px]" />}
                                                title="粘贴 JSON 数据"
                                                sub="从聊天 / 笔记复制后直接粘贴解析"
                                                open={pasteOpen}
                                                onClick={() => setPasteOpen(v => !v)}
                                            />
                                            {pasteOpen && (
                                                <div className="px-4 pt-3 pb-4">
                                                    <textarea
                                                        value={pasteText}
                                                        onChange={(e) => setPasteText(e.target.value)}
                                                        placeholder="粘贴 JSON 数组内容（格式可参考标准模板）"
                                                        autoFocus
                                                        className="w-full min-h-[96px] resize-none rounded-lg border border-border bg-background p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 outline-none focus-ring"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => parseAndPreview(pasteText)}
                                                        disabled={!pasteText.trim()}
                                                        className="mt-2.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all active:scale-[0.98] focus-ring disabled:opacity-40 disabled:pointer-events-none"
                                                    >
                                                        解析并预览
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <ActionRow
                                                icon={<Download className="w-[17px] h-[17px]" />}
                                                title="保存标准模板"
                                                sub="保存到本机 · import_template.json"
                                                onClick={handleDownloadTemplate}
                                                disabled={templateBusy}
                                            />
                                        </div>

                                        <div>
                                            <ActionRow
                                                icon={<Table2 className="w-[17px] h-[17px]" />}
                                                title="查看字段说明"
                                                sub={`${templateFields.length} 个字段 · 含示例值`}
                                                open={fieldsOpen}
                                                onClick={() => setFieldsOpen(v => !v)}
                                            />
                                            {fieldsOpen && templateFields.length > 0 && (
                                                <div className="px-4 pt-3 pb-4">
                                                    <div className="rounded-lg border border-border/60 divide-y divide-border/50 overflow-hidden">
                                                        {templateFields.map(f => (
                                                            <div key={f.key} className="flex items-center gap-3 px-3.5 py-2.5">
                                                                <span className="w-16 shrink-0 text-xs font-medium text-foreground">{f.key}</span>
                                                                <span className="flex-1 min-w-0 truncate text-right font-mono text-[11px] text-muted-foreground">{f.example}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {templateSaved && (
                                        <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-500 animate-in slide-in-from-bottom-2" role="status">
                                            <Check className="w-4 h-4 flex-shrink-0" />
                                            <span className="text-xs font-medium">{templateSaved}</span>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 animate-in slide-in-from-bottom-2">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-xs font-medium">{error}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div
                                        className={`
                                            flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative overflow-hidden group
                                            ${dragOver
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                            }
                                        `}
                                        onDrop={handleDrop}
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className={`w-16 h-16 mb-4 rounded-2xl bg-muted border border-border flex items-center justify-center transition-transform duration-500 ${dragOver ? 'scale-110 shadow-lg' : 'group-hover:scale-105'}`}>
                                            <Upload className={`w-7 h-7 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                                        </div>
                                        <div className="text-center space-y-1.5">
                                            <p className="text-base font-medium text-foreground">点击上传或将文件拖到这里</p>
                                            <p className="text-xs text-muted-foreground">支持 .json 格式文件</p>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 animate-in slide-in-from-bottom-2">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-xs font-medium">{error}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 2: Preview - Card Grid or Table */}
                    {step === 'preview' && (
                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-foreground">预览数据</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-xs font-medium text-muted-foreground">
                                        {parsedData.length} 条记录
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden border border-border rounded-xl bg-muted/20 flex flex-col relative">
                                <div className="absolute inset-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3">
                                    {renderCard ? (
                                        /* CARD GRID VIEW - 移动端单列，桌面端使用传入的 gridClassName */
                                        <div className={`grid ${isMobile ? 'grid-cols-1' : gridClassName} gap-3 auto-rows-min`}>
                                            {parsedData.map((item, i) => (
                                                <div key={i} className="animate-in fade-in zoom-in-95 fill-mode-both" style={{ animationDelay: `${i * 30}ms` }}>
                                                    <SwipeToDelete onDelete={() => removeParsedItem(item)}>
                                                        {renderCard(item, i)}
                                                    </SwipeToDelete>
                                                </div>
                                            ))}
                                        </div>
                                    ) : previewColumns ? (
                                        /* FALLBACK TABLE VIEW */
                                        <table className="w-full text-sm h-full">
                                            <thead className="bg-muted/80 text-xs font-medium text-muted-foreground sticky top-0 backdrop-blur-md z-10">
                                                <tr>
                                                    <th className="px-6 py-3 text-left w-16">#</th>
                                                    {previewColumns.map((col, i) => (
                                                        <th key={i} className="px-6 py-3 text-left" style={{ width: col.width }}>{col.header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50">
                                                {parsedData.map((item, i) => (
                                                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                                                        <td className="px-6 py-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                                                        {previewColumns.map((col, ci) => (
                                                            <td key={ci} className="px-6 py-3 text-foreground">
                                                                {col.render ? col.render(item) : col.key ? String(item[col.key] || '') : ''}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">No layout configured</div>
                                    )}
                                </div>
                            </div>

                            <div className={`flex items-center gap-2 flex-shrink-0 ${isMobile ? 'mt-3 pt-3 border-t border-border' : 'mt-4 justify-between'}`}>
                                {/* Re-upload Button */}
                                <button
                                    onClick={resetState}
                                    className={`text-muted-foreground hover:text-foreground transition-colors focus-ring ${isMobile ? 'px-3 py-2.5 text-sm' : 'text-sm px-2 py-1'}`}
                                >
                                    重新上传
                                </button>

                                {/* Import Button */}
                                <button
                                    onClick={handleImport}
                                    className={`bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold rounded-lg transition-all focus-ring ${isMobile ? 'flex-1 h-11 active:scale-[0.98]' : 'px-4 py-2 shadow-sm active:scale-95'}`}
                                >
                                    确认导入
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Loading */}
                    {step === 'importing' && (
                        <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-4 border-muted" />
                                <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                            </div>
                            <h3 className="mt-8 text-xl font-medium text-foreground">正在处理...</h3>
                        </div>
                    )}

                    {/* Step 4: Result */}
                    {step === 'result' && importResult && (
                        <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 mb-8 shadow-sm">
                                <Check className="w-12 h-12 text-green-500" />
                            </div>
                            <h3 className="text-3xl font-bold text-foreground mb-2">导入成功!</h3>
                            <p className="text-muted-foreground mb-8">
                                成功导入 <span className="text-foreground font-bold">{importResult.success}</span> 条数据
                            </p>
                            <button
                                onClick={handleFinishImport}
                                className="px-10 py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl transition-all shadow-lg active:scale-95 focus-ring"
                            >
                                完成
                            </button>
                        </div>
                    )}
                </div>
        </div>
    );

    // 移动端：统一二级页面壳（返回手势 + 统一页头）；桌面端：保留左侧栏弹窗
    if (isMobile) {
        return (
            <SubPage
                isOpen={isOpen}
                onClose={handleClose}
                title={title}
                bodyClassName="overflow-hidden flex flex-col"
            >
                {workspace}
            </SubPage>
        );
    }

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={null}
            maxWidth="max-w-3xl"
            className="flex-row p-0 overflow-hidden !h-[640px] !max-h-[95vh]"
            bodyClassName="p-0 overflow-hidden flex flex-row h-full"
            showCloseButton={false}
        >
            {desktopSidebar}
            {workspace}
        </BaseModal>
    );
}
