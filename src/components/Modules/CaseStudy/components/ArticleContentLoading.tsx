import { LoaderCircle } from 'lucide-react';

export default function ArticleContentLoading() {
    return (
        <section
            className="max-w-3xl mx-auto py-10 sm:py-16 animate-in fade-in duration-300"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="flex items-center gap-3 text-muted-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                </span>
                <div>
                    <p className="font-serif text-sm text-foreground/85">正在取回文章内容</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">公共案例库响应中，请稍候</p>
                </div>
            </div>

            <div className="mt-8 space-y-4" aria-hidden="true">
                <div className="h-4 w-11/12 animate-pulse rounded bg-muted/70" />
                <div className="h-4 w-full animate-pulse rounded bg-muted/60 [animation-delay:120ms]" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted/50 [animation-delay:240ms]" />
                <div className="mt-8 h-4 w-10/12 animate-pulse rounded bg-muted/60 [animation-delay:360ms]" />
                <div className="h-4 w-full animate-pulse rounded bg-muted/50 [animation-delay:480ms]" />
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted/40 [animation-delay:600ms]" />
            </div>
        </section>
    );
}
