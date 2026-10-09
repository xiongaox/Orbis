/**
 * 三元案例列表的字段排序：与奇门 caseSort 同构，侧栏使用；
 * 比较器一律按升序返回负值让 a 在前；方向由调用方统一翻转。
 */

import { SANYUAN_CASE_TYPES, type SanYuanCase } from '../../../services/sanyuanCaseService';
import type { SortOption } from '../../Common/SortFieldButton';

export const SANYUAN_SORT_OPTIONS: SortOption[] = [
    { id: 'time', label: '时间' },
    { id: 'category', label: '分类' },
];

export function compareSanYuanCase(a: SanYuanCase, b: SanYuanCase, field: string): number {
    switch (field) {
        case 'time': {
            // 更新时间；无效时间排最后
            const timeA = new Date(a.updated_at).getTime();
            const timeB = new Date(b.updated_at).getTime();
            const validA = Number.isNaN(timeA) ? Number.MAX_SAFE_INTEGER : timeA;
            const validB = Number.isNaN(timeB) ? Number.MAX_SAFE_INTEGER : timeB;
            return validA - validB;
        }
        case 'category': {
            const nameA = SANYUAN_CASE_TYPES.find((t) => t.id === a.case_type)?.name ?? '';
            const nameB = SANYUAN_CASE_TYPES.find((t) => t.id === b.case_type)?.name ?? '';
            return nameA.localeCompare(nameB, 'zh-Hans-CN');
        }
        default:
            return 0;
    }
}
