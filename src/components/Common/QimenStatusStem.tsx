type QimenStemStatus = 'jiXing' | 'ruMu' | 'jiXingRuMu';

interface QimenStatusStemProps {
    status: string;
    value: string;
    isMobile: boolean;
    mobileAsBadge?: boolean;
    mobileClassName: string;
    desktopClassName: string;
}

const STATUS_STYLE_VARS: Record<QimenStemStatus, { color: string; backgroundColor: string }> = {
    jiXing: {
        color: 'var(--qimen-status-ji-xing)',
        backgroundColor: 'var(--qimen-status-ji-xing-bg)',
    },
    ruMu: {
        color: 'var(--qimen-status-ru-mu)',
        backgroundColor: 'var(--qimen-status-ru-mu-bg)',
    },
    jiXingRuMu: {
        color: 'var(--qimen-status-ji-xing-ru-mu)',
        backgroundColor: 'var(--qimen-status-ji-xing-ru-mu-bg)',
    },
};

function isQimenStemStatus(status: string): status is QimenStemStatus {
    return status in STATUS_STYLE_VARS;
}

export default function QimenStatusStem({
    status,
    value,
    isMobile,
    mobileAsBadge = false,
    mobileClassName,
    desktopClassName,
}: QimenStatusStemProps) {
    const style = STATUS_STYLE_VARS[isQimenStemStatus(status) ? status : 'jiXing'];

    if (isMobile && !mobileAsBadge) {
        return <span className={`${mobileClassName} font-serif font-bold`} style={style}>{value}</span>;
    }

    return (
        <span
            className={`inline-flex items-center justify-center ${isMobile ? mobileClassName : desktopClassName} rounded-md border font-serif font-bold`}
            style={{ ...style, borderColor: style.color }}
        >
            {value}
        </span>
    );
}
