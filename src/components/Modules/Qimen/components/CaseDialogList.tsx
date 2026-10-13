/**
 * 只读的案例正文列表：气泡左右分栏（求测人在左、测算师与断法在右）。
 *
 * 抽出来是因为两处要用同一套外观：
 * - 案例详情卡（右侧栏）直接铺开整段对话供浏览；
 * - 正文弹窗逐条渲染，但带选中/编辑等交互，由它自己实现。
 *
 * 这里不做任何交互，只渲染——浏览和编辑分开，卡片就不需要背选中态、
 * 也不需要遮罩层的逻辑。
 */
import type { CaseDialogLine } from '../../../Common/caseDialog';
import { KIND_STYLE, MODE_LABEL } from './caseDialogStyle';

interface CaseDialogListProps {
    lines: CaseDialogLine[];
    /** 序号：列表与弹窗共用同一套编号，避免两处对不上 */
    startIndex?: number;
}

export default function CaseDialogList({ lines, startIndex = 0 }: CaseDialogListProps) {
    return (
        <ol className="space-y-2">
            {lines.map((line, offset) => {
                const index = startIndex + offset;
                const style = KIND_STYLE[line.kind];
                const isMine = line.kind !== 'q';
                return (
                    <li
                        key={`${line.kind}-${index}`}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                        <span className={`mb-1 flex items-center gap-1.5 text-[13px] ${style.label}`}>
                            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                            {MODE_LABEL[line.kind]}
                            <span className="font-mono text-[11.5px] text-muted-foreground/60">#{index + 1}</span>
                        </span>
                        <p className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 text-[13.5px] leading-relaxed ${style.text} ${style.box}`}>
                            {line.text}
                        </p>
                    </li>
                );
            })}
        </ol>
    );
}
