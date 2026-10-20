import React from 'react';
import {
  GUA64_NAJIA_MAP,
  GUA64_TRIGRAM_YAO,
  GUA64_WX_RELATION,
} from '../../../../lib/caseStudy/knowledgeData';

export interface YaoSymbolProps {
  lines: number[];
}

export const YaoSymbol: React.FC<YaoSymbolProps> = ({ lines }) => {
  return (
    <div className="yao-symbol">
      {lines.map((val, idx) =>
        val === 1 ? (
          <div key={idx} className="yao-bar yang" />
        ) : (
          <div key={idx} className="yao-bar yin">
            <span />
            <span />
          </div>
        )
      )}
    </div>
  );
};

export const TaijiCell: React.FC = () => {
  return (
    <div className="bagua-card">
      <span className="bagua-corner tl" />
      <span className="bagua-corner tr" />
      <span className="bagua-corner bl" />
      <span className="bagua-corner br" />
      <div className="bagua-inner-card taiji-inner">
        <svg viewBox="0 0 100 100" className="taiji-svg">
          <circle cx="50" cy="50" r="47" fill="#fcfcfc" stroke="#222" strokeWidth="1.5" />
          <path
            d="M 50 3 A 47 47 0 0 1 50 97 A 23.5 23.5 0 0 1 50 50 A 23.5 23.5 0 0 0 50 3 Z"
            fill="#181818"
          />
          <circle cx="50" cy="26.5" r="5.5" fill="#181818" />
          <circle cx="50" cy="73.5" r="5.5" fill="#fcfcfc" />
        </svg>
      </div>
    </div>
  );
};

export interface BaguaXianCellProps {
  cell: {
    isTaiji?: boolean;
    num?: string;
    wx?: string;
    gua?: string;
    nature?: string;
    lines?: number[];
  };
}

export const BaguaXianCell: React.FC<BaguaXianCellProps> = ({ cell }) => {
  if (cell.isTaiji) return <TaijiCell />;
  return (
    <div className="bagua-card">
      <span className="bagua-corner tl" />
      <span className="bagua-corner tr" />
      <span className="bagua-corner bl" />
      <span className="bagua-corner br" />
      <div className="bagua-inner-card">
        <div className="bagua-row-top">
          <span className="bagua-meta-txt">{cell.num}</span>
          <span className="bagua-meta-txt">{cell.wx}</span>
        </div>
        <div className="bagua-hero-char">{cell.gua}</div>
        <div className="bagua-row-bot">
          <span className="bagua-meta-txt">{cell.nature}</span>
          {cell.lines && <YaoSymbol lines={cell.lines} />}
        </div>
      </div>
    </div>
  );
};

export interface BaguaHouCellProps {
  cell: {
    isTaiji?: boolean;
    wxCls?: string;
    pos?: string;
    num?: string;
    wx?: string;
    gua?: string;
    nature?: string;
    lines?: number[];
  };
}

export const BaguaHouCell: React.FC<BaguaHouCellProps> = ({ cell }) => {
  if (cell.isTaiji) return <TaijiCell />;
  return (
    <div className={`bagua-card ${cell.wxCls || ''}`}>
      <span className="bagua-corner tl" />
      <span className="bagua-corner tr" />
      <span className="bagua-corner bl" />
      <span className="bagua-corner br" />
      <div className="bagua-inner-card">
        <div className="bagua-row-top">
          <span className="bagua-meta-txt">{cell.pos}</span>
          <span className="bagua-meta-txt">
            {cell.num} {cell.wx}
          </span>
        </div>
        <div className="bagua-hero-char">{cell.gua}</div>
        <div className="bagua-row-bot">
          <span className="bagua-meta-txt">{cell.nature}</span>
          {cell.lines && <YaoSymbol lines={cell.lines} />}
        </div>
      </div>
    </div>
  );
};

export interface Gua64Item {
  name: string;
  low: string;
  up: string;
  shi: number;
  ying: number;
}

export interface Gua64CardProps {
  gua: Gua64Item;
  palaceWx: string;
  isLarge?: boolean;
  highlightShiying?: boolean;
}

export const Gua64Card: React.FC<Gua64CardProps> = ({
  gua,
  palaceWx,
  isLarge = false,
  highlightShiying = true,
}) => {
  const dizhiArr = (GUA64_NAJIA_MAP[gua.low as keyof typeof GUA64_NAJIA_MAP] || [])
    .slice(0, 3)
    .concat((GUA64_NAJIA_MAP[gua.up as keyof typeof GUA64_NAJIA_MAP] || []).slice(3));

  const yaoArr = (GUA64_TRIGRAM_YAO[gua.low as keyof typeof GUA64_TRIGRAM_YAO] || []).concat(
    GUA64_TRIGRAM_YAO[gua.up as keyof typeof GUA64_TRIGRAM_YAO] || []
  );

  const lines = [];
  for (let i = 5; i >= 0; i--) {
    const dz = dizhiArr[i] || '';
    const ewx = dz[1] || '';
    const relMap = GUA64_WX_RELATION[palaceWx as keyof typeof GUA64_WX_RELATION] || {};
    const qin = relMap[ewx as keyof typeof relMap] || '';
    const isYang = yaoArr[i] === 1;
    const isShi = i === gua.shi;
    const isYing = i === gua.ying;

    let roleText = '';
    let roleClass = '';
    if (isShi) {
      roleText = '(世)';
      roleClass = 'is-shi';
    } else if (isYing) {
      roleText = '(应)';
      roleClass = 'is-ying';
    }

    lines.push(
      <div key={i} className="gua64-line-row">
        <div className="gua64-info">
          <span className="gua64-qin">{qin}</span>
          <span className="gua64-dizhi">{dz}</span>
        </div>
        <div className="gua64-bar-box">
          <div className={isYang ? 'gua64-bar-yang' : 'gua64-bar-yin'} />
        </div>
        <div
          className={`gua64-role ${roleClass}`}
          style={{ opacity: highlightShiying ? 1 : 0.15 }}
        >
          {roleText}
        </div>
      </div>
    );
  }

  return (
    <div className={`gua64-card ${isLarge ? 'is-large' : ''}`}>
      <div className="gua64-strip">
        <div className="gua64-strip-line" />
        <div className="gua64-strip-name">{gua.name}</div>
        <div className="gua64-strip-line" />
      </div>
      <div className="gua64-body">{lines}</div>
    </div>
  );
};

export interface Gua64SealProps {
  palace: {
    num: string;
    wx: string;
    name: string;
    trigram: string;
    sym: string;
  };
  isLarge?: boolean;
}

export const Gua64Seal: React.FC<Gua64SealProps> = ({ palace, isLarge = false }) => {
  return (
    <div className={`gua64-seal-card ${isLarge ? 'is-large' : ''}`}>
      <div className="gua64-seal-corners-extra" />
      <div className="gua64-seal-top">
        <span>{palace.num}</span>
        <span className={`wx-${palace.wx}`}>({palace.wx})</span>
      </div>
      <div className="gua64-seal-mid">{palace.name}</div>
      <div className="gua64-seal-bot">
        <span>{palace.trigram}</span>
        <span className="gua64-seal-sym">{palace.sym}</span>
      </div>
    </div>
  );
};
