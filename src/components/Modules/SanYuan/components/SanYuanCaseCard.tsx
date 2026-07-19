import { Pencil, Trash2 } from 'lucide-react';
import { SANYUAN_CASE_TYPES, type SanYuanCase, type SanYuanCaseType } from '../../../../services/sanyuanCaseService';

interface SanYuanCaseCardProps {
    caseData: SanYuanCase;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function getCaseTypeName(caseType: SanYuanCaseType): string {
    return SANYUAN_CASE_TYPES.find((item) => item.id === caseType)?.name ?? caseType;
}

function formatUpdatedAt(value: string): string {
    return new Date(value).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function SanYuanCaseCard({
    caseData,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
}: SanYuanCaseCardProps) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect();
                }
            }}
            className={`group rounded-xl border p-3 text-left transition-colors cursor-pointer ${isSelected
                ? 'border-primary/40 bg-primary/10'
                : 'border-border/50 bg-card/40 hover:border-primary/30 hover:bg-card'
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{caseData.title}</p>
                        <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                            {getCaseTypeName(caseData.case_type)}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {caseData.mountain}山{caseData.facing}向 · {caseData.yun}运{caseData.pan_type === 'ti' ? '替卦' : '下卦'}
                    </p>
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">
                        {caseData.location_label || '未填写地点 / 项目别名'}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground/80">
                        更新于 {formatUpdatedAt(caseData.updated_at)}
                    </p>
                </div>
                <div className="flex shrink-0 gap-1">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onEdit();
                        }}
                        className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-ring"
                        aria-label="编辑案例"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete();
                        }}
                        className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive focus-ring"
                        aria-label="删除案例"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
