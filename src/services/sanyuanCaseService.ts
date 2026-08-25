import type { Mountain, PanType, SanYuanInput, YuanPhase } from '../lib/sanyuan';
import { DIRECTIONS } from '../lib/sanyuan';
import { getPrivateUserId, localPrivateStore } from './localPrivateStore';

export const SANYUAN_CASE_TYPES = [
    { id: 'yangzhai', name: '阳宅' },
    { id: 'yinzhai', name: '阴宅' },
] as const;

export type SanYuanCaseType = typeof SANYUAN_CASE_TYPES[number]['id'];

export interface SanYuanCase {
    id: string;
    user_id: string;
    title: string;
    case_type: SanYuanCaseType;
    mountain: Mountain;
    facing: Mountain;
    yun: number;
    pan_type: PanType;
    yuan_phase: YuanPhase;
    location_label?: string;
    site_usage?: string;
    landform_notes?: string;
    analysis?: string;
    feedback?: string;
    created_at: string;
    updated_at: string;
}

export type CreateSanYuanCaseInput = Omit<SanYuanCase, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateSanYuanCaseInput = Partial<CreateSanYuanCaseInput>;

export function getSanYuanCaseInput(caseData: Pick<SanYuanCase, 'mountain' | 'facing' | 'yun' | 'pan_type' | 'yuan_phase'>): SanYuanInput {
    return {
        mountain: caseData.mountain,
        facing: caseData.facing,
        yun: caseData.yun,
        panType: caseData.pan_type,
        yuanPhase: caseData.yuan_phase,
    };
}

export function getSanYuanDirectionId(caseData: Pick<SanYuanCase, 'mountain' | 'facing'>): string {
    return DIRECTIONS.find((direction) => (
        direction.mountain === caseData.mountain && direction.facing === caseData.facing
    ))?.id ?? `${caseData.mountain}-${caseData.facing}`;
}

export const sanyuanCaseService = {
    async getCases(): Promise<SanYuanCase[]> {
        const userId = await getPrivateUserId();
        const records = await localPrivateStore.list(userId, 'sanyuan_case');
        return records.map((record) => record.payload as unknown as SanYuanCase);
    },

    async createCase(input: CreateSanYuanCaseInput): Promise<SanYuanCase> {
        const userId = await getPrivateUserId();
        if (userId === 'anonymous') {
            throw new Error('请先登录');
        }
        const now = new Date().toISOString();
        const result = { ...input, id: crypto.randomUUID(), user_id: userId, created_at: now, updated_at: now };
        await localPrivateStore.put(userId, 'sanyuan_case', result, result.id);
        return result;
    },

    async updateCase(id: string, input: UpdateSanYuanCaseInput): Promise<SanYuanCase> {
        const userId = await getPrivateUserId();
        const current = await localPrivateStore.get(userId, 'sanyuan_case', id);
        if (!current) throw new Error('未找到三元案例');
        const result = { ...(current.payload as unknown as SanYuanCase), ...input, updated_at: new Date().toISOString() };
        await localPrivateStore.put(userId, 'sanyuan_case', result, id);
        return result;
    },

    async deleteCase(id: string): Promise<void> {
        await localPrivateStore.remove(await getPrivateUserId(), 'sanyuan_case', id);
    },
};
