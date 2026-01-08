/**
 * 导入案例 Modal
 * 支持 Excel 批量导入命造数据
 */
import { useState, useRef, useCallback } from 'react';
import { Loader2, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { baziCaseService } from '../../services/baziCaseService';
import { parseExcelFile, downloadTemplate, type ParseResult } from '../../services/bazi/excelImporter';
import { BAZI_CASES_CHANGED_EVENT } from '../../data/caseConstants';

interface ImportCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImported: () => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

export default function ImportCaseModal({ isOpen, onClose, onImported }: ImportCaseModalProps) {
    const [step, setStep] = useState<ImportStep>('upload');
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setStep('upload');
        setParseResult(null);
        setIsImporting(false);
        setImportResult(null);
        setError(null);
        setDragOver(false);
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileSelect = async (file: File) => {
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setError('请上传 Excel 文件（.xlsx 或 .xls）');
            return;
        }

        setError(null);
        try {
            const result = await parseExcelFile(file);
            setParseResult(result);
            setStep('preview');
        } catch (err) {
            setError(err instanceof Error ? err.message : '文件解析失败');
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleImport = async () => {
        if (!parseResult || parseResult.data.length === 0) return;

        setIsImporting(true);
        setStep('importing');
        setError(null);

        try {
            const created = await baziCaseService.createCases(parseResult.data);
            setImportResult({
                success: created.length,
                failed: parseResult.data.length - created.length,
            });
            setStep('result');
            window.dispatchEvent(new CustomEvent(BAZI_CASES_CHANGED_EVENT));
            onImported();
        } catch (err) {
            setError(err instanceof Error ? err.message : '导入失败');
            setStep('preview');
        } finally {
            setIsImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="modal-card" style={{ maxWidth: '600px' }}>
                <h2 className="modal-title">导入案例</h2>

                {/* 步骤 1: 上传文件 */}
                {step === 'upload' && (
                    <div className="space-y-4">
                        {/* 模板下载 */}
                        <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="w-8 h-8 text-primary" />
                                    <div>
                                        <div className="font-medium text-foreground">下载导入模板</div>
                                        <div className="text-xs text-muted-foreground">Excel 格式，包含示例数据</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={downloadTemplate}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    下载模板
                                </button>
                            </div>
                        </div>

                        {/* 上传区域 */}
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                                }`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                            <div className="text-foreground mb-1">拖拽文件到此处，或点击上传</div>
                            <div className="text-xs text-muted-foreground">支持 .xlsx / .xls 格式</div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(file);
                                }}
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="button" onClick={handleClose} className="modal-btn">
                                取消
                            </button>
                        </div>
                    </div>
                )}

                {/* 步骤 2: 预览数据 */}
                {step === 'preview' && parseResult && (
                    <div className="space-y-4">
                        {/* 统计信息 */}
                        <div className="flex gap-4">
                            <div className="flex-1 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                                <div className="text-2xl font-bold text-green-600">{parseResult.data.length}</div>
                                <div className="text-xs text-green-600/80">可导入</div>
                            </div>
                            {parseResult.errors.length > 0 && (
                                <div className="flex-1 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                                    <div className="text-2xl font-bold text-destructive">{parseResult.errors.length}</div>
                                    <div className="text-xs text-destructive/80">有错误</div>
                                </div>
                            )}
                        </div>

                        {/* 错误列表 */}
                        {parseResult.errors.length > 0 && (
                            <div className="max-h-32 overflow-y-auto bg-destructive/5 rounded-lg p-3 space-y-1">
                                {parseResult.errors.map((err, i) => (
                                    <div key={i} className="text-xs text-destructive flex items-start gap-2">
                                        <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <span>第 {err.row} 行: {err.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 数据预览 */}
                        {parseResult.data.length > 0 && (
                            <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-secondary sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground border-b border-border">姓名</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground border-b border-border">性别</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground border-b border-border">标签</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {parseResult.data.slice(0, 10).map((item, i) => (
                                            <tr key={i} className="hover:bg-secondary/30">
                                                <td className="px-2 py-1.5 text-foreground">{item.name}</td>
                                                <td className="px-2 py-1.5 text-foreground">{item.gender === 'male' ? '男' : '女'}</td>
                                                <td className="px-2 py-1.5 text-muted-foreground text-xs">
                                                    {item.tags?.join(', ') || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {parseResult.data.length > 10 && (
                                            <tr>
                                                <td colSpan={3} className="px-2 py-1.5 text-center text-xs text-muted-foreground">
                                                    ... 还有 {parseResult.data.length - 10} 条
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="button" onClick={() => setStep('upload')} className="modal-btn">
                                重新上传
                            </button>
                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={parseResult.data.length === 0}
                                className="modal-btn primary flex items-center gap-2"
                            >
                                确认导入 ({parseResult.data.length} 条)
                            </button>
                        </div>
                    </div>
                )}

                {/* 步骤 3: 导入中 */}
                {step === 'importing' && (
                    <div className="py-12 text-center">
                        <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                        <div className="text-foreground">正在导入...</div>
                        <div className="text-xs text-muted-foreground mt-1">请勿关闭此窗口</div>
                    </div>
                )}

                {/* 步骤 4: 导入结果 */}
                {step === 'result' && importResult && (
                    <div className="py-8 text-center space-y-4">
                        <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
                        <div>
                            <div className="text-xl font-medium text-foreground">导入完成</div>
                            <div className="text-sm text-muted-foreground mt-1">
                                成功导入 {importResult.success} 条案例
                                {importResult.failed > 0 && `，${importResult.failed} 条失败`}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button type="button" onClick={handleClose} className="modal-btn primary">
                                完成
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
