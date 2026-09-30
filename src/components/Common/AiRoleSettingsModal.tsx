/**
 * AiRoleSettingsModal - AI 研判角色与提示词规范设置弹窗
 *
 * 模块定位：
 * - 允许用户自由定制、切换和保存大模型研判的 System Prompt；
 * - 按模块（八字/奇门）预设对应的角色规范与研判准则文案，确保排盘真值先行锁定再深度推演。
 */

import React, { useState, useMemo } from 'react';
import { UserCog, Sparkles, RotateCcw, Check, BookOpen, AlertTriangle } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import {
  aiRolePromptService,
  type AiRoleTemplate,
} from '../../services/aiRolePromptService';

interface AiRoleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName?: string;
}

interface ModuleGuide {
  guideLabel: string;
  truthScope: string;
  highlight: string;
  recommendedId: string;
}

// 各模块的研判准则与推荐规范： 不同术数的"断事之本"不同，文案随 moduleName 切换
const MODULE_GUIDE_BAZI: ModuleGuide = {
  guideLabel: '命理严谨性准则',
  truthScope: '四柱干支与客观局象',
  highlight: '妻财子禄寿',
  recommendedId: 'yueyuan_bazi',
};

const MODULE_GUIDE_QIMEN: ModuleGuide = {
  guideLabel: '推演严谨性准则',
  truthScope: '九宫格局与星门神仪',
  highlight: '用神宫位与趋吉避凶',
  recommendedId: 'qimen_master',
};

export default function AiRoleSettingsModal({
  isOpen,
  onClose,
  moduleName = '八字',
}: AiRoleSettingsModalProps) {
  const templates = useMemo(() => aiRolePromptService.getTemplates(moduleName), [moduleName]);
  const initialPrompt = useMemo(() => aiRolePromptService.getSystemPrompt(moduleName), [moduleName]);
  const guide = useMemo(
    () => (moduleName.includes('奇门') ? MODULE_GUIDE_QIMEN : MODULE_GUIDE_BAZI),
    [moduleName],
  );
  const recommendedName = templates.find((t) => t.id === guide.recommendedId)?.name ?? '推荐规范';

  const [promptText, setPromptText] = useState(initialPrompt);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const matched = templates.find((t) => t.systemPrompt.trim() === initialPrompt.trim());
    return matched ? matched.id : 'custom';
  });
  const [isSaved, setIsSaved] = useState(false);
  // 移动端检测：必须在任何早退之前调用，保证 hooks 顺序稳定
  const { isMobile } = useLayoutMode();

  const handleSelectTemplate = (template: AiRoleTemplate) => {
    setSelectedTemplateId(template.id);
    setPromptText(template.systemPrompt);
    setIsSaved(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptText(e.target.value);
    setSelectedTemplateId('custom');
    setIsSaved(false);
  };

  const handleResetDefault = () => {
    const defaultText = aiRolePromptService.resetToDefault(moduleName);
    setPromptText(defaultText);
    const tmpls = aiRolePromptService.getTemplates(moduleName);
    const matched = tmpls.find((t) => t.systemPrompt.trim() === defaultText.trim());
    setSelectedTemplateId(matched ? matched.id : guide.recommendedId);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSave = () => {
    aiRolePromptService.saveSystemPrompt(moduleName, promptText);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 400);
  };

  const bodyContent = (
    <div className="space-y-4 text-sm">
        {/* 核心理念提示：一句话说清「为什么要锁定真值」，细则交给模板本身 */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold">{guide.guideLabel}：</span>
            推荐套用「{recommendedName}」，研判前系统会先锁定{guide.truthScope}，再围绕{guide.highlight}展开论证。
          </div>
        </div>

        {/* 角色预设模板切换 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              预设角色模板
            </label>
            <span className="text-[11px] text-muted-foreground">点击套用</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {templates.map((tmpl) => {
              const isSelected = selectedTemplateId === tmpl.id;
              const isRecommended = tmpl.id === guide.recommendedId;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`p-2.5 text-left rounded-lg border transition-all text-xs relative ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm text-foreground ring-1 ring-primary/40'
                      : 'border-border/70 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium mb-1">
                    <span className="truncate">{tmpl.name}</span>
                    {isRecommended && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-[4px] font-semibold shrink-0 ml-1">
                        推荐
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] line-clamp-2 text-muted-foreground/90 leading-tight">
                    {tmpl.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 提示词编辑区 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              系统提示词
            </label>
            <span className="text-[11px] text-muted-foreground">
              {promptText.length} 字 {selectedTemplateId === 'custom' && '· 已自定义'}
            </span>
          </div>
          <textarea
            value={promptText}
            onChange={handleTextChange}
            rows={12}
            className="w-full px-3 py-2 text-[13px] font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y leading-relaxed text-foreground placeholder:text-muted-foreground/60 shadow-inner"
            placeholder="请输入大模型扮演的角色与推演规则要求..."
          />
        </div>
    </div>
  );

  const footerContent = (
    <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-border/60"
            title={`恢复为${recommendedName}规范`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            恢复推荐规范
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-all shadow-sm active:scale-95"
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  已保存
                </>
              ) : (
                '保存并生效'
              )}
            </button>
          </div>
    </div>
  );

  // 移动端：整页推入，与其余二级界面统一
  if (isMobile) {
    return (
      <SubPage isOpen={isOpen} onClose={onClose} title="AI 角色设定" footer={footerContent}>
        <div className="px-4 py-4">{bodyContent}</div>
      </SubPage>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <UserCog className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">AI 角色设定</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            {moduleName}
          </span>
        </div>
      }
      maxWidth="max-w-2xl"
      footer={footerContent}
    >
      {bodyContent}
    </BaseModal>
  );
}
