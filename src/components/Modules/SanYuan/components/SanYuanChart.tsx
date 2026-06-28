import { useState } from 'react';
import SanYuanPalaceCell, { type SanYuanPalaceData } from './SanYuanPalaceCell';

// Grid position constants (Luo Shu square)
// 4 9 2
// 3 5 7
// 8 1 6
export const XUN_KONG = [3, 8, 1, 2, 7, 0, 5, 4, 6]; // Array indices mapped to display grid

const MOCK_DATA: Record<number, SanYuanPalaceData> = {
    0: {
        position: 0, centerChar: '巽', centerBgText: '巽',
        topLeft: '4', topCenter: '肆', topRight: '5',
        middleLeft: '3', middleLeftColor: 'red', middleRight: '八',
        bottomRow: ['6', '6', '2'], bottomRowColors: ['red', 'red', 'red']
    },
    1: {
        position: 1, centerChar: '离', centerBgText: '离',
        topLeft: '9', topCenter: '玖', topRight: '9',
        middleLeft: '7', middleRight: '四',
        bottomRow: ['8', '5', '8'], bottomRowColors: ['red', 'default', 'red']
    },
    2: {
        position: 2, centerChar: '坤', centerBgText: '坤',
        topLeft: '2', topCenter: '贰', topRight: '7',
        middleLeft: '5', middleRight: '六',
        bottomRow: ['4', '4', '4']
    },
    3: {
        position: 3, centerChar: '震', centerBgText: '震',
        topLeft: '3', topCenter: '叁', topRight: '6',
        middleLeft: '4', middleLeftColor: 'red', middleRight: '七',
        bottomRow: ['1', '1', '1'], bottomRowColors: ['red', 'red', 'red']
    },
    // Center is blank
    5: {
        position: 5, centerChar: '兑', centerBgText: '兑',
        topLeft: '7', topCenter: '柒', topRight: '2',
        middleLeft: '9', middleRight: '二',
        bottomRow: ['2', '2', '5'], bottomRowColors: ['red', 'red', 'default']
    },
    6: {
        position: 6, centerChar: '艮', centerBgText: '艮',
        topLeft: '8', topCenter: '捌', topRight: '1',
        middleLeft: '8', middleRight: '三',
        bottomRow: ['5', '8', '3'], bottomRowColors: ['default', 'red', 'default']
    },
    7: {
        position: 7, centerChar: '坎', centerBgText: '坎',
        topLeft: '1', topCenter: '壹', topRight: '8',
        middleLeft: '6', middleRight: '五',
        bottomRow: ['3', '3', '6'], bottomRowColors: ['default', 'default', 'red']
    },
    8: {
        position: 8, centerChar: '乾', centerBgText: '乾',
        topLeft: '6', topCenter: '陸', topRight: '3',
        middleLeft: '1', middleLeftColor: 'red', middleRight: '一',
        bottomRow: ['7', '7', '7']
    },
};

export default function SanYuanChart() {
    const [selectedCell, setSelectedCell] = useState<number | null>(null);

    // Creates the 3x3 grid
    const renderGrid = () => {
        const gridItems = [];
        for (let i = 0; i < 9; i++) {
            gridItems.push(
                <SanYuanPalaceCell
                    key={i}
                    data={MOCK_DATA[i]}
                    isActive={selectedCell === i}
                    onClick={() => setSelectedCell(i)}
                />
            );
        }
        return gridItems;
    };

    return (
        <div className="w-full max-w-[640px] aspect-square grid grid-cols-3 grid-rows-3 gap-2 md:gap-3 p-2 bg-card/20 border border-border/50 rounded-2xl shadow-inner mx-auto my-auto overflow-hidden">
            {renderGrid()}
        </div>
    );
}
