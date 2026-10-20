import React, { useMemo, useCallback } from 'react';
import {
  getShichenHtml,
  getGanxiangHtml,
  getZhixiangHtml,
  getCangganHtml,
  getHechongHtml,
  getNayinHtml,
  getBaguaXianHtml,
  getBaguaHouHtml,
  getErshisiHtml,
  getJiuxingHtml,
  getXingzuoHtml,
  getKoujueHtml,
} from './knowledgeGenerators';
import { DiaohouSection } from './DiaohouSection';
import { Gua64Section } from './Gua64Section';
import { ZhangShengSection } from './ZhangShengSection';
import Toast from '../../../Common/Toast';
import { useToast } from '../../../../hooks/useToast';

export interface KnowledgeContentProps {
  itemId: string;
  ganxiangActiveGan: string;
  zhixiangActiveZhi: string;
  nayinFilterWx: string;
  zhangshengFilterMode: string;
  diaohouFilterGan: string;
  gua64ActivePalace: string;
  onGua64ActivePalaceChange: (palace: string) => void;
  gua64HighlightShiying: boolean;
  onGua64HighlightShiyingChange: (highlight: boolean) => void;
  ershisiPalaceFilter: string;
  jiuxingTypeFilter: string;
  xingzuoElementFilter: string;
  koujueCatFilter: string;
}

export const KnowledgeContent: React.FC<KnowledgeContentProps> = ({
  itemId,
  ganxiangActiveGan,
  zhixiangActiveZhi,
  nayinFilterWx,
  zhangshengFilterMode,
  diaohouFilterGan,
  gua64ActivePalace,
  onGua64ActivePalaceChange,
  gua64HighlightShiying,
  onGua64HighlightShiyingChange,
  ershisiPalaceFilter,
  jiuxingTypeFilter,
  xingzuoElementFilter,
  koujueCatFilter,
}) => {
  const { toast, showToast } = useToast();

  // 口诀歌诀是静态 HTML 注入，无法挂 React 回调，用事件委托处理复制按钮
  const handleHtmlClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const box = target.closest<HTMLElement>('[data-koujue-copy]');
    if (!box) return;
    // 仅点击复制按钮或韵文区域本身生效，避免点卡片空白处误触
    if (!target.closest('[data-koujue-copy-btn]') && target !== box) return;
    const raw = box.dataset.koujueCopy;
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(decodeURIComponent(raw));
      showToast('已复制歌诀');
    } catch {
      // 剪贴板不可用（如非安全上下文）时明确告知，引导手动选取复制
      showToast('复制失败，请手动选中歌诀复制', 'error');
    }
  }, [showToast]);

  const htmlContent = useMemo(() => {
    switch (itemId) {
      case 'shichen':
        return getShichenHtml();
      case 'ganxiang':
        return getGanxiangHtml(ganxiangActiveGan);
      case 'zhixiang':
        return getZhixiangHtml(zhixiangActiveZhi);
      case 'canggan':
        return getCangganHtml();
      case 'hechong':
        return getHechongHtml();
      case 'nayin':
        return getNayinHtml(nayinFilterWx);
      case 'bagua_xian':
        return getBaguaXianHtml();
      case 'bagua_hou':
        return getBaguaHouHtml();
      case 'ershisi':
        return getErshisiHtml(ershisiPalaceFilter);
      case 'jiuxing':
        return getJiuxingHtml(jiuxingTypeFilter);
      case 'xingzuo':
        return getXingzuoHtml(xingzuoElementFilter);
      case 'koujue':
        return getKoujueHtml(koujueCatFilter);
      default:
        return null;
    }
  }, [
    itemId,
    ganxiangActiveGan,
    zhixiangActiveZhi,
    nayinFilterWx,
    ershisiPalaceFilter,
    jiuxingTypeFilter,
    xingzuoElementFilter,
    koujueCatFilter,
  ]);

  if (itemId === 'zhangsheng') {
    return <ZhangShengSection filterMode={zhangshengFilterMode} />;
  }

  if (itemId === 'diaohou') {
    return (
      <DiaohouSection
        filterGan={diaohouFilterGan}
      />
    );
  }

  if (itemId === 'liushisigua') {
    return (
      <Gua64Section
        activePalace={gua64ActivePalace}
        onPalaceChange={onGua64ActivePalaceChange}
        highlightShiying={gua64HighlightShiying}
        onHighlightShiyingChange={onGua64HighlightShiyingChange}
      />
    );
  }

  if (htmlContent) {
    // 整页居中页（八卦两页、十二时辰、支藏天干）打专用类供 CSS 精准命中
    const centeredPage =
      itemId === 'bagua_xian' ||
      itemId === 'bagua_hou' ||
      itemId === 'shichen' ||
      itemId === 'canggan';
    return (
      <>
        <div
          className={`w-full ${centeredPage ? 'is-centered-page' : ''}`}
          onClick={handleHtmlClick}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
        <Toast toast={toast} />
      </>
    );
  }

  return null;
};
