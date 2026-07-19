import { describe, expect, it } from 'vitest';
import { getSanYuanCaseInput, getSanYuanDirectionId, type SanYuanCase } from './sanyuanCaseService';

const FIVE_YUN_UPPER_CASE: SanYuanCase = {
    id: 'case-1',
    user_id: 'user-1',
    title: '五运上元测试',
    case_type: 'yangzhai',
    mountain: '壬',
    facing: '丙',
    yun: 5,
    pan_type: 'ti',
    yuan_phase: 'upper',
    created_at: '2026-07-19T00:00:00.000Z',
    updated_at: '2026-07-19T00:00:00.000Z',
};

describe('三元天星案例参数', () => {
    it('保存与加载后保留五运元期及排盘参数', () => {
        expect(getSanYuanCaseInput(FIVE_YUN_UPPER_CASE)).toEqual({
            mountain: '壬',
            facing: '丙',
            yun: 5,
            panType: 'ti',
            yuanPhase: 'upper',
        });
    });

    it('能将保存的山向转换为界面选择值', () => {
        expect(getSanYuanDirectionId(FIVE_YUN_UPPER_CASE)).toBe('壬-丙');
    });
});
