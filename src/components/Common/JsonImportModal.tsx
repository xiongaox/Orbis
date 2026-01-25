import { useRef, useState, useCallback } from 'react';
import { Loader2, Upload, FileJson, Check, X, AlertCircle, LayoutTemplate } from 'lucide-react';

export interface JsonImportModalProps<T> {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    onParse: (jsonData: any) => T[];
    onSave: (data: T[]) => Promise<number>;
    onFinish: () => void;
    templateData: any;
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
    renderCard
}: JsonImportModalProps<T>) {
    const [step, setStep] = useState<ImportStep>('upload');
    const [parsedData, setParsedData] = useState<T[]>([]);
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileSelect = async (file: File) => {
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
            } catch (e) {
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
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [onParse]);

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

    const handleFinish = () => {
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

    if (!isOpen) return null;

    // Steps configuration for timeline
    const steps = [
        { id: 'upload', label: '上传文件' },
        { id: 'preview', label: '预览数据' },
        { id: 'result', label: '完成导入' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === (step === 'importing' ? 'result' : step));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                onClick={handleClose}
            />

            {/* Split Layout Modal */}
            <div className="relative w-full max-w-3xl h-[520px] bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 flex animate-in zoom-in-95 duration-300">

                {/* LEFT SIDEBAR: Context & Timeline */}
                <div className="w-[220px] bg-zinc-900/50 border-r border-white/5 flex flex-col p-6 relative overflow-hidden flex-shrink-0">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/20 via-transparent to-transparent" />
                    </div>

                    {/* Logo/Icon */}
                    <div className="mb-8 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-lg mb-3">
                            <FileJson className="w-5 h-5 text-orange-500" />
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
                        <p className="text-xs text-zinc-500 mt-1.5">支持批量导入 JSON 格式数据</p>
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
                                                ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_15px_-3px_rgba(249,115,22,0.5)]'
                                                : isCompleted
                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                                    : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                                            }
                                        `}>
                                            {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                                        </div>
                                        {idx !== steps.length - 1 && (
                                            <div className={`w-0.5 flex-1 mt-1.5 mb-[-1.25rem] transition-colors duration-300 ${isCompleted ? 'bg-zinc-700' : 'bg-zinc-800/50'}`} />
                                        )}
                                    </div>
                                    <div className={`pt-0.5 transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                                        <div className="font-medium text-xs">{s.label}</div>
                                        {isActive && s.id === 'upload' && <div className="text-xs text-zinc-500 mt-0.5">请选择或拖拽文件</div>}
                                        {isActive && s.id === 'preview' && <div className="text-xs text-zinc-500 mt-0.5">确认数据无误后导入</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Action: Download Template */}
                    <div className="mt-auto relative z-10">
                        <button
                            onClick={downloadTemplate}
                            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-white/10 transition-all text-left group"
                        >
                            <div className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 group-hover:text-white transition-colors">
                                <LayoutTemplate className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 group-hover:text-zinc-400">还没有数据?</div>
                                <div className="text-xs font-medium text-zinc-300 group-hover:text-white">下载标准模版</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* RIGHT CONTENT: Workspace */}
                <div className="flex-1 bg-zinc-950 flex flex-col relative w-full overflow-hidden">
                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-all z-20"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex-1 p-6 flex flex-col justify-center h-full overflow-hidden">

                        {/* Step 1: Upload Dropzone */}
                        {step === 'upload' && (
                            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-semibold text-white mb-4">上传文件</h3>
                                <div
                                    className={`
                                        flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative overflow-hidden group
                                        ${dragOver
                                            ? 'border-orange-500 bg-orange-500/5'
                                            : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30'
                                        }
                                    `}
                                    onDrop={handleDrop}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className={`w-16 h-16 mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center transition-transform duration-500 ${dragOver ? 'scale-110 shadow-2xl shadow-orange-500/20' : 'group-hover:scale-105'}`}>
                                        <Upload className={`w-7 h-7 ${dragOver ? 'text-orange-500' : 'text-zinc-400'}`} />
                                    </div>
                                    <div className="text-center space-y-1.5">
                                        <p className="text-base font-medium text-zinc-200">点击上传或将文件拖到这里</p>
                                        <p className="text-xs text-zinc-500">支持 .json 格式文件</p>
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
                                        <h3 className="text-lg font-semibold text-white">预览数据</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-400">
                                            {parsedData.length} 条记录
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden border border-zinc-800 rounded-xl bg-zinc-900/20 flex flex-col relative">
                                    <div className="absolute inset-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3">
                                        {renderCard ? (
                                            /* CARD GRID VIEW */
                                            <div className="grid grid-cols-2 gap-3 auto-rows-min">
                                                {parsedData.map((item, i) => (
                                                    <div key={i} className="animate-in fade-in zoom-in-95 fill-mode-both" style={{ animationDelay: `${i * 30}ms` }}>
                                                        {renderCard(item, i)}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : previewColumns ? (
                                            /* FALLBACK TABLE VIEW */
                                            <table className="w-full text-sm h-full">
                                                <thead className="bg-zinc-900/80 text-xs font-medium text-zinc-500 sticky top-0 backdrop-blur-md z-10">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left w-16">#</th>
                                                        {previewColumns.map((col, i) => (
                                                            <th key={i} className="px-6 py-3 text-left" style={{ width: col.width }}>{col.header}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {parsedData.map((item, i) => (
                                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                                            <td className="px-6 py-3 text-zinc-600 font-mono text-xs">{i + 1}</td>
                                                            {previewColumns.map((col, ci) => (
                                                                <td key={ci} className="px-6 py-3 text-zinc-300">
                                                                    {col.render ? col.render(item) : col.key ? String(item[col.key] || '') : ''}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-zinc-500">No layout configured</div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-between items-center flex-shrink-0">
                                    {/* Re-upload Button (Moved here) */}
                                    <button
                                        onClick={resetState}
                                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
                                    >
                                        取消并重新上传
                                    </button>

                                    {/* Import Button (Resized) */}
                                    <button
                                        onClick={handleImport}
                                        className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-lg transition-all shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)] active:scale-95"
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
                                    <div className="w-20 h-20 rounded-full border-4 border-zinc-800" />
                                    <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                                </div>
                                <h3 className="mt-8 text-xl font-medium text-white">正在处理...</h3>
                            </div>
                        )}

                        {/* Step 4: Result */}
                        {step === 'result' && importResult && (
                            <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                                <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 mb-8 shadow-[0_0_50px_-10px_rgba(34,197,94,0.4)]">
                                    <Check className="w-12 h-12 text-green-500" />
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-2">导入成功!</h3>
                                <p className="text-zinc-400 mb-8">
                                    成功导入 <span className="text-white font-bold">{importResult.success}</span> 条数据
                                </p>
                                <button
                                    onClick={handleFinish}
                                    className="px-10 py-3 bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    完成
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
