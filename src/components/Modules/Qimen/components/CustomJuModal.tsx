/**
 * CustomJuModal - 应用源码层
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
 * - `default CustomJuModal`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `BaseModal`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useState } from 'react';
import BaseModal from '../../../UI/BaseModal';

interface CustomJuModalProps {
    isOpen: boolean;
    currentJu: string;  // 当前局数，如 "阳遁三局"
    onClose: () => void;
    onConfirm: (customJu: number) => void;  // customJu: 1~9=阳遁, -1~-9=阴遁
}

const JU_NUM_MAP: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9
};

const JU_LABELS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

export default function CustomJuModal({
    isOpen,
    currentJu,
    onClose,
    onConfirm
}: CustomJuModalProps) {
    // 解析当前局数作为默认值
    const parseCurrentJu = () => {
        const match = currentJu.match(/(阳|阴)遁([一二三四五六七八九])局/);
        if (match) {
            return {
                isYang: match[1] === '阳',
                juNum: JU_NUM_MAP[match[2]] || 1
            };
        }
        return { isYang: true, juNum: 1 };
    };

    const defaultJu = parseCurrentJu();
    const [isYang, setIsYang] = useState(defaultJu.isYang);
    const [juNum, setJuNum] = useState(defaultJu.juNum);

    if (!isOpen) return null;

    const handleConfirm = () => {
        // 阳遁用正数，阴遁用负数
        const customJu = isYang ? juNum : -juNum;
        onConfirm(customJu);
    };

    const footer = (
        <div className="flex gap-2 w-full">
            <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-muted/50 text-muted-foreground font-serif text-sm hover:bg-muted transition-colors focus-ring"
            >
                取消
            </button>
            <button
                onClick={handleConfirm}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-serif text-sm hover:bg-primary/90 transition-colors focus-ring"
            >
                确认排盘
            </button>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={<span className="font-serif font-bold">自定义局数</span>}
            footer={footer}
            maxWidth="max-w-sm"
        >
            <div className="space-y-5">
                {/* 阴阳遁选择 */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground font-serif">遁法</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsYang(true)}
                            className={`flex-1 py-2 rounded-lg font-serif text-sm transition-all focus-ring ${isYang
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                        >
                            阳遁
                        </button>
                        <button
                            onClick={() => setIsYang(false)}
                            className={`flex-1 py-2 rounded-lg font-serif text-sm transition-all focus-ring ${!isYang
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                        >
                            阴遁
                        </button>
                    </div>
                </div>

                {/* 局数选择 */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground font-serif">局数</label>
                    <div className="grid grid-cols-3 gap-2">
                        {JU_LABELS.map((label, idx) => {
                            const num = idx + 1;
                            const isSelected = juNum === num;
                            return (
                                <button
                                    key={num}
                                    onClick={() => setJuNum(num)}
                                    className={`py-3 rounded-lg font-serif text-lg transition-all focus-ring ${isSelected
                                        ? 'bg-primary/10 border-2 border-primary text-primary font-bold shadow-sm'
                                        : 'bg-muted/50 border-2 border-transparent text-foreground hover:bg-muted'
                                        }`}
                                >
                                    {label}局
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 预览 */}
                <div className="text-center py-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="text-sm text-muted-foreground">选择结果：</span>
                    <span className="ml-2 text-lg font-bold font-serif text-primary">
                        {isYang ? '阳' : '阴'}遁{JU_LABELS[juNum - 1]}局
                    </span>
                </div>
            </div>
        </BaseModal>
    );
}
