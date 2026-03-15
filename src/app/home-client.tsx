"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { EmptyState } from "@/components/chat/empty-state";
import { MessageSkeleton } from "@/components/chat/message-skeleton";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { HeroSection } from "@/components/landing/hero-section";
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
    deleteSessionDocumentAPI,
} from "@/lib/api";
import {
    formatIngestionDescription,
    formatIngestionError,
} from "@/lib/ingestion-error";
import {
    AppSettings,
    ChatMessage as ChatMessageType,
    ChatSession,
    QueryFilters,
    SessionInfo,
    UploadProgress,
    UsageResponse,
} from "@/types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
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
    agent_mode: false,
    max_agent_steps: 5,
};

const PENDING_INGESTION = new Set(["queued", "processing"]);
const BLOCKED_INGESTION = new Set(["queued", "processing", "failed"]);
const IDLE_UPLOAD_PROGRESS: UploadProgress = {
    status: "idle",
    percent: 0,
    fileName: "",
    files: [],
};

interface DBMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    metadata?: Record<string, unknown> | null;
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

    const [uploadProgress, setUploadProgress] = useState<UploadProgress>(IDLE_UPLOAD_PROGRESS);
    const [pendingUploadFiles, setPendingUploadFiles] = useState<File[] | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isSessionReady, setIsSessionReady] = useState(false);
    const [isSessionLoading, setIsSessionLoading] = useState(false);
    const [isSwitchingSession, setIsSwitchingSession] = useState(false);
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
            setUploadProgress(IDLE_UPLOAD_PROGRESS);
            setPendingUploadFiles(null);
            return;
        }

        setIsSessionLoading(true);
        setIsSwitchingSession(false);
        setSessionError(false);
        setMessages([]);
        setUploadedFiles([]);
        setSessionId(null);
        setSessionInfo(null);
        setUploadProgress(IDLE_UPLOAD_PROGRESS);
        setPendingUploadFiles(null);

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
            setUploadProgress(IDLE_UPLOAD_PROGRESS);
            setPendingUploadFiles(null);
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

    useEffect(() => {
        if (uploadProgress.status !== "processing") return;

        if (
            sessionInfo?.ingestion_status === "ready" ||
            sessionInfo?.ingestion_status === "ready_with_warnings"
        ) {
            setUploadProgress((prev) => ({
                ...prev,
                status: "done",
                percent: 100,
                error: undefined,
            }));
            return;
        }

        if (sessionInfo?.ingestion_status === "failed") {
            const ingestionInfo = formatIngestionError({
                ingestion_error: sessionInfo?.ingestion_error,
                ingestion_error_code: sessionInfo?.ingestion_error_code,
                ingestion_error_severity: sessionInfo?.ingestion_error_severity,
                ingestion_warnings: sessionInfo?.ingestion_warnings,
                file_results: sessionInfo?.file_results,
            });

            if (ingestionInfo.severity === "warning") {
                // A warning-only ingestion result should not keep upload progress in retry state.
                setUploadProgress((prev) => ({
                    ...prev,
                    status: "done",
                    percent: 100,
                    error: undefined,
                }));
                return;
            }

            const description = formatIngestionDescription({
                ingestion_error: sessionInfo?.ingestion_error,
                ingestion_error_code: sessionInfo?.ingestion_error_code,
                ingestion_error_severity: sessionInfo?.ingestion_error_severity,
                ingestion_warnings: sessionInfo?.ingestion_warnings,
                file_results: sessionInfo?.file_results,
            });
            setUploadProgress((prev) => ({
                ...prev,
                status: "error",
                error: description,
            }));
        }
    }, [
        sessionInfo?.file_results,
        sessionInfo?.ingestion_error,
        sessionInfo?.ingestion_error_code,
        sessionInfo?.ingestion_error_severity,
        sessionInfo?.ingestion_status,
        sessionInfo?.ingestion_warnings,
        uploadProgress.status,
    ]);

    useEffect(() => {
        if (uploadProgress.status !== "done") return;

        const timer = setTimeout(() => {
            setUploadProgress(IDLE_UPLOAD_PROGRESS);
        }, 2200);

        return () => clearTimeout(timer);
    }, [uploadProgress.status]);

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
        setIsSwitchingSession(true);
        setIsSessionLoading(true);
        setSessionError(false);
        setMessages([]);
        setUploadProgress(IDLE_UPLOAD_PROGRESS);
        try {
            const msgs = await getSessionMessagesAPI(session.id);
            const uiMessages: ChatMessageType[] = (msgs as DBMessage[]).map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.createdAt),
                ...(m.metadata && {
                    sources: m.metadata.sources as ChatMessageType["sources"],
                    grounded: m.metadata.grounded as boolean | undefined,
                    grounding_score: m.metadata.grounding_score as number | undefined,
                    rewritten_query: m.metadata.rewritten_query as string | null | undefined,
                    model_used: m.metadata.model_used as string | undefined,
                    debug: m.metadata.debug as ChatMessageType["debug"],
                }),
            }));
            setMessages(uiMessages);
            setUploadedFiles(session.files?.map((f) => f.name) || []);
            await refreshSessionInfo(session.id, true);
        } catch (error) {
            console.error("Failed to load session messages", error);
            toast.error("Failed to load conversation");
        } finally {
            setIsSessionLoading(false);
            setIsSwitchingSession(false);
        }
    };

    const handleSelectSession = (session: ChatSession) => {
        if (session.id === sessionId) return;
        selectSession(session);
        setSidebarOpen(false);
    };

    const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // 1. Optimistic Update
        const previousSessions = [...sessions];
        setSessions((prev) => prev.filter((s) => s.id !== id));

        if (sessionId === id) {
            handleNewSession();
        }

        // 2. Background API Call
        try {
            await deleteSessionAPI(id);
            toast.success("Chat deleted");
            refreshUsage(false).catch(console.error);
        } catch (error) {
            console.error("Delete session failed", error);
            toast.error("Failed to delete chat");
            // 3. Rollback on failure
            setSessions(previousSessions);
            if (sessionId === id) {
                // If we optimistically cleared the session, we can't easily undo the UI route back to the specific chat without more complex logic,
                // but at least the session reappears in the sidebar.
            }
        }
    };

    const handleDeleteDocument = async (fileName: string) => {
        if (!sessionId) return;

        // 1. Optimistic Update
        const previousUploadedFiles = [...uploadedFiles];
        const previousSessions = [...sessions];

        setUploadedFiles(prev => prev.filter(f => f !== fileName));
        setSessions(prev => prev.map(s => {
            if (s.id === sessionId) {
                return { ...s, files: s.files?.filter(f => f.name !== fileName) || [] };
            }
            return s;
        }));

        // 2. Background API Call
        try {
            await deleteSessionDocumentAPI(sessionId, fileName);
            toast.success("Document deleted");
            refreshSessionInfo(sessionId, true).catch(console.error);
        } catch (error) {
            console.error("Failed to delete document", error);
            toast.error("Failed to delete document");
            // 3. Rollback on failure
            setUploadedFiles(previousUploadedFiles);
            setSessions(previousSessions);
        }
    };

    const handleUpload = (files: File[]) => {
        if (!requireAuth()) return;
        if (!sessionId) return;
        if (uploadProgress.status === "uploading" || uploadProgress.status === "processing") {
            toast.info("Please wait for the current upload to finish.");
            return;
        }

        const fileNames = files.map((file) => file.name);
        const uploadLabel = fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files`;
        setPendingUploadFiles(files);
        
        // 1. Optimistic UI Updates
        setUploadProgress({
            status: "uploading",
            percent: 0,
            fileName: uploadLabel,
            files: fileNames,
            error: undefined,
        });
        
        const newFiles = files.map((f) => ({ name: f.name, type: f.type }));
        setUploadedFiles((prev) => [...prev, ...fileNames]);
        setSessions((prev) =>
            prev.map((s) => {
                if (s.id === sessionId) {
                    return { ...s, files: [...(s.files || []), ...newFiles] };
                }
                return s;
            })
        );

        // 2. Background Upload Process
        uploadFiles(sessionId, files, {
            async_mode: settings.async_mode,
            enable_ocr: settings.enable_ocr,
            extract_tables: settings.extract_tables,
        }, (percent) => {
            setUploadProgress((prev) => ({
                ...prev,
                status: "uploading",
                percent,
                fileName: uploadLabel,
                files: fileNames,
                error: undefined,
            }));
        }).then(async (result) => {
            const shouldShowProcessing =
                settings.async_mode ||
                result.ingestion_status === "queued" ||
                result.ingestion_status === "processing";

            setUploadProgress((prev) => ({
                ...prev,
                status: shouldShowProcessing ? "processing" : "done",
                percent: 100,
                fileName: uploadLabel,
                files: fileNames,
                error: undefined,
            }));

            await refreshSessionInfo(sessionId, true);
            setPendingUploadFiles(null);

            if (
                result.ingestion_status === "queued" ||
                result.ingestion_status === "processing"
            ) {
                toast.success("Files queued for ingestion", {
                    description: "You can query after status becomes ready.",
                });
            } else if (result.ingestion_status === "failed") {
                const issue = formatIngestionError(result);
                const description = formatIngestionDescription(result);
                if (issue.severity === "warning") {
                    toast.warning(issue.title, { description });
                    setUploadProgress((prev) => ({
                        ...prev,
                        status: "done",
                        percent: 100,
                        error: undefined,
                    }));
                } else {
                    toast.error(issue.title, { description });
                    setUploadProgress((prev) => ({
                        ...prev,
                        status: "error",
                        error: description,
                    }));
                }
            } else {
                const warningCount = result.summary?.warning_files ?? 0;
                const failedCount = result.summary?.failed_files ?? 0;
                const resultWarningsFromFiles =
                    result.file_results?.some(
                        (item) =>
                            String(item.status).toLowerCase() === "warning" ||
                            String(item.severity).toLowerCase() === "warning"
                    ) ?? false;
                const resultFailuresFromFiles =
                    result.file_results?.some(
                        (item) =>
                            String(item.status).toLowerCase() === "failed" ||
                            String(item.severity).toLowerCase() === "error"
                    ) ?? false;
                const hasResultWarning =
                    result.ingestion_status === "ready_with_warnings" ||
                    warningCount > 0 ||
                    resultWarningsFromFiles;
                const hasResultFailure = failedCount > 0 || resultFailuresFromFiles;

                if (hasResultWarning || hasResultFailure) {
                    const issue = formatIngestionError(result);
                    const description = formatIngestionDescription(result);
                    toast.warning("Upload completed with warnings", {
                        description:
                            description === "The document could not be processed."
                                ? "Some files could not be processed. Check ingestion details."
                                : description,
                    });
                    if (issue.severity === "error") {
                        setUploadProgress((prev) => ({
                            ...prev,
                            status: "error",
                            error: description,
                        }));
                    } else {
                        setUploadProgress((prev) => ({
                            ...prev,
                            status: "done",
                            percent: 100,
                            error: undefined,
                        }));
                    }
                } else {
                    toast.success("Upload successful", {
                        description: "Documents processed and ready for querying.",
                    });
                }
            }
        }).catch((error) => {
            console.error("Upload failed", error);
            
            // Rollback optimistic update
            setUploadedFiles((prev) => prev.filter((f) => !fileNames.includes(f)));
            setSessions((prev) =>
                prev.map((s) => {
                    if (s.id === sessionId) {
                        return { ...s, files: s.files?.filter((f) => !fileNames.includes(f.name)) || [] };
                    }
                    return s;
                })
            );

            if (error instanceof ApiError && error.status === 404) {
                toast.error("Session expired", {
                    description: "Creating a new session...",
                });
                handleNewSession();
                setUploadProgress({
                    status: "error",
                    percent: 0,
                    fileName: uploadLabel,
                    files: fileNames,
                    error: "Session expired while uploading.",
                });
                return;
            }

            if (error instanceof ApiError && error.status === 429) {
                toast.error("Upload rate limit reached. Try again shortly.");
                setUploadProgress({
                    status: "error",
                    percent: 0,
                    fileName: uploadLabel,
                    files: fileNames,
                    error: "Upload rate limit reached. Try again shortly.",
                });
                return;
            }

            toast.error("Upload failed. Please try again.");
            setUploadProgress({
                status: "error",
                percent: 0,
                fileName: uploadLabel,
                files: fileNames,
                error: error instanceof Error ? error.message : "Upload failed. Please try again.",
            });
        });
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
            const ingestionInfo = formatIngestionError(sessionInfo);
            const description = formatIngestionDescription(sessionInfo);
            if (ingestionInfo.severity === "warning") {
                toast.warning(ingestionInfo.title, { description });
            } else {
                toast.error("Document ingestion failed", { description });
            }
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
                    agent_mode: settings.agent_mode,
                    max_agent_steps: settings.max_agent_steps,
                },
                abortController.signal
            );

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No reader available");

            let fullContent = "";
            let sseBuffer = "";
            const streamMeta: Record<string, unknown> = {};

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

                        if (parsed.step) {
                            if (!streamMeta.agent_steps) streamMeta.agent_steps = [];
                            (streamMeta.agent_steps as unknown[]).push(parsed.step);

                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === assistantId
                                        ? {
                                              ...msg,
                                              agent_steps: (streamMeta.agent_steps as ChatMessageType["agent_steps"]) || [],
                                          }
                                        : msg
                                )
                            );
                            continue;
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
                            parsed.debug !== undefined ||
                            parsed.agent_steps !== undefined ||
                            parsed.agent_iterations !== undefined
                        ) {
                            // Accumulate metadata for persistence
                            if (parsed.sources) streamMeta.sources = parsed.sources;
                            if (parsed.model_used) streamMeta.model_used = parsed.model_used;
                            if (parsed.rewritten_query !== undefined) streamMeta.rewritten_query = parsed.rewritten_query;
                            if (parsed.grounded !== undefined) streamMeta.grounded = parsed.grounded;
                            if (parsed.grounding_score !== undefined) streamMeta.grounding_score = parsed.grounding_score;
                            if (parsed.debug) streamMeta.debug = parsed.debug;
                            if (parsed.agent_steps) streamMeta.agent_steps = parsed.agent_steps;
                            if (parsed.agent_iterations !== undefined) streamMeta.agent_iterations = parsed.agent_iterations;

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
                                              agent_steps:
                                                  (parsed.agent_steps as ChatMessageType["agent_steps"]) ||
                                                  msg.agent_steps,
                                              agent_iterations:
                                                  (parsed.agent_iterations as number | undefined) ??
                                                  msg.agent_iterations,
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
                await saveMessageAPI(
                    sessionId,
                    "assistant",
                    fullContent,
                    Object.keys(streamMeta).length > 0 ? streamMeta : null
                );
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

    const handleRetryUpload = () => {
        if (!pendingUploadFiles || pendingUploadFiles.length === 0) {
            setUploadProgress(IDLE_UPLOAD_PROGRESS);
            return;
        }
        handleUpload(pendingUploadFiles);
    };

    const sidebarProps = {
        onUpload: handleUpload,
        onNewSession: handleNewSession,
        onSelectSession: handleSelectSession,
        onDeleteSession: handleDeleteSession,
        sessions,
        currentSessionId: sessionId,
        uploadedFiles,
        uploadProgress,
        onRetryUpload: handleRetryUpload,
        settings,
        onSettingsChange: handleSettingsChange,
        sessionInfo,
        onDeleteDocument: handleDeleteDocument,
    };

    if (!isLoaded) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!userId) {
        return <HeroSection onGetStarted={() => openSignIn()} />;
    }

    const usageBlocked = !!usageInfo && usageInfo.quota.remaining_today <= 0;
    const languageKey = settings.language === "id" ? "id" : "en";

    return (
        <div className="flex h-dvh overflow-hidden bg-background">
            <div className="hidden md:block h-full">
                <AppSidebar {...sidebarProps} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col min-h-0">
                <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border/40 bg-background/80 px-3 py-2.5 backdrop-blur-md md:hidden">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-11 w-11 shrink-0"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
                                <AppSidebar {...sidebarProps} />
                            </SheetContent>
                        </Sheet>
                        <h1 className="truncate text-lg font-semibold">Synapse</h1>
                    </div>

                    <div className="shrink-0">
                        <UserButton afterSignOutUrl="/" />
                    </div>
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
                    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4">
                        {messages.length === 0 ? (
                            isSessionLoading && isSwitchingSession && !sessionError ? (
                                <MessageSkeleton />
                            ) : (
                                <EmptyState
                                    examplePrompts={EXAMPLE_PROMPTS[languageKey]}
                                    uploadedFiles={uploadedFiles}
                                    sessionInfo={sessionInfo}
                                    isSessionLoading={isSessionLoading}
                                    sessionError={sessionError}
                                    onRetry={handleNewSession}
                                    onPromptSelect={handleSend}
                                    onOpenSidebar={() => setSidebarOpen(true)}
                                />
                            )
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg, idx) => {
                                    const precedingQuery =
                                        msg.role === "assistant"
                                            ? [...messages.slice(0, idx)]
                                                  .reverse()
                                                  .find((m) => m.role === "user")?.content
                                            : undefined;

                                    return (
                                        <ChatMessage
                                            key={msg.id}
                                            message={msg}
                                            query={precedingQuery}
                                            onFeedback={
                                                msg.role === "assistant"
                                                    ? (rating) => handleFeedback(msg.id, rating)
                                                    : undefined
                                            }
                                            isSubmittingFeedback={feedbackLoading[msg.id]}
                                        />
                                    );
                                })}

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

                <div className="bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/60">
                    <div className="mx-auto w-full max-w-3xl">
                        <ChatInput
                            onSend={handleSend}
                            disabled={isStreaming || !isSessionReady || usageBlocked}
                            isStreaming={isStreaming}
                            onStop={handleStop}
                            agentMode={settings.agent_mode}
                            onAgentModeChange={(agent_mode) => handleSettingsChange({ ...settings, agent_mode })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
