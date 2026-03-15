"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Upload,
    FileText,
    Plus,
    Loader2,
    AlertCircle,
    Trash2,
    MessageSquare,
    FileCode,
    FileImage,
    LogIn,
} from "lucide-react";
import { formatIngestionError } from "@/lib/ingestion-error";
import { cn } from "@/lib/utils";
import { SettingsModal } from "@/components/settings-modal";
import { AppSettings, ChatSession, SessionInfo, UploadProgress } from "@/types";
import { UserButton, useAuth, useClerk } from "@clerk/nextjs";
import { getSupportedFormatsAPI } from "@/lib/api";

interface AppSidebarProps {
    onUpload: (files: File[]) => void;
    onNewSession: () => void;
    onSelectSession: (session: ChatSession) => void;
    onDeleteSession: (id: string, e: React.MouseEvent) => void;
    sessions: ChatSession[];
    currentSessionId: string | null;
    uploadedFiles: string[];
    uploadProgress: UploadProgress;
    onRetryUpload: () => void;
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
    sessionInfo?: SessionInfo | null;
    onDeleteDocument: (fileName: string) => Promise<void>;
}

export function AppSidebar({
    onUpload,
    onNewSession,
    onSelectSession,
    onDeleteSession,
    sessions,
    currentSessionId,
    uploadedFiles,
    uploadProgress,
    onRetryUpload,
    settings,
    onSettingsChange,
    sessionInfo,
    onDeleteDocument,
}: AppSidebarProps) {
    const { userId } = useAuth();
    const { openSignIn } = useClerk();
    const [isDragging, setIsDragging] = useState(false);
    const [formatsText, setFormatsText] = useState("");

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) onUpload(files);
        },
        [onUpload]
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) onUpload(files);
            e.target.value = "";
        },
        [onUpload]
    );

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split(".").pop()?.toLowerCase();
        if (["js", "ts", "tsx", "py", "json", "html", "css", "md"].includes(ext || ""))
            return FileCode;
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return FileImage;
        return FileText;
    };

    useEffect(() => {
        if (!userId) return;

        getSupportedFormatsAPI()
            .then((res) => {
                const formats = Array.isArray(res.formats) ? res.formats : [];
                if (formats.length > 0) {
                    setFormatsText(formats.join(", "));
                }
            })
            .catch((error) => {
                console.error("Failed to load supported formats", error);
            });
    }, [userId]);

    const ingestionStatus =
        sessionInfo?.ingestion_status || (sessionInfo?.is_ready ? "ready" : "idle");
    const ingestionErrorInfo = formatIngestionError(sessionInfo);
    const hasIngestionWarning =
        ingestionStatus === "ready_with_warnings" || ingestionErrorInfo.severity === "warning";
    const hasIngestionIssueData =
        !!sessionInfo?.ingestion_error ||
        !!sessionInfo?.ingestion_error_code ||
        (sessionInfo?.ingestion_warnings?.length ?? 0) > 0 ||
        (sessionInfo?.file_results?.length ?? 0) > 0;
    const shouldShowIngestionDetails =
        (ingestionStatus === "failed" || ingestionStatus === "ready_with_warnings") &&
        hasIngestionIssueData;
    const isUploadLocked =
        uploadProgress.status === "uploading" || uploadProgress.status === "processing";

    const uploadLabel =
        uploadProgress.status === "uploading"
            ? "Uploading..."
            : uploadProgress.status === "processing"
              ? "Processing..."
              : "Drop files here";

    return (
        <div className="flex h-full w-72 shrink-0 flex-col border-r border-border/40 bg-card/50 backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4">
                <h2 className="text-lg font-semibold">Synapse</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onNewSession}
                    title="New Chat"
                    className="h-10 w-10"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <Separator />

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                    <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        History
                    </p>
                    {sessions.length === 0 ? (
                        <p className="px-2 text-xs text-muted-foreground">No recent chats</p>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => onSelectSession(session)}
                                className={cn(
                                    "group flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted/50 cursor-pointer",
                                    "min-h-11",
                                    currentSessionId === session.id &&
                                        "bg-muted text-foreground font-medium"
                                )}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">{session.title}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                    onClick={(e) => onDeleteSession(session.id, e)}
                                >
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                <Separator className="my-2" />

                {/* Upload Area */}
                {userId && (
                    <div className="p-4">
                        {!currentSessionId ? (
                            <div className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
                                <p>No active session yet.</p>
                                <Button
                                    size="sm"
                                    className="mt-2 h-7 text-xs"
                                    onClick={onNewSession}
                                >
                                    Create Session
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Ingestion Status */}
                                <div className="mb-3 rounded-md border border-border/40 bg-muted/20 p-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Ingestion</span>
                                        <span
                                            className={cn(
                                                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                                ingestionStatus === "ready" &&
                                                    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                                                ingestionStatus === "ready_with_warnings" &&
                                                    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                                ingestionStatus === "failed" &&
                                                    (hasIngestionWarning
                                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"),
                                                (ingestionStatus === "queued" ||
                                                    ingestionStatus === "processing") &&
                                                    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                                ingestionStatus === "idle" &&
                                                    "bg-muted text-muted-foreground"
                                            )}
                                        >
                                            {ingestionStatus}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Docs: {sessionInfo?.document_count ?? uploadedFiles.length}
                                    </p>
                                    {shouldShowIngestionDetails && (
                                        <div className="mt-1 space-y-1 text-[11px]">
                                            <p
                                                className={cn(
                                                    hasIngestionWarning
                                                        ? "text-amber-600 dark:text-amber-400"
                                                        : "text-destructive"
                                                )}
                                            >
                                                {ingestionErrorInfo.title}
                                            </p>
                                            <p className="text-muted-foreground wrap-break-word">
                                                {ingestionErrorInfo.description}
                                            </p>
                                            {ingestionErrorInfo.hint && (
                                                <p className="text-muted-foreground">
                                                    {ingestionErrorInfo.hint}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Drop Zone */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={cn(
                                        "relative flex min-h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                                        isDragging
                                            ? "border-primary bg-primary/10"
                                            : "border-muted-foreground/25 hover:border-muted-foreground/50",
                                        isUploadLocked && "pointer-events-none opacity-90"
                                    )}
                                >
                                    {isUploadLocked ? (
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    ) : (
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                    )}
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {uploadLabel}
                                    </p>
                                    <p className="mt-1 text-center text-[11px] text-muted-foreground">
                                        Tap to browse or drag and drop files
                                    </p>

                                    {uploadProgress.status !== "idle" && (
                                        <div className="mt-4 w-full rounded-md border border-border/50 bg-background/60 p-3 text-xs">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="truncate text-muted-foreground">
                                                    {uploadProgress.fileName || "Uploading files"}
                                                </span>
                                                {uploadProgress.status === "uploading" && (
                                                    <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                                                        {uploadProgress.percent}%
                                                    </span>
                                                )}
                                            </div>

                                            {uploadProgress.status === "uploading" && (
                                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-500 transition-[width] duration-200"
                                                        style={{ width: `${uploadProgress.percent}%` }}
                                                    />
                                                </div>
                                            )}

                                            {uploadProgress.status === "processing" && (
                                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                    <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-500" />
                                                </div>
                                            )}

                                            {uploadProgress.status === "done" && (
                                                <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                                                    Upload complete. Processing started.
                                                </p>
                                            )}

                                            {uploadProgress.status === "error" && (
                                                <div className="mt-2 flex items-center justify-between gap-2">
                                                    <p className="flex min-w-0 items-center gap-1 truncate text-[11px] text-destructive">
                                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                        {uploadProgress.error || "Upload failed"}
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 min-h-8 px-2 text-[11px]"
                                                        onClick={onRetryUpload}
                                                    >
                                                        Retry
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.txt,.docx,.md,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/x-markdown,image/png,image/jpeg,image/webp"
                                        onChange={handleFileSelect}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                        disabled={isUploadLocked}
                                    />
                                </div>
                                {formatsText && (
                                    <p className="mt-2 text-[11px] text-muted-foreground">
                                        Supported: {formatsText}
                                    </p>
                                )}

                                {/* Uploaded Files */}
                                {uploadedFiles.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            DOCUMENTS ({uploadedFiles.length})
                                        </p>
                                        {uploadedFiles.map((file, i) => {
                                            const Icon = getFileIcon(file);
                                            return (
                                                    <div
                                                        key={i}
                                                        className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-muted/30"
                                                    >
                                                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <span className="truncate flex-1">{file}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteDocument(file);
                                                            }}
                                                            title="Delete document"
                                                        >
                                                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                        </Button>
                                                    </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            <Separator />

            {/* Footer: Settings & User */}
            <div className="p-4 space-y-4">
                <SettingsModal settings={settings} onSettingsChange={onSettingsChange} />

                {userId ? (
                    <div className="flex items-center gap-3 px-2">
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    avatarBox: "h-8 w-8",
                                },
                            }}
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Account</span>
                            <span className="text-xs text-muted-foreground">Manage profile</span>
                        </div>
                    </div>
                ) : (
                    <Button
                        onClick={() => openSignIn()}
                        className="w-full gap-2"
                        variant="default"
                    >
                        <LogIn className="h-4 w-4" />
                        Sign In
                    </Button>
                )}
            </div>
        </div>
    );
}
