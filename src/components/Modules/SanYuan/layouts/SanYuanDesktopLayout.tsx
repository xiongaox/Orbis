import SanYuanChart from '../components/SanYuanChart';

export default function SanYuanDesktopLayout() {
    return (
        <>
            {/* 左侧案例列表 */}
            <div className="w-72 xl:w-80 2xl:w-96 h-full flex-shrink-0 overflow-hidden border-r border-border/50 bg-card/30">
                <div className="p-6">
                    <h2 className="text-xl font-bold font-serif mb-4">案例列表</h2>
                    <div className="text-muted-foreground text-sm">暂无案例数据</div>
                </div>
            </div>

            {/* 中间盘面 */}
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col p-4 relative items-center justify-center">
                <SanYuanChart />
            </main>

            {/* 右侧详情 */}
            <div className="w-72 xl:w-80 2xl:w-96 flex-shrink-0 min-h-0 overflow-hidden flex flex-col border-l border-border/50 bg-card/30">
                <div className="p-6">
                    <h2 className="text-xl font-bold font-serif mb-4">盘面信息</h2>
                    <div className="text-muted-foreground text-sm">暂无数据展示</div>
                </div>
            </div>
        </>
    );
}
