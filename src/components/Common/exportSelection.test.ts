import { describe, expect, it } from 'vitest';
import {
    isGroupChecked,
    isSelected,
    toggleAll,
    toggleGroup,
    toggleOne,
    type ExportSelection,
} from './exportSelection';

/**
 * 导出选中的核心不变量：
 * 1. 默认空选中——打开弹窗必须一篇都不选。
 * 2. 勾选/取消都是显式清单，不存在「回弹成全选」。
 * 3. 整组勾选按组粒度生效，不影响其他组。
 */
const allKeys = ['a1', 'a2', 'b1'];
const groupA = ['a1', 'a2'];

const selected = (selection: ExportSelection) => allKeys.filter((key) => isSelected(selection, key));

describe('导出案例选中模型', () => {
    it('默认空选中', () => {
        expect(selected(new Set())).toEqual([]);
    });

    it('勾选单篇只选中该篇', () => {
        expect(selected(toggleOne(new Set(), 'a1'))).toEqual(['a1']);
    });

    it('取消单篇后不会回弹成全部', () => {
        expect(selected(toggleOne(new Set(['a1', 'b1']), 'a1'))).toEqual(['b1']);
    });

    it('整组勾选只影响该组', () => {
        expect(selected(toggleGroup(new Set(), groupA))).toEqual(['a1', 'a2']);
    });

    it('整组半选时勾选会补满该组', () => {
        const half = toggleGroup(new Set(), groupA);
        const partial = toggleOne(half, 'a1');
        expect(isGroupChecked(partial, groupA)).toBe(false);
        expect(selected(toggleGroup(partial, groupA))).toEqual(['a1', 'a2']);
    });

    it('整组已全选时再点会整组移出', () => {
        expect(selected(toggleGroup(toggleGroup(new Set(), groupA), groupA))).toEqual([]);
    });

    it('全选切换：空 → 全部 → 空', () => {
        const all = toggleAll(new Set(), allKeys);
        expect(selected(all)).toEqual(allKeys);
        expect(selected(toggleAll(all, allKeys))).toEqual([]);
    });
});
