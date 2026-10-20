import React from 'react';
import {
  DATA_GAN,
  DATA_ZHI,
  DATA_ERSHISI,
  DATA_KOUJUE,
  GAN_WX_MAP,
  getKnowledgeOutlineTitle,
} from '../../../../lib/caseStudy/knowledgeData';

interface KnowledgeOutlineProps {
  itemId: string;
  ganxiangActiveGan: string;
  onGanxiangActiveGanChange: (gan: string) => void;
  zhixiangActiveZhi: string;
  onZhixiangActiveZhiChange: (zhi: string) => void;
  nayinFilterWx: string;
  onNayinFilterWxChange: (wx: string) => void;
  zhangshengFilterMode: string;
  onZhangshengFilterModeChange: (mode: string) => void;
  diaohouFilterGan: string;
  onDiaohouFilterGanChange: (gan: string) => void;
  ershisiPalaceFilter: string;
  onErshisiPalaceFilterChange: (palace: string) => void;
  jiuxingTypeFilter: string;
  onJiuxingTypeFilterChange: (type: string) => void;
  xingzuoElementFilter: string;
  onXingzuoElementFilterChange: (elem: string) => void;
  koujueCatFilter: string;
  onKoujueCatFilterChange: (cat: string) => void;
  variant?: 'sidebar' | 'bare';
  onItemSelect?: () => void;
}

