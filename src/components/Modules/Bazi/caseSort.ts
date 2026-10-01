/**
 * 八字案例列表的字段排序：侧栏与案例库弹窗共用同一组字段与比较器。
 * 比较器一律按升序返回负值让 a 在前；方向由调用方统一翻转。
 */

import { getAgeFromBirth } from '../../../utils/lunarUtil';
import type { BaziCase } from '../../../services/baziCaseService';
import type { SortOption } from '../../Common/SortFieldButton';

export const BAZI_SORT_OPTIONS: SortOption[] = [
    { id: 'age', label: '年龄' },
    { id: 'group', label: '分组' },
    { id: 'gender', label: '性别' },
];

export function compareBaziCase(a: BaziCase, b: BaziCase, field: string): number {
    switch (field) {
        case 'age': {
            // 虚岁（当年 - 出生年 + 1）；缺失出生日期的排最后
            const ageA = getAgeFromBirth(a.birth_date) ?? Number.MAX_SAFE_INTEGER;
            const ageB = getAgeFromBirth(b.birth_date) ?? Number.MAX_SAFE_INTEGER;
            return ageA - ageB;
        }
        case 'group': {
            // 分组 = 第一个 tag（朋友 / 亲人 / 父母…）；无分组排最后
            const groupA = a.tags?.[0];
            const groupB = b.tags?.[0];
            if (!groupA && !groupB) return 0;
            if (!groupA) return 1;
            if (!groupB) return -1;
            return groupA.localeCompare(groupB, 'zh-Hans-CN');
        }
        case 'gender':
            return (a.gender === 'male' ? 0 : 1) - (b.gender === 'male' ? 0 : 1);
        default:
            return 0;
    }
}
