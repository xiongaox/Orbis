/**
 * TagSelector - 应用源码层
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
 * - `default TagSelector`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `baziCaseService`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { CASE_TAGS, type CaseTag } from '../../services/baziCaseService';

interface TagSelectorProps {
    selectedTags: CaseTag[];
    onChange: (tags: CaseTag[]) => void;
    disabled?: boolean;
}

export default function TagSelector({ selectedTags, onChange, disabled }: TagSelectorProps) {
    const toggleTag = (tag: CaseTag) => {
        if (disabled) return;

        if (selectedTags.includes(tag)) {
            onChange(selectedTags.filter(t => t !== tag));
        } else {
            onChange([...selectedTags, tag]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {CASE_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        disabled={disabled}
                        className={`
                            px-3 py-1.5 text-xs rounded-lg transition-all
                            border focus-ring
                            ${isSelected
                                ? 'bg-[hsl(var(--accent-primary)/0.18)] border-[hsl(var(--accent-primary)/0.4)] text-[hsl(var(--accent-primary))] dark:bg-primary/20 dark:border-primary/50 dark:text-primary'
                                : 'bg-[hsl(var(--muted))] border-[hsl(var(--muted-border))] text-[hsl(var(--text-secondary-light))] hover:text-[hsl(var(--text-primary-light))] hover:border-[hsl(var(--accent-primary)/0.35)] hover:bg-[hsl(var(--muted-hover))] dark:bg-secondary/50 dark:border-border dark:text-muted-foreground dark:hover:text-foreground dark:hover:border-primary/30'
                            }
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                    >
                        {tag}
                    </button>
                );
            })}
        </div>
    );
}
