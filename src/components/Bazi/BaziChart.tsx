import { useState } from 'react';
import type { Case } from '../../types';
import EditCaseModal from '../Modals/EditCaseModal';

interface BaziChartProps {
    data: Case;
    onCaseUpdated: () => void;
}

export default function BaziChart({ data, onCaseUpdated }: BaziChartProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    return (
        <section className="content-main figma-content">
            <EditCaseModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                caseData={data}
                onSaved={() => {
                    onCaseUpdated();
                    setIsEditModalOpen(false);
                }}
            />
            {/* Top Header */}
            <div className="figma-header">
                <div className="figma-avatar-wrap">
                    <span className="figma-zodiac-icon">{data.zodiac || '🐰'}</span>
                </div>
                <div className="figma-name">{data.name}</div>
                <div className="figma-dates">
                    <div className="figma-date-line">
                        <span className="figma-label">阴历:</span>
                        <span className="figma-value">{data.lunar_date || '未设置'}</span>
                        <span className="figma-tag kunzao">
                            {data.gender === 'female' ? '（坤造）' : '（乾造）'}
                        </span>
                    </div>
                    <div className="figma-date-line">
                        <span className="figma-label">阳历:</span>
                        <span className="figma-value">{data.solar_date || data.birth_date}</span>
                    </div>
                </div>
                <button className="figma-edit-btn" onClick={() => setIsEditModalOpen(true)}>编辑</button>
            </div>

            {/* Main Content Grid */}
            <div className="figma-content-grid">
                {/* Left: Chart Table */}
                <div className="figma-pan-table">
                    <table className="pan-table">
                        <thead>
                            <tr>
                                <th className="pan-label-col"></th>
                                <th>流年</th>
                                <th>大运</th>
                                <th>年柱</th>
                                <th>月柱</th>
                                <th>日柱</th>
                                <th>时柱</th>
                            </tr>
                        </thead>
                        <tbody>

                            {/* Main Star Row */}
                            <tr>
                                <td className="pan-label">主星</td>
                                <td></td>
                                <td></td>
                                <td>{data.main_stars?.[0] || ''}</td>
                                <td>{data.main_stars?.[1] || ''}</td>
                                <td>{data.main_stars?.[2] || '日主'}</td>
                                <td>{data.main_stars?.[3] || ''}</td>
                            </tr>
                            {/* Heavenly Stems (Tian Gan) */}
                            <tr className="pan-row-tiangan">
                                <td className="pan-label">天干</td>
                                <td><span className="gan-box wood">乙</span></td>
                                <td><span className="gan-box earth">己</span></td>
                                <td><span className="gan-box">{data.year_pillar?.charAt(0) || '-'}</span></td>
                                <td><span className="gan-box">{data.month_pillar?.charAt(0) || '-'}</span></td>
                                <td><span className="gan-box">{data.day_pillar?.charAt(0) || '-'}</span></td>
                                <td><span className="gan-box">{data.hour_pillar?.charAt(0) || '-'}</span></td>
                            </tr>
                            {/* Earthly Branches (Di Zhi) */}
                            <tr className="pan-row-dizhi">
                                <td className="pan-label">地支</td>
                                <td><span className="zhi-box fire">巳</span></td>
                                <td><span className="zhi-box fire">未</span></td>
                                <td><span className="zhi-box">{data.year_pillar?.charAt(1) || '-'}</span></td>
                                <td><span className="zhi-box">{data.month_pillar?.charAt(1) || '-'}</span></td>
                                <td><span className="zhi-box">{data.day_pillar?.charAt(1) || '-'}</span></td>
                                <td><span className="zhi-box">{data.hour_pillar?.charAt(1) || '-'}</span></td>
                            </tr>
                            {/* Hidden Stems (Cang Gan) */}
                            <tr className="pan-row-canggan">
                                <td className="pan-label">藏干</td>
                                <td>...</td>
                                <td>...</td>
                                <td>
                                    <div className="canggan-col">
                                        {data.hidden_stems?.[0]?.map((item: any, idx: number) => (
                                            <div key={idx} className="canggan-item">
                                                <span className="canggan-gan">{item.stem}</span>
                                                <span className="canggan-god">{item.god}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="canggan-col">
                                        {data.hidden_stems?.[1]?.map((item: any, idx: number) => (
                                            <div key={idx} className="canggan-item">
                                                <span className="canggan-gan">{item.stem}</span>
                                                <span className="canggan-god">{item.god}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="canggan-col">
                                        {data.hidden_stems?.[2]?.map((item: any, idx: number) => (
                                            <div key={idx} className="canggan-item">
                                                <span className="canggan-gan">{item.stem}</span>
                                                <span className="canggan-god">{item.god}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="canggan-col">
                                        {data.hidden_stems?.[3]?.map((item: any, idx: number) => (
                                            <div key={idx} className="canggan-item">
                                                <span className="canggan-gan">{item.stem}</span>
                                                <span className="canggan-god">{item.god}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                            {/* Star Luck (Xing Yun) */}
                            <tr>
                                <td className="pan-label">星运</td>
                                <td></td>
                                <td></td>
                                <td>{data.star_lucks?.[0] || ''}</td>
                                <td>{data.star_lucks?.[1] || ''}</td>
                                <td>{data.star_lucks?.[2] || ''}</td>
                                <td>{data.star_lucks?.[3] || ''}</td>
                            </tr>
                            {/* Self Sitting (Zi Zuo) */}
                            <tr>
                                <td className="pan-label">自坐</td>
                                <td></td>
                                <td></td>
                                <td>{data.self_sitting?.[0] || ''}</td>
                                <td>{data.self_sitting?.[1] || ''}</td>
                                <td>{data.self_sitting?.[2] || ''}</td>
                                <td>{data.self_sitting?.[3] || ''}</td>
                            </tr>
                            {/* Void (Kong Wang) */}
                            <tr>
                                <td className="pan-label">空亡</td>
                                <td></td>
                                <td></td>
                                <td>{(Array.isArray(data.kong_wang) ? data.kong_wang[0] : data.kong_wang) || ''}</td>
                                <td>{data.kong_wang?.[1] || ''}</td>
                                <td>{data.kong_wang?.[2] || ''}</td>
                                <td>{data.kong_wang?.[3] || ''}</td>
                            </tr>
                            {/* Na Yin */}
                            <tr>
                                <td className="pan-label">纳音</td>
                                <td></td>
                                <td></td>
                                <td>{data.na_yin?.[0] || ''}</td>
                                <td>{data.na_yin?.[1] || ''}</td>
                                <td>{data.na_yin?.[2] || ''}</td>
                                <td>{data.na_yin?.[3] || ''}</td>
                            </tr>
                        </tbody>
                    </table>
                    {/* Shen Sha - Dynamic */}
                    <div className="pan-shenshu">
                        <div className="shenshu-label">神煞</div>
                        <div className="shenshu-grid">
                            {data.shen_sha && data.shen_sha.length > 0 ? (
                                data.shen_sha.map((star, idx) => (
                                    <div key={idx} className="shenshu-col"><span>{star}</span></div>
                                ))
                            ) : (
                                <div className="shenshu-col"><span>（无特殊神煞）</span></div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Dayun & Liunian (Simplified for now) */}
                <div className="figma-right-panel">
                    <div className="dayun-info">
                        <span>起运: ...</span>
                        <span>交运: ...</span>
                        <span className="right">辰巳空亡（日）</span>
                    </div>
                    {/* Tables omitted for brevity in this initial port, can be added back */}
                    <div className="sizhu-section">
                        <div className="sizhu-title">智能四柱图示</div>
                        <div className="sizhu-content">
                            <p className="sizhu-placeholder">四柱图示区域</p>
                        </div>
                        <div className="sizhu-footer">
                            <button className="sizhu-btn">⚙</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
