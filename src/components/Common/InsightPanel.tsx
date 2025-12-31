import { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

// 默认八字书籍（向后兼容）
const defaultBooks = [
  { id: 'dayun', name: '穷通宝鉴', category: 'classic' },
  { id: 'shensha', name: '滴天髓', category: 'classic' },
  { id: 'sanming', name: '三命通会', category: 'classic' },
  { id: 'bazi', name: '八字提要', category: 'analysis' },
  { id: 'gezhi', name: '子平真诠', category: 'analysis' },
];

// 默认内容（向后兼容）
const defaultContent = {
  hint: '调候用神提示：甲 壬',
  subHint: '本八字：连 壬 亘 甲',
  summary: `九月丙火虎袈，墓土用甲，先用甲木，次取壬水。

丙火至九月，为囊地之火。易与土博光。而乃忌魁光。水，如太阳遇于地平下凌沧波申返砺而出。分光，故先取甲木木制土。用月用卦甲木制土。甲丁两适。科甲有准。若无兰荐贫中。首无支配己巳。支责临期甲已。`,
  keyPoints: [
    '九秋土爆木枯，用甲不能无水，癸水只有洒太之功，贫而无取太之用。',
    '有辅甲之铜官，得养甲己，甲震王适，无度欲才，充甲又焦否下格。',
    '戊戌宫火之墓库，与未月同为燥土。用用甲木制土，泄秀生财。',
  ],
  advice: `成宫火之墓库，与未月同为燥土。增则甲丙气急火气，溜则丙火无力。
柱无庚辛王委等出干首。终方贫气天忱。`,
};

export interface InsightBook {
  id: string;
  name: string;
  category?: string;
}

export interface InsightContent {
  hint?: string;
  subHint?: string;
  summary?: string;
  summaryTitle?: string;
  keyPoints?: string[];
  keyPointsTitle?: string;
  advice?: string;
  adviceTitle?: string;
}

interface InsightPanelProps {
  className?: string;
  title?: string;
  books?: InsightBook[];
  content?: InsightContent;
  onExport?: () => void;
  onDetail?: () => void;
}

export default function InsightPanel({
  className = '',
  title = '智能咨询参考',
  books = defaultBooks,
  content = defaultContent,
  onExport,
  onDetail,
}: InsightPanelProps) {
  const [activeBook, setActiveBook] = useState(books[0]?.id || '');
  const [openSections, setOpenSections] = useState(['summary', 'keyPoints']);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((item) => item !== section) : [...prev, section],
    );
  };

  return (
    <aside
      className={`w-80 bg-card border-l border-border flex flex-col min-h-0 flex-shrink-0 ${className}`}
    >
      <div className="p-4 border-b border-border">
        <h2 className="font-display text-base font-medium text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {title}
        </h2>
      </div>
      <div className="p-4 border-b border-border">
        {content.hint && <div className="text-xs text-muted-foreground mb-2">{content.hint}</div>}
        {content.subHint && <div className="text-xs text-muted-foreground mb-3">{content.subHint}</div>}
        <div className="flex flex-wrap gap-1.5">
          {books.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveBook(item.id)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${activeBook === item.id
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-border'
                }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {content.summary && (
          <div className="bg-secondary/30 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => toggleSection('summary')}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                {content.summaryTitle || '论丙九月'}
              </span>
              {openSections.includes('summary') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {openSections.includes('summary') && (
              <div className="px-3 pb-3">
                <p className="text-sm text-muted-foreground leading-relaxed font-serif">
                  {content.summary}
                </p>
              </div>
            )}
          </div>
        )}
        {content.keyPoints && content.keyPoints.length > 0 && (
          <div className="bg-secondary/30 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => toggleSection('keyPoints')}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                {content.keyPointsTitle || '要点解析'}
              </span>
              {openSections.includes('keyPoints') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {openSections.includes('keyPoints') && (
              <div className="px-3 pb-3 space-y-2">
                {content.keyPoints.map((item) => (
                  <div key={item} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-primary flex-shrink-0">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {content.advice && (
          <div className="bg-secondary/30 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => toggleSection('advice')}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                {content.adviceTitle || '建议参考'}
              </span>
              {openSections.includes('advice') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {openSections.includes('advice') && (
              <div className="px-3 pb-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{content.advice}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-4 border-t border-border">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExport}
            className="px-3 py-2 text-xs bg-secondary hover:bg-secondary/80 rounded-lg text-muted-foreground transition-colors"
          >
            导出报告
          </button>
          <button
            type="button"
            onClick={onDetail}
            className="px-3 py-2 text-xs bg-primary/10 hover:bg-primary/20 rounded-lg text-primary transition-colors"
          >
            详细解读
          </button>
        </div>
      </div>
    </aside>
  );
}
