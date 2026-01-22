/**
 * 奇门断法页面组件
 * 三栏布局：左侧主题列表 + 中间正文 + 右侧大纲
 */
import { useDuanFa } from './hooks/useDuanFa';
import DuanFaSidebar from './components/DuanFaSidebar';
import DuanFaContent from './components/DuanFaContent';
import DuanFaOutline from './components/DuanFaOutline';

export default function DuanFaPage() {
    const {
        files,
        selectedFileId,
        selectedFile,
        outline,
        activeSectionId,
        handleSelectFile,
        handleOutlineClick,
    } = useDuanFa();

    return (
        <div className="flex w-full h-full overflow-hidden bg-background">
            {/* 左侧：主题列表 (15%) */}
            <DuanFaSidebar
                files={files}
                selectedFileId={selectedFileId}
                onSelectFile={handleSelectFile}
            />

            {/* 中间：正文内容 */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <DuanFaContent
                    content={selectedFile?.content || ''}
                    title={selectedFile?.name || '奇门断法'}
                />
            </div>

            {/* 右侧：大纲导航 (15%) */}
            <DuanFaOutline
                outline={outline}
                activeSectionId={activeSectionId}
                onItemClick={handleOutlineClick}
            />
        </div>
    );
}
