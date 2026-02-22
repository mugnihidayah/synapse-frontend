"use client";

import { useState } from "react";
import { Source } from "@/types";
import { ChevronDown, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceViewer } from "./source-viewer";

interface SourceCardsProps {
    sources: Source[];
    query?: string;
}

export function SourceCards({ sources, query = "" }: SourceCardsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSource, setSelectedSource] = useState<Source | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);

    if (!sources || sources.length === 0) return null;

    const handleCardClick = (source: Source) => {
        setSelectedSource(source);
        setViewerOpen(true);
    };

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
                            <button
                                key={i}
                                onClick={() => handleCardClick(source)}
                                className="group w-full text-left rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50 hover:border-border"
                            >
                                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                                    <FileText className="h-3 w-3" />
                                    <span className="max-w-[52%] truncate sm:max-w-[58%]">
                                        {source.source ||
                                            String(source.metadata?.source || "Unknown source")}
                                    </span>
                                    {typeof source.page === "number" && (
                                        <span className="rounded bg-muted px-1.5 py-0.5">
                                            Page {source.page}
                                        </span>
                                    )}
                                    {typeof source.score === "number" && (
                                        <span
                                            className={cn(
                                                "rounded px-1.5 py-0.5",
                                                source.score >= 0.7
                                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                    : source.score >= 0.4
                                                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                            )}
                                        >
                                            {(source.score * 100).toFixed(0)}%
                                        </span>
                                    )}
                                    <ExternalLink className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-100" />
                                    {source.chunk_id && (
                                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                                            {source.chunk_id.slice(0, 8)}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/80 line-clamp-2">
                                    {source.snippet || source.text}
                                </p>
                            </button>
                        ))}
                </div>
            )}

            <SourceViewer
                source={selectedSource}
                query={query}
                open={viewerOpen}
                onOpenChange={setViewerOpen}
            />
        </div>
    );
}
