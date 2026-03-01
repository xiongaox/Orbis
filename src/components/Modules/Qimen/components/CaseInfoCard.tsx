/**
 * 奇门案例信息卡片
 * 显示/编辑案例描述、反馈和断语
 */
import { useState, useEffect } from 'react';
import { Eye, EyeOff, FileText, Pencil, Save, X } from 'lucide-react';
import { type QimenCase, qimenCaseService } from '../../../../services/qimenCaseService';

interface CaseInfoCardProps {
    caseData: QimenCase | null;
    onCaseUpdated?: (updatedCase: QimenCase) => void;
}

export default function CaseInfoCard({ caseData, onCaseUpdated }: CaseInfoCardProps) {
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({
        description: caseData?.description || '',
        feedback: caseData?.feedback || '',
        analysis: caseData?.analysis || '',
    });

    useEffect(() => {
        if (caseData) {
            setEditData({
                description: caseData.description || '',
                feedback: caseData.feedback || '',
                analysis: caseData.analysis || '',
            });
        }
    }, [caseData]);

    const handleSave = async () => {
        if (!caseData) return;
        setIsSaving(true);
        try {
            const updatedCase = await qimenCaseService.updateCase(caseData.id, {
                description: editData.description,
                feedback: editData.feedback,
                analysis: editData.analysis,
            });
            onCaseUpdated?.(updatedCase);
            setIsEditMode(false);
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditData({
            description: caseData?.description || '',
            feedback: caseData?.feedback || '',
            analysis: caseData?.analysis || '',
        });
        setIsEditMode(false);
    };

    if (!caseData) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center h-40 text-muted-foreground/60 gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
                <span className="text-sm">暂无关联案例信息</span>
            </div>
        );
    }

    return (
        <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif font-bold flex items-center gap-2 text-foreground">
                    <FileText className="w-5 h-5" />
                    案例详情
                </h3>
                <div className="flex items-center gap-1">
                    {isEditMode ? (
                        <>
                            <button onClick={handleSave} disabled={isSaving} className="text-emerald-500 hover:text-emerald-400 transition-colors p-1.5 rounded-md hover:bg-emerald-500/10 disabled:opacity-50" title="保存">
                                <Save className="w-4 h-4" />
                            </button>
                            <button onClick={handleCancel} disabled={isSaving} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/50 disabled:opacity-50" title="取消">
                                <X className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setIsEditMode(true)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/50" title="编辑">
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsPrivacyMode(!isPrivacyMode)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/50" title={isPrivacyMode ? "显示明文" : "隐藏信息"}>
                                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className={isPrivacyMode && !isEditMode ? "blur-sm opacity-60 select-none transition-all duration-300" : "transition-all duration-300"}>
                {/* 事情描述 */}
                <div className="space-y-2 mb-4">
                    <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2"><span className="w-1.5 h-1.5 bg-primary/80 rounded-full" />事情描述</h4>
                    {isEditMode ? (
                        <textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="w-full text-sm leading-relaxed p-3.5 bg-muted/30 border border-primary/40 rounded-lg min-h-[80px] whitespace-pre-wrap text-foreground/90 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="输入事情描述..." />
                    ) : (
                        <div className="text-sm leading-relaxed p-3.5 bg-muted/30 border border-border/30 rounded-lg min-h-[60px] whitespace-pre-wrap text-foreground/90 shadow-sm">
                            {isPrivacyMode ? '•'.repeat(Math.min((caseData.description?.length || 0), 100)) + ((caseData.description?.length || 0) > 100 ? '...' : '') : (caseData.description || '无描述')}
                        </div>
                    )}
                </div>

                {/* 事件反馈 */}
                <div className="space-y-2 mb-4">
                    <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-500/80 rounded-full" />事件反馈</h4>
                    {isEditMode ? (
                        <textarea value={editData.feedback} onChange={(e) => setEditData({ ...editData, feedback: e.target.value })} className="w-full text-sm leading-relaxed p-3.5 bg-muted/30 border border-emerald-500/40 rounded-lg min-h-[80px] whitespace-pre-wrap text-foreground/90 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30" placeholder="输入事件反馈..." />
                    ) : (
                        <div className="text-sm leading-relaxed p-3.5 bg-muted/30 border border-border/30 rounded-lg min-h-[60px] whitespace-pre-wrap text-foreground/90 shadow-sm">
                            {isPrivacyMode ? '•'.repeat(Math.min((caseData.feedback?.length || 0), 60)) : (caseData.feedback || '暂无反馈')}
                        </div>
                    )}
                </div>

                {/* 案例断法 */}
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500/80 rounded-full" />案例断法</h4>
                    {isEditMode ? (
                        <textarea value={editData.analysis} onChange={(e) => setEditData({ ...editData, analysis: e.target.value })} className="w-full text-sm leading-relaxed p-3.5 bg-muted/30 border border-indigo-500/40 rounded-lg min-h-[100px] whitespace-pre-wrap text-foreground/90 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="输入案例断法..." />
                    ) : (
                        <div className="text-sm leading-relaxed p-3.5 bg-muted/30 border border-border/30 rounded-lg min-h-[80px] whitespace-pre-wrap text-foreground/90 shadow-sm">
                            {isPrivacyMode ? '•'.repeat(Math.min((caseData.analysis?.length || 0), 80)) : (caseData.analysis || '暂无断语')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
