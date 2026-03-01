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
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `BaseModal` 等 4 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useRef, useState, useCallback } from 'react';
import { Upload, FileJson, Check, AlertCircle, LayoutTemplate, X } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import { useMediaQuery } from '../../hooks/useMediaQuery';

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

    const resetState = useCallback(() => {
        setStep('upload');
        setParsedData([]);
        setImportResult(null);
        setError(null);
        setDragOver(false);
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileSelect = useCallback(async (file: File) => {
        if (!file.name.endsWith('.json')) {
            setError('仅支持 JSON 格式文件 (.json)');
            return;
        }

        setError(null);
        try {
            const text = await file.text();
            let jsonData;
            try {
                jsonData = JSON.parse(text);
            } catch {
                throw new Error('JSON 文件解析失败');
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

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

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

    const downloadTemplate = () => {
        const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import_template.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Steps configuration for timeline
    const steps = [
        { id: 'upload', label: '上传文件' },
        { id: 'preview', label: '预览数据' },
        { id: 'result', label: '完成导入' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === (step === 'importing' ? 'result' : step));

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={null}
            maxWidth={isMobile ? 'max-w-full' : 'max-w-3xl'}
            fullScreen={isMobile}
            className={isMobile
                ? 'flex-col p-0 overflow-hidden'
                : 'flex-row p-0 overflow-hidden !h-[640px] !max-h-[95vh]'
            }
            bodyClassName={isMobile
                ? 'p-0 overflow-hidden flex flex-col h-full'
                : 'p-0 overflow-hidden flex flex-row h-full'
            }
            showCloseButton={false}
        >
            {/* 移动端：顶部精简步骤条 + 标题 */}
            {isMobile ? (
                <div className="bg-muted/30 border-b border-border px-4 py-4 flex-shrink-0">
                    {/* 标题行 + 关闭按钮 */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
                                <FileJson className="w-4 h-4 text-primary" />
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
                    {/* 水平步骤条 */}
                    <div className="flex items-center gap-1">
                        {steps.map((s, idx) => {
                            const isActive = idx === currentStepIndex;
                            const isCompleted = idx < currentStepIndex;
                            return (
                                <div key={s.id} className="flex items-center gap-1 flex-1">
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all flex-shrink-0
                                        ${isActive
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : isCompleted
                                                ? 'bg-muted border-primary/20 text-muted-foreground'
                                                : 'bg-muted/50 border-border text-muted-foreground/50'
                                        }
                                    `}>
                                        {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                                    </div>
                                    <span className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                                        {s.label}
                                    </span>
                                    {idx !== steps.length - 1 && (
                                        <div className={`flex-1 h-px mx-1 ${isCompleted ? 'bg-primary/30' : 'bg-border'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* 桌面端：左侧边栏（原样保留） */
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
                            onClick={downloadTemplate}
                            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-left group focus-ring"
                        >
                            <div className="p-1.5 rounded-lg bg-background text-muted-foreground group-hover:text-foreground transition-colors border border-border">
                                <LayoutTemplate className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">还没有数据?</div>
                                <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">下载标准模版</div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* RIGHT CONTENT: Workspace */}
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

                    {/* Step 1: Upload Dropzone */}
                    {step === 'upload' && (
                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-xl font-semibold text-foreground mb-4">上传文件</h3>
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
                            </div>

                            {error && (
                                <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 animate-in slide-in-from-bottom-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs font-medium">{error}</span>
                                </div>
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
                                                    {renderCard(item, i)}
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

                            <div className="mt-4 flex justify-between items-center flex-shrink-0">
                                {/* Re-upload Button */}
                                <button
                                    onClick={resetState}
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 focus-ring"
                                >
                                    取消并重新上传
                                </button>

                                {/* Import Button */}
                                <button
                                    onClick={handleImport}
                                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-95 focus-ring"
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

                {/* 移动端：底部下载模版按钮（上传和预览步骤时显示） */}
                {isMobile && (step === 'upload' || step === 'preview') && (
                    <div className="flex-shrink-0 px-4 pb-4">
                        <button
                            onClick={downloadTemplate}
                            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-left group focus-ring"
                        >
                            <div className="p-1.5 rounded-lg bg-background text-muted-foreground group-hover:text-foreground transition-colors border border-border">
                                <LayoutTemplate className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">还没有数据?</div>
                                <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">下载标准模版</div>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </BaseModal>
    );
}
