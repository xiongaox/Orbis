/**
 * ReadingProgressButton - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default ReadingProgressButton`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */



interface ReadingProgressButtonProps {
    progress: number;
    savedProgress: number;
    isFinished: boolean;
    onRestore: () => void;
    className?: string;
}

export default function ReadingProgressButton({
    progress,
    savedProgress,
    isFinished,
    onRestore,
    className
}: ReadingProgressButtonProps) {
    const displayProgress = progress > 0 ? progress : savedProgress;
    const hasProgress = displayProgress > 0;

    if (!hasProgress) return null;

    return (
        <button
            onClick={isFinished ? undefined : onRestore}
            className={`
                relative w-[50px] h-[50px]
                bg-card/95 backdrop-blur-sm rounded-full
                border border-border/60
                shadow-md ${isFinished ? '' : 'hover:shadow-lg hover:bg-card cursor-pointer'}
                transition-all duration-300
                flex items-center justify-center
                ${className || ''}
            `}
            title={isFinished ? "已读完" : "继续阅读"}
            disabled={isFinished}
            aria-label={isFinished ? "已读完" : "继续阅读"}
        >
            {/* SVG 进度环 */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
                {/* 背景环 */}
                <circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted/30"
                />
                {/* 进度环 */}
                <circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className={`transition-all duration-500 ease-out ${isFinished ? 'text-green-500' : 'text-primary'}`}
                    strokeDasharray={`${Math.min(displayProgress, 100) * 1.256} 125.6`}
                />
            </svg>
            {/* 中间内容：百分比或打勾 */}
            <div className="z-10 transition-all duration-300">
                {isFinished ? (
                    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" className="animate-[check_0.3s_ease-out_forwards]" />
                    </svg>
                ) : (
                    <span className="text-xs font-medium text-foreground tabular-nums">
                        {displayProgress}%
                    </span>
                )}
            </div>
        </button>
    );
}
