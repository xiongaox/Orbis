/**
 * DuanFaSidebar - 应用源码层
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
 * - `default DuanFaSidebar`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `duanfaData`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import type { DuanFaFile } from '../../../../lib/caseStudy/duanfaData';

interface DuanFaSidebarProps {
    files: DuanFaFile[];
    selectedFileId: string | null;
    onSelectFile: (fileId: string) => void;
    variant?: 'sidebar' | 'drawer';
}

export default function DuanFaSidebar({ files, selectedFileId, onSelectFile, variant = 'sidebar' }: DuanFaSidebarProps) {
    const containerClassName = variant === 'drawer'
        ? 'w-full h-full border-b border-border/40 bg-card/30 flex flex-col overflow-hidden'
        : 'w-[160px] min-w-[160px] border-r border-border/40 bg-card/30 flex flex-col overflow-hidden';

    return (
        <div className={containerClassName}>
            {/* 标题 */}
            <div className="py-3 px-4 border-b border-border/40 bg-card/50 flex-shrink-0">
                <span className="font-serif font-bold text-foreground/80">断法列表</span>
            </div>

            {/* 主题列表 */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
                {files.map((file) => {
                    const isActive = selectedFileId === file.id;
                    return (
                        <button
                            key={file.id}
                            onClick={() => onSelectFile(file.id)}
                            className={`
                                w-full text-left py-3 px-4 transition-all
                                border-b border-border/20
                                ${isActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'hover:bg-muted/30 text-foreground/70'
                                }
                            `}
                        >
                            <span className="font-serif text-base">{file.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
