"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
    ApiError,
    createSession,
    deleteSessionAPI,
    getHistory,
    getPreferencesAPI,
    getSessionInfoAPI,
    getSessionMessagesAPI,
    getUsageInsightsAPI,
    queryStream,
    saveMessageAPI,
    submitFeedbackAPI,
    updatePreferencesAPI,
    updateSessionTitleAPI,
    uploadFiles,
} from "@/lib/api";
import {
    AppSettings,
    ChatMessage as ChatMessageType,
    ChatSession,
    QueryFilters,
    SessionInfo,
    UsageResponse,
} from "@/types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Loader2, RefreshCw, RotateCcw, LogIn, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth, useClerk, UserButton } from "@clerk/nextjs";

const EXAMPLE_PROMPTS = {
    id: [
        "Rangkum dokumen ini secara lengkap",
        "Apa poin-poin utama dari dokumen?",
        "Jelaskan konsep kunci yang dibahas",
        "Buat daftar istilah penting beserta definisinya",
    ],
    en: [
        "Summarize this document completely",
        "What are the main points of the document?",
        "Explain the key concepts discussed",
        "Create a list of important terms and definitions",
    ],
};

const DEFAULT_SETTINGS: AppSettings = {
    language: "id",
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    top_k: null,
    rerank_top_k: null,
    include_debug: false,
    strict_grounding: true,
    enable_query_rewrite: true,
    filters: {},
    async_mode: true,
    enable_ocr: true,
    extract_tables: true,
};

const PENDING_INGESTION = new Set(["queued", "processing"]);
const BLOCKED_INGESTION = new Set(["queued", "processing", "failed"]);

interface DBMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
}

function sanitizeFilters(filters: QueryFilters): QueryFilters | null {
    const next: QueryFilters = {};

    if (filters.sources && filters.sources.length > 0) next.sources = filters.sources;
    if (filters.source_type) next.source_type = filters.source_type;
    if (typeof filters.page_from === "number") next.page_from = filters.page_from;
    if (typeof filters.page_to === "number") next.page_to = filters.page_to;
    if (filters.chunk_types && filters.chunk_types.length > 0) next.chunk_types = filters.chunk_types;
    if (filters.content_origin) next.content_origin = filters.content_origin;

    return Object.keys(next).length > 0 ? next : null;
}

