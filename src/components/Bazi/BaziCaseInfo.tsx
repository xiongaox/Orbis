import { Copy, Edit2, Share2 } from 'lucide-react';

const caseInfo = {
  name: '案例6',
  gender: '坤造',
  lunar: '八月廿八 子时',
  solar: '1998年10月16日',
};

export default function BaziCaseInfo() {
  return (
    <div className="bg-card rounded-xl border border-border p-4 mx-6 mt-6 mb-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="font-display text-xl text-primary">案</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display text-lg font-medium text-foreground">{caseInfo.name}</h2>
              <span className="text-xs px-2 py-0.5 bg-secondary rounded text-muted-foreground">
                {caseInfo.gender}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>阴历：{caseInfo.lunar}</span>
              <span>阳历：{caseInfo.solar}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
