import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
  /**
   * 移动端：把右侧大纲挂进抽屉（桌面/平板不传，走内联第四栏）。
   * inline 为并排式：主内容由调用方平移让位，与八字/奇门移动端同款。
   * portalTarget 为不平移的宿主节点：调用方把正文放进 translate 卡片时，
   * 卡片会成为绝对定位后代的包含块，抽屉必须挂到卡片外才不会跟着平移。
   */
  outlineDrawer?: { open: boolean; onClose: () => void; inline?: boolean; portalTarget?: HTMLElement | null };
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
  };

  // 切换条目后正文回到顶部。
  // 必须放在 useLayoutEffect 里：点击时旧内容还在 DOM 中，当场设 scrollTop=0 会被
  // 随后的内容替换 + 浏览器滚动锚定抵消，表现为「新内容从中部开始」
  useLayoutEffect(() => {
    contentScrollerRef.current?.scrollTo({ top: 0 });
  }, [selectedItemId]);

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
      {KNOWLEDGE_ITEMS.map((item) => {
        const isActive = item.id === selectedItemId;
        return (
          <button
            key={item.id}
            type="button"
            className={`l2-item-btn ${isActive ? 'active' : ''}`}
            onClick={() => handleSelectItem(item.id)}
          >
            <span>{item.name}</span>
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
      {outlineDrawer && (() => {
        const drawer = (
          <SideDrawer
            open={outlineDrawer.open}
            title={getKnowledgeOutlineTitle(selectedItemId) ?? '大纲'}
            side="right"
            size="xxs"
            inline={outlineDrawer.inline}
            onClose={outlineDrawer.onClose}
          >
            <div className="knowledge-drawer-content flex-1 min-h-0 overflow-y-auto p-3 scrollbar-thin">
              {getKnowledgeOutlineTitle(selectedItemId)
                ? renderOutline('bare', outlineDrawer.onClose)
                : <div className="text-sm text-muted-foreground py-6 text-center">当前篇目无大纲</div>}
            </div>
          </SideDrawer>
        );
        return outlineDrawer.portalTarget ? createPortal(drawer, outlineDrawer.portalTarget) : drawer;
      })()}
    </>
  );
};

export default KnowledgePage;
