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
                            border
                            ${isSelected
                                ? 'bg-primary/20 border-primary/50 text-primary'
                                : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
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
