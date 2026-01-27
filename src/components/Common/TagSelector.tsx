/**
 * 标签选择器组件
 * 支持多选，预设 14 个标签
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