export default function HomeClient() {
    const { userId, isLoaded } = useAuth();
    const { openSignIn } = useClerk();

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);

    const [isUploading, setIsUploading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isSessionReady, setIsSessionReady] = useState(false);
    const [isSessionLoading, setIsSessionLoading] = useState(false);
    const [sessionError, setSessionError] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [usageInfo, setUsageInfo] = useState<UsageResponse | null>(null);
    const [feedbackLoading, setFeedbackLoading] = useState<Record<string, boolean>>({});

    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const settingsTimeout = useRef<NodeJS.Timeout | null>(null);
    const initialized = useRef(false);

    const requireAuth = useCallback(() => {
        if (!userId) {
            openSignIn();
            return false;
        }
        return true;
    }, [userId, openSignIn]);

    const refreshUsage = useCallback(
        async (notifyIfQuotaEmpty = false) => {
            if (!userId) return;
            try {
                const usage = await getUsageInsightsAPI();
                setUsageInfo(usage);
                if (notifyIfQuotaEmpty && usage.quota.remaining_today <= 0) {
                    toast.error("Daily query quota reached", {
                        description: "Try again tomorrow or use a different API key quota.",
                    });
                }
            } catch (error) {
                console.error("Failed to refresh usage", error);
            }
        },
        [userId]
    );

    const handleNewSession = useCallback(async () => {
        if (!userId) {
            setSessionId(null);
            setMessages([]);
            setUploadedFiles([]);
            setSessionInfo(null);
            return;
        }

        setIsSessionLoading(true);
        setSessionError(false);
        setMessages([]);
        setUploadedFiles([]);
        setSessionId(null);
        setSessionInfo(null);

        try {
            const session = await createSession();
            setSessionId(session.session_id);

            const newSession: ChatSession = {
                id: session.session_id,
                title: "New Chat",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: [],
                files: [],
            };
            setSessions((prev) => [newSession, ...prev]);
            await refreshUsage(false);
        } catch (error) {
            console.error("Failed to create session:", error);
            setSessionError(true);
            toast.error("Failed to create new session");
        } finally {
            setIsSessionLoading(false);
        }
    }, [refreshUsage, userId]);

    const refreshSessionInfo = useCallback(
        async (targetSessionId: string, silent = false) => {
            if (!targetSessionId || !userId) return;

            try {
                const info = await getSessionInfoAPI(targetSessionId);
                if (targetSessionId === sessionId) {
                    setSessionInfo(info);
                }
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) {
                    if (targetSessionId === sessionId) {
                        setSessionInfo(null);
                        toast.error("Session expired or not found. Creating a new one.");
                        handleNewSession();
                    }
                    return;
                }

                if (!silent) {
                    console.error("Failed to fetch session info", error);
                    toast.error("Failed to refresh session status");
                }
            }
        },
        [handleNewSession, sessionId, userId]
    );

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const ingestionStatus = sessionInfo?.ingestion_status || "idle";
        setIsSessionReady(!!sessionId && !BLOCKED_INGESTION.has(ingestionStatus));
    }, [sessionId, sessionInfo?.ingestion_status]);

    useEffect(() => {
        if (!isLoaded || !userId || initialized.current) return;
        initialized.current = true;

        const loadData = async () => {
            try {
                const history = await getHistory();
                setSessions(history);

                if (history.length === 0) {
                    await handleNewSession();
                } else {
                    const mostRecent = history[0] as ChatSession;
                    setSessionId(mostRecent.id);
                    setIsSessionLoading(true);

                    try {
                        const msgs = await getSessionMessagesAPI(mostRecent.id);
                        const uiMessages: ChatMessageType[] = (msgs as DBMessage[]).map((m) => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                            timestamp: new Date(m.createdAt),
                        }));
                        setMessages(uiMessages);
                        setUploadedFiles(mostRecent.files?.map((f) => f.name) || []);
                    } finally {
                        setIsSessionLoading(false);
                    }

                    await refreshSessionInfo(mostRecent.id, true);
                }
            } catch (err) {
                console.error("Failed to load history", err);
                toast.error("Failed to load chat history");
            }

            try {
                const prefs = await getPreferencesAPI();
                if (prefs && Object.keys(prefs).length > 0) {
                    setSettings((prev) => ({ ...prev, ...prefs }));
                }
            } catch (err) {
                console.error("Failed to load settings", err);
            }

            refreshUsage(false);
        };

        loadData();
    }, [handleNewSession, isLoaded, refreshSessionInfo, refreshUsage, userId]);

    const wasLoggedIn = useRef(false);
    useEffect(() => {
        if (userId) {
            wasLoggedIn.current = true;
        } else if (isLoaded && !userId && wasLoggedIn.current) {
            setMessages([]);
            setSessions([]);
            setSessionId(null);
            setUploadedFiles([]);
            setSessionError(false);
            setSessionInfo(null);
            setUsageInfo(null);
            setSettings(DEFAULT_SETTINGS);
            initialized.current = false;
            wasLoggedIn.current = false;
        }
    }, [isLoaded, userId]);

    useEffect(() => {
        if (!userId || !sessionId || !sessionInfo?.ingestion_status) return;
        if (!PENDING_INGESTION.has(sessionInfo.ingestion_status)) return;

        const timer = setInterval(() => {
            refreshSessionInfo(sessionId, true);
        }, 3000);

        return () => clearInterval(timer);
    }, [refreshSessionInfo, sessionId, sessionInfo?.ingestion_status, userId]);

    const handleSettingsChange = (newSettings: AppSettings) => {
        if (!requireAuth()) return;

        setSettings(newSettings);

        if (settingsTimeout.current) clearTimeout(settingsTimeout.current);
        settingsTimeout.current = setTimeout(() => {
            updatePreferencesAPI(newSettings).catch((err) =>
                console.error("Failed to save prefs", err)
            );
        }, 1000);
    };

    const selectSession = async (session: ChatSession) => {
        setSessionId(session.id);
        setIsSessionLoading(true);
        setSessionError(false);
        try {
            const msgs = await getSessionMessagesAPI(session.id);
            const uiMessages: ChatMessageType[] = (msgs as DBMessage[]).map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.createdAt),
            }));
            setMessages(uiMessages);
            setUploadedFiles(session.files?.map((f) => f.name) || []);
            await refreshSessionInfo(session.id, true);
        } catch (error) {
            console.error("Failed to load session messages", error);
            toast.error("Failed to load conversation");
        } finally {
            setIsSessionLoading(false);
        }
    };

    const handleSelectSession = (session: ChatSession) => {
        if (session.id === sessionId) return;
        selectSession(session);
        setSidebarOpen(false);
    };

    const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteSessionAPI(id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
            toast.success("Chat deleted");
            await refreshUsage(false);

            if (sessionId === id) {
                handleNewSession();
            }
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Failed to delete chat");
        }
    };

    const handleUpload = async (files: File[]) => {
        if (!requireAuth()) return;
        if (!sessionId) return;

        setIsUploading(true);
        try {
            const result = await uploadFiles(sessionId, files, {
                async_mode: settings.async_mode,
                enable_ocr: settings.enable_ocr,
                extract_tables: settings.extract_tables,
            });

            const fileNames = files.map((f) => f.name);
            setUploadedFiles((prev) => [...prev, ...fileNames]);
            setSessions((prev) =>
                prev.map((s) => {
                    if (s.id === sessionId) {
                        const newFiles = files.map((f) => ({ name: f.name, type: f.type }));
                        return { ...s, files: [...(s.files || []), ...newFiles] };
                    }
                    return s;
                })
            );

            await refreshSessionInfo(sessionId, true);

            if (result.ingestion_status === "queued") {
                toast.success("Files queued for ingestion", {
                    description: "You can query after status becomes ready.",
                });
            } else {
                toast.success(`${fileNames.join(", ")} uploaded successfully`);
            }
        } catch (error) {
            console.error("Upload failed:", error);

            if (error instanceof ApiError && error.status === 404) {
                toast.error("Session expired. Creating a new one.");
                handleNewSession();
                return;
            }

            if (error instanceof ApiError && error.status === 429) {
                toast.error("Upload rate limit reached. Try again shortly.");
                return;
            }

            toast.error("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsStreaming(false);
            toast.info("Generation stopped");
        }
    };

    const handleRegenerate = () => {
        if (!requireAuth()) return;
        if (isStreaming || messages.length === 0) return;

        const lastUserMsg = messages.findLast((m) => m.role === "user");
        if (!lastUserMsg) return;

        handleSend(lastUserMsg.content);
    };

    const handleSend = async (content: string) => {
        if (!requireAuth()) return;
        if (!sessionId || isStreaming) return;

        if (usageInfo && usageInfo.quota.remaining_today <= 0) {
            toast.error("Daily query quota reached");
            return;
        }

        const ingestionStatus = sessionInfo?.ingestion_status || "idle";
        if (PENDING_INGESTION.has(ingestionStatus)) {
            toast.info("Documents are still being processed. Please wait until ready.");
            return;
        }

        if (ingestionStatus === "failed") {
            toast.error("Document ingestion failed", {
                description: sessionInfo?.ingestion_error || "Please upload documents again.",
            });
            return;
        }

        if (uploadedFiles.length === 0) {
            toast.error("Please upload a document first before asking questions.", {
                description: "Synapse needs a document to answer your questions.",
            });
            return;
        }

        const shouldUpdateTitle = !messages.some((m) => m.role === "user");

        const userMessage: ChatMessageType = {
            id: Date.now().toString(),
            role: "user",
            content,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        const assistantId = (Date.now() + 1).toString();
        const assistantMessage: ChatMessageType = {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isStreaming: true,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsStreaming(true);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await queryStream(
                sessionId,
                {
                    question: content,
                    language: settings.language,
                    model: settings.model,
                    temperature: settings.temperature,
                    top_k: settings.top_k,
                    rerank_top_k: settings.rerank_top_k,
                    include_debug: settings.include_debug,
                    strict_grounding: settings.strict_grounding,
                    enable_query_rewrite: settings.enable_query_rewrite,
                    filters: sanitizeFilters(settings.filters),
                },
                abortController.signal
            );

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No reader available");

            let fullContent = "";
            let sseBuffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                sseBuffer += decoder.decode(value, { stream: true });
                const events = sseBuffer.split("\n\n");
                sseBuffer = events.pop() || "";

                for (const event of events) {
                    const dataLines = event
                        .split("\n")
                        .filter((line) => line.startsWith("data: "));

                    for (const line of dataLines) {
                        const data = line.slice(6).trim();
                        if (!data || data === "[DONE]") continue;

                        let parsed: Record<string, unknown>;
                        try {
                            parsed = JSON.parse(data) as Record<string, unknown>;
                        } catch (parseError) {
                            console.warn("SSE parse error", parseError);
                            continue;
                        }

                        if (parsed.error) {
                            throw new Error(String(parsed.error));
                        }

                        if (typeof parsed.chunk === "string") {
                            fullContent += parsed.chunk;
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === assistantId ? { ...msg, content: fullContent } : msg
                                )
                            );
                        }

                        if (
                            parsed.sources !== undefined ||
                            parsed.model_used !== undefined ||
                            parsed.rewritten_query !== undefined ||
                            parsed.grounded !== undefined ||
                            parsed.grounding_score !== undefined ||
                            parsed.debug !== undefined
                        ) {
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === assistantId
                                        ? {
                                              ...msg,
                                              sources:
                                                  (parsed.sources as ChatMessageType["sources"]) ||
                                                  msg.sources,
                                              model_used:
                                                  (parsed.model_used as string | undefined) ||
                                                  msg.model_used,
                                              rewritten_query:
                                                  (parsed.rewritten_query as
                                                      | string
                                                      | null
                                                      | undefined) ?? msg.rewritten_query,
                                              grounded:
                                                  (parsed.grounded as boolean | undefined) ??
                                                  msg.grounded,
                                              grounding_score:
                                                  (parsed.grounding_score as number | undefined) ??
                                                  msg.grounding_score,
                                              debug:
                                                  (parsed.debug as ChatMessageType["debug"]) ??
                                                  msg.debug,
                                          }
                                        : msg
                                )
                            );
                        }
                    }
                }
            }

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantId ? { ...msg, isStreaming: false } : msg
                )
            );

            if (fullContent) {
                await saveMessageAPI(sessionId, "assistant", fullContent);
            }

            if (shouldUpdateTitle) {
                const newTitle = content.slice(0, 50) + (content.length > 50 ? "..." : "");
                await updateSessionTitleAPI(sessionId, newTitle);
                setSessions((prev) =>
                    prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
                );
            }

            await refreshUsage(true);
        } catch (error: unknown) {
            if (error instanceof Error && error.name === "AbortError") {
                return;
            }

            if (error instanceof ApiError && error.status === 404) {
                toast.error("Session expired. Creating a new one.");
                handleNewSession();
            } else if (error instanceof ApiError && error.status === 429) {
                toast.error("Rate limit exceeded. Please wait and retry.");
                refreshUsage(false);
            } else {
                const message = error instanceof Error ? error.message : "Response failed.";
                toast.error(message);
            }

            const errorMessage = error instanceof Error ? error.message : "Response failed.";
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantId
                        ? {
                              ...msg,
                              content: `Error: ${errorMessage}`,
                              isStreaming: false,
                          }
                        : msg
                )
            );
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const handleFeedback = async (assistantMessageId: string, rating: -1 | 1) => {
        if (!requireAuth()) return;
        if (!sessionId) return;

        const assistantIndex = messages.findIndex((msg) => msg.id === assistantMessageId);
        if (assistantIndex === -1) return;

        const assistantMessage = messages[assistantIndex];
        if (assistantMessage.role !== "assistant") return;

        const questionMessage = [...messages.slice(0, assistantIndex)]
            .reverse()
            .find((msg) => msg.role === "user");

        if (!questionMessage || !assistantMessage.content.trim()) {
            toast.error("Cannot send feedback for empty response");
            return;
        }

        setFeedbackLoading((prev) => ({ ...prev, [assistantMessageId]: true }));

        try {
            await submitFeedbackAPI(sessionId, {
                question: questionMessage.content,
                answer: assistantMessage.content,
                rating,
                metadata: {
                    model_used: assistantMessage.model_used,
                    grounded: assistantMessage.grounded,
                    grounding_score: assistantMessage.grounding_score,
                },
            });

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, feedbackRating: rating } : msg
                )
            );
            toast.success("Feedback submitted");
            refreshUsage(false);
        } catch (error) {
            console.error("Failed to submit feedback", error);
            if (error instanceof ApiError && error.status === 404) {
                toast.error("Session expired. Creating a new one.");
                handleNewSession();
            } else {
                toast.error("Failed to submit feedback");
            }
        } finally {
            setFeedbackLoading((prev) => ({ ...prev, [assistantMessageId]: false }));
        }
    };

    const sidebarProps = {
        onUpload: handleUpload,
        onNewSession: handleNewSession,
        onSelectSession: handleSelectSession,
        onDeleteSession: handleDeleteSession,
        sessions,
        currentSessionId: sessionId,
        uploadedFiles,
        isUploading,
        settings,
        onSettingsChange: handleSettingsChange,
        sessionInfo,
    };

    if (!isLoaded) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const usageBlocked = !!usageInfo && usageInfo.quota.remaining_today <= 0;

    return (
        <div className="flex h-dvh overflow-hidden bg-background">
            <div className="hidden md:block h-full">
                <AppSidebar {...sidebarProps} />
            </div>

            <div className="flex flex-1 flex-col min-h-0">
                <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-md px-4 py-3 md:hidden">
                    <div className="flex items-center gap-3">
                        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="shrink-0">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
                                <AppSidebar {...sidebarProps} />
                            </SheetContent>
                        </Sheet>
                        <h1 className="text-lg font-semibold">Synapse</h1>
                    </div>

                    {!userId ? (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => openSignIn()}
                            className="gap-2"
                        >
                            <LogIn className="h-4 w-4" />
                            Sign In
                        </Button>
                    ) : (
                        <UserButton afterSignOutUrl="/" />
                    )}
                </div>

                {usageBlocked && (
                    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
                        <div className="mx-auto flex max-w-3xl items-center gap-2">
                            <AlertTriangle className="h-3 w-3" />
                            Daily query quota reached. Query input is temporarily disabled.
                        </div>
                    </div>
                )}

                <div
                    className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden p-0 md:p-4"
                    ref={scrollRef}
                >
                    <div className="mx-auto max-w-3xl w-full flex flex-col gap-4">
                        {messages.length === 0 ? (
                            <div className="flex h-full min-h-[60vh] items-center justify-center">
                                <div className="text-center">
                                    <h1 className="text-4xl font-bold">Synapse</h1>
                                    <p className="mt-2 text-muted-foreground">
                                        Upload documents and start asking questions
                                    </p>

                                    {isSessionLoading && (
                                        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm">Connecting to server...</span>
                                        </div>
                                    )}

                                    {sessionError && !isSessionLoading && (
                                        <div className="mt-6">
                                            <p className="text-sm text-destructive">
                                                Failed to connect to server
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-3"
                                                onClick={handleNewSession}
                                            >
                                                <RefreshCw className="mr-2 h-3 w-3" />
                                                Retry
                                            </Button>
                                        </div>
                                    )}

                                    {sessionInfo &&
                                        PENDING_INGESTION.has(sessionInfo.ingestion_status || "") && (
                                            <div className="mt-6 flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm">
                                                    Documents are being processed (
                                                    {sessionInfo.ingestion_status})
                                                </span>
                                            </div>
                                        )}

                                    {sessionInfo?.ingestion_status === "failed" && (
                                        <div className="mt-6 text-sm text-destructive">
                                            Ingestion failed:{" "}
                                            {sessionInfo.ingestion_error || "unknown error"}
                                        </div>
                                    )}

                                    {(!userId || (isSessionReady && !isSessionLoading && !sessionError)) && (
                                        <div className="mt-8 grid gap-2 sm:grid-cols-2 text-left max-w-lg mx-auto">
                                            {EXAMPLE_PROMPTS[settings.language as "id" | "en"]?.map(
                                                (prompt) => (
                                                    <button
                                                        key={prompt}
                                                        onClick={() => handleSend(prompt)}
                                                        className="rounded-lg border border-border/50 p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                                                    >
                                                        {prompt}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <ChatMessage
                                        key={msg.id}
                                        message={msg}
                                        onFeedback={
                                            msg.role === "assistant"
                                                ? (rating) => handleFeedback(msg.id, rating)
                                                : undefined
                                        }
                                        isSubmittingFeedback={feedbackLoading[msg.id]}
                                    />
                                ))}

                                {!isStreaming &&
                                    messages.length > 0 &&
                                    messages[messages.length - 1].role === "assistant" && (
                                        <div className="flex justify-center pt-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleRegenerate}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <RotateCcw className="mr-2 h-3 w-3" />
                                                Regenerate Response
                                            </Button>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 p-4">
                    <div className="mx-auto w-full max-w-3xl">
                        <ChatInput
                            onSend={handleSend}
                            disabled={isStreaming || (!!userId && (!isSessionReady || usageBlocked))}
                            isStreaming={isStreaming}
                            onStop={handleStop}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
