/**
 * 导出案例的选中模型（纯函数，便于测试）。
 *
 * 打开弹窗默认「一个都不选」，由用户主动挑分类或单篇；
 * 因此选中态始终是一份显式清单，不需要「null = 全部」这类隐式态，
 * 也就不存在「取消一篇又被归一化回全选」的回弹问题。
 */
export type ExportSelection = Set<string>;

/** 整组勾选：该组已全选则整组移出，否则整组加入 */
export function toggleGroup(
    selection: ExportSelection,
    groupKeys: readonly string[],
): ExportSelection {
    if (groupKeys.length === 0) return selection;
    const next = new Set(selection);
    const allChecked = groupKeys.every((key) => selection.has(key));
    groupKeys.forEach((key) => {
        if (allChecked) next.delete(key);
        else next.add(key);
    });
    return next;
}

/** 单篇勾选 */
export function toggleOne(selection: ExportSelection, key: string): ExportSelection {
    const next = new Set(selection);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
}

/** 全选 ⇄ 清空 */
export function toggleAll(
    selection: ExportSelection,
    allKeys: readonly string[],
): ExportSelection {
    const allChecked = allKeys.length > 0 && allKeys.every((key) => selection.has(key));
    return allChecked ? new Set<string>() : new Set(allKeys);
}

/** 该组是否已全选（用于三态勾选框的「勾」） */
export function isGroupChecked(selection: ExportSelection, groupKeys: readonly string[]): boolean {
    return groupKeys.length > 0 && groupKeys.every((key) => selection.has(key));
}

/** 是否已选中 */
export function isSelected(selection: ExportSelection, key: string): boolean {
    return selection.has(key);
}
