import { useMemo, useState } from 'react';
import { DIRECTIONS, calculateSanYuanChart, getYuanPhaseDefault, isYuanPhaseChoiceRequired } from '../../../../lib/sanyuan';
import type { PanType, PalaceName, YuanPhase } from '../../../../lib/sanyuan';
import { useLayoutMode } from '../../../../hooks/useLayoutMode';
import { getSanYuanCaseInput, getSanYuanDirectionId, type SanYuanCase } from '../../../../services/sanyuanCaseService';

export interface SanYuanDraft {
    directionId: string;
    yun: number;
    panType: PanType;
    yuanPhase: YuanPhase;
}

const DEFAULT_DRAFT: SanYuanDraft = {
    directionId: '壬-丙',
    yun: 9,
    panType: 'xia',
    yuanPhase: 'lower',
};

function toChartInput(draft: SanYuanDraft) {
    const direction = DIRECTIONS.find((item) => item.id === draft.directionId) ?? DIRECTIONS[0];

    return {
        mountain: direction.mountain,
        facing: direction.facing,
        yun: draft.yun,
        panType: draft.panType,
        yuanPhase: draft.yuanPhase,
    };
}

export function useSanYuanState() {
    const layoutMode = useLayoutMode();
    const [draft, setDraft] = useState<SanYuanDraft>(DEFAULT_DRAFT);
    const [submittedDraft, setSubmittedDraft] = useState<SanYuanDraft>(DEFAULT_DRAFT);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [selectedPalace, setSelectedPalace] = useState<PalaceName | null>(null);

    const chart = useMemo(() => calculateSanYuanChart(toChartInput(submittedDraft)), [submittedDraft]);

    const updateDirection = (directionId: string) => {
        setDraft((current) => ({ ...current, directionId }));
    };

    const updateYun = (yun: number) => {
        setDraft((current) => ({
            ...current,
            yun,
            yuanPhase: isYuanPhaseChoiceRequired(yun) ? current.yuanPhase : getYuanPhaseDefault(yun),
        }));
    };

    const updatePanType = (panType: PanType) => {
        setDraft((current) => ({ ...current, panType }));
    };

    const updateYuanPhase = (yuanPhase: YuanPhase) => {
        setDraft((current) => ({ ...current, yuanPhase }));
    };

    const submitChart = () => {
        setSubmittedDraft(draft);
        setSelectedCaseId(null);
        setSelectedPalace(null);
    };

    const selectCase = (caseData: SanYuanCase) => {
        const input = getSanYuanCaseInput(caseData);
        const nextDraft: SanYuanDraft = {
            directionId: getSanYuanDirectionId(caseData),
            yun: input.yun,
            panType: input.panType,
            yuanPhase: input.yuanPhase,
        };

        setDraft(nextDraft);
        setSubmittedDraft(nextDraft);
        setSelectedCaseId(caseData.id);
        setSelectedPalace(null);
    };

    const clearSelectedCase = () => {
        setSelectedCaseId(null);
    };

    return {
        ...layoutMode,
        chart,
        draft,
        selectedCaseId,
        selectedPalace,
        isYuanPhaseChoiceRequired: isYuanPhaseChoiceRequired(draft.yun),
        updateDirection,
        updateYun,
        updatePanType,
        updateYuanPhase,
        submitChart,
        selectCase,
        clearSelectedCase,
        setSelectedPalace,
    };
}

export type SanYuanState = ReturnType<typeof useSanYuanState>;
