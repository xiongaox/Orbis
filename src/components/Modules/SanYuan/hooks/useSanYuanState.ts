import { useLayoutMode } from '../../../../hooks/useLayoutMode';
import { useState } from 'react';

export function useSanYuanState() {
    const layoutMode = useLayoutMode();
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

    return {
        ...layoutMode,
        selectedCaseId,
        setSelectedCaseId
    };
}
