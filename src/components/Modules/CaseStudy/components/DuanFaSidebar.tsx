/**
 * 断法左侧主题列表组件
 */
import type { DuanFaFile } from '../../../../lib/caseStudy/duanfaData';

interface DuanFaSidebarProps {
    files: DuanFaFile[];
    selectedFileId: string | null;
    onSelectFile: (fileId: string) => void;
}

export default function DuanFaSidebar({ files, selectedFileId, onSelectFile }: DuanFaSidebarProps) {
    return (
        <div className="w-[15%] min-w-[140px] border-r border-border/40 bg-card/30 flex flex-col overflow-hidden">
            {/* 标题 */}
            <div className="py-3 px-4 border-b border-border/40 bg-card/50 flex-shrink-0">
                <span className="font-serif font-bold text-foreground/80">奇门断法</span>
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