export const KnowledgeOutline: React.FC<KnowledgeOutlineProps> = ({
  itemId,
  ganxiangActiveGan,
  onGanxiangActiveGanChange,
  zhixiangActiveZhi,
  onZhixiangActiveZhiChange,
  nayinFilterWx,
  onNayinFilterWxChange,
  zhangshengFilterMode,
  onZhangshengFilterModeChange,
  diaohouFilterGan,
  onDiaohouFilterGanChange,
  ershisiPalaceFilter,
  onErshisiPalaceFilterChange,
  jiuxingTypeFilter,
  onJiuxingTypeFilterChange,
  xingzuoElementFilter,
  onXingzuoElementFilterChange,
  koujueCatFilter,
  onKoujueCatFilterChange,
  variant = 'sidebar',
  onItemSelect,
}) => {
  const title = getKnowledgeOutlineTitle(itemId);
  if (!title) {
    return null;
  }

  let content: React.ReactNode = null;

  switch (itemId) {
    case 'ganxiang':
      content = DATA_GAN.map((g) => {
        const isActive = ganxiangActiveGan === g.gan;
        return (
          <button
            key={g.gan}
            type="button"
            className={`outline-btn ${isActive ? 'active' : ''}`}
            onClick={() => {
              onGanxiangActiveGanChange(g.gan);
              onItemSelect?.();
            }}
          >
            <span className={`wx-${g.wx} outline-char`}>{g.gan}</span>
            <span className="outline-desc">
              {g.yy}
              {g.wx} · {g.role.split('·')[0].trim()}
            </span>
          </button>
        );
      });
      break;

    case 'zhixiang':
      content = DATA_ZHI.map((z) => {
        const isActive = zhixiangActiveZhi === z.zhi;
        return (
          <button
            key={z.zhi}
            type="button"
            className={`outline-btn ${isActive ? 'active' : ''}`}
            onClick={() => {
              onZhixiangActiveZhiChange(z.zhi);
              onItemSelect?.();
            }}
          >
            <span className={`wx-${z.wx} outline-char`}>{z.zhi}</span>
            <span className="outline-desc">
              {z.animal_zodiac} · {z.yy}
              {z.wx}
            </span>
          </button>
        );
      });
      break;

    case 'nayin':
      content = (
        <>
          <button
            type="button"
            className={`outline-btn ${nayinFilterWx === 'all' ? 'active' : ''}`}
            onClick={() => {
              onNayinFilterWxChange('all');
              onItemSelect?.();
            }}
          >
            <span>全览 (60甲子)</span>
          </button>
          {['金', '木', '水', '火', '土'].map((w) => (
            <button
              key={w}
              type="button"
              className={`outline-btn ${nayinFilterWx === w ? 'active' : ''}`}
              onClick={() => {
                onNayinFilterWxChange(w);
                onItemSelect?.();
              }}
            >
              <span className={`color-wx-${w}`}>●</span>
              <span>纳音属{w} (12)</span>
            </button>
          ))}
        </>
      );
      break;

    case 'zhangsheng':
      content = (
        <>
          <button
            type="button"
            className={`outline-btn ${zhangshengFilterMode === 'all' ? 'active' : ''}`}
            onClick={() => {
              onZhangshengFilterModeChange('all');
              onItemSelect?.();
            }}
          >
            <span>全盘总览</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${zhangshengFilterMode === '生' ? 'active' : ''}`}
            onClick={() => {
              onZhangshengFilterModeChange('生');
              onItemSelect?.();
            }}
          >
            <span>四长生 (寅申巳亥)</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${zhangshengFilterMode === '临官' ? 'active' : ''}`}
            onClick={() => {
              onZhangshengFilterModeChange('临官');
              onItemSelect?.();
            }}
          >
            <span>临官禄位</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${zhangshengFilterMode === '旺' ? 'active' : ''}`}
            onClick={() => {
              onZhangshengFilterModeChange('旺');
              onItemSelect?.();
            }}
          >
            <span>四帝旺 (子午卯酉)</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${zhangshengFilterMode === '墓' ? 'active' : ''}`}
            onClick={() => {
              onZhangshengFilterModeChange('墓');
              onItemSelect?.();
            }}
          >
            <span>四墓库 (辰戌丑未)</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${zhangshengFilterMode === '绝' ? 'active' : ''}`}
            onClick={() => {
              onZhangshengFilterModeChange('绝');
              onItemSelect?.();
            }}
          >
            <span>绝处生机</span>
          </button>
        </>
      );
      break;

    case 'diaohou':
      content = (
        <>
          <button
            type="button"
            className={`outline-btn ${diaohouFilterGan === 'all' ? 'active' : ''}`}
            onClick={() => {
              onDiaohouFilterGanChange('all');
              onItemSelect?.();
            }}
          >
            <span>显示全部 (不筛选)</span>
          </button>
          {['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].map((g) => (
            <button
              key={g}
              type="button"
              className={`outline-btn ${diaohouFilterGan === g ? 'active' : ''}`}
              onClick={() => {
                onDiaohouFilterGanChange(g);
                onItemSelect?.();
              }}
            >
              <span className={`color-wx-${GAN_WX_MAP[g as keyof typeof GAN_WX_MAP]}`} style={{ fontWeight: 700 }}>
                {g}
              </span>
              <span>
                {g}
                {GAN_WX_MAP[g as keyof typeof GAN_WX_MAP]}日主
              </span>
            </button>
          ))}
        </>
      );
      break;

    case 'ershisi':
      content = (
        <>
          <button
            type="button"
            className={`outline-btn ${ershisiPalaceFilter === 'all' ? 'active' : ''}`}
            onClick={() => {
              onErshisiPalaceFilterChange('all');
              onItemSelect?.();
            }}
          >
            <span>全盘总览 (八宫)</span>
          </button>
          {DATA_ERSHISI.map((p) => (
            <button
              key={p.gua}
              type="button"
              className={`outline-btn ${ershisiPalaceFilter === p.gua ? 'active' : ''}`}
              onClick={() => {
                onErshisiPalaceFilterChange(p.gua);
                onItemSelect?.();
              }}
            >
              <span>
                {p.gua} ({p.shans.map((s) => s.shan).join('')})
              </span>
            </button>
          ))}
        </>
      );
      break;

    case 'jiuxing':
      content = (
        <>
          <button
            type="button"
            className={`outline-btn ${jiuxingTypeFilter === 'all' ? 'active' : ''}`}
            onClick={() => {
              onJiuxingTypeFilterChange('all');
              onItemSelect?.();
            }}
          >
            <span>九宫全览 (3×3)</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${jiuxingTypeFilter === 'good' ? 'active' : ''}`}
            onClick={() => {
              onJiuxingTypeFilterChange('good');
              onItemSelect?.();
            }}
          >
            <span>吉星品汇 (一四六八九)</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${jiuxingTypeFilter === 'bad' ? 'active' : ''}`}
            onClick={() => {
              onJiuxingTypeFilterChange('bad');
              onItemSelect?.();
            }}
          >
            <span>煞曜提防 (二三五七)</span>
          </button>
        </>
      );
      break;

    case 'xingzuo':
      content = (
        <>
          <button
            type="button"
            className={`outline-btn ${xingzuoElementFilter === 'all' ? 'active' : ''}`}
            onClick={() => {
              onXingzuoElementFilterChange('all');
              onItemSelect?.();
            }}
          >
            <span>全十二星座</span>
          </button>
          {['火象', '土象', '风象', '水象'].map((elem) => (
            <button
              key={elem}
              type="button"
              className={`outline-btn ${xingzuoElementFilter === elem ? 'active' : ''}`}
              onClick={() => {
                onXingzuoElementFilterChange(elem);
                onItemSelect?.();
              }}
            >
              <span>
                {elem === '火象' && '火象 (白羊/狮子/射手)'}
                {elem === '土象' && '土象 (金牛/处女/摩羯)'}
                {elem === '风象' && '风象 (双子/天秤/水瓶)'}
                {elem === '水象' && '水象 (巨蟹/天蝎/双鱼)'}
              </span>
            </button>
          ))}
        </>
      );
      break;

    case 'koujue':
      content = (
        <>
          <button
            type="button"
            className={`outline-btn ${koujueCatFilter === 'all' ? 'active' : ''}`}
            onClick={() => {
              onKoujueCatFilterChange('all');
              onItemSelect?.();
            }}
          >
            <span>全部歌赋 ({DATA_KOUJUE.length})</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${koujueCatFilter === 'body' ? 'active' : ''}`}
            onClick={() => {
              onKoujueCatFilterChange('body');
              onItemSelect?.();
            }}
          >
            <span>经络脏腑身体</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${koujueCatFilter === 'tiangan' ? 'active' : ''}`}
            onClick={() => {
              onKoujueCatFilterChange('tiangan');
              onItemSelect?.();
            }}
          >
            <span>十天干体性歌</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${koujueCatFilter === 'hechong' ? 'active' : ''}`}
            onClick={() => {
              onKoujueCatFilterChange('hechong');
              onItemSelect?.();
            }}
          >
            <span>刑冲化合藏干</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${koujueCatFilter === 'season' ? 'active' : ''}`}
            onClick={() => {
              onKoujueCatFilterChange('season');
              onItemSelect?.();
            }}
          >
            <span>四时旺相用神</span>
          </button>
          <button
            type="button"
            className={`outline-btn ${koujueCatFilter === 'shensha' ? 'active' : ''}`}
            onClick={() => {
              onKoujueCatFilterChange('shensha');
              onItemSelect?.();
            }}
          >
            <span>常用神煞起例</span>
          </button>
        </>
      );
      break;

    default:
      return null;
  }

  // bare：标题与外层容器由调用方提供（如移动端抽屉头），这里只出筛选列表
  if (variant === 'bare') {
    return <div className="flex flex-col gap-1.5">{content}</div>;
  }

  return (
    <div className="nav-col-outline">
      <div className="nav-header">{title}</div>
      <div className="outline-list">{content}</div>
    </div>
  );
};

export default KnowledgeOutline;
