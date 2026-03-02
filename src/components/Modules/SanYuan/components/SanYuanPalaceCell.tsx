export interface SanYuanPalaceData {
    position: number; // 0-8 for JiuGong
    centerChar: string; // e.g., '叁' (中)
    centerBgText: string; // e.g., '震' (中背景)

    topLeft: string; // e.g., '3'
    topCenter: string; // e.g., '肆' 
    topRight: string; // e.g., '6'

    middleLeft: string; // e.g., '4' (red)
    middleLeftColor?: 'red' | 'default';
    middleRight: string; // e.g., '七'

    bottomRow: [string, string, string]; // e.g., ['1', '1', '1']
    bottomRowColors?: ['red' | 'default', 'red' | 'default', 'red' | 'default'];

    isActive?: boolean;
}

interface Props {
    data?: SanYuanPalaceData;
    onClick?: () => void;
    isActive?: boolean;
}

export default function SanYuanPalaceCell({ data, onClick }: Props) {
    if (!data) {
        return <div className="bg-card/20 rounded-xl" />; // Empty placeholder (e.g., center cell)
    }

    const {
        centerBgText,
        topLeft, topCenter, topRight, middleLeftColor = 'default',
        middleLeft, middleRight,
        bottomRow, bottomRowColors = ['default', 'default', 'default'],
        isActive
    } = data;

    return (
        <div
            className={`flex flex-col gap-1 w-full h-full bg-card/40 rounded-xl p-1.5 cursor-pointer transition-all border-2 overflow-hidden
                ${isActive ? 'border-primary ring-2 ring-primary/20 bg-card' : 'border-border/80 hover:border-primary/50'}
            `}
            onClick={onClick}
        >
            <div className="flex gap-1 flex-[4] min-h-0">
                {/* 顶部三个区块 (左、中、右) */}
                <div className="bg-background/80 flex-[1] flex flex-col items-center justify-center rounded-lg shadow-sm p-1 md:p-1.5">
                    <span className="text-lg md:text-[24px] text-foreground/90 leading-none">{topLeft}</span>
                </div>
                <div className="bg-background/80 flex-[1.6] flex flex-col items-center justify-center rounded-lg shadow-sm p-1 md:p-1.5">
                    <span className="text-lg md:text-[24px] leading-none text-foreground/90">
                        {topCenter}
                    </span>
                </div>
                <div className="bg-background/80 flex-[1] flex flex-col items-center justify-center rounded-lg shadow-sm p-1 md:p-1.5">
                    <span className="text-lg md:text-[24px] text-foreground/90 leading-none">{topRight}</span>
                </div>
            </div>

            <div className="flex gap-1 flex-[6] min-h-0">
                {/* 中间层三个区块 (两侧小，中间大) */}
                <div className="bg-background/80 flex-[1] flex items-center justify-center rounded-lg shadow-sm p-1 md:p-1.5">
                    <span className={`text-lg md:text-[24px] leading-none ${middleLeftColor === 'red' ? 'text-destructive' : 'text-foreground/90'}`}>{middleLeft}</span>
                </div>

                <div className="flex-[1.6] bg-background/90 flex items-center justify-center rounded-lg shadow-sm overflow-hidden p-1">
                    <span className="text-[20px] md:text-[28px] xl:text-[36px] font-bold font-serif text-foreground/30 leading-none">{centerBgText}</span>
                </div>

                <div className="bg-background/80 flex-[1] flex items-center justify-center rounded-lg shadow-sm p-1 md:p-1.5">
                    <span className="text-lg md:text-[24px] text-foreground/90 leading-none">{middleRight}</span>
                </div>
            </div>

            {/* 底部三个紧密排列的数字 */}
            <div className="flex gap-1 flex-[4] min-h-0">
                {bottomRow.map((val, idx) => (
                    <div key={idx} className={`bg-background/80 flex items-center justify-center rounded-lg shadow-sm p-1 md:p-1.5 ${idx === 1 ? 'flex-[1.6]' : 'flex-[1]'}`}>
                        <span className={`text-lg md:text-[24px] leading-none ${bottomRowColors[idx] === 'red' ? 'text-destructive' : 'text-foreground/90'}`}>
                            {val}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
