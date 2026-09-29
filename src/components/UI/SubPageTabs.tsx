/**
 * SubPageTabs - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：SubPage 页头正下方的统一 tab 切换条
 *
 * 关键职责：
 * - 下划线式 tab：选中态为主色下划线 + 主色文字，未选中弱化为辅助色
 * - 由 SubPage 的 tabBar 插槽钉在页头与正文之间，不随内容滚动
 *
 * 使用约束：
 * - 仅移动端使用；桌面端弹窗沿用各自的分段控件布局，不要强行套用
 * - 全应用移动端二级页的 tab 切换统一走本组件，不再各页自绘分段控件
 */
import type { ReactNode } from 'react';

export interface SubPageTabItem<T extends string> {
    key: T;
    label: ReactNode;
    disabled?: boolean;
}

interface SubPageTabsProps<T extends string> {
    tabs: readonly SubPageTabItem<T>[];
    active: T;
    onChange: (key: T) => void;
    ariaLabel: string;
}

export default function SubPageTabs<T extends string>({ tabs, active, onChange, ariaLabel }: SubPageTabsProps<T>) {
    return (
        <div role="tablist" aria-label={ariaLabel} className="flex w-full border-b border-border bg-background">
            {tabs.map((tab) => {
                const selected = tab.key === active;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        disabled={tab.disabled}
                        onClick={() => onChange(tab.key)}
                        className={`relative flex min-h-11 flex-1 items-center justify-center px-3 text-sm transition-colors focus-ring disabled:opacity-50 ${
                            selected
                                ? 'font-semibold text-primary'
                                : 'font-medium text-muted-foreground hover:text-foreground active:text-foreground'
                        }`}
                    >
                        {tab.label}
                        {/* 选中下划线贴住 tab 条底边，与页头分隔线形成连贯层级 */}
                        <span
                            aria-hidden
                            className={`absolute inset-x-6 bottom-0 h-0.5 rounded-full transition-colors ${
                                selected ? 'bg-primary' : 'bg-transparent'
                            }`}
                        />
                    </button>
                );
            })}
        </div>
    );
}
