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
                        <div
                            key={i}
                            className="rounded-lg border border-border/50 bg-muted/30 p-3"
                        >
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                <span>{source.metadata.source}</span>
                                {source.metadata.page && (
                                    <span className="ml-auto">
                                        Page {source.metadata.page}
                                    </span>
                                )}
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/80">
                                {source.text}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}