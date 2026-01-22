/**
 * 断法模块状态管理 Hook - MD 版本
 */
import { useState, useMemo, useCallback } from 'react';
import {
    DUANFA_FILES,
    generateOutlineFromMd,
    type DuanFaFile,
    type DuanFaOutlineItem
} from '../../../../lib/caseStudy/duanfaData';

export function useDuanFa() {
    // 当前选中的文件 ID
    const [selectedFileId, setSelectedFileId] = useState<string | null>(
        DUANFA_FILES[0]?.id || null
    );

    // 当前选中的标题 ID（用于高亮大纲）
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    // 获取当前选中的文件
    const selectedFile = useMemo<DuanFaFile | null>(() => {
        return DUANFA_FILES.find(f => f.id === selectedFileId) || null;
    }, [selectedFileId]);

    // 生成大纲
    const outline = useMemo<DuanFaOutlineItem[]>(() => {
        if (!selectedFile) return [];
        return generateOutlineFromMd(selectedFile.content);
    }, [selectedFile]);

    // 选择文件
    const handleSelectFile = useCallback((fileId: string) => {
        setSelectedFileId(fileId);
        setActiveSectionId(null);
    }, []);

    // 点击大纲项，滚动到对应标题
    const handleOutlineClick = useCallback((sectionId: string) => {
        setActiveSectionId(sectionId);
        // 滚动到对应元素
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    return {
        // 文件列表
        files: DUANFA_FILES,

        // 选中状态
        selectedFileId,
        selectedFile,
        activeSectionId,

        // 大纲
        outline,

        // 操作方法
        handleSelectFile,
        handleOutlineClick,
        setActiveSectionId,
    };
}
