"use client";

import { useState } from "react";
import { Source } from "@/types";
import { ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceCardsProps {
    sources: Source[];
}

export function SourceCards({ sources }: SourceCardsProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronDown
                    className={cn(
                        "h-3 w-3 transition-transform",
                        isOpen && "rotate-180"
                    )}
                />
                {sources.length} source{sources.length > 1 ? "s" : ""}
            </button>

            {isOpen && (
                <div className="mt-2 space-y-2">
                    {sources.map((source, i) => (
                        <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                <span className="max-w-[60%] truncate">
                                    {source.source ||
                                        String(source.metadata?.source || "Unknown source")}
                                </span>
                                {typeof source.page === "number" && (
                                    <span className="rounded bg-muted px-1.5 py-0.5">
                                        Page {source.page}
                                    </span>
                                )}
                                {typeof source.score === "number" && (
                                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">
                                        Score {source.score.toFixed(2)}
                                    </span>
                                )}
                                {source.chunk_id && (
                                    <span className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono">
                                        {source.chunk_id.slice(0, 8)}
                                    </span>
                                )}
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/80">
                                {source.snippet || source.text}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
