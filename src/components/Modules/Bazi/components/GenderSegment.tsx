/**
 * 模块定位：
 * - 主要目标：性别二选一分段控件（男 / 女）
 *
 * 关键职责：
 * - 新建案例与编辑案例弹窗共用同一份性别选择 UI，避免两处各复制一段按钮组
 * - 选中态为 primary 淡底 + 描边 + ring（与新建弹窗历史样式一致）
 *
 * 无障碍：原实现是原生 radio，改为 button 后用 radiogroup/radio 角色保持语义。
 */
interface GenderSegmentProps {
    value: 'male' | 'female';
    onChange: (gender: 'male' | 'female') => void;
    disabled?: boolean;
}

const OPTIONS = [
    { key: 'male', label: '男' },
    { key: 'female', label: '女' },
] as const;

const BUTTON_BASE = 'flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed';

export default function GenderSegment({ value, onChange, disabled }: GenderSegmentProps) {
    return (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="性别">
            {OPTIONS.map((option) => (
                <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={value === option.key}
                    disabled={disabled}
                    onClick={() => onChange(option.key)}
                    className={`${BUTTON_BASE} ${
                        value === option.key
                            ? 'border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/50 hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
