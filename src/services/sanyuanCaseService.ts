import type { Mountain, PanType, SanYuanInput, YuanPhase } from '../lib/sanyuan';
import { DIRECTIONS } from '../lib/sanyuan';
import { supabase } from '../lib/supabase';

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
        const { data, error } = await supabase
            .from('sanyuan_cases')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch SanYuan cases:', error);
            throw new Error(error.message);
        }

        return data || [];
    },

    async createCase(input: CreateSanYuanCaseInput): Promise<SanYuanCase> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('请先登录');
        }

        const { data, error } = await supabase
            .from('sanyuan_cases')
            .insert({
                ...input,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to create SanYuan case:', error);
            throw new Error(error.message);
        }

        return data;
    },

    async updateCase(id: string, input: UpdateSanYuanCaseInput): Promise<SanYuanCase> {
        const { data, error } = await supabase
            .from('sanyuan_cases')
            .update(input)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update SanYuan case:', error);
            throw new Error(error.message);
        }

        return data;
    },

    async deleteCase(id: string): Promise<void> {
        const { error } = await supabase
            .from('sanyuan_cases')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Failed to delete SanYuan case:', error);
            throw new Error(error.message);
        }
    },
};
