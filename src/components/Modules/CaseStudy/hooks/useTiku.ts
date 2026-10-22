import { useCallback, useMemo, useState } from 'react';
import { TIKU_BANKS, findBank, type TikuVolume } from '../../../../lib/caseStudy/tikuData';
import { readSetting, writeSetting } from '../../../../services/appSettingStore';

/** 上次浏览到的题库位置，切走再回来仍停在原处 */
const TIKU_POSITION_KEY = 'tiku_position';

interface TikuPosition {
    bankId: string;
    editionId: string | null;
    volumeId: string | null;
}

function readPosition(): TikuPosition {
    const saved = readSetting<TikuPosition | null>(TIKU_POSITION_KEY, null);
    return {
        bankId: saved?.bankId ?? TIKU_BANKS[0]?.id ?? '',
        editionId: saved?.editionId ?? null,
        volumeId: saved?.volumeId ?? null,
    };
}

/**
 * 题库导航状态：题库 → 届次 → 命例卷。
 * 与断法的三级结构同构，第四级（题目）由命例卷内部承载。
 * 选中位置持久化，切换模块再回来不会重置到默认届次。
 */
export function useTiku() {
    // 惰性初始化：只在首次挂载读一次持久化位置
    const [selectedBankId, setSelectedBankId] = useState<string>(() => readPosition().bankId);
    const [selectedEditionId, setSelectedEditionId] = useState<string | null>(() => readPosition().editionId);
    const [selectedVolumeId, setSelectedVolumeId] = useState<string | null>(() => readPosition().volumeId);

    const bank = useMemo(() => findBank(selectedBankId), [selectedBankId]);

    const editions = useMemo(() => bank?.editions ?? [], [bank]);

    // 未显式选择时默认落在最新一届
    const edition = useMemo(() => {
        if (!editions.length) return null;
        return editions.find((e) => e.id === selectedEditionId) ?? editions[editions.length - 1];
    }, [editions, selectedEditionId]);

    const volumes = useMemo(() => edition?.volumes ?? [], [edition]);

    const volume = useMemo<TikuVolume | null>(() => {
        if (!volumes.length) return null;
        return volumes.find((v) => v.id === selectedVolumeId) ?? volumes[0];
    }, [volumes, selectedVolumeId]);

    const handleSelectBank = useCallback((id: string) => {
        setSelectedBankId(id);
        setSelectedEditionId(null);
        setSelectedVolumeId(null);
        writeSetting(TIKU_POSITION_KEY, { bankId: id, editionId: null, volumeId: null });
    }, []);

    const handleSelectEdition = useCallback((id: string) => {
        setSelectedEditionId(id);
        setSelectedVolumeId(null);
        writeSetting(TIKU_POSITION_KEY, { bankId: selectedBankId, editionId: id, volumeId: null });
    }, [selectedBankId]);

    const handleSelectVolume = useCallback((id: string) => {
        setSelectedVolumeId(id);
        writeSetting(TIKU_POSITION_KEY, {
            bankId: selectedBankId,
            editionId: selectedEditionId,
            volumeId: id,
        });
    }, [selectedBankId, selectedEditionId]);

    return {
        bank,
        editions,
        edition,
        volumes,
        volume,
        selectedBankId,
        selectedEditionId: edition?.id ?? null,
        selectedVolumeId: volume?.id ?? null,
        handleSelectBank,
        handleSelectEdition,
        handleSelectVolume,
    };
}

export type UseTikuResult = ReturnType<typeof useTiku>;
