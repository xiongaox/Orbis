import { useSanYuanState } from './hooks/useSanYuanState';
import SanYuanDesktopLayout from './layouts/SanYuanDesktopLayout';
import SanYuanPadLayout from './layouts/SanYuanPadLayout';
import SanYuanMobileLayout from './layouts/SanYuanMobileLayout';

export default function SanYuanPage() {
    const state = useSanYuanState();
    const { useDesktopLayout, isPadLandscape } = state;

    return (
        <div className="flex flex-1 h-full min-h-0 overflow-hidden relative">
            {useDesktopLayout ? (
                <SanYuanDesktopLayout state={state} />
            ) : isPadLandscape ? (
                <SanYuanPadLayout />
            ) : (
                <SanYuanMobileLayout />
            )}
        </div>
    );
}
