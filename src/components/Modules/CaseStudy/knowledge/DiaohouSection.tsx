import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import {
  DIAOHOU_MONTHS,
  DIAOHOU_DATA,
  GAN_WX_MAP,
  ZHI_WX_MAP,
} from '../../../../lib/caseStudy/knowledgeData';

export interface DiaohouSectionProps {
  filterGan: string;
}

export const DiaohouSection: React.FC<DiaohouSectionProps> = ({
  filterGan,
}) => {
  // 窄屏改走卡片流：一张卡 = 一个日主，默认折叠，点卡头展开
  const isNarrow = useMediaQuery('(max-width: 640px)');
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (g: string) => setExpanded((cur) => (cur === g ? null : g));
  // 直接十干全览（分表切换已移除）
  const gans = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

  return (
    <div className="w-full">
      <div className="dh-board-container">
        {isNarrow ? (
          <div className="dh-cards">
            {gans.map((g) => (
              <section key={g} className={`dh-card ${expanded === g ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="dh-card-head"
                  onClick={() => toggle(g)}
                  aria-expanded={expanded === g}
                >
                  <span className={`color-wx-${GAN_WX_MAP[g as keyof typeof GAN_WX_MAP]}`}>{g}</span>
                  <span className="dh-card-sub">{GAN_WX_MAP[g as keyof typeof GAN_WX_MAP]} · 调候用神</span>
                  <ChevronDown className="dh-card-chevron" />
                </button>
                {expanded === g && (
                <ul className="dh-card-list">
                  {DIAOHOU_MONTHS.map((mInfo, mIdx) => {
                    const items = (DIAOHOU_DATA[g as keyof typeof DIAOHOU_DATA] || [])[mIdx] || [];
                    const zWx = ZHI_WX_MAP[mInfo.zhi as keyof typeof ZHI_WX_MAP];
                    return (
                      <li key={mInfo.zhi} className="dh-card-row">
                        <span className="dh-card-month">
                          <span className={`color-wx-${zWx}`}>{mInfo.zhi}</span>
                          <span className="dh-month-sub">{mInfo.month}</span>
                        </span>
                        <span className="dh-card-items">
                          {items.map((itemGan, itemIdx) => {
                            const iWx = GAN_WX_MAP[itemGan as keyof typeof GAN_WX_MAP];
                            const isDimmed = filterGan !== 'all' && itemGan !== filterGan;
                            const isHighlighted = filterGan !== 'all' && itemGan === filterGan;
                            return (
                              <span
                                key={itemIdx}
                                className={`dh-char color-wx-${iWx} ${isDimmed ? 'is-dimmed' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                              >
                                {itemGan}
                              </span>
                            );
                          })}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                )}
              </section>
            ))}
          </div>
        ) : (
        <div className="dh-table-wrap">
          <table className="dh-table is-all-gans">
            <thead>
              <tr>
                <th className="col-month">月令 \ 日主</th>
                {gans.map((g) => (
                  <th key={g}>
                    <span className={`color-wx-${GAN_WX_MAP[g as keyof typeof GAN_WX_MAP]}`}>{g}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIAOHOU_MONTHS.map((mInfo, mIdx) => {
                const zWx = ZHI_WX_MAP[mInfo.zhi as keyof typeof ZHI_WX_MAP];
                const isAlt = mIdx % 2 === 1;

                return (
                  <tr key={mInfo.zhi} className={isAlt ? 'alt-row' : ''}>
                    {/* 第一列：月令 */}
                    <td className="dh-cell-month">
                      <span className={`color-wx-${zWx}`}>{mInfo.zhi}</span>
                      <span className="dh-month-sub">({mInfo.month})</span>
                    </td>

                    {/* 各日主用神 */}
                    {gans.map((g) => {
                      const items = (DIAOHOU_DATA[g as keyof typeof DIAOHOU_DATA] || [])[mIdx] || [];
                      return (
                        <td
                          key={g}
                          className="dh-cell-items"
                          title={`日主${g}${GAN_WX_MAP[g as keyof typeof GAN_WX_MAP]} · ${mInfo.zhi}月(${mInfo.month}) 调侯用神：${items.join('、')}`}
                        >
                          <div className="dh-items-row">
                            {items.map((itemGan, itemIdx) => {
                              const iWx = GAN_WX_MAP[itemGan as keyof typeof GAN_WX_MAP];
                              let isDimmed = false;
                              let isHighlighted = false;
                              if (filterGan !== 'all') {
                                if (itemGan === filterGan) isHighlighted = true;
                                else isDimmed = true;
                              }

                              return (
                                <span
                                  key={itemIdx}
                                  className={`dh-char color-wx-${iWx} ${isDimmed ? 'is-dimmed' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                                >
                                  {itemGan}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};
