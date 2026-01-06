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
  /** 滴天髓基础数据（诗诀+原注），用于原文标签 */
  ditiansuiBasic?: {
    poem: string;
    explanation: string[];
  };
}

interface InsightPanelProps {
  className?: string;
  title?: string;
  books?: InsightBook[];
  content?: InsightContent;
  activeBook?: string;
  onBookChange?: (bookId: string) => void;
}

export default function InsightPanel({
  className = '',
  title = '智能咨询参考',
  books = defaultBooks,
  content = defaultContent,
  activeBook: controlledActiveBook,
  onBookChange,
}: InsightPanelProps) {
  const [internalActiveBook, setInternalActiveBook] = useState(books[0]?.id || '');
  const [openSections, setOpenSections] = useState(['summary', 'keyPoints']);
  // 滴天髓子标签：原文 | 逻辑解析
  const [ditiansuiSubTab, setDitiansuiSubTab] = useState<'yuanwen' | 'logic'>('yuanwen');

  const activeBook = controlledActiveBook || internalActiveBook;

  const handleBookChange = (id: string) => {
    setInternalActiveBook(id);
    onBookChange?.(id);
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((item) => item !== section) : [...prev, section],
    );
  };

  // 天干列表
  const tianGanList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

  // 渲染调候用神文本（给天干加边框）
  const renderTianGanText = (text: string) => {
    const chars = text.split('');
    return chars.map((char, index) => {
      if (tianGanList.includes(char)) {
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-md border border-primary/50 text-primary bg-primary/10"
          >
            {char}
          </span>
        );
      }
      return null; // 忽略非天干字符
    });
  };

  // 渲染透藏文本（透和藏用不同样式）
  const renderTouCangText = (text: string) => {
    const parts = text.split(' ').filter(Boolean);
    return parts.map((part, index) => {
      if (part.startsWith('透')) {
        const gans = part.slice(1).split('');
        return (
          <span key={index} className="inline-flex items-center gap-1">
            <span className="text-xs font-bold text-foreground mr-0.5">
              透
            </span>
            {gans.map((gan, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-md border border-primary/50 text-primary bg-primary/10"
              >
                {gan}
              </span>
            ))}
          </span>
        );
      } else if (part.startsWith('藏')) {
        const gans = part.slice(1).split('');
        return (
          <span key={index} className="inline-flex items-center gap-1 ml-3">
            <span className="text-xs font-bold text-foreground mr-0.5">
              藏
            </span>
            {gans.map((gan, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-md border border-primary/50 text-primary bg-primary/10"
              >
                {gan}
              </span>
            ))}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div
      className={`flex flex-col flex-1 min-h-0 ${className}`}
    >
      <div className="p-4 border-b border-border">
        <h2 className="font-display text-base font-medium text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {title}
        </h2>
      </div>
      <div className="p-4 border-b border-border">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {books.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleBookChange(item.id)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${activeBook === item.id
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-border'
                }`}
            >
              {item.name}
            </button>
          ))}
        </div>
        {/* 仅穷通宝鉴显示调候提示 */}
        {activeBook !== 'ditiansui' && content.hint && (
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1 flex-wrap">
            <span>调候用神提示：</span>
            {renderTianGanText(content.hint.replace('调候用神提示：', ''))}
          </div>
        )}
        {activeBook !== 'ditiansui' && content.subHint && (
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1 flex-wrap">
            <span>本八字：</span>
            {renderTouCangText(content.subHint.replace('本八字：', ''))}
          </div>
        )}

        {/* 滴天髓子标签 */}
        {activeBook === 'ditiansui' && (
          <div className="flex mt-3 p-1 bg-secondary/50 rounded-lg border border-border/50">
            <button
              type="button"
              onClick={() => setDitiansuiSubTab('yuanwen')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${ditiansuiSubTab === 'yuanwen'
                ? 'bg-background text-foreground font-medium shadow-sm ring-1 ring-border/20'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              原文
            </button>
            <button
              type="button"
              onClick={() => setDitiansuiSubTab('logic')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${ditiansuiSubTab === 'logic'
                ? 'bg-background text-foreground font-medium shadow-sm ring-1 ring-border/20'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              逻辑解析
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 滴天髓：根据子标签显示不同内容 */}
        {activeBook === 'ditiansui' ? (
          <>
            {/* 原文标签：显示诗诀和原注 */}
            {ditiansuiSubTab === 'yuanwen' && (
              <div className="space-y-4">
                {/* 诗诀 */}
                <div className="bg-secondary/30 rounded-lg border border-border p-4">
                  <p className="text-sm text-foreground leading-relaxed font-serif">
                    {content.ditiansuiBasic?.poem || content.summary}
                  </p>
                </div>
                {/* 原注与任氏曰 */}
                {(content.ditiansuiBasic?.explanation || []).length > 0 && (
                  <div className="bg-secondary/30 rounded-lg border border-border">
                    <div className="p-3 border-b border-border/50">
                      <span className="text-sm font-medium text-foreground flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-accent" />
                        原注与任氏曰
                      </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {(content.ditiansuiBasic?.explanation || []).map((point, index) => (
                        <div
                          key={index}
                          className={`px-4 py-3 text-sm text-muted-foreground leading-relaxed ${index > 0 ? 'border-t border-border/30 pt-3' : ''}`}
                        >
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* 逻辑解析标签：显示结构化分析 */}
            {ditiansuiSubTab === 'logic' && content.keyPoints && content.keyPoints.length > 0 && (
              <div className="max-h-[32rem] overflow-y-auto space-y-3 pr-1">
                {content.keyPoints.map((point, index) => {
                  // 解析结构化内容（格式：**段落**\n【标签】\n推理\n💡现代意义）
                  const lines = point.split('\n');
                  const segmentMatch = lines[0]?.match(/\*\*(.+?)\*\*/);
                  const segment = segmentMatch ? segmentMatch[1] : lines[0];
                  const tagsMatch = lines[1]?.match(/【(.+?)】/);
                  const tags = tagsMatch ? tagsMatch[1].split('、') : [];
                  const reasoning = lines[2] || '';
                  const modernMatch = lines[3]?.match(/💡\s*(.+)/);
                  const modern = modernMatch ? modernMatch[1] : '';

                  return (
                    <div key={index} className="bg-secondary/30 rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{segment}</span>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {reasoning && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{reasoning}</p>
                      )}
                      {modern && (
                        <div className="text-sm text-foreground font-bold bg-secondary/50 rounded p-2 border-l-2 border-muted-foreground/30">
                          💡 {modern}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          // 其他书籍：正常显示
          <>
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
                    <BookOpen className="w-4 h-4 text-primary" />
                    {content.keyPointsTitle || '要点解析'}
                  </span>
                  {openSections.includes('keyPoints') ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {openSections.includes('keyPoints') && (
                  <div className="px-3 pb-3 max-h-96 overflow-y-auto pr-1">
                    {content.keyPoints.map((item, index) => {
                      // Markdown 渲染逻辑
                      const renderMarkdownText = (text: string) => {
                        const parts = text.split(/(\*\*.*?\*\*)/g);
                        return parts.map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return (
                              <span key={i} className="font-bold text-foreground">
                                {part.slice(2, -2)}
                              </span>
                            );
                          }
                          return <span key={i}>{part}</span>;
                        });
                      };

                      // 检查是否为Markdown格式（以###开头）
                      if (item.trim().startsWith('###')) {
                        const lines = item.split('\n');
                        return (
                          <div
                            key={index}
                            className={`
                          ${index !== 0 ? 'pt-4 border-t border-border/40 mt-4' : 'mb-4'}
                        `}
                          >
                            {lines.map((line, lineIdx) => {
                              if (line.trim().startsWith('###')) {
                                return (
                                  <div key={lineIdx} className="font-medium text-foreground text-sm mb-2 flex items-start gap-1.5 border-l-2 border-primary/40 pl-2">
                                    {renderMarkdownText(line.trim().replace(/^###\s*/, ''))}
                                  </div>
                                );
                              }
                              if (line.trim().startsWith('*')) {
                                return (
                                  <div key={lineIdx} className="flex gap-2 text-xs text-muted-foreground ml-2 mb-1.5 last:mb-0">
                                    <span className="text-primary/60 mt-[3px] flex-shrink-0 text-[10px]">●</span>
                                    <span className="leading-relaxed">
                                      {renderMarkdownText(line.trim().replace(/^\*\s*/, ''))}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div key={lineIdx} className="text-xs text-muted-foreground ml-2 mb-1 last:mb-0">
                                  {renderMarkdownText(line)}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      // 兼容旧格式（普通列表项）
                      return (
                        <div
                          key={item}
                          className={`flex gap-2 text-sm text-muted-foreground ${index !== 0 ? 'mt-2' : ''}`}
                        >
                          <span className="text-primary flex-shrink-0">•</span>
                          <span className="leading-relaxed">{renderMarkdownText(item)}</span>
                        </div>
                      );
                    })}
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
          </>
        )}
      </div>
    </div>
  );
}

