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
