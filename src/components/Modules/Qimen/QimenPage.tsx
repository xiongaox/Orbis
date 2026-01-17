/**
 * 奇门遁甲模块 - 主页面容器
 * 三栏布局：左侧案例列表、中间九宫盘式、右侧宫位详情
 */
import { useState } from 'react';
import QimenCaseList from './QimenCaseList';
import QimenChart, { type QimenPalace } from './QimenChart';
import QimenPalaceDetail from './QimenPalaceDetail';

// Mock 九宫数据 - 包含完整的旺相、十二长生等信息
const MOCK_PALACES: QimenPalace[] = [
    {
        position: 4, gongName: '巽', tianPan: '壬', diPan: '乙', men: '死门', xing: '天英', shen: '九天',
        anGan: '庚', shenWang: '〇/马', xingWang: '囚丨月相', menWang: '死丨月旺',
        anGanShiErCS: '刑养胎', tianPanShiErCS: '袁旺', diPanShiErCS: '冠沐'
    },
    {
        position: 9, gongName: '离', tianPan: '戊', diPan: '戊', men: '惊门', xing: '天禽', shen: '值符',
        anGan: '壬', shenWang: '', xingWang: '月旺', menWang: '休丨旺',
        anGanShiErCS: '死', tianPanShiErCS: '旺', diPanShiErCS: '旺'
    },
    {
        position: 2, gongName: '坤', tianPan: '庚', diPan: '丁', men: '开门', xing: '天柱', shen: '腾蛇',
        anGan: '癸', shenWang: '', xingWang: '月相', menWang: '相丨月旺',
        anGanShiErCS: '绝', tianPanShiErCS: '冠', diPanShiErCS: '墓'
    },
    {
        position: 3, gongName: '震', tianPan: '辛', diPan: '乙', men: '景门', xing: '天辅', shen: '九地',
        anGan: '丙', shenWang: '〇', xingWang: '休丨月休', menWang: '旺丨月旺',
        anGanShiErCS: '沐', tianPanShiErCS: '胎', diPanShiErCS: '旺'
    },
    {
        position: 5, gongName: '中', tianPan: '癸', diPan: '癸', men: '', xing: '', shen: '',
        anGan: '戊'
    },
    {
        position: 7, gongName: '兑', tianPan: '丙', diPan: '己', men: '休门', xing: '天心', shen: '太阴',
        anGan: '己', shenWang: '', xingWang: '相丨月度', menWang: '囚丨月死',
        anGanShiErCS: '衰', tianPanShiErCS: '冠', diPanShiErCS: '养'
    },
    {
        position: 8, gongName: '艮', tianPan: '乙', diPan: '丙', men: '杜门', xing: '天冲', shen: '玄武',
        anGan: '丁', shenWang: '', xingWang: '休丨月休', menWang: '相丨月相',
        anGanShiErCS: '长', tianPanShiErCS: '胎', diPanShiErCS: '沐'
    },
    {
        position: 1, gongName: '坎', tianPan: '丁', diPan: '庚', men: '伤门', xing: '天任', shen: '白虎',
        anGan: '戊', shenWang: '', xingWang: '死丨月死', menWang: '休丨月休',
        anGanShiErCS: '墓', tianPanShiErCS: '冠', diPanShiErCS: '绝'
    },
    {
        position: 6, gongName: '乾', tianPan: '己', diPan: '辛', men: '生门', xing: '天蓬', shen: '六合',
        anGan: '庚', shenWang: '', xingWang: '囚丨月因', menWang: '死丨月旺',
        anGanShiErCS: '刑养胎', tianPanShiErCS: '养胎', diPanShiErCS: '冠沐'
    },
];

export default function QimenPage() {
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [selectedPalace, setSelectedPalace] = useState<number | null>(null);

    // 获取选中的宫位数据
    const selectedPalaceData = selectedPalace
        ? MOCK_PALACES.find(p => p.position === selectedPalace) || null
        : null;

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* 左侧案例列表 */}
            <QimenCaseList
                selectedCaseId={selectedCaseId}
                onSelectCase={setSelectedCaseId}
            />

            {/* 中间九宫盘式 */}
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col p-6">
                <QimenChart
                    palaces={MOCK_PALACES}
                    selectedPalace={selectedPalace}
                    onSelectPalace={setSelectedPalace}
                />
            </main>

            {/* 右侧宫位详情 */}
            <QimenPalaceDetail palace={selectedPalaceData} />
        </div>
    );
}
