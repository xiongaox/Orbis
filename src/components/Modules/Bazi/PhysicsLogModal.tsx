/**
 * PhysicsLogModal - 应用源码层
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
 * - `default PhysicsLogModal`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `lucide-react`、外部依赖 `react`、内部模块 `BaseModal`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { Info, Shield, AlertTriangle, Flame, Droplets, Wind, Sparkles, Mountain } from 'lucide-react';
import { useMemo } from 'react';
import BaseModal from '../../UI/BaseModal';

interface PhysicsLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: string[];
    title?: string;
    description?: string; // 原 baziPattern，现改为通用描述
    highlightColor?: string; // 传入的颜色类名
}

export default function PhysicsLogModal({
    isOpen,
    onClose,
    logs,
    title = "旺衰物理逻辑日志",
    description,
    highlightColor = ""
}: PhysicsLogModalProps) {
    // 解析日志条目，返回带有样式属性的对象
    const parseLog = (log: string) => {
        let theme = 'default';
        let icon = <Info className="w-4 h-4" />;
        let content = log;

        if (log.includes('⚠️')) {
            theme = 'warning';
            icon = <AlertTriangle className="w-4 h-4 text-orange-500" />;
            content = log.replace('⚠️', '').trim();
        } else if (log.includes('🛡️')) {
            theme = 'defense';
            icon = <Shield className="w-4 h-4 text-emerald-500" />;
            content = log.replace('🛡️', '').trim();
        } else if (log.includes('✨')) {
            theme = 'success';
            icon = <Sparkles className="w-4 h-4 text-amber-500" />;
            content = log.replace('✨', '').trim();
        } else if (log.includes('🔥') || log.includes('火')) { // 略宽泛，优先匹配Emoji
            if (log.includes('🔥')) {
                theme = 'fire';
                icon = <Flame className="w-4 h-4 text-red-500" />;
                content = log.replace('🔥', '').trim();
            }
        }

        if (log.includes('💧')) {
            theme = 'water';
            icon = <Droplets className="w-4 h-4 text-blue-500" />;
            content = log.replace('💧', '').trim();
        } else if (log.includes('🏜️') || log.includes('⛰️')) {
            theme = 'earth';
            icon = <Mountain className="w-4 h-4 text-stone-500" />;
            content = log.replace('🏜️', '').replace('⛰️', '').trim();
        } else if (log.includes('🌪️') || log.includes('💨')) {
            theme = 'wood';
            icon = <Wind className="w-4 h-4 text-green-500" />;
            content = log.replace('🌪️', '').replace('💨', '').trim();
        } else if (log.includes('🔀')) { // 冲
            theme = 'clash';
            // icon remains default or maybe something else
            content = log.replace('🔀', '').trim();
        }

        return { theme, icon, content, original: log };
    };

    const parsedLogs = useMemo(() => logs.map(parseLog), [logs]);

    if (!isOpen) return null;

    const header = (
        <div className="flex flex-col">
            <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                {title}
            </span>
            {description && (
                <p className="text-sm text-muted-foreground mt-1 font-normal">
                    当前判定：<span className={`font-medium ${highlightColor || 'text-foreground'}`}>{description}</span>
                </p>
            )}
        </div>
    );

    const footer = (
        <div className="w-full text-xs text-muted-foreground text-center">
            以上逻辑基于 V35 物理模拟引擎分析生成
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={header}
            footer={footer}
            maxWidth="max-w-lg"
        >
            <div className="space-y-3">
                {parsedLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        暂无物理逻辑日志
                    </div>
                ) : (
                    parsedLogs.map((item, idx) => (
                        <div
                            key={idx}
                            className={`
                                flex items-start gap-3 p-3 rounded-lg border text-sm leading-relaxed transition-colors
                                ${item.theme === 'warning' ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800' : ''}
                                ${item.theme === 'defense' ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : ''}
                                ${item.theme === 'success' ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' : ''}
                                ${item.theme === 'fire' ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : ''}
                                ${item.theme === 'water' ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' : ''}
                                ${item.theme === 'earth' ? 'bg-stone-50/50 border-stone-200 dark:bg-stone-950/20 dark:border-stone-800' : ''}
                                ${item.theme === 'default' ? 'bg-muted/30 border-border hover:bg-muted/50' : ''}
                            `}
                        >
                            <div className="mt-0.5 shrink-0 select-none">
                                {item.icon}
                            </div>
                            <div className="text-foreground/90 font-mono text-xs sm:text-sm">
                                {item.content}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </BaseModal>
    );
}
