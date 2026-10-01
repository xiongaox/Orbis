/**
 * 奇门案例列表的字段排序：侧栏与案例库弹窗共用同一组字段与比较器。
 * 比较器一律按升序返回负值让 a 在前；方向由调用方统一翻转。
 */

import { QIMEN_CATEGORIES, type QimenCase } from '../../../services/qimenCaseService';
import type { SortOption } from '../../Common/SortFieldButton';

export const QIMEN_SORT_OPTIONS: SortOption[] = [
    { id: 'time', label: '时间' },
    { id: 'category', label: '分类' },
];

export function compareQimenCase(a: QimenCase, b: QimenCase, field: string): number {
    switch (field) {
        case 'time': {
            // 求测时间；无效时间排最后
            const timeA = new Date(a.test_date).getTime();
            const timeB = new Date(b.test_date).getTime();
            const validA = Number.isNaN(timeA) ? Number.MAX_SAFE_INTEGER : timeA;
            const validB = Number.isNaN(timeB) ? Number.MAX_SAFE_INTEGER : timeB;
            return validA - validB;
        }
        case 'category': {
            const nameA = QIMEN_CATEGORIES.find((c) => c.id === a.category)?.name ?? '';
            const nameB = QIMEN_CATEGORIES.find((c) => c.id === b.category)?.name ?? '';
            return nameA.localeCompare(nameB, 'zh-Hans-CN');
        }
        default:
            return 0;
    }
}
