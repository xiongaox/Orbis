/**
 * 关键职责：
 * - 奇门案例详情区：完整对话直接铺在卡片里并内部滚动，浏览不必开弹窗；
 *   点标题栏的铅笔进编辑（弹窗打开即聚焦输入框），编辑与浏览分工清楚。
 * - 摘要只读，真正的新增/删除都在 CaseDialogModal 里（弹窗常驻，由案例区布局挂载）。
 * - 隐私模式：对话照常渲染，用遮罩层 + 模糊盖住（不替换文本，布局不变）。
 */

import { useMemo } from 'react';
import { Eye, EyeOff, FileText, SquarePen } from 'lucide-react';
import { type QimenCase } from '../../../../services/qimenCaseService';
import { dialogLinesFromCase } from '../../../Common/caseDialog';
import CaseDialogList from './CaseDialogList';
import { useLayoutMode } from '../../../../hooks/useLayoutMode';

interface CaseInfoCardProps {
    caseData: QimenCase | null;
    isPrivacyMode: boolean;
    onTogglePrivacy: () => void;
    /** 打开正文弹窗：read 只是查看，edit 会直接聚焦到输入框继续记录 */
    onOpenDialog: (intent?: 'read' | 'edit') => void;
}

export default function CaseInfoCard({ caseData, isPrivacyMode, onTogglePrivacy, onOpenDialog }: CaseInfoCardProps) {
    // 移动端：整卡高度跟随内容（外层抽屉负责滚动），不再截断成一小块可滚区域
    const { isMobile } = useLayoutMode();

    // 卡片直接铺完整记录流，不再另做摘要
    const lines = useMemo(() => dialogLinesFromCase(caseData), [caseData]);

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
                    {/* 编辑入口：直接进弹窗并聚焦输入框，省掉「先展开再点输入框」这一步 */}
                    <button
                        type="button"
                        onClick={() => onOpenDialog('edit')}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/50 focus-ring"
                        title="编辑案例正文"
                        aria-label="编辑案例正文"
                    >
                        <SquarePen className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onTogglePrivacy}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/50 focus-ring"
                        title={isPrivacyMode ? '显示明文' : '隐藏信息'}
                        aria-label={isPrivacyMode ? '显示明文' : '隐藏信息'}
                    >
                        {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* 完整对话直接铺在卡片里并内部滚动：浏览时不必开弹窗，
                要改再点标题栏的铅笔（弹窗才是编辑态） */}
            {lines.length === 0 ? (
                <button
                    type="button"
                    onClick={() => onOpenDialog('edit')}
                    className="w-full rounded-lg border border-dashed border-border px-3.5 py-6 text-center text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-ring"
                >
                    还没有记录，点这里记下求测人问的第一句
                </button>
            ) : (
                /* 隐私模式只靠遮罩盖住，不替换成圆点掩码：
                   文本层保持原样，模糊 + 去饱和让内容不可读，布局也不会塌。 */
                <div className="relative">
                    <div
                        className={`rounded-lg border border-border bg-muted/20 px-3 py-3 ${isMobile ? '' : 'max-h-[46vh] overflow-y-auto overscroll-contain'} ${isPrivacyMode ? 'pointer-events-none select-none blur-[7px] saturate-50' : ''}`}
                        aria-hidden={isPrivacyMode || undefined}
                    >
                        <CaseDialogList lines={lines} />
                    </div>
                    {isPrivacyMode && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-background/40">
                            <EyeOff className="h-5 w-5 text-muted-foreground" />
                            <span className="text-[11.5px] text-muted-foreground">内容已隐藏</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
