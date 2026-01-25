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
    // 当前选中的术数分类 ID
    const [selectedShuShuId, setSelectedShuShuId] = useState<string>('qimen');

    // 根据选中的术数分类筛选文件
    const filteredFiles = useMemo(() => {
        // 目前所有现有文件暂时都归类为 'qimen'
        // 后续如果有其他分类的文件，需要根据文件元数据进行筛选
        if (selectedShuShuId === 'qimen') {
            return DUANFA_FILES;
        }
        return [];
    }, [selectedShuShuId]);

    // 当前选中的文件 ID
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

    // 当文件列表变化时，自动选中第一个文件
    useMemo(() => {
        if (filteredFiles.length > 0) {
            // 如果当前选中的文件不在新列表中，则选中第一个
            const exists = filteredFiles.find(f => f.id === selectedFileId);
            if (!exists) {
                setSelectedFileId(filteredFiles[0].id);
            }
        } else {
            setSelectedFileId(null);
        }
    }, [filteredFiles, selectedFileId]);

    // 当前选中的标题 ID（用于高亮大纲）
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    // 获取当前选中的文件
    const selectedFile = useMemo<DuanFaFile | null>(() => {
        return filteredFiles.find(f => f.id === selectedFileId) || null;
    }, [filteredFiles, selectedFileId]);

    // 生成大纲
    const outline = useMemo<DuanFaOutlineItem[]>(() => {
        if (!selectedFile) return [];
        return generateOutlineFromMd(selectedFile.content);
    }, [selectedFile]);

    // 选择术数分类
    const handleSelectShuShu = useCallback((id: string) => {
        setSelectedShuShuId(id);
    }, []);

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
        // 选中状态
        selectedShuShuId,
        selectedFileId,
        selectedFile,
        activeSectionId,

        // 数据
        files: filteredFiles, // 返回筛选后的文件列表
        outline,

        // 操作方法
        handleSelectShuShu,
        handleSelectFile,
        handleOutlineClick,
        setActiveSectionId,
    };
}
