/**
 * 奇门断法页面组件
 * 三栏布局：左侧主题列表 + 中间正文 + 右侧大纲
 */
import { useDuanFa } from './hooks/useDuanFa';
import DuanFaSidebar from './components/DuanFaSidebar';
import DuanFaContent from './components/DuanFaContent';
import DuanFaOutline from './components/DuanFaOutline';
import ShuShuSidebar from './components/ShuShuSidebar';

export default function DuanFaPage() {
    const {
        selectedShuShuId,
        files,
        selectedFileId,
        selectedFile,
        outline,
        activeSectionId,
        handleSelectShuShu,
        handleSelectFile,
        handleOutlineClick,
    } = useDuanFa();

    return (
        <div className="flex w-full h-full overflow-hidden bg-background">
            {/* 1. 术数分类 (12%) */}
            <ShuShuSidebar
                selectedId={selectedShuShuId}
                onSelect={handleSelectShuShu}
            />

            {/* 2. 主题列表 (15%) */}
            <DuanFaSidebar
                files={files}
                selectedFileId={selectedFileId}
                onSelectFile={handleSelectFile}
            />

            {/* 3. 中间：正文内容 */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <DuanFaContent
                    content={selectedFile?.content || ''}
                    title={selectedFile?.name || (selectedShuShuId === 'qimen' ? '奇门断法' : '暂无内容')}
                />
            </div>

            {/* 4. 右侧：大纲导航 (15%) */}
            <DuanFaOutline
                outline={outline}
                activeSectionId={activeSectionId}
                onItemClick={handleOutlineClick}
            />
        </div>
    );
}
