import {
  DATA_SHICHEN,
  DATA_GAN,
  ZHI_ESSENCE,
  DATA_ZHI,
  ZHANGSHENG_STAGES,
  DATA_ZHANG_SHENG_MATRIX,
  GAN_WX_MAP,
  ZHI_WX_MAP,
  DATA_NAYIN,
  NAYIN_XUN_LIST,
  BAGUA_XIAN_CELLS,
  BAGUA_HOU_CELLS,
  DATA_ERSHISI,
  DATA_JIUXING,
  DATA_XINGZUO,
  DATA_KOUJUE,
} from '../../../../lib/caseStudy/knowledgeData';


function renderYaoSymbol(lines: number[]) {
  return `
    <div class="yao-symbol">
      ${lines.map(val => val === 1 
        ? `<div class="yao-bar yang"></div>` 
        : `<div class="yao-bar yin"><span></span><span></span></div>`
      ).join('')}
    </div>
  `;
}

// 中宫太极图专用渲染

function renderTaijiCell() {
  return `
    <div class="bagua-card">
      <span class="bagua-corner tl"></span>
      <span class="bagua-corner tr"></span>
      <span class="bagua-corner bl"></span>
      <span class="bagua-corner br"></span>
      <div class="bagua-inner-card taiji-inner">
        <svg viewBox="0 0 100 100" class="taiji-svg">
          <circle cx="50" cy="50" r="47" fill="#fcfcfc" stroke="#222" stroke-width="1.5"/>
          <path d="M 50 3 A 47 47 0 0 1 50 97 A 23.5 23.5 0 0 1 50 50 A 23.5 23.5 0 0 0 50 3 Z" fill="#181818"/>
          <circle cx="50" cy="26.5" r="5.5" fill="#181818"/>
          <circle cx="50" cy="73.5" r="5.5" fill="#fcfcfc"/>
        </svg>
      </div>
    </div>
  `;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderBaguaXianCell(cell: any) {
  if (cell.isTaiji) return renderTaijiCell();
  return `
    <div class="bagua-card">
      <span class="bagua-corner tl"></span>
      <span class="bagua-corner tr"></span>
      <span class="bagua-corner bl"></span>
      <span class="bagua-corner br"></span>
      <div class="bagua-inner-card">
        <div class="bagua-row-top">
          <span class="bagua-meta-txt">${cell.num}</span>
          <span class="bagua-meta-txt">${cell.wx}</span>
        </div>
        <div class="bagua-hero-char">${cell.gua}</div>
        <div class="bagua-row-bot">
          <span class="bagua-meta-txt">${cell.nature}</span>
          ${renderYaoSymbol(cell.lines)}
        </div>
      </div>
    </div>
  `;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderBaguaHouCell(cell: any) {
  if (cell.isTaiji) return renderTaijiCell();
  return `
    <div class="bagua-card ${cell.wxCls}">
      <span class="bagua-corner tl"></span>
      <span class="bagua-corner tr"></span>
      <span class="bagua-corner bl"></span>
      <span class="bagua-corner br"></span>
      <div class="bagua-inner-card">
        <div class="bagua-row-top">
          <span class="bagua-meta-txt">${cell.numSign}</span>
          <span class="bagua-meta-txt">${cell.dir}</span>
          <span class="bagua-meta-txt">${cell.wx}</span>
        </div>
        <div class="bagua-hero-char">${cell.gua}</div>
        <div class="bagua-row-bot">
          <span class="bagua-meta-txt">${cell.nature}</span>
          ${renderYaoSymbol(cell.lines)}
          <span class="bagua-meta-txt">${cell.role}</span>
        </div>
      </div>
    </div>
  `;
}

export function getShichenHtml(): string {
  return `
        <!-- 6×2 PDF 原稿同款大字速查方阵 -->
        <div class="shichen-cards-grid">
          ${DATA_SHICHEN.map(s => `
            <div class="shichen-card-item">
              <div class="shichen-card-zhi">${s.zhi}</div>
              <div class="shichen-card-name">${s.name}</div>
              <div class="shichen-card-time">${s.time}</div>
            </div>
          `).join('')}
        </div>
      `
}

export function getGanxiangHtml(ganxiangActiveGan: string): string {
  const activeGan = DATA_GAN.find(g => g.gan === ganxiangActiveGan) || DATA_GAN[0];
      return `
        
        <div class="gz-container">
          <!-- 主看板 -->
          <div class="gz-panel">
            <!-- 头部主旨横幅 (文言流式，无重复干支) -->
            <div class="gz-hero-banner">
              <div class="gz-hero-title-row">
                <span class="gz-hero-name">${activeGan.gan}</span>
                <span class="gz-hero-sub-role">${activeGan.yy}${activeGan.wx} · ${activeGan.role}</span>
              </div>

              <!-- 规整古典属性阵列 -->
              <div class="gz-hero-meta-grid">
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">方位</span>
                  <span class="gz-meta-value">${activeGan.direct}</span>
                </div>
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">色彩</span>
                  <span class="gz-meta-value">${activeGan.color}</span>
                </div>
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">时令天时</span>
                  <span class="gz-meta-value">${activeGan.weather}</span>
                </div>
              </div>

              <!-- 经籍综述通引 -->
              <div class="gz-classic-quote">
                ${activeGan.summary}
              </div>
            </div>

            <!-- 核心维度（双栏） -->
            <div class="gz-split-row">
              <!-- 左板：天象地理人事 -->
              <div class="gz-major-section">
                <div class="gz-sec-title-bar">
                  <span class="gz-sec-title">天象 · 地理 · 人事</span>
                </div>
                <div class="gz-data-list">
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【天象天文】</span></div>
                    <div class="gz-data-content">${activeGan.sky}</div>
                  </div>
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【地理物理】</span></div>
                    <div class="gz-data-content">${activeGan.earth}</div>
                  </div>
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【社会人事】</span></div>
                    <div class="gz-data-content">${activeGan.person_role}</div>
                  </div>
                </div>
              </div>

              <!-- 右板：形体脏腑心性 -->
              <div class="gz-major-section">
                <div class="gz-sec-title-bar">
                  <span class="gz-sec-title">形体 · 脏腑 · 心性</span>
                </div>
                <div class="gz-data-list">
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【外在形体】</span></div>
                    <div class="gz-data-content">${activeGan.body_out}</div>
                  </div>
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【内在脏腑】</span></div>
                    <div class="gz-data-content">${activeGan.body_in}</div>
                  </div>
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【思维心性】</span></div>
                    <div class="gz-data-content">${activeGan.mind}</div>
                  </div>
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【感官感知】</span></div>
                    <div class="gz-data-content">${activeGan.sense}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 下板：万物类象 -->
            <div class="gz-universe-section">
              <div class="gz-sec-title-bar">
                <span class="gz-sec-title">万物类象</span>
              </div>
              <div class="gz-universe-grid">
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">核心概念</span></div>
                  <div class="gz-u-body">${activeGan.concept}</div>
                </div>
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">代表人物</span></div>
                  <div class="gz-u-body">${activeGan.person}</div>
                </div>
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">形态容止</span></div>
                  <div class="gz-u-body">${activeGan.morph}</div>
                </div>
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">性情特质</span></div>
                  <div class="gz-u-body">${activeGan.nature}</div>
                </div>
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">动物生灵</span></div>
                  <div class="gz-u-body">${activeGan.animal}</div>
                </div>
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">草木植物</span></div>
                  <div class="gz-u-body">${activeGan.plant || '—'}</div>
                </div>
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">器用静物</span></div>
                  <div class="gz-u-body">${activeGan.obj}</div>
                </div>
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">地理环境场所</span></div>
                  <div class="gz-u-body">${activeGan.geo}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
}

export function getZhixiangHtml(zhixiangActiveZhi: string): string {
  const activeZhi = DATA_ZHI.find(z => z.zhi === zhixiangActiveZhi) || DATA_ZHI[0];
      return `
        
        <div class="gz-container">
          <!-- 主看板 -->
          <div class="gz-panel">
            <!-- 头部主旨横幅 (文言流式，无重复干支) -->
            <div class="gz-hero-banner">
              <div class="gz-hero-title-row">
                <span class="gz-hero-name">${activeZhi.zhi}</span>
                <span class="gz-hero-sub-role">${activeZhi.animal_zodiac} · ${activeZhi.yy}${activeZhi.wx}</span>
              </div>

              <!-- 规整古典属性阵列 -->
              <div class="gz-hero-meta-grid">
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">方位</span>
                  <span class="gz-meta-value">${activeZhi.direct}</span>
                </div>
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">天时</span>
                  <span class="gz-meta-value">${activeZhi.weather}</span>
                </div>
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">色彩</span>
                  <span class="gz-meta-value">${activeZhi.color}</span>
                </div>
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">时令</span>
                  <span class="gz-meta-value">${activeZhi.month} · ${activeZhi.solar}</span>
                </div>
              </div>

              <!-- 气脉意象通论 (精炼雅致) -->
              <div class="gz-classic-quote">
                ${ZHI_ESSENCE[activeZhi.zhi] || activeZhi.nature}
              </div>
            </div>

            <!-- 核心维度大板块：形神心性 与 生理脏腑 (双栏对比大看板) -->
            <div class="gz-split-row">
              <!-- 左板：形貌心性特质 -->
              <div class="gz-major-section">
                <div class="gz-sec-title-bar">
                  <span class="gz-sec-title">形态 · 心性 · 概念</span>
                </div>
                <div class="gz-data-list">
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【外在形态】</span></div>
                    <div class="gz-data-content">${activeZhi.morph}</div>
                  </div>
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【心性秉性】</span></div>
                    <div class="gz-data-content">${activeZhi.nature}</div>
                  </div>
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【核心概念】</span></div>
                    <div class="gz-data-content">${activeZhi.concept}</div>
                  </div>
                </div>
              </div>

              <!-- 右板：生理脏腑与人群映射 -->
              <div class="gz-major-section">
                <div class="gz-sec-title-bar">
                  <span class="gz-sec-title">脏腑 · 人物 · 场所</span>
                </div>
                <div class="gz-data-list">
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【对应脏腑】</span></div>
                    <div class="gz-data-content">${activeZhi.body}</div>
                  </div>
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【代表人物】</span></div>
                    <div class="gz-data-content">${activeZhi.person}</div>
                  </div>
                  <div class="gz-data-row">
                    <div class="gz-data-header"><span class="gz-data-tag">【时空场域】</span></div>
                    <div class="gz-data-content">${activeZhi.geo}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 下板：万物类象 -->
            <div class="gz-universe-section">
              <div class="gz-sec-title-bar">
                <span class="gz-sec-title">万物类象</span>
              </div>
              <div class="gz-universe-grid">
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">动物生灵</span></div>
                  <div class="gz-u-body">${activeZhi.animal}</div>
                </div>
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">草木植物</span></div>
                  <div class="gz-u-body">${activeZhi.plant || '—'}</div>
                </div>
                <div class="gz-u-item">
                  <div class="gz-u-head"><span class="gz-u-title">器用静物</span></div>
                  <div class="gz-u-body">${activeZhi.obj}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
}

export function getCangganHtml(): string {
  return `
        <!-- 3×4 四季三元掌诀记忆矩阵 (纯粹金石卡片，告别扁平与多层嵌套) -->
        <div class="canggan-matrix-board">
          <!-- 顶部三元气机列首导引 (大号醒目·气脉分明) -->
          <div class="canggan-pure-top-row">
            <div class="canggan-pure-col-head">
              <div class="col-title">四长生 · 四孟</div>
              <div class="col-desc">初气生发 · 藏干皆阳</div>
            </div>
            <div class="canggan-pure-col-head">
              <div class="col-title">四正神 · 四仲</div>
              <div class="col-desc">当权专令 · 专旺纯粹</div>
            </div>
            <div class="canggan-pure-col-head">
              <div class="col-title">四墓库 · 四季</div>
              <div class="col-desc">杂气蓄德 · 万象归藏</div>
            </div>
          </div>

          <!-- 纯粹 3 列 × 4 行网格 (1:1 正方形印石单元格) -->
          <div class="canggan-pure-grid">
            <!-- 1. 寅 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">寅</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-木">甲</span>
                <span class="canggan-pure-gan-char wx-火">丙</span>
                <span class="canggan-pure-gan-char wx-土">戊</span>
              </div>
            </div>
            <!-- 2. 卯 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">卯</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-木">乙</span>
              </div>
            </div>
            <!-- 3. 辰 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">辰</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-土">戊</span>
                <span class="canggan-pure-gan-char wx-木">乙</span>
                <span class="canggan-pure-gan-char wx-水">癸</span>
              </div>
            </div>

            <!-- 4. 巳 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">巳</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-火">丙</span>
                <span class="canggan-pure-gan-char wx-金">庚</span>
                <span class="canggan-pure-gan-char wx-土">戊</span>
              </div>
            </div>
            <!-- 5. 午 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">午</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-火">丁</span>
                <span class="canggan-pure-gan-char wx-土">己</span>
              </div>
            </div>
            <!-- 6. 未 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">未</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-土">己</span>
                <span class="canggan-pure-gan-char wx-火">丁</span>
                <span class="canggan-pure-gan-char wx-木">乙</span>
              </div>
            </div>

            <!-- 7. 申 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">申</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-金">庚</span>
                <span class="canggan-pure-gan-char wx-水">壬</span>
                <span class="canggan-pure-gan-char wx-土">戊</span>
              </div>
            </div>
            <!-- 8. 酉 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">酉</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-金">辛</span>
              </div>
            </div>
            <!-- 9. 戌 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">戌</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-土">戊</span>
                <span class="canggan-pure-gan-char wx-金">辛</span>
                <span class="canggan-pure-gan-char wx-火">丁</span>
              </div>
            </div>

            <!-- 10. 亥 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">亥</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-水">壬</span>
                <span class="canggan-pure-gan-char wx-木">甲</span>
              </div>
            </div>
            <!-- 11. 子 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">子</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-水">癸</span>
              </div>
            </div>
            <!-- 12. 丑 -->
            <div class="canggan-pure-card">
              <div class="canggan-zhi-hero">丑</div>
              <div class="canggan-pure-gans-row">
                <span class="canggan-pure-gan-char wx-土">己</span>
                <span class="canggan-pure-gan-char wx-水">癸</span>
                <span class="canggan-pure-gan-char wx-金">辛</span>
              </div>
            </div>
          </div>
        </div>
      `
}

export function getHechongHtml(): string {
  return `
        <div class="hechong-container">
          <!-- 上排 4 板块 -->
          <div class="hechong-grid">
            
            <!-- ① 地支十二宫 -->
            <details class="hechong-card">
              <summary class="hechong-card-header">
                <span class="hechong-card-title">地支十二宫</span>
                <span class="hechong-card-tag">掌诀基盘</span>
              </summary>
              <div class="hechong-card-body is-center">
                <div class="palace-ring-grid">
                  <!-- 第 1 行 (顶): 巳 午 未 申 -->
                  <div class="mizi-box" title="巳">巳</div>
                  <div class="mizi-box" title="午">午</div>
                  <div class="mizi-box" title="未">未</div>
                  <div class="mizi-box" title="申">申</div>

                  <!-- 第 2 行: 辰 [中央印章] 酉 -->
                  <div class="mizi-box" title="辰">辰</div>
                  <div class="palace-ring-center">
                    <span class="center-seal">地支掌诀</span>
                    <span class="center-sub">顺时流布</span>
                  </div>
                  <div class="mizi-box" title="酉">酉</div>

                  <!-- 第 3 行: 卯 [中央印章] 戌 -->
                  <div class="mizi-box" title="卯">卯</div>
                  <div class="mizi-box" title="戌">戌</div>

                  <!-- 第 4 行 (底): 寅 丑 子 亥 -->
                  <div class="mizi-box" title="寅">寅</div>
                  <div class="mizi-box" title="丑">丑</div>
                  <div class="mizi-box" title="子">子</div>
                  <div class="mizi-box" title="亥">亥</div>
                </div>
              </div>
              <div class="hechong-card-footer">
                顺布十二辰，掐算掌中生；周天分野，掌内乾坤。
              </div>
            </details>

            <!-- ② 地支六合 -->
            <details class="hechong-card">
              <summary class="hechong-card-header">
                <span class="hechong-card-title">地支六合</span>
                <span class="hechong-card-tag">合化相亲</span>
              </summary>
              <div class="hechong-card-body">
                <!-- 子丑合土 -->
                <div class="liuhe-row">
                  <div class="liuhe-pair">
                    <span class="mizi-box sm">子</span>
                    <span class="pair-rel-sym">合</span>
                    <span class="mizi-box sm">丑</span>
                  </div>
                  <span class="liuhe-arrow">➔</span>
                  <div class="liuhe-result">
                    <span class="hua-badge">化土</span>
                    <span class="hua-desc-pill">克合</span>
                  </div>
                </div>
                <!-- 寅亥合木 -->
                <div class="liuhe-row">
                  <div class="liuhe-pair">
                    <span class="mizi-box sm">寅</span>
                    <span class="pair-rel-sym">合</span>
                    <span class="mizi-box sm">亥</span>
                  </div>
                  <span class="liuhe-arrow">➔</span>
                  <div class="liuhe-result">
                    <span class="hua-badge">化木</span>
                    <span class="hua-desc-pill">生合</span>
                  </div>
                </div>
                <!-- 卯戌合火 -->
                <div class="liuhe-row">
                  <div class="liuhe-pair">
                    <span class="mizi-box sm">卯</span>
                    <span class="pair-rel-sym">合</span>
                    <span class="mizi-box sm">戌</span>
                  </div>
                  <span class="liuhe-arrow">➔</span>
                  <div class="liuhe-result">
                    <span class="hua-badge">化火</span>
                    <span class="hua-desc-pill">克合</span>
                  </div>
                </div>
                <!-- 辰酉合金 -->
                <div class="liuhe-row">
                  <div class="liuhe-pair">
                    <span class="mizi-box sm">辰</span>
                    <span class="pair-rel-sym">合</span>
                    <span class="mizi-box sm">酉</span>
                  </div>
                  <span class="liuhe-arrow">➔</span>
                  <div class="liuhe-result">
                    <span class="hua-badge">化金</span>
                    <span class="hua-desc-pill">生合</span>
                  </div>
                </div>
                <!-- 巳申合水 -->
                <div class="liuhe-row">
                  <div class="liuhe-pair">
                    <span class="mizi-box sm">巳</span>
                    <span class="pair-rel-sym">合</span>
                    <span class="mizi-box sm">申</span>
                  </div>
                  <span class="liuhe-arrow">➔</span>
                  <div class="liuhe-result">
                    <span class="hua-badge">化水</span>
                    <span class="hua-desc-pill">合刑</span>
                  </div>
                </div>
                <!-- 午未合土 -->
                <div class="liuhe-row">
                  <div class="liuhe-pair">
                    <span class="mizi-box sm">午</span>
                    <span class="pair-rel-sym">合</span>
                    <span class="mizi-box sm">未</span>
                  </div>
                  <span class="liuhe-arrow">➔</span>
                  <div class="liuhe-result">
                    <span class="hua-badge">日月</span>
                    <span class="hua-desc-pill">生合</span>
                  </div>
                </div>
              </div>
              <div class="hechong-card-footer">
                阴阳相引，互有照应；亲和相融，亦主牵绊。
              </div>
            </details>

            <!-- ③ 地支六冲 -->
            <details class="hechong-card">
              <summary class="hechong-card-header">
                <span class="hechong-card-title">地支六冲</span>
                <span class="hechong-card-tag">对冲动荡</span>
              </summary>
              <div class="hechong-card-body">
                <div class="pair-grid">
                  <!-- 1. 子午冲 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">子</span>
                      <span class="pair-rel-sym">冲</span>
                      <span class="mizi-box sm">午</span>
                    </div>
                    <span class="pair-info-text">水火相冲</span>
                  </div>
                  <!-- 2. 丑未冲 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">丑</span>
                      <span class="pair-rel-sym">冲</span>
                      <span class="mizi-box sm">未</span>
                    </div>
                    <span class="pair-info-text">墓库相冲</span>
                  </div>
                  <!-- 3. 寅申冲 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">寅</span>
                      <span class="pair-rel-sym">冲</span>
                      <span class="mizi-box sm">申</span>
                    </div>
                    <span class="pair-info-text">生方相冲</span>
                  </div>
                  <!-- 4. 卯酉冲 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">卯</span>
                      <span class="pair-rel-sym">冲</span>
                      <span class="mizi-box sm">酉</span>
                    </div>
                    <span class="pair-info-text">专气相冲</span>
                  </div>
                  <!-- 5. 辰戌冲 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">辰</span>
                      <span class="pair-rel-sym">冲</span>
                      <span class="mizi-box sm">戌</span>
                    </div>
                    <span class="pair-info-text">水火库冲</span>
                  </div>
                  <!-- 6. 巳亥冲 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">巳</span>
                      <span class="pair-rel-sym">冲</span>
                      <span class="mizi-box sm">亥</span>
                    </div>
                    <span class="pair-info-text">天关地轴</span>
                  </div>
                </div>
              </div>
              <div class="hechong-card-footer">
                方位相对，同气相克；环境变迁，冲荡不宁。
              </div>
            </details>

            <!-- ④ 地支相刑 -->
            <details class="hechong-card">
              <summary class="hechong-card-header">
                <span class="hechong-card-title">地支相刑</span>
                <span class="hechong-card-tag">刑伤官讼</span>
              </summary>
              <div class="hechong-card-body">
                <div class="xing-section">
                  <!-- 自刑 -->
                  <div class="xing-group">
                    <div class="xing-group-title">
                      <span>自刑之支</span>
                      <span class="xing-note">自寻烦恼 · 心胸偏狭</span>
                    </div>
                    <div class="xing-group-row">
                      <span class="mizi-box sm">辰</span>
                      <span class="mizi-box sm">辰</span>
                      <span style="color:var(--border)">|</span>
                      <span class="mizi-box sm">午</span>
                      <span class="mizi-box sm">午</span>
                      <span style="color:var(--border)">|</span>
                      <span class="mizi-box sm">酉</span>
                      <span class="mizi-box sm">酉</span>
                      <span style="color:var(--border)">|</span>
                      <span class="mizi-box sm">亥</span>
                      <span class="mizi-box sm">亥</span>
                    </div>
                  </div>
                  <!-- 子卯刑 -->
                  <div class="xing-group">
                    <div class="xing-group-title">
                      <span>无礼之刑</span>
                      <span class="xing-note">子刑卯 · 卯刑子 · 酒色风波</span>
                    </div>
                    <div class="xing-group-row">
                      <span class="mizi-box sm">子</span>
                      <span class="pair-rel-sym">刑</span>
                      <span class="mizi-box sm">卯</span>
                      <span style="font-size:12px;color:var(--muted);margin-left:auto;">生而相残，损阴德</span>
                    </div>
                  </div>
                  <!-- 丑戌未 -->
                  <div class="xing-group">
                    <div class="xing-group-title">
                      <span>持势之刑</span>
                      <span class="xing-note">丑 戌 未 · 藏干相击损耗</span>
                    </div>
                    <div class="xing-group-row">
                      <span class="mizi-box sm">丑</span>
                      <span style="color:var(--muted);font-size:12px;">➔</span>
                      <span class="mizi-box sm">戌</span>
                      <span style="color:var(--muted);font-size:12px;">➔</span>
                      <span class="mizi-box sm">未</span>
                      <span style="font-size:12px;color:var(--muted);margin-left:auto;">土多金埋病符</span>
                    </div>
                  </div>
                  <!-- 寅巳申 -->
                  <div class="xing-group">
                    <div class="xing-group-title">
                      <span>无恩之刑</span>
                      <span class="xing-note">寅 巳 申 · 生方相害反目</span>
                    </div>
                    <div class="xing-group-row">
                      <span class="mizi-box sm">寅</span>
                      <span style="color:var(--muted);font-size:12px;">➔</span>
                      <span class="mizi-box sm">巳</span>
                      <span style="color:var(--muted);font-size:12px;">➔</span>
                      <span class="mizi-box sm">申</span>
                      <span style="font-size:12px;color:var(--muted);margin-left:auto;">自恃有才反受害</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="hechong-card-footer">
                恩中招怨，过刚易折；官符刑伤，骨肉乖违。
              </div>
            </details>

          </div>

          <!-- 下排 4 板块 -->
          <div class="hechong-grid">

            <!-- ⑤ 地支六害 (穿) -->
            <details class="hechong-card">
              <summary class="hechong-card-header">
                <span class="hechong-card-title">地支六害 (相穿)</span>
                <span class="hechong-card-tag">暗箭难防</span>
              </summary>
              <div class="hechong-card-body">
                <div class="pair-grid">
                  <!-- 1. 子未害 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">子</span>
                      <span class="pair-rel-sym">害</span>
                      <span class="mizi-box sm">未</span>
                    </div>
                    <span class="pair-info-text">势家相嫉</span>
                  </div>
                  <!-- 2. 丑午害 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">丑</span>
                      <span class="pair-rel-sym">害</span>
                      <span class="mizi-box sm">午</span>
                    </div>
                    <span class="pair-info-text">恃旺凌衰</span>
                  </div>
                  <!-- 3. 寅巳害 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">寅</span>
                      <span class="pair-rel-sym">害</span>
                      <span class="mizi-box sm">巳</span>
                    </div>
                    <span class="pair-info-text">各恃临官</span>
                  </div>
                  <!-- 4. 卯辰害 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">卯</span>
                      <span class="pair-rel-sym">害</span>
                      <span class="mizi-box sm">辰</span>
                    </div>
                    <span class="pair-info-text">少陵长害</span>
                  </div>
                  <!-- 5. 申亥害 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">申</span>
                      <span class="pair-rel-sym">害</span>
                      <span class="mizi-box sm">亥</span>
                    </div>
                    <span class="pair-info-text">嫉妒争功</span>
                  </div>
                  <!-- 6. 酉戌害 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">酉</span>
                      <span class="pair-rel-sym">害</span>
                      <span class="mizi-box sm">戌</span>
                    </div>
                    <span class="pair-info-text">鬼贼相害</span>
                  </div>
                </div>
              </div>
              <div class="hechong-card-footer">
                合遭冲害，笑里藏刀；恩将仇报，最防暗疾。
              </div>
            </details>

            <!-- ⑥ 地支六破 -->
            <details class="hechong-card">
              <summary class="hechong-card-header">
                <span class="hechong-card-title">地支六破</span>
                <span class="hechong-card-tag">裂痕难圆</span>
              </summary>
              <div class="hechong-card-body">
                <div class="pair-grid">
                  <!-- 1. 子酉破 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">子</span>
                      <span class="pair-rel-sym">破</span>
                      <span class="mizi-box sm">酉</span>
                    </div>
                    <span class="pair-info-text">相生带破</span>
                  </div>
                  <!-- 2. 卯午破 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">卯</span>
                      <span class="pair-rel-sym">破</span>
                      <span class="mizi-box sm">午</span>
                    </div>
                    <span class="pair-info-text">火多木焚</span>
                  </div>
                  <!-- 3. 辰丑破 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">辰</span>
                      <span class="pair-rel-sym">破</span>
                      <span class="mizi-box sm">丑</span>
                    </div>
                    <span class="pair-info-text">湿土相争</span>
                  </div>
                  <!-- 4. 戌未破 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">戌</span>
                      <span class="pair-rel-sym">破</span>
                      <span class="mizi-box sm">未</span>
                    </div>
                    <span class="pair-info-text">燥土相击</span>
                  </div>
                  <!-- 5. 寅亥破 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">寅</span>
                      <span class="pair-rel-sym">破</span>
                      <span class="mizi-box sm">亥</span>
                    </div>
                    <span class="pair-info-text">生合带破</span>
                  </div>
                  <!-- 6. 巳申破 -->
                  <div class="pair-cell">
                    <div class="pair-items">
                      <span class="mizi-box sm">巳</span>
                      <span class="pair-rel-sym">破</span>
                      <span class="mizi-box sm">申</span>
                    </div>
                    <span class="pair-info-text">合刑带破</span>
                  </div>
                </div>
              </div>
              <div class="hechong-card-footer">
                气聚而分，合中带耗；美中不足，事留裂痕。
              </div>
            </details>

            <!-- ⑦ 地支三合局 -->
            <details class="hechong-card">
              <summary class="hechong-card-header">
                <span class="hechong-card-title">地支三合</span>
                <span class="hechong-card-tag">专气结党</span>
              </summary>
              <div class="hechong-card-body">
                <!-- 申子辰水局 -->
                <div class="triad-row">
                  <div class="triad-members">
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">申</span>
                      <span class="triad-stage-tag">长生</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">子</span>
                      <span class="triad-stage-tag">帝旺</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">辰</span>
                      <span class="triad-stage-tag">墓库</span>
                    </div>
                  </div>
                  <span style="color:var(--muted);font-size:12px;">➔</span>
                  <div class="triad-badge">水局 · 润下</div>
                </div>
                <!-- 寅午戌火局 -->
                <div class="triad-row">
                  <div class="triad-members">
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">寅</span>
                      <span class="triad-stage-tag">长生</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">午</span>
                      <span class="triad-stage-tag">帝旺</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">戌</span>
                      <span class="triad-stage-tag">墓库</span>
                    </div>
                  </div>
                  <span style="color:var(--muted);font-size:12px;">➔</span>
                  <div class="triad-badge">火局 · 炎上</div>
                </div>
                <!-- 巳酉丑金局 -->
                <div class="triad-row">
                  <div class="triad-members">
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">巳</span>
                      <span class="triad-stage-tag">长生</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">酉</span>
                      <span class="triad-stage-tag">帝旺</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">丑</span>
                      <span class="triad-stage-tag">墓库</span>
                    </div>
                  </div>
                  <span style="color:var(--muted);font-size:12px;">➔</span>
                  <div class="triad-badge">金局 · 从革</div>
                </div>
                <!-- 亥卯未木局 -->
                <div class="triad-row">
                  <div class="triad-members">
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">亥</span>
                      <span class="triad-stage-tag">长生</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">卯</span>
                      <span class="triad-stage-tag">帝旺</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">未</span>
                      <span class="triad-stage-tag">墓库</span>
                    </div>
                  </div>
                  <span style="color:var(--muted);font-size:12px;">➔</span>
                  <div class="triad-badge">木局 · 曲直</div>
                </div>
              </div>
              <div class="hechong-card-footer">
                生旺墓聚，专气结党；其势浩荡，成局力绝。
              </div>
            </details>

            <!-- ⑧ 地支三会方 -->
            <details class="hechong-card">
              <summary class="hechong-card-header">
                <span class="hechong-card-title">地支三会</span>
                <span class="hechong-card-tag">四方真气</span>
              </summary>
              <div class="hechong-card-body">
                <!-- 寅卯辰东方木 -->
                <div class="triad-row">
                  <div class="triad-members">
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">寅</span>
                      <span class="triad-stage-tag">孟春</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">卯</span>
                      <span class="triad-stage-tag">仲春</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">辰</span>
                      <span class="triad-stage-tag">季春</span>
                    </div>
                  </div>
                  <span style="color:var(--muted);font-size:12px;">➔</span>
                  <div class="triad-badge">东木 · 春全</div>
                </div>
                <!-- 巳午未南方火 -->
                <div class="triad-row">
                  <div class="triad-members">
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">巳</span>
                      <span class="triad-stage-tag">孟夏</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">午</span>
                      <span class="triad-stage-tag">仲夏</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">未</span>
                      <span class="triad-stage-tag">季夏</span>
                    </div>
                  </div>
                  <span style="color:var(--muted);font-size:12px;">➔</span>
                  <div class="triad-badge">南火 · 夏全</div>
                </div>
                <!-- 申酉戌西方金 -->
                <div class="triad-row">
                  <div class="triad-members">
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">申</span>
                      <span class="triad-stage-tag">孟秋</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">酉</span>
                      <span class="triad-stage-tag">仲秋</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">戌</span>
                      <span class="triad-stage-tag">季秋</span>
                    </div>
                  </div>
                  <span style="color:var(--muted);font-size:12px;">➔</span>
                  <div class="triad-badge">西金 · 秋全</div>
                </div>
                <!-- 亥子丑北方水 -->
                <div class="triad-row">
                  <div class="triad-members">
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">亥</span>
                      <span class="triad-stage-tag">孟冬</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">子</span>
                      <span class="triad-stage-tag">仲冬</span>
                    </div>
                    <span style="color:var(--muted);font-size:12px;">·</span>
                    <div class="triad-item-wrap">
                      <span class="mizi-box sm">丑</span>
                      <span class="triad-stage-tag">季冬</span>
                    </div>
                  </div>
                  <span style="color:var(--muted);font-size:12px;">➔</span>
                  <div class="triad-badge">北水 · 冬全</div>
                </div>
              </div>
              <div class="hechong-card-footer">
                一方全气，四时司权；冠绝诸局，统领当令。
              </div>
            </details>

          </div>
        </div>
      `
}

export function getNayinHtml(nayinFilterWx: string): string {
  // 6 旬，每旬 10 个干支 + 1 个旬空
      const rows = [];
      for (let i = 0; i < 6; i++) {
        const xunInfo = NAYIN_XUN_LIST[i];
        const ganzhiSlice = DATA_NAYIN.slice(i * 10, (i + 1) * 10);
        rows.push({
          xun: xunInfo,
          items: ganzhiSlice,
          isAlt: (i % 2 === 1)
        });
      }

      return `
        <div class="nayin-board-container">
          <!-- 桌面端视图：六十甲子 6 行 × 11 列 纳音大盘 -->
          <div class="nayin-table-wrap nayin-desktop-only">
            <table class="nayin-table">
              <tbody>
                ${rows.map((r) => `
                  <tr class="nayin-row ${r.isAlt ? 'alt-row' : ''}">
                    ${r.items.map(([gz, ny]) => {
                      const gan = gz[0];
                      const zhi = gz[1];
                      const gWx = GAN_WX_MAP[gan];
                      const zWx = ZHI_WX_MAP[zhi];
                      const nyWx = ny.slice(-1);

                      const isDimmed = (nayinFilterWx !== 'all' && nayinFilterWx !== nyWx);
                      const isHighlighted = (nayinFilterWx !== 'all' && nayinFilterWx === nyWx);

                      return `
                        <td class="nayin-cell ${isDimmed ? 'is-dimmed' : ''} ${isHighlighted ? 'is-highlighted' : ''}" title="${gz} · ${ny} (${nyWx})">
                          <div class="nayin-cell-inner">
                            <div class="nayin-ganzhi">
                              <span class="nayin-gan color-wx-${gWx}">${gan}</span>
                              <span class="nayin-zhi color-wx-${zWx}">${zhi}</span>
                            </div>
                            <span class="nayin-name color-wx-${nyWx}">${ny}</span>
                          </div>
                        </td>
                      `;
                    }).join('')}

                    <!-- 第 11 列：旬空 -->
                    <td class="nayin-cell col-xunkong ${nayinFilterWx !== 'all' ? 'is-dimmed' : ''}" title="${r.xun.name} 旬空：${r.xun.xunkong.join('')}">
                      <div class="nayin-cell-inner">
                        <div class="nayin-ganzhi">
                          <span class="nayin-gan color-wx-${ZHI_WX_MAP[r.xun.xunkong[0]]}">${r.xun.xunkong[0]}</span>
                          <span class="nayin-zhi color-wx-${ZHI_WX_MAP[r.xun.xunkong[1]]}">${r.xun.xunkong[1]}</span>
                        </div>
                        <span class="nayin-xunkong-label">旬空</span>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- 移动端专属自适应视图：六旬典雅牌阵流 (两两一组，竖屏顺畅自适应，杜绝截断与空黑) -->
          <div class="nayin-mobile-cards-wrap">
            ${rows.map((r) => `
              <div class="nayin-mobile-xun-block">
                <div class="nayin-mobile-xun-header">
                  <div class="nayin-mobile-xun-title">
                    <span class="nayin-xun-badge">${r.xun.name}</span>
                    <span class="nayin-xun-range">${r.items[0][0]} 至 ${r.items[9][0]}</span>
                  </div>
                  <div class="nayin-mobile-kong-badge">旬空：${r.xun.xunkong.join(' · ')}</div>
                </div>

                <div class="nayin-mobile-pairs-grid">
                  ${[0, 2, 4, 6, 8].map((pairIdx) => {
                    const [gz1, ny1] = r.items[pairIdx];
                    const [gz2] = r.items[pairIdx + 1];
                    const nyWx = ny1.slice(-1);
                    const isDimmed = (nayinFilterWx !== 'all' && nayinFilterWx !== nyWx);
                    const isHighlighted = (nayinFilterWx !== 'all' && nayinFilterWx === nyWx);

                    return `
                      <div class="nayin-pair-card ${isDimmed ? 'is-dimmed' : ''} ${isHighlighted ? 'is-highlighted' : ''}">
                        <div class="nayin-pair-ganzhis">
                          <span class="nayin-pair-gz">
                            <span class="color-wx-${GAN_WX_MAP[gz1[0]]}">${gz1[0]}</span><span class="color-wx-${ZHI_WX_MAP[gz1[1]]}">${gz1[1]}</span>
                          </span>
                          <span class="nayin-pair-dot">·</span>
                          <span class="nayin-pair-gz">
                            <span class="color-wx-${GAN_WX_MAP[gz2[0]]}">${gz2[0]}</span><span class="color-wx-${ZHI_WX_MAP[gz2[1]]}">${gz2[1]}</span>
                          </span>
                        </div>
                        <div class="nayin-pair-badge color-wx-${nyWx}">
                          ${ny1}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
}

export function getZhangshengHtml(zhangshengFilterMode: string): string {
  return `
        <div class="zs-board-container">
          <!-- 十二长生 10 行 × 13 列大盘 (一屏自适应呈现) -->
          <div class="zs-table-wrap">
            <table class="zs-table">
              <thead>
                <tr>
                  <th class="col-gan"></th>
                  ${ZHANGSHENG_STAGES.map((s) => `
                    <th>${s}</th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${DATA_ZHANG_SHENG_MATRIX.map((row) => `
                  <tr class="zs-row">
                    <!-- 第一列：天干 -->
                    <td class="zs-cell-gan color-wx-${row.wx}" data-label="天干"><span class="zs-gan-char">${row.gan}</span></td>

                    <!-- 12 长生地支 -->
                    ${row.zhis.map((zhi, colIdx) => {
                      const stageName = ZHANGSHENG_STAGES[colIdx];
                      const zWx = ZHI_WX_MAP[zhi];
                      const isLinguan = (stageName === '临官');
                      const isJue = (stageName === '绝');

                      // 筛选高亮判定
                      let isHighlighted = false;
                      let isDimmed = false;
                      if (zhangshengFilterMode === '生') {
                        if (['寅', '申', '巳', '亥'].includes(zhi)) isHighlighted = true;
                        else isDimmed = true;
                      } else if (zhangshengFilterMode === '旺') {
                        if (['子', '午', '卯', '酉'].includes(zhi)) isHighlighted = true;
                        else isDimmed = true;
                      } else if (zhangshengFilterMode === '墓') {
                        if (['辰', '戌', '丑', '未'].includes(zhi)) isHighlighted = true;
                        else isDimmed = true;
                      } else if (zhangshengFilterMode === '临官') {
                        if (isLinguan) isHighlighted = true;
                        else isDimmed = true;
                      } else if (zhangshengFilterMode === '绝') {
                        if (isJue) isHighlighted = true;
                        else isDimmed = true;
                      }

                      return `
                        <td data-label="${stageName}" title="${row.gan}在${zhi}为${stageName} (${zWx})">
                          <span class="zs-cell-zhi color-wx-${zWx} ${isDimmed ? 'is-dimmed' : ''} ${isHighlighted ? 'is-highlighted' : ''}">
                            ${zhi}
                          </span>
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `
}

export function getBaguaXianHtml(): string {
  return `
        <!-- 纯原生 HTML/CSS 东方折角双层九宫格 (一屏尽览·SVG规格精准重现) -->
        <div class="bagua-grid-board">
          <div class="bagua-nine-grid">
            ${BAGUA_XIAN_CELLS.map(renderBaguaXianCell).join('')}
          </div>
        </div>
      `
}

export function getBaguaHouHtml(): string {
  return `
        <!-- 纯原生 HTML/CSS 东方折角五行设色九宫格 (一屏尽览·SVG规格精准重现) -->
        <div class="bagua-grid-board">
          <div class="bagua-nine-grid">
            ${BAGUA_HOU_CELLS.map(renderBaguaHouCell).join('')}
          </div>
        </div>
      `
}

export function getErshisiHtml(ershisiPalaceFilter: string): string {
  const filtered = (ershisiPalaceFilter === 'all') 
        ? DATA_ERSHISI 
        : DATA_ERSHISI.filter(p => p.gua === ershisiPalaceFilter);
      return `
        <!-- 八宫二十四山条幅名盘架构 (通栏舒展、整齐对齐) -->
        <div class="shan-palace-list">
          ${filtered.map(p => `
            <div class="shan-palace-strip">
              <div class="shan-palace-top-bar">
                <div class="shan-palace-title-wrap">
                  <span class="shan-palace-badge">${p.name}</span>
                  <span class="shan-palace-dir-deg">${p.dir}</span>
                </div>
                <div class="shan-palace-summary">${p.desc}</div>
              </div>

              <!-- 该宫地元、天元、人元三山横向舒展并排 -->
              <div class="shan-tri-row">
                ${p.shans.map(s => `
                  <div class="shan-box-card">
                    <div class="shan-box-head">
                      <div class="shan-box-left">
                        <span class="shan-char-main wx-${s.wx}">${s.shan}</span>
                        <span class="shan-role-pill">${s.type} · ${s.yy}${s.wx}</span>
                      </div>
                      <span class="shan-deg-tag">${s.degree}</span>
                    </div>
                    <div class="shan-trait-text">${s.trait}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 经典立向辨正要旨 -->
        <div class="gz-panel" style="margin-top:18px">
          <div class="gz-sec-title-bar">
            <span class="gz-sec-title">堪舆立向三元龙阴阳辨正准绳</span>
            <span class="gz-sec-badge">经传口诀</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:12px">
            <div style="padding:10px 14px;background:var(--secondary);border-radius:6px;font-size:13px;line-height:1.6">
              <strong style="color:var(--primary)">天元龙与人元龙互兼：</strong> 天元龙与人元龙阴阳属性相同者可相兼（如子山兼癸山、壬山兼亥山为巨门吉向），气脉相通，为正向合局。
            </div>
            <div style="padding:10px 14px;background:var(--secondary);border-radius:6px;font-size:13px;line-height:1.6">
              <strong style="color:var(--primary)">地元龙不可杂天人：</strong> 地元龙属初气，与天元、人元龙气脉殊异。若地元龙兼天元或人元，易犯“阴阳差错”与“出卦向”，主丁财衰歇。
            </div>
            <div style="padding:10px 14px;background:var(--secondary);border-radius:6px;font-size:13px;line-height:1.6">
              <strong style="color:var(--primary)">每山各占十五度：</strong> 二十四山每山宽十五度，分金以正中七度半为正针正向，偏出三度为兼向，出四度半即犯空亡大忌。
            </div>
          </div>
        </div>
      `
}

export function getJiuxingHtml(jiuxingTypeFilter: string): string {
  const filtered = (jiuxingTypeFilter === 'all')
        ? DATA_JIUXING
        : (jiuxingTypeFilter === 'good')
          ? DATA_JIUXING.filter(j => j.type.includes('吉'))
          : DATA_JIUXING.filter(j => j.type.includes('凶'));
      return `
        <!-- 九星象义后天八卦九宫大盘 (3×3 严格方位排列) -->
        <div class="jiuxing-grid">
          ${filtered.map(j => `
            <div class="jiuxing-card">
              <div class="jiuxing-head">
                <span class="jiuxing-name wx-${j.wx}">${j.num} · ${j.star}</span>
                <div class="jiuxing-meta-right">
                  <div class="jiuxing-alias-line">北斗${j.alias} · ${j.eight_zhai}</div>
                  <div class="jiuxing-badges-line">
                    <span class="jiuxing-dir-badge">${j.dir} · ${j.palace}</span>
                    <span class="jiuxing-type-tag ${j.type.includes('吉') ? 'good' : 'bad'}">${j.type.split(' ')[0]}</span>
                  </div>
                </div>
              </div>

              <div class="gz-hero-meta-grid">
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">五行</span>
                  <span class="gz-meta-value">${j.wx}</span>
                </div>
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">八宅</span>
                  <span class="gz-meta-value">${j.eight_zhai}</span>
                </div>
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">星宿</span>
                  <span class="gz-meta-value">${j.alias} (${j.palace})</span>
                </div>
                <div class="gz-meta-pill">
                  <span class="gz-meta-label">气脉象义</span>
                  <span class="gz-meta-value">${j.nature}</span>
                </div>
              </div>

              <div class="jiuxing-contrast-block">
                <div class="jiuxing-contrast-row good">
                  <span class="jiuxing-contrast-tag">【得令吉验】</span>
                  <span class="jiuxing-contrast-desc">${j.good}</span>
                </div>
                <div class="jiuxing-contrast-row bad">
                  <span class="jiuxing-contrast-tag">【失令凶断】</span>
                  <span class="jiuxing-contrast-desc">${j.bad}</span>
                </div>
              </div>

              <div class="jiuxing-bottom-meta">
                <div><strong>身心与器用：</strong>${j.body}</div>
                <div><strong>物象：</strong>${j.obj}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `
}

export function getXingzuoHtml(xingzuoElementFilter: string): string {
  const filtered = (xingzuoElementFilter === 'all')
        ? DATA_XINGZUO
        : DATA_XINGZUO.filter(x => x.element === xingzuoElementFilter);
      return `
        <!-- 十二星座中西合参典雅双列名谱 -->
        <div class="xingzuo-grid">
          ${filtered.map(x => `
            <div class="xingzuo-card">
              <div class="xingzuo-head">
                <div class="xingzuo-lead-wrap">
                  <span class="xingzuo-symbol-box">${x.sym}</span>
                  <div class="xingzuo-name-group">
                    <span class="xingzuo-name">${x.name}</span>
                    <span class="xingzuo-en-date">${x.en} · ${x.date}</span>
                  </div>
                </div>
                <span class="xingzuo-solar-pill">中气 · ${x.solar_term.split(' ')[0]}</span>
              </div>

              <div class="xingzuo-attr-grid">
                <div class="xingzuo-attr-cell"><strong>四象：</strong>${x.element} · ${x.mode.split(' ')[0]}</div>
                <div class="xingzuo-attr-cell"><strong>守护：</strong>${x.ruler.split(' ')[0]}</div>
                <div class="xingzuo-attr-cell"><strong>经脉：</strong>${x.body.split('、').slice(0, 2).join('、')}</div>
                <div class="xingzuo-attr-cell"><strong>色彩：</strong>${x.colors.split('、').slice(0, 2).join('、')}</div>
              </div>

              <div class="xingzuo-body-block">
                <span class="xingzuo-keywords-badge">${x.keywords}</span>
                <div class="xingzuo-point-row">
                  <strong>天赋优势：</strong>${x.talent}
                </div>
                <div class="xingzuo-point-row shadow">
                  <strong>成长挑战：</strong>${x.shadow}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `
}

export function getKoujueHtml(koujueCatFilter: string): string {
  const filtered = (koujueCatFilter === 'all')
        ? DATA_KOUJUE
        : DATA_KOUJUE.filter(k => k.cat === koujueCatFilter);
      return `
        <!-- 口诀卡片网格 -->
        <div class="koujue-grid">
          ${filtered.map(k => `
            <div class="koujue-card">
              <div class="koujue-head">
                <div class="koujue-title-group">
                  <span class="koujue-title">${k.title}</span>
                  <span class="koujue-badge">${k.catName}</span>
                </div>
                <span class="koujue-source-tag">${k.author.replace(/·/g, '<span class="koujue-src-sep">·</span>')}</span>
              </div>

              <!-- 口诀韵文正文：右上角复制按钮，点整块也能复制。
                   容器是 pre-line，按钮前后不能留换行/缩进，否则会渲染成空行 -->
              <div class="koujue-poem-box" data-koujue-copy="${encodeURIComponent(k.poem)}"><button type="button" class="koujue-copy-btn" data-koujue-copy-btn aria-label="复制歌诀" title="复制歌诀"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>${k.poem}</div>

              <!-- 释要与应用 -->
              <div class="koujue-explain-box">
                <div><strong>【经传微旨】</strong>${k.explain}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `
}
