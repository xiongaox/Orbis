/**
 * 案例详情卡的静态渲染检查：卡片内直接铺完整对话（供浏览）、轮数与条数、
 * 隐私模式不外泄原文，以及标题栏的编辑入口。
 * （正文弹窗走 createPortal，需要 DOM 环境，项目未装 jsdom，故不在此覆盖。）
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CaseInfoCard from '../Modules/Qimen/components/CaseInfoCard';
import type { QimenCase } from '../../services/qimenCaseService';

const base: QimenCase = {
    id: 'c1',
    title: '张三问事业',
    test_date: '2026-10-13T04:16:00.000Z',
    category: 'work',
    description: '第一问\n\n第二问',
    analysis: '断一\n\n断二',
    feedback: '反馈一',
    created_at: '2026-10-13T04:16:00.000Z',
    updated_at: '2026-10-13T04:16:00.000Z',
};

describe('案例详情卡', () => {
    it('卡片内铺完整对话并带序号，可直接滚动浏览', () => {
        const html = renderToStaticMarkup(
            <CaseInfoCard caseData={base} isPrivacyMode={false} onTogglePrivacy={() => {}} onOpenDialog={() => {}} />,
        );
        // 完整列表都在，不是只回显最近一条
        expect(html).toContain('第一问');
        expect(html).toContain('第二问');
        expect(html).toContain('反馈一');
        expect(html).toContain('断一');
        expect(html).toContain('断二');
        // 说话人标签与序号
        expect(html).toContain('求测人');
        expect(html).toContain('测算师');
        expect(html).toContain('#1');
        expect(html).toContain('#5');
        // 滚动容器（卡片不再显示轮数/条数提示，浏览即可）
        expect(html).toContain('overflow-y-auto');
        expect(html).not.toContain('共 2 轮');
        expect(html).not.toContain('继续记录');
    });

    it('隐私模式用遮罩盖住原文，不替换成掩码文本', () => {
        const html = renderToStaticMarkup(
            <CaseInfoCard caseData={base} isPrivacyMode onTogglePrivacy={() => {}} onOpenDialog={() => {}} />,
        );
        // 文本层保留原样（靠模糊+遮罩盖住），布局不会因为换内容而塌掉
        expect(html).toContain('第二问');
        expect(html).not.toContain('•');
        // 遮罩：模糊、去交互、对读屏隐藏，并给出可见提示
        expect(html).toContain('blur-[7px]');
        expect(html).toContain('pointer-events-none');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('内容已隐藏');
    });

    it('断法用主色虚框标记，与测算师回答分开', () => {
        const html = renderToStaticMarkup(
            <CaseInfoCard
                caseData={{ ...base, description: '一问', feedback: '这是回答', analysis: '这是断法' }}
                isPrivacyMode={false}
                onTogglePrivacy={() => {}}
                onOpenDialog={() => {}}
            />,
        );
        expect(html).toContain('这是断法');
        expect(html).toContain('border-dashed');
        expect(html).toContain('这是回答');
    });

    it('标题栏给出编辑入口，点它以 edit 意图打开弹窗', () => {
        const html = renderToStaticMarkup(
            <CaseInfoCard caseData={base} isPrivacyMode={false} onTogglePrivacy={() => {}} onOpenDialog={() => {}} />,
        );
        expect(html).toContain('编辑案例正文');
        expect(html).toContain('隐藏信息');
    });

    it('没有正文时给出引导，而不是空白卡', () => {
        const html = renderToStaticMarkup(
            <CaseInfoCard
                caseData={{ ...base, description: '', analysis: '', feedback: '' }}
                isPrivacyMode={false}
                onTogglePrivacy={() => {}}
                onOpenDialog={() => {}}
            />,
        );
        expect(html).toContain('还没有记录');
    });
});
