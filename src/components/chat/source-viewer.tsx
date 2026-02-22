"use client";

import { Fragment, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Source } from "@/types";
import { FileText, Hash, Layers } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const PdfViewer = dynamic(() => import("./pdf-viewer"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
    ),
});

interface SourceViewerProps {
    source: Source | null;
    query: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/* ─── Keyword Highlighting ─── */

function extractKeywords(query: string): string[] {
    const stopWords = new Set([
        "a", "an", "the", "is", "are", "was", "were", "be", "been",
        "do", "does", "did", "will", "would", "could", "should", "may",
        "can", "has", "have", "had", "this", "that", "these", "those",
        "it", "its", "i", "me", "my", "we", "our", "you", "your",
        "he", "she", "they", "them", "his", "her", "their",
        "in", "on", "at", "to", "for", "of", "with", "by", "from",
        "and", "or", "but", "not", "no", "if", "so", "as",
        "what", "which", "who", "how", "when", "where", "why",
        "yang", "dan", "di", "ke", "dari", "ini", "itu", "dengan",
        "untuk", "pada", "adalah", "ada", "akan", "juga", "sudah",
        "tidak", "bisa", "saya", "apa", "bagaimana", "secara",
        "atau", "dalam", "oleh", "seperti", "agar", "saat",
        "tentang", "sebagai", "karena", "mereka", "telah",
    ]);

    return query
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.has(word))
        .filter((word, index, arr) => arr.indexOf(word) === index);
}

function highlightText(
    text: string,
    keywords: string[]
): { text: string; highlighted: boolean }[] {
    if (keywords.length === 0) return [{ text, highlighted: false }];

    const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(`(${escaped.join("|")})`, "gi");

    const segments: { text: string; highlighted: boolean }[] = [];
    let lastIndex = 0;

    text.replace(pattern, (match, _group, offset) => {
        if (offset > lastIndex) {
            segments.push({ text: text.slice(lastIndex, offset), highlighted: false });
        }
        segments.push({ text: match, highlighted: true });
        lastIndex = offset + match.length;
        return match;
    });

    if (lastIndex < text.length) {
        segments.push({ text: text.slice(lastIndex), highlighted: false });
    }

    return segments.length > 0 ? segments : [{ text, highlighted: false }];
}

/* ─── Score Bar ─── */

function ScoreBar({ score }: { score: number }) {
    const percentage = Math.round(score * 100);
    const color =
        score >= 0.7 ? "bg-emerald-500"
        : score >= 0.4 ? "bg-amber-500"
        : "bg-rose-500";
    const textColor =
        score >= 0.7 ? "text-emerald-600 dark:text-emerald-400"
        : score >= 0.4 ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Relevance</span>
                <span className={cn("font-medium", textColor)}>{percentage}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                    className={cn("h-full rounded-full transition-all", color)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

/* ─── Text Viewer ─── */

function TextViewer({ source, keywords }: { source: Source; keywords: string[] }) {
    const fullText = source.text || "";
    const segments = useMemo(() => highlightText(fullText, keywords), [fullText, keywords]);
    const matchCount = segments.filter((s) => s.highlighted).length;

    return (
        <div className="space-y-3">
            {matchCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                    {matchCount} keyword match{matchCount > 1 ? "es" : ""} found
                </p>
            )}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground/90">
                    {segments.map((segment, i) => (
                        <Fragment key={i}>
                            {segment.highlighted ? (
                                <mark className="rounded-sm bg-amber-400/30 px-0.5 text-foreground dark:bg-amber-500/25">
                                    {segment.text}
                                </mark>
                            ) : (
                                segment.text
                            )}
                        </Fragment>
                    ))}
                </p>
            </div>

            {source.snippet && source.snippet !== source.text && (
                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Relevant snippet
                    </p>
                    <div className="rounded-lg border-l-2 border-emerald-500/50 bg-emerald-500/5 p-3">
                        <p className="text-sm leading-6 text-foreground/80">{source.snippet}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Main Source Viewer ─── */

export function SourceViewer({ source, query, open, onOpenChange }: SourceViewerProps) {
    const keywords = useMemo(() => extractKeywords(query), [query]);
    const [activeTab, setActiveTab] = useState<"document" | "text">("document");

    if (!source) return null;

    const sourceName = source.source || String(source.metadata?.source || "Unknown source");
    const isPdf = sourceName.toLowerCase().endsWith(".pdf");
    const canShowPdf = isPdf && !!source.document_id;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full max-w-full flex-col gap-0 p-0 sm:max-w-xl"
            >
                {/* Header */}
                <SheetHeader className="border-b border-border/50 p-4 space-y-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
                        <SheetTitle className="text-sm font-medium truncate">
                            {sourceName}
                        </SheetTitle>
                    </div>

                    {/* Metadata badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {typeof source.page === "number" && (
                            <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
                                <Layers className="h-3 w-3" />
                                Page {source.page}
                            </span>
                        )}
                        {source.chunk_id && (
                            <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground">
                                <Hash className="h-3 w-3" />
                                {source.chunk_id.slice(0, 12)}
                            </span>
                        )}
                    </div>

                    {/* Score bar */}
                    {typeof source.score === "number" && <ScoreBar score={source.score} />}

                    {/* Tabs (only if PDF available) */}
                    {canShowPdf && (
                        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                            <button
                                onClick={() => setActiveTab("document")}
                                className={cn(
                                    "h-11 flex-1 rounded-md px-3 text-xs font-medium transition-colors",
                                    activeTab === "document"
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Document
                            </button>
                            <button
                                onClick={() => setActiveTab("text")}
                                className={cn(
                                    "h-11 flex-1 rounded-md px-3 text-xs font-medium transition-colors",
                                    activeTab === "text"
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Extracted Text
                            </button>
                        </div>
                    )}
                </SheetHeader>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                    {canShowPdf && activeTab === "document" ? (
                        <PdfViewer
                            documentId={source.document_id!}
                            initialPage={source.page || 1}
                        />
                    ) : (
                        <TextViewer source={source} keywords={keywords} />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
