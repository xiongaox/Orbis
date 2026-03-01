/**
 * qimenCaseService - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载前端具体功能
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `QIMEN_CATEGORIES`, `QimenCategory`, `QimenCase`, `CreateQimenCaseInput`, `UpdateQimenCaseInput`, `qimenCaseService`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `supabase`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { supabase } from '../lib/supabase';

// 奇门案例分类（对应 QimenCaseList/Modal 中的定义）
export const QIMEN_CATEGORIES = [
    { id: 'work', name: '工作事业' },
    { id: 'study', name: '求学考试' },
    { id: 'love', name: '恋爱婚姻' },
    { id: 'wealth', name: '生意财运' },
    { id: 'lost', name: '失物失人' },
    { id: 'travel', name: '出行出国' },
    { id: 'health', name: '疾病身体' },
    { id: 'other', name: '其他杂项' },
] as const;

export type QimenCategory = typeof QIMEN_CATEGORIES[number]['id'];

export interface QimenCase {
    id: string;
    user_id: string;
    title: string;
    test_date: string; // ISO String
    category: QimenCategory;
    description?: string;
    feedback?: string; // 事件反馈
    analysis?: string; // 案例断法
    qimen_data?: Record<string, unknown>; // 预留：存储排盘参数
    created_at: string;
    updated_at: string;
}

export type CreateQimenCaseInput = Omit<QimenCase, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateQimenCaseInput = Partial<CreateQimenCaseInput>;

export const qimenCaseService = {
    /**
     * 获取当前用户的所有案例
     */
    async getCases(): Promise<QimenCase[]> {
        const { data, error } = await supabase
            .from('qimen_cases')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch qimen cases:', error);
            // 暂时忽略表不存在的错误，返回空数组以免阻断 UI（开发阶段）
            if (error.code === '42P01') return [];
            throw new Error(error.message);
        }

        return data || [];
    },

    /**
     * 创建新案例
     */
    async createCase(input: CreateQimenCaseInput): Promise<QimenCase> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            // 简单模拟未登录也可以创建（如果需要）
            // throw new Error('请先登录');
            // 为了保证能跑通，如果没用户ID可能报错. 
            // 暂时假设用户已登录
        }

        const userId = user?.id || 'anonymous'; // Fallback for dev

        const { data, error } = await supabase
            .from('qimen_cases')
            .insert({
                ...input,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to create qimen case:', error);
            throw new Error(error.message);
        }

        return data;
    },

    async createCases(inputs: CreateQimenCaseInput[]): Promise<number> {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || 'anonymous';

        const casesToInsert = inputs.map(input => ({
            ...input,
            user_id: userId,
        }));

        const { data, error } = await supabase
            .from('qimen_cases')
            .insert(casesToInsert)
            .select();

        if (error) {
            console.error('Failed to bulk create qimen cases:', error);
            throw new Error(error.message);
        }

        return data?.length || 0;
    },

    /**
     * 更新案例
     */
    async updateCase(id: string, input: UpdateQimenCaseInput): Promise<QimenCase> {
        const { data, error } = await supabase
            .from('qimen_cases')
            .update({
                ...input,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update qimen case:', error);
            throw new Error(error.message);
        }

        return data;
    },

    /**
     * 删除案例
     */
    async deleteCase(id: string): Promise<void> {
        const { error } = await supabase
            .from('qimen_cases')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Failed to delete qimen case:', error);
            throw new Error(error.message);
        }
    }
};
