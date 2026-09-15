/**
 * PhysicsLogModal - 旺衰逻辑分析详情弹窗
 *
 * 模块定位：
 * - 所在层级：业务组件层
 * - 主要目标：承载八字旺衰分析详情弹窗，提供【格局与旺衰看板】与【AI 深度推演】双轨架构
 *
 * 关键职责：
 * - 默认看板：纯本地确定性计算，直观展示能量天平、子平四要素矩阵与全局裁判词
 * - 进阶推演：轻量集成大模型子平学术推导，微缩折叠思考链，排版美化
 * - 拒绝臃肿，消除前后指标矛盾，提供优雅清爽的研判体验
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Compass, Bot } from 'lucide-react';
import BaseModal from '../../UI/BaseModal';
import type { BaziApiResponse } from '../../../types/bazi';
import { aiChatService } from '../../../services/aiChatService';
import type { AiModelService } from '../../../services/aiModelService';
import {
  calculateWangShuaiDashboard,
  getYueyuanSystemPrompt,
  buildYueyuanUserPrompt,
  calculateWangShuaiIndicators,
} from '../../../lib/xuan-bazi/skills/yueyuanWangShuaiSkill';
import WangShuaiDashboard from './WangShuaiDashboard';
import WangShuaiAiPanel from './WangShuaiAiPanel';

interface PhysicsLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  title?: string;
  description?: string;
  highlightColor?: string;
  baziData?: BaziApiResponse | null;
}

export default function PhysicsLogModal({
  isOpen,
  onClose,
  logs = [],
  title = "旺衰逻辑分析",
  baziData = null,
}: PhysicsLogModalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ai'>('dashboard');

  // AI 相关状态
  const [services, setServices] = useState<AiModelService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');
  const [aiReasoningContent, setAiReasoningContent] = useState<string>('');
  const [aiError, setAiError] = useState<string>('');

  // 缓存已生成的分析结果 { content, reasoning }
  const cacheMap = useRef<Map<string, { content: string; reasoning: string }>>(new Map());
  // 保持当前流式调用的 AbortController 引用，支持中途随时停止
  const abortControllerRef = useRef<AbortController | null>(null);

  // 组件卸载时安全清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoadingAi(false);
    onClose();
  };

  // 1. 本地确定性看板数据计算 (0延迟，秒开)
  const dashboardData = useMemo(() => {
    if (!baziData) return null;
    try {
      return calculateWangShuaiDashboard(baziData);
    } catch (e) {
      console.error('Failed to calculate WangShuai dashboard:', e);
      return null;
    }
  }, [baziData]);

  // 缓存 key：基于盘面阳历日期与日主
  const cacheKey = useMemo(() => {
    if (!baziData) return '';
    const dayGan = baziData.pillars?.[2]?.tiangan || '';
    return `${baziData.solarDate || ''}_${dayGan}_${baziData.gender || ''}`;
  }, [baziData]);

  // 加载可用的 AI 服务列表
  useEffect(() => {
    if (isOpen && activeTab === 'ai') {
      void aiChatService.getAvailableServices().then((list) => {
        setServices(list);
        if (list.length > 0 && !selectedServiceId) {
          setSelectedServiceId(list[0].id);
          if (list[0].models && list[0].models.length > 0) {
            setSelectedModel(list[0].models[0]);
          }
        }
      });
    }
  }, [isOpen, activeTab, selectedServiceId]);

  // 当切换选中的服务时同步模型
  const currentService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || services[0] || null;
  }, [services, selectedServiceId]);

  useEffect(() => {
    if (currentService?.models && currentService.models.length > 0) {
      if (!currentService.models.includes(selectedModel)) {
        setSelectedModel(currentService.models[0]);
      }
    }
  }, [currentService, selectedModel]);

  // 读取缓存结果
  useEffect(() => {
    if (cacheKey && cacheMap.current.has(cacheKey)) {
      const cached = cacheMap.current.get(cacheKey);
      setAiAnalysisResult(cached?.content || '');
      setAiReasoningContent(cached?.reasoning || '');
    } else {
      setAiAnalysisResult('');
      setAiReasoningContent('');
    }
    setAiError('');
  }, [cacheKey]);

  // 手动停止 AI 推演
  const handleStopAiAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoadingAi(false);
  }, []);

  // 发起 AI 旺衰分析（全双工流式传输）
  const handleRunAiAnalysis = useCallback(async (forceRefresh = false) => {
    if (!baziData) {
      setAiError('未获取到当前排盘数据，无法生成分析');
      return;
    }

    if (!currentService) {
      setAiError('请先配置并启用 AI 服务');
      return;
    }

    if (!forceRefresh && cacheKey && cacheMap.current.has(cacheKey)) {
      const cached = cacheMap.current.get(cacheKey);
      setAiAnalysisResult(cached?.content || '');
      setAiReasoningContent(cached?.reasoning || '');
      return;
    }

    // 中止上一个未完成的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoadingAi(true);
    setAiError('');
    setAiAnalysisResult('');
    setAiReasoningContent('');

    try {
      const indicators = calculateWangShuaiIndicators(baziData);
      const systemPrompt = getYueyuanSystemPrompt();
      const userPrompt = buildYueyuanUserPrompt(baziData, indicators);

      let accumulatedText = '';
      let accumulatedReasoning = '';

      const { fullText, fullReasoning } = await aiChatService.callChatStream({
        service: currentService,
        model: selectedModel || currentService.models?.[0],
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt,
        temperature: 0.2,
        timeoutMs: 180_000,
        signal: controller.signal,
        onChunk: (chunk) => {
          if (chunk.reasoning) {
            accumulatedReasoning += chunk.reasoning;
            setAiReasoningContent(accumulatedReasoning);
          }
          if (chunk.text) {
            accumulatedText += chunk.text;
            setAiAnalysisResult(accumulatedText);
          }
        },
      });

      setAiAnalysisResult(fullText);
      setAiReasoningContent(fullReasoning);
      if (cacheKey) {
        cacheMap.current.set(cacheKey, { content: fullText, reasoning: fullReasoning });
      }
    } catch (err) {
      if (controller.signal.aborted) {
        // 用户主动停止，保留已有推演内容，不报错
        return;
      }
      setAiError(err instanceof Error ? err.message : 'AI 分析过程出现异常');
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoadingAi(false);
    }
  }, [baziData, currentService, selectedModel, cacheKey]);

  if (!isOpen) return null;

  const header = (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-center justify-between pr-9">
        <span className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="w-5 h-5 text-primary" />
          {title}
        </span>
      </div>

      {/* 极简精致 Segmented Control Tab，全宽对齐取消按钮 */}
      <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/50 w-full">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeTab === 'dashboard'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-primary" />
          <span>格局与旺衰看板 (本地秒开)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeTab === 'ai'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-indigo-500" />
          <span>AI 深度推演 (子平学术)</span>
        </button>
      </div>
    </div>
  );

  const footer = (
    <div className="w-full text-xs text-muted-foreground text-center">
      {activeTab === 'dashboard'
        ? '基于正统子平条件变量与能量天平算法 · 确定性裁决'
        : '基于跃渊子平八字分析体系 · 深度学术推导演绎'}
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={header}
      footer={footer}
      maxWidth="max-w-2xl"
      bodyClassName="p-4"
    >
      {activeTab === 'dashboard' ? (
        dashboardData ? (
          <WangShuaiDashboard data={dashboardData} rawLogs={logs} />
        ) : (
          <div className="text-center py-10 text-muted-foreground text-xs">
            未能解析当前排盘数据
          </div>
        )
      ) : (
        <WangShuaiAiPanel
          services={services}
          selectedServiceId={selectedServiceId}
          onSelectServiceId={setSelectedServiceId}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          isLoading={isLoadingAi}
          onRunAnalysis={handleRunAiAnalysis}
          onStopAnalysis={handleStopAiAnalysis}
          analysisResult={aiAnalysisResult}
          reasoningContent={aiReasoningContent}
          error={aiError}
          baziData={baziData}
        />
      )}
    </BaseModal>
  );
}
