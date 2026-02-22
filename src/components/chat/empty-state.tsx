"use client";

import { Button } from "@/components/ui/button";
import { formatIngestionError } from "@/lib/ingestion-error";
import { cn } from "@/lib/utils";
import { SessionInfo } from "@/types";
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    Menu,
    RefreshCw,
    Sparkles,
    Upload,
} from "lucide-react";

const PENDING_INGESTION = new Set(["queued", "processing"]);

interface EmptyStateProps {
    examplePrompts: string[];
    uploadedFiles: string[];
    sessionInfo: SessionInfo | null;
    isSessionLoading: boolean;
    sessionError: boolean;
    onRetry: () => void;
    onPromptSelect: (prompt: string) => void;
    onOpenSidebar?: () => void;
}

export function EmptyState({
    examplePrompts,
    uploadedFiles,
    sessionInfo,
    isSessionLoading,
    sessionError,
    onRetry,
    onPromptSelect,
    onOpenSidebar,
}: EmptyStateProps) {
    const ingestionStatus = sessionInfo?.ingestion_status || "idle";
    const isIngestionPending = PENDING_INGESTION.has(ingestionStatus);
    const hasFiles = uploadedFiles.length > 0 || (sessionInfo?.document_count ?? 0) > 0;
    const hasIngestionFailed = sessionInfo?.ingestion_status === "failed";
    const hasReadyWarnings = sessionInfo?.ingestion_status === "ready_with_warnings";
    const ingestionErrorInfo = formatIngestionError(sessionInfo);
    const hasIngestionWarning =
        ingestionErrorInfo.severity === "warning";
    const hasIngestionIssueData =
        !!sessionInfo?.ingestion_error ||
        !!sessionInfo?.ingestion_error_code ||
        (sessionInfo?.ingestion_warnings?.length ?? 0) > 0 ||
        (sessionInfo?.file_results?.length ?? 0) > 0;
    const canAsk =
        hasFiles &&
        !isIngestionPending &&
        !hasIngestionFailed &&
        !isSessionLoading &&
        !sessionError;

    const helperText = hasIngestionFailed
        ? hasIngestionWarning
            ? "The uploaded image could not be converted into readable text."
            : "Document ingestion failed. Please upload documents again."
        : hasReadyWarnings
          ? "Some files were skipped, but your processed documents are ready for questions."
        : isIngestionPending
          ? "Documents are being processed. You can ask questions as soon as indexing is complete."
          : hasFiles
            ? "Your documents are ready. Ask your first question to start chatting with Synapse."
            : "Upload your first document to begin a grounded AI conversation.";

    const statusLabel = hasIngestionFailed
        ? hasIngestionWarning
            ? "No text detected"
            : "Ingestion failed"
        : hasReadyWarnings
          ? "Ready with warnings"
        : isIngestionPending
          ? `Processing (${ingestionStatus})`
          : hasFiles
            ? "Ready to ask"
            : "No document yet";

    return (
        <div className="flex min-h-[60vh] w-full items-center justify-center px-3 py-8 sm:px-4 sm:py-10">
            <div className="w-full max-w-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/70 p-5 backdrop-blur-md sm:p-8">
                    <div className="relative z-10">
                        <div className="mb-4 flex justify-center">
                            <div
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                                    hasIngestionFailed &&
                                        (hasIngestionWarning
                                            ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                            : "border-destructive/35 bg-destructive/10 text-destructive"),
                                    isIngestionPending &&
                                        "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                                    !hasIngestionFailed &&
                                        !isIngestionPending &&
                                        hasReadyWarnings &&
                                        "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                                    !hasIngestionFailed &&
                                        !isIngestionPending &&
                                        hasFiles &&
                                        !hasReadyWarnings &&
                                        "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                                    !hasIngestionFailed &&
                                        !isIngestionPending &&
                                        !hasFiles &&
                                        "border-border/60 bg-card/70 text-muted-foreground"
                                )}
                            >
                                {hasIngestionFailed ? (
                                    <AlertCircle className="h-3.5 w-3.5" />
                                ) : isIngestionPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : hasReadyWarnings ? (
                                    <AlertCircle className="h-3.5 w-3.5" />
                                ) : hasFiles ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                    <Upload className="h-3.5 w-3.5" />
                                )}
                                {statusLabel}
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                                <Sparkles className="h-5 w-5 text-emerald-500" />
                            </div>
                            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Synapse</h1>
                            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                                {helperText}
                            </p>
                        </div>

                        {isSessionLoading && (
                            <div className="mt-5 flex justify-center">
                                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Loading your session...
                                </div>
                            </div>
                        )}

                        {sessionError && !isSessionLoading && (
                            <div className="mt-5">
                                <p className="text-sm text-destructive">Failed to connect to server.</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
                                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                    Retry
                                </Button>
                            </div>
                        )}

                        {(hasIngestionFailed || hasReadyWarnings) && hasIngestionIssueData && (
                            <div
                                className={cn(
                                    "mx-auto mt-5 max-w-lg rounded-lg border px-3 py-2 text-sm",
                                    hasIngestionWarning || hasReadyWarnings
                                        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                        : "border-destructive/30 bg-destructive/10 text-destructive"
                                )}
                            >
                                <p className="font-medium">{ingestionErrorInfo.title}</p>
                                <p className="mt-1">{ingestionErrorInfo.description}</p>
                                {ingestionErrorInfo.hint && (
                                    <p className="mt-1 text-xs opacity-90">{ingestionErrorInfo.hint}</p>
                                )}
                            </div>
                        )}

                        {!hasFiles && !hasIngestionFailed && (
                            <div className="mt-5 space-y-2 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Upload your first document to unlock grounded Q&A.
                                </p>
                                <p className="hidden text-xs text-muted-foreground sm:block">
                                    Use the left sidebar upload area to continue.
                                </p>
                                {onOpenSidebar && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="sm:hidden"
                                        onClick={onOpenSidebar}
                                    >
                                        <Menu className="mr-2 h-3.5 w-3.5" />
                                        Open Upload Menu
                                    </Button>
                                )}
                            </div>
                        )}

                        {canAsk && (
                            <p className="mt-5 text-center text-sm font-medium text-emerald-600 dark:text-emerald-300">
                                You are ready. Ask your first question.
                            </p>
                        )}

                        <div className="mt-7 sm:mt-8">
                            <p className="mb-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Try asking
                            </p>
                            <div className="grid gap-2 text-left max-sm:grid-cols-1 sm:grid-cols-2">
                                {examplePrompts.map((prompt, index) => (
                                    <button
                                        key={prompt}
                                        onClick={() => onPromptSelect(prompt)}
                                        disabled={!canAsk}
                                        className={cn(
                                            "rounded-lg border px-3 py-3 text-sm transition-colors",
                                            index === 0 &&
                                                canAsk &&
                                                "border-emerald-500/45 bg-emerald-500/10 text-foreground",
                                            canAsk
                                                ? "border-border/60 text-muted-foreground hover:border-emerald-500/45 hover:bg-muted/40 hover:text-foreground"
                                                : "cursor-not-allowed border-border/40 text-muted-foreground/60"
                                        )}
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
