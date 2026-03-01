/**
 * WannianliPage - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default WannianliPage`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `AdvancedDatePicker`、内部模块 `WannianliLayout`、内部模块 `useWannianliState`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import AdvancedDatePicker from '../../Common/AdvancedDatePicker';
import WannianliLayout from './layouts/WannianliLayout';
import { useWannianliState } from './hooks/useWannianliState';

export default function WannianliPage() {
    const wannianliState = useWannianliState();

    return (
        <>
            <WannianliLayout
                {...wannianliState}
                setIsDatePickerOpen={wannianliState.setIsDatePickerOpen}
            />
            {/* 日期选择弹窗 - 复用组件在最顶层 */}
            <AdvancedDatePicker
                value={wannianliState.selectedDate}
                isOpen={wannianliState.isDatePickerOpen}
                onClose={() => wannianliState.setIsDatePickerOpen(false)}
                hideBazi={true}
                onConfirm={(date) => {
                    wannianliState.setSelectedDate(date);
                    wannianliState.setViewDate(date);
                    wannianliState.setIsDatePickerOpen(false);
                }}
            />
        </>
    );
}
