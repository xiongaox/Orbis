import React from 'react';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import {
  ZHANGSHENG_STAGES,
  DATA_ZHANG_SHENG_MATRIX,
  ZHI_WX_MAP,
} from '../../../../lib/caseStudy/knowledgeData';
import { getZhangshengHtml } from './knowledgeGenerators';

export interface ZhangShengSectionProps {
  filterMode: string;
}

/** 高亮/淡化判定，与宽表保持同一套规则 */
function highlightFlags(filterMode: string, stageName: string, zhi: string) {
  let isHighlighted = false;
  let isDimmed = false;
  if (filterMode === '生') {
    if (['寅', '申', '巳', '亥'].includes(zhi)) isHighlighted = true;
    else isDimmed = true;
  } else if (filterMode === '旺') {
    if (['子', '午', '卯', '酉'].includes(zhi)) isHighlighted = true;
    else isDimmed = true;
  } else if (filterMode === '墓') {
    if (['辰', '戌', '丑', '未'].includes(zhi)) isHighlighted = true;
    else isDimmed = true;
  } else if (filterMode === '临官') {
    if (stageName === '临官') isHighlighted = true;
    else isDimmed = true;
  } else if (filterMode === '绝') {
    if (stageName === '绝') isHighlighted = true;
    else isDimmed = true;
  }
  return { isHighlighted, isDimmed };
}

export const ZhangShengSection: React.FC<ZhangShengSectionProps> = ({ filterMode }) => {
  // 窄屏走 div 名册竖排；宽屏沿用 13 列宽表（表格上下文里硬掰 tr/td 跨端不可靠）
  const isNarrow = useMediaQuery('(max-width: 640px)');

  if (!isNarrow) {
    return (
      <div
        className="w-full"
        dangerouslySetInnerHTML={{ __html: getZhangshengHtml(filterMode) }}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="zs-list">
        {DATA_ZHANG_SHENG_MATRIX.map((row) => (
          <div key={row.gan} className="zs-list-row">
            <div className={`zs-list-gan color-wx-${row.wx}`}>{row.gan}</div>
            <div className="zs-list-pairs">
              {row.zhis.map((zhi, colIdx) => {
                const stageName = ZHANGSHENG_STAGES[colIdx];
                const zWx = ZHI_WX_MAP[zhi as keyof typeof ZHI_WX_MAP];
                const { isHighlighted, isDimmed } = highlightFlags(filterMode, stageName, zhi);
                return (
                  <span
                    key={stageName}
                    className="zs-list-pair"
                    title={`${row.gan}在${zhi}为${stageName} (${zWx})`}
                  >
                    <i>{stageName}</i>
                    <b
                      className={`color-wx-${zWx} ${isDimmed ? 'is-dimmed' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                    >
                      {zhi}
                    </b>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
