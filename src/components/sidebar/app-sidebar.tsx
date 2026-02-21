"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Upload,
    FileText,
    Plus,
    Loader2,
    CheckCircle2,
    Trash2,
    MessageSquare,
    FileCode,
    FileImage,
    LogIn,
    RefreshCw,
    Download,
    KeyRound,
    Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsPanel } from "./settings-panel";
import { ApiKeyInfo, AppSettings, ChatSession, SessionDocumentItem, SessionInfo, UsageResponse } from "@/types";
import { UserButton, useAuth, useClerk } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import {
    createApiKeyAPI,
    deleteApiKeyAPI,
    exportSessionAPI,
    getApiKeysAPI,
    getSessionDocumentsAPI,
    getSupportedFormatsAPI,
    getUsageInsightsAPI,
} from "@/lib/api";
import { toast } from "sonner";

interface AppSidebarProps {
    onUpload: (files: File[]) => Promise<void>;
    onNewSession: () => void;
    onSelectSession: (session: ChatSession) => void;
    onDeleteSession: (id: string, e: React.MouseEvent) => void;
    sessions: ChatSession[];
    currentSessionId: string | null;
    uploadedFiles: string[];
    isUploading: boolean;
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
    sessionInfo?: SessionInfo | null;
}

export function AppSidebar({
    onUpload,
    onNewSession,
    onSelectSession,
    onDeleteSession,
    sessions,
    currentSessionId,
    uploadedFiles,
    isUploading,
    settings,
    onSettingsChange,
    sessionInfo,
}: AppSidebarProps) {
    const { userId } = useAuth();
    const { openSignIn } = useClerk();
    const [isDragging, setIsDragging] = useState(false);
    const [formatsText, setFormatsText] = useState("");
    const [documents, setDocuments] = useState<SessionDocumentItem[]>([]);
    const [docPage, setDocPage] = useState(1);
    const [docTotal, setDocTotal] = useState(0);
    const [docSearch, setDocSearch] = useState("");
    const [docSource, setDocSource] = useState("");
    const [isDocsLoading, setIsDocsLoading] = useState(false);
    const [usage, setUsage] = useState<UsageResponse | null>(null);
    const [isUsageLoading, setIsUsageLoading] = useState(false);
    const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
    const [isKeysLoading, setIsKeysLoading] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyRateLimit, setNewKeyRateLimit] = useState(100);
    const [createdKey, setCreatedKey] = useState<string | null>(null);

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
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['js', 'ts', 'tsx', 'py', 'json', 'html', 'css', 'md'].includes(ext || '')) return FileCode;
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return FileImage;
        return FileText;
    };

    const refreshUsage = useCallback(async () => {
        if (!userId) return;
        setIsUsageLoading(true);
        try {
            const data = await getUsageInsightsAPI();
            setUsage(data);
        } catch (error) {
            console.error("Failed to load usage", error);
        } finally {
            setIsUsageLoading(false);
        }
    }, [userId]);

    const refreshKeys = useCallback(async () => {
        if (!userId) return;
        setIsKeysLoading(true);
        try {
            const data = await getApiKeysAPI();
            setApiKeys(data);
        } catch (error) {
            console.error("Failed to load keys", error);
        } finally {
            setIsKeysLoading(false);
        }
    }, [userId]);

    const refreshDocuments = useCallback(async () => {
        if (!userId || !currentSessionId) return;
        setIsDocsLoading(true);
        try {
            const data = await getSessionDocumentsAPI(currentSessionId, {
                page: docPage,
                page_size: 10,
                source: docSource || undefined,
                search: docSearch || undefined,
            });
            setDocuments(data.items || []);
            setDocTotal(data.total || 0);
        } catch (error) {
            console.error("Failed to load documents", error);
        } finally {
            setIsDocsLoading(false);
        }
    }, [currentSessionId, docPage, docSearch, docSource, userId]);

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

        refreshUsage();
        refreshKeys();
    }, [userId, refreshUsage, refreshKeys]);

    useEffect(() => {
        refreshDocuments();
    }, [refreshDocuments, uploadedFiles.length]);

    const handleExport = async (format: "markdown" | "json") => {
        if (!currentSessionId) return;
        try {
            const { blob, filename } = await exportSessionAPI(currentSessionId, format);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("Session exported");
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to export session");
        }
    };

    const handleCreateKey = async () => {
        try {
            const res = await createApiKeyAPI({
                name: newKeyName || null,
                rate_limit: newKeyRateLimit,
            });
            setCreatedKey(res.api_key);
            setNewKeyName("");
            toast.success("API key created");
            await refreshKeys();
        } catch (error) {
            console.error("Create key failed", error);
            toast.error("Failed to create API key");
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        try {
            await deleteApiKeyAPI(keyId);
            toast.success("API key revoked");
            await refreshKeys();
        } catch (error) {
            console.error("Delete key failed", error);
            toast.error("Failed to revoke API key");
        }
    };

    const totalDocPages = Math.max(1, Math.ceil(docTotal / 10));
    const ingestionStatus = sessionInfo?.ingestion_status || (sessionInfo?.is_ready ? "ready" : "idle");

    return (
        <div className="flex h-full w-72 shrink-0 flex-col border-r border-border/40 bg-card/50 backdrop-blur-xl overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4">
                <h2 className="text-lg font-semibold">Synapse</h2>
                <Button variant="ghost" size="icon" onClick={onNewSession} title="New Chat">
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
                                    currentSessionId === session.id && "bg-muted text-foreground font-medium"
                                )}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">{session.title}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
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
                                <div className="mb-3 rounded-md border border-border/40 bg-muted/20 p-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Ingestion</span>
                                        <span
                                            className={cn(
                                                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                                ingestionStatus === "ready" &&
                                                    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                                                ingestionStatus === "failed" &&
                                                    "bg-rose-500/15 text-rose-600 dark:text-rose-400",
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
                                    {sessionInfo?.ingestion_error && (
                                        <p className="mt-1 text-[11px] text-destructive">
                                            {sessionInfo.ingestion_error}
                                        </p>
                                    )}
                                </div>

                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                                        isDragging
                                            ? "border-primary bg-primary/10"
                                            : "border-muted-foreground/25 hover:border-muted-foreground/50"
                                    )}
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    ) : (
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                    )}
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {isUploading ? "Processing..." : "Drop files here"}
                                    </p>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.txt,.docx,.md,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/x-markdown,image/png,image/jpeg,image/webp"
                                        onChange={handleFileSelect}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                        disabled={isUploading}
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
                                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-muted/30"
                                                >
                                                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                    <span className="truncate flex-1">{file}</span>
                                                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="mt-4 space-y-2 rounded-md border border-border/40 p-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <p className="font-medium text-foreground">Document Chunks</p>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6"
                                            onClick={refreshDocuments}
                                        >
                                            <RefreshCw className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            value={docSearch}
                                            onChange={(e) => {
                                                setDocPage(1);
                                                setDocSearch(e.target.value);
                                            }}
                                            className="h-7 text-xs"
                                            placeholder="Search..."
                                        />
                                        <Input
                                            value={docSource}
                                            onChange={(e) => {
                                                setDocPage(1);
                                                setDocSource(e.target.value);
                                            }}
                                            className="h-7 text-xs"
                                            placeholder="Source file..."
                                        />
                                    </div>
                                    {isDocsLoading ? (
                                        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Loading chunks...
                                        </div>
                                    ) : documents.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">No chunks found</p>
                                    ) : (
                                        <div className="max-h-44 space-y-1 overflow-y-auto">
                                            {documents.map((doc) => (
                                                <div key={doc.chunk_id} className="rounded border border-border/40 p-2">
                                                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                                        <span className="truncate">{doc.source || "Unknown source"}</span>
                                                        {typeof doc.page === "number" && (
                                                            <span>p.{doc.page}</span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 line-clamp-3 text-[11px] text-muted-foreground">
                                                        {doc.preview}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-[11px]">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[11px]"
                                            disabled={docPage <= 1}
                                            onClick={() => setDocPage((prev) => Math.max(1, prev - 1))}
                                        >
                                            Prev
                                        </Button>
                                        <span className="text-muted-foreground">
                                            Page {docPage}/{totalDocPages}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[11px]"
                                            disabled={docPage >= totalDocPages}
                                            onClick={() =>
                                                setDocPage((prev) => Math.min(totalDocPages, prev + 1))
                                            }
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <Separator />

            {/* Footer: User & Settings */}
            <div className="p-4 space-y-4">
                <div className="space-y-2 rounded-md border border-border/40 p-3">
                    <div className="flex items-center justify-between">
                        <p className="flex items-center gap-1 text-xs font-medium">
                            <Gauge className="h-3 w-3" />
                            Usage & Quota
                        </p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={refreshUsage}
                        >
                            {isUsageLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3 w-3" />
                            )}
                        </Button>
                    </div>
                    {usage ? (
                        <div className="space-y-1 text-[11px] text-muted-foreground">
                            <p>Today: {usage.quota.used_today}/{usage.quota.daily_limit}</p>
                            <p>Remaining: {usage.quota.remaining_today}</p>
                            <p>Total Queries: {usage.total_queries}</p>
                            <p>Total Feedback: {usage.total_feedback}</p>
                        </div>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">No usage data</p>
                    )}
                </div>

                {currentSessionId && (
                    <div className="space-y-2 rounded-md border border-border/40 p-3">
                        <p className="text-xs font-medium">Export Session</p>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleExport("markdown")}
                            >
                                <Download className="mr-1 h-3 w-3" />
                                Markdown
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleExport("json")}
                            >
                                <Download className="mr-1 h-3 w-3" />
                                JSON
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-2 rounded-md border border-border/40 p-3">
                    <p className="flex items-center gap-1 text-xs font-medium">
                        <KeyRound className="h-3 w-3" />
                        API Keys
                    </p>
                    <Input
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Key name (optional)"
                    />
                    <Input
                        type="number"
                        min={1}
                        value={newKeyRateLimit}
                        onChange={(e) => setNewKeyRateLimit(Number(e.target.value) || 100)}
                        className="h-7 text-xs"
                        placeholder="Rate limit"
                    />
                    <Button
                        size="sm"
                        className="h-7 w-full text-xs"
                        onClick={handleCreateKey}
                    >
                        Create Key
                    </Button>
                    {createdKey && (
                        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2">
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                Copy now, key is shown once:
                            </p>
                            <p className="mt-1 break-all font-mono text-[10px] text-foreground">
                                {createdKey}
                            </p>
                        </div>
                    )}
                    {isKeysLoading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading keys...
                        </div>
                    ) : apiKeys.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No active key metadata</p>
                    ) : (
                        <div className="space-y-2">
                            {apiKeys.map((key) => (
                                <div key={key.key_id} className="rounded border border-border/40 p-2">
                                    <p className="truncate text-[11px] font-medium text-foreground">
                                        {key.name || key.key_id}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Limit: {key.rate_limit}/min
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="mt-1 h-6 w-full text-[10px]"
                                        onClick={() => handleDeleteKey(key.key_id)}
                                    >
                                        Revoke
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <SettingsPanel settings={settings} onSettingsChange={onSettingsChange} />
                
                {userId ? (
                    <div className="flex items-center gap-3 px-2">
                        <UserButton 
                            afterSignOutUrl="/" 
                            appearance={{
                                elements: {
                                    avatarBox: "h-8 w-8"
                                }
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
