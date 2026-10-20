import React from 'react';
import { GUA64_PALACES } from '../../../../lib/caseStudy/knowledgeData';
import { Gua64Card } from './KnowledgeYaoAndBagua';

/** 六十四卦矩阵的列名（世序），窄屏卡片流下作为每格的标签 */
const GUA64_COLUMNS = ['八纯卦', '一世卦', '二世卦', '三世卦', '四世卦', '五世卦', '游魂卦', '归魂卦'];

export interface Gua64SectionProps {
  activePalace: string;
  onPalaceChange: (palace: string) => void;
  highlightShiying: boolean;
  onHighlightShiyingChange: (highlight: boolean) => void;
}

export const Gua64Section: React.FC<Gua64SectionProps> = ({
  activePalace,
  highlightShiying,
}) => {
  const isAll = activePalace === 'all';
  const activePalaceObj =
    GUA64_PALACES.find((p) => p.name === activePalace) || GUA64_PALACES[0];

  return (
    <div className="w-full">
      <div className="gua64-container">

        {/* 模式一：单宫一屏精读 */}
        {!isAll ? (
          <div className="gua64-single-palace">
            <div className="gua64-palace-header-bar">
              <div className="gua64-palace-title">
                <span>{activePalaceObj.name}宫八卦</span>
                <span className={`chip-wx wx-${activePalaceObj.wx}`}>
                  {activePalaceObj.wx}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--muted)' }}>
                  · {activePalaceObj.trigram} ({activePalaceObj.sym}) · 京房易纳甲
                </span>
              </div>
              <div className="gua64-palace-desc">
                本宫纯卦 ➔ 一世至五世 ➔ 游魂(四世) ➔ 归魂(三世)
              </div>
            </div>

            <div className="gua64-row-cards">
              {activePalaceObj.guas.map((g) => (
                <div key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontFamily: 'var(--font-serif)',
                      color: 'var(--muted)',
                      textAlign: 'center',
                    }}
                  >
                    {g.col}
                  </div>
                  <Gua64Card
                    gua={g}
                    palaceWx={activePalaceObj.wx}
                    isLarge={true}
                    highlightShiying={highlightShiying}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 模式二：八宫全览 */
          <div className="gua64-matrix-container">
            <table className="gua64-table">
              <thead>
                <tr>
                  {GUA64_COLUMNS.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GUA64_PALACES.map((p) => (
                  <tr key={p.name}>
                    {p.guas.map((g, colIdx) => (
                      <td key={g.name} data-label={GUA64_COLUMNS[colIdx]}>
                        <Gua64Card
                          gua={g}
                          palaceWx={p.wx}
                          isLarge={false}
                          highlightShiying={highlightShiying}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
