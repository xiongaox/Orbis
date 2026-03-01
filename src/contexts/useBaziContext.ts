import { useContext } from 'react';
import { BaziContext } from './baziContextStore';
import type { BaziContextValue } from './baziContextStore';

export function useBaziContext(): BaziContextValue {
    const context = useContext(BaziContext);
    if (!context) {
        throw new Error('useBaziContext must be used within a BaziProvider');
    }
    return context;
}
