import React, { useState, useRef } from 'react';
import { KNOWLEDGE_ITEMS, getKnowledgeOutlineTitle } from '../../../../lib/caseStudy/knowledgeData';
import KnowledgeOutline from './KnowledgeOutline';
import SideDrawer from '../../../UI/SideDrawer';
import { KnowledgeContent } from './KnowledgeContent';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { useIsPadLandscape } from '../../../../hooks/useIsPadLandscape';
import '../knowledge.css';

export interface KnowledgePageProps {
  initialItemId?: string;
  onItemChange?: (itemId: string) => void;
  /** 移动端：把右侧大纲挂进抽屉（桌面/平板不传，走内联第四栏） */
  outlineDrawer?: { open: boolean; onClose: () => void };
}

export const KnowledgePage: React.FC<KnowledgePageProps> = ({
  initialItemId = 'shichen',
  onItemChange,
  outlineDrawer,
}) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isPadLandscape = useIsPadLandscape();
  const useDesktopLayout = isDesktop && !isPadLandscape;

  // 状态管理
  const [selectedItemId, setSelectedItemId] = useState<string>(initialItemId);
  const [prevInitialItemId, setPrevInitialItemId] = useState<string>(initialItemId);

  if (initialItemId && initialItemId !== prevInitialItemId) {
    setPrevInitialItemId(initialItemId);
    setSelectedItemId(initialItemId);
  }

  const [ganxiangActiveGan, setGanxiangActiveGan] = useState<string>('甲');
  const [zhixiangActiveZhi, setZhixiangActiveZhi] = useState<string>('子');
  const [nayinFilterWx, setNayinFilterWx] = useState<string>('all');
  const [zhangshengFilterMode, setZhangshengFilterMode] = useState<string>('all');
  const [diaohouFilterGan, setDiaohouFilterGan] = useState<string>('all');
  const [gua64ActivePalace, setGua64ActivePalace] = useState<string>('all');
  const [gua64HighlightShiying, setGua64HighlightShiying] = useState<boolean>(true);
  const [ershisiPalaceFilter, setErshisiPalaceFilter] = useState<string>('all');
  const [jiuxingTypeFilter, setJiuxingTypeFilter] = useState<string>('all');
  const [xingzuoElementFilter, setXingzuoElementFilter] = useState<string>('all');
  const [koujueCatFilter, setKoujueCatFilter] = useState<string>('all');

  // 滚动容器引用
  const contentScrollerRef = useRef<HTMLDivElement>(null);

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    onItemChange?.(id);
    // 切换条目时滚动回顶部
    if (contentScrollerRef.current) {
      contentScrollerRef.current.scrollTop = 0;
    }
  };

  // 宽版心条目：大盘全览表格与三列/多栏卡片篇目统一撑开到大屏视口，避免两侧留白过多
  const isWide = [
    'diaohou',
    'liushisigua',
    'zhangsheng',
    'nayin',
    'hechong',
    'ershisi',
    'jiuxing',
    'xingzuo',
    'koujue',
  ].includes(selectedItemId);

  // 二级栏：常识篇目列表
  const l2ListContent = (
    <div className="l2-list">
      {KNOWLEDGE_ITEMS.map((item, idx) => {
        const isActive = item.id === selectedItemId;
        return (
          <button
            key={item.id}
            type="button"
            className={`l2-item-btn ${isActive ? 'active' : ''}`}
            onClick={() => handleSelectItem(item.id)}
          >
            <span>{item.name}</span>
            <span className="l2-item-idx">{String(idx + 1).padStart(2, '0')}</span>
          </button>
        );
      })}
    </div>
  );

  // 右侧大纲：桌面内联栏与移动抽屉共用同一份筛选控件，仅外壳与选中后行为不同
  const renderOutline = (variant: 'sidebar' | 'bare', onItemSelect?: () => void) => (
    <KnowledgeOutline
      itemId={selectedItemId}
      variant={variant}
      onItemSelect={onItemSelect}
      ganxiangActiveGan={ganxiangActiveGan}
      onGanxiangActiveGanChange={setGanxiangActiveGan}
      zhixiangActiveZhi={zhixiangActiveZhi}
      onZhixiangActiveZhiChange={setZhixiangActiveZhi}
      nayinFilterWx={nayinFilterWx}
      onNayinFilterWxChange={setNayinFilterWx}
      zhangshengFilterMode={zhangshengFilterMode}
      onZhangshengFilterModeChange={setZhangshengFilterMode}
      diaohouFilterGan={diaohouFilterGan}
      onDiaohouFilterGanChange={setDiaohouFilterGan}
      ershisiPalaceFilter={ershisiPalaceFilter}
      onErshisiPalaceFilterChange={setErshisiPalaceFilter}
      jiuxingTypeFilter={jiuxingTypeFilter}
      onJiuxingTypeFilterChange={setJiuxingTypeFilter}
      xingzuoElementFilter={xingzuoElementFilter}
      onXingzuoElementFilterChange={setXingzuoElementFilter}
      koujueCatFilter={koujueCatFilter}
      onKoujueCatFilterChange={setKoujueCatFilter}
    />
  );

  return (
    <>
    <div className="layout-a knowledge-theme flex-1 flex w-full h-full overflow-hidden relative">
      {/* 桌面端二级栏：常识篇目列表 */}
      {useDesktopLayout && (
        <div className="nav-col-l2">
          <div className="nav-header">常识篇目</div>
          {l2ListContent}
        </div>
      )}

      {/* 中间正文阅读区 */}
      <div className="content-col-main flex-1 flex flex-col overflow-hidden relative">

        <div
          ref={contentScrollerRef}
          className="content-scroller flex-1 overflow-y-auto"
        >
          <div className={`content-max-w ${isWide ? 'is-wide is-wide-64gua' : ''}`}>
            <KnowledgeContent
              itemId={selectedItemId}
              ganxiangActiveGan={ganxiangActiveGan}
              zhixiangActiveZhi={zhixiangActiveZhi}
              nayinFilterWx={nayinFilterWx}
              zhangshengFilterMode={zhangshengFilterMode}
              diaohouFilterGan={diaohouFilterGan}
              gua64ActivePalace={gua64ActivePalace}
              onGua64ActivePalaceChange={setGua64ActivePalace}
              gua64HighlightShiying={gua64HighlightShiying}
              onGua64HighlightShiyingChange={setGua64HighlightShiying}
              ershisiPalaceFilter={ershisiPalaceFilter}
              jiuxingTypeFilter={jiuxingTypeFilter}
              xingzuoElementFilter={xingzuoElementFilter}
              koujueCatFilter={koujueCatFilter}
            />
          </div>
        </div>
      </div>

      {/* 桌面端四级栏：右侧大纲导航 */}
      {useDesktopLayout && renderOutline('sidebar')}

    </div>

      {/* 移动端：大纲进右抽屉。必须挂在这里而不是 .knowledge-theme 内部——
          该作用域重定义了 Tailwind 的 --card（十六进制值），嵌在里面的抽屉
          bg-card 会解析成非法颜色而透出正文。内容套 knowledge-drawer-content 保留主题配色。 */}
      {outlineDrawer && (
        <SideDrawer
          open={outlineDrawer.open}
          title={getKnowledgeOutlineTitle(selectedItemId) ?? '大纲'}
          side="right"
          size="xxs"
          onClose={outlineDrawer.onClose}
        >
          <div className="knowledge-drawer-content flex-1 min-h-0 overflow-y-auto p-3 scrollbar-thin">
            {getKnowledgeOutlineTitle(selectedItemId)
              ? renderOutline('bare', outlineDrawer.onClose)
              : <div className="text-sm text-muted-foreground py-6 text-center">当前篇目无大纲</div>}
          </div>
        </SideDrawer>
      )}
    </>
  );
};

export default KnowledgePage;
