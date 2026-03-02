

import { useState } from 'react';
import CustomSelect from '../../../UI/CustomSelect';

const DIRECTIONS = [
    { label: "壬山丙向", value: "壬山丙向" },
    { label: "子山午向", value: "子山午向" },
    { label: "癸山丁向", value: "癸山丁向" },
    { label: "丑山未向", value: "丑山未向" },
    { label: "艮山坤向", value: "艮山坤向" },
    { label: "寅山申向", value: "寅山申向" },
    { label: "甲山庚向", value: "甲山庚向" },
    { label: "卯山酉向", value: "卯山酉向" },
    { label: "乙山辛向", value: "乙山辛向" },
    { label: "辰山戌向", value: "辰山戌向" },
    { label: "巽山乾向", value: "巽山乾向" },
    { label: "巳山亥向", value: "巳山亥向" },
    { label: "丙山壬向", value: "丙山壬向" },
    { label: "午山子向", value: "午山子向" },
    { label: "丁山癸向", value: "丁山癸向" },
    { label: "未山丑向", value: "未山丑向" },
    { label: "坤山艮向", value: "坤山艮向" },
    { label: "申山寅向", value: "申山寅向" },
    { label: "庚山甲向", value: "庚山甲向" },
    { label: "酉山卯向", value: "酉山卯向" },
    { label: "辛山乙向", value: "辛山乙向" },
    { label: "戌山辰向", value: "戌山辰向" },
    { label: "乾山巽向", value: "乾山巽向" },
    { label: "亥山巳向", value: "亥山巳向" },
];

const YUAN_YUN = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(yun => ({ label: `${yun}运`, value: yun }));
const TIGUA = [
    { label: "下卦 (9°内)", value: "xia" },
    { label: "替卦 (9°外)", value: "ti" },
];

export default function SanYuanInfoBar() {
    const [direction, setDirection] = useState('壬山丙向');
    const [yun, setYun] = useState(9);
    const [gua, setGua] = useState('xia');

    return (
        <div className="flex flex-col gap-3 w-full max-w-[640px] mx-auto mb-6 shrink-0">
            {/* Top Bar: Controls */}
            <div className="flex items-center justify-between gap-2 bg-card/40 border border-border/50 rounded-xl px-4 py-3">
                {/* 山向 */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">山向</span>
                    <CustomSelect
                        options={DIRECTIONS}
                        value={direction}
                        onChange={(v: string | number) => setDirection(v as string)}
                        className="w-[104px]"
                    />
                </div>

                {/* 元运 */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">元运</span>
                    <CustomSelect
                        options={YUAN_YUN}
                        value={yun}
                        onChange={(v: string | number) => setYun(v as number)}
                        className="w-[72px]"
                    />
                </div>

                {/* 卦类 */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">卦类</span>
                    <CustomSelect
                        options={TIGUA}
                        value={gua}
                        onChange={(v: string | number) => setGua(v as string)}
                        className="w-[115px]"
                    />
                </div>

                <button className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-5 py-1.5 rounded-lg transition-colors shadow-sm ml-auto shrink-0 md:ml-2 cursor-pointer">
                    排盘
                </button>
            </div>

            {/* Bottom Bar: Info Display */}
            <div className="flex items-center justify-between bg-card/40 border border-border/50 rounded-xl px-6 py-3">
                <div className="text-base font-bold text-primary">
                    壬山丙向 · 9运下卦
                </div>

                <div className="flex border border-border/50 rounded-lg overflow-hidden bg-background/30 shadow-sm">
                    <div className="flex flex-col items-center justify-center px-4 py-1.5 border-r border-border/50 min-w-[64px]">
                        <span className="text-lg font-bold text-primary leading-none mb-1.5">5</span>
                        <span className="text-[10px] text-muted-foreground leading-none">山星</span>
                    </div>
                    <div className="flex flex-col items-center justify-center px-4 py-1.5 border-r border-border/50 min-w-[64px]">
                        <span className="text-lg font-bold text-primary leading-none mb-1.5">4</span>
                        <span className="text-[10px] text-muted-foreground leading-none">向星</span>
                    </div>
                    <div className="flex flex-col items-center justify-center px-4 py-1.5 min-w-[64px]">
                        <span className="text-lg font-bold text-primary leading-none mb-1.5">9</span>
                        <span className="text-[10px] text-muted-foreground leading-none">运</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
