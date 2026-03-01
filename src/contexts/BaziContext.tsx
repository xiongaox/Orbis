/**
 * BaziContext - 八字模块状态上下文
 * 解决 Prop Drilling 问题，让子组件直接访问八字状态
 */
import type { ReactNode } from 'react';
import { useBazi } from '../hooks/useBazi';
import { BaziContext } from './baziContextStore';

// Provider Props
interface BaziProviderProps {
    children: ReactNode;
}

/**
 * BaziProvider - 八字状态提供者
 * 包裹需要访问八字状态的组件树
 */
export function BaziProvider({ children }: BaziProviderProps) {
    const baziState = useBazi();

    return (
        <BaziContext.Provider value={baziState}>
            {children}
        </BaziContext.Provider>
    );
}
