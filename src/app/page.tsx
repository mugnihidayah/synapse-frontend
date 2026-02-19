"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { createSession, uploadFiles, queryStream, getHistory, getSessionMessagesAPI, deleteSessionAPI, saveMessageAPI, updateSessionTitleAPI, getPreferencesAPI, updatePreferencesAPI } from "@/lib/api";
import { ChatMessage as ChatMessageType, AppSettings, ChatSession } from "@/types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Loader2, RefreshCw, RotateCcw, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useAuth, useClerk } from "@clerk/nextjs";

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
    ]
};

export default function Home() {
    const { userId, isLoaded } = useAuth();
    const { openSignIn } = useClerk();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    
    // Helper to enforce auth
    const requireAuth = useCallback(() => {
        if (!userId) {
            openSignIn();
            return false;
        }
        return true;
    }, [userId, openSignIn]);
    
    // UI States
    const [isUploading, setIsUploading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    // isSessionReady determines if we can chat (must have session ID)
    const [isSessionReady, setIsSessionReady] = useState(false); 
    const [isSessionLoading, setIsSessionLoading] = useState(false);
    const [sessionError, setSessionError] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Settings
    const [settings, setSettings] = useState<AppSettings>({
        language: "id",
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
    });
    
    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const settingsTimeout = useRef<NodeJS.Timeout | null>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Update isSessionReady based on sessionId
    useEffect(() => {
        setIsSessionReady(!!sessionId);
    }, [sessionId]);

    // Prevent double-fetching in strict mode
    const initialized = useRef(false);

    // Load History and Settings on Mount
    useEffect(() => {
        if (!isLoaded || !userId || initialized.current) return;
        initialized.current = true;

        const loadData = async () => {
            // 1. Load History
            try {
                const history = await getHistory();
                setSessions(history);
                
                if (history.length === 0) {
                    handleNewSession();
                } else {
                     const mostRecent = history[0];
                     selectSession(mostRecent);
                }
            } catch (err) {
                console.error("Failed to load history", err);
                toast.error("Failed to load chat history");
            }

            // 2. Load Settings
            try {
                const prefs = await getPreferencesAPI();
                if (prefs && Object.keys(prefs).length > 0) {
                    setSettings(prev => ({ ...prev, ...prefs }));
                }
            } catch (err) {
                console.error("Failed to load settings", err);
            }
        };

        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, userId]);

    // Cleanup on Logout
    const wasLoggedIn = useRef(false);
    useEffect(() => {
        if (userId) {
            wasLoggedIn.current = true;
        } else if (isLoaded && !userId && wasLoggedIn.current) {
            // User just logged out - clear potentially sensitive state
            setMessages([]);
            setSessions([]);
            setSessionId(null);
            setUploadedFiles([]);
            setSessionError(false);
            setSettings({
                language: "id",
                model: "llama-3.3-70b-versatile",
                temperature: 0.3,
            });
            initialized.current = false;
            wasLoggedIn.current = false;
        }
    }, [isLoaded, userId]);

    // Handle Settings Change with Debounce Save
    const handleSettingsChange = (newSettings: AppSettings) => {
        if (!requireAuth()) return; // Trigger auth for settings change

        setSettings(newSettings);
        
        if (settingsTimeout.current) clearTimeout(settingsTimeout.current);
        settingsTimeout.current = setTimeout(() => {
             updatePreferencesAPI(newSettings).catch(err => console.error("Failed to save prefs", err));
        }, 1000);
    };

    const selectSession = async (session: ChatSession) => {
        setSessionId(session.id);
        setIsSessionLoading(true);
        try {
            const msgs = await getSessionMessagesAPI(session.id);
            interface DBMessage {
                id: string;
                role: "user" | "assistant";
                content: string;
                createdAt: string;
            }
            const uiMessages: ChatMessageType[] = msgs.map((m: DBMessage) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.createdAt),
            }));
            setMessages(uiMessages);
            
            // Map DB files to uploadedFiles state (string[])
            const fileNames = session.files?.map(f => f.name) || [];
            setUploadedFiles(fileNames);
            
        } catch (error) {
            console.error("Failed to load session messages", error);
            toast.error("Failed to load conversation");
        } finally {
            setIsSessionLoading(false);
        }
    };

    const handleNewSession = useCallback(async () => {
        if (!userId) {
            // Guest: Just reset local state
            setSessionId(null);
            setMessages([]);
            setUploadedFiles([]);
            return;
        }

        setIsSessionLoading(true);
        setSessionError(false);
        setMessages([]);
        setUploadedFiles([]);
        setSessionId(null); 
        
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
            setSessions(prev => [newSession, ...prev]);
            
        } catch (error) {
            console.error("Failed to create session:", error);
            setSessionError(true);
            toast.error("Failed to create new session");
        } finally {
            setIsSessionLoading(false);
        }
    }, [userId]);

    const handleSelectSession = (session: ChatSession) => {
        if (session.id === sessionId) return;
        selectSession(session);
        setSidebarOpen(false);
    };

    const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteSessionAPI(id);
            setSessions(prev => prev.filter(s => s.id !== id));
            toast.success("Chat deleted");
            
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
            await uploadFiles(sessionId, files);
            const fileNames = files.map((f) => f.name);
            setUploadedFiles((prev) => [...prev, ...fileNames]);
            
            // Update the session in the list to include the new files
            setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    const newFiles = files.map(f => ({ name: f.name, type: f.type }));
                    // Append to existing files
                    return { ...s, files: [...(s.files || []), ...newFiles] };
                }
                return s;
            }));

            toast.success(`${fileNames.join(", ")} uploaded successfully`);
        } catch (error) {
            console.error("Upload failed:", error);
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
        
        // Find last user message
        const lastUserMsg = messages.findLast(m => m.role === "user");
        if (!lastUserMsg) return;

        // Call handleSend with that message content
        // Note: New assistant message will be appended. We could optionally remove the last failed assistant message.
        handleSend(lastUserMsg.content);
    };

    const handleSend = async (content: string) => {
        if (!requireAuth()) return;

        if (!sessionId || isStreaming) return;

        if (uploadedFiles.length === 0) {
            toast.error("Please upload a document first before asking questions.", {
                description: "Synapse needs a document to answer your questions."
            });
            return;
        }

        // 1. Add User Message
        const userMessage: ChatMessageType = {
            id: Date.now().toString(), 
            role: "user",
            content,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // 2. Add Placeholder Assistant Message
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

        // Setup AbortController
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await queryStream(sessionId, {
                question: content,
                language: settings.language,
                model: settings.model,
                temperature: settings.temperature,
            }, abortController.signal);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No reader available");

            let fullContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        if (data === "[DONE]") continue;

                        try {
                            const parsed = JSON.parse(data);

                            if (parsed.error) {
                                throw new Error(parsed.error);
                            }

                            if (parsed.chunk !== undefined) {
                                fullContent += parsed.chunk;
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === assistantId
                                            ? { ...msg, content: fullContent }
                                            : msg
                                    )
                                );
                            }

                            if (parsed.sources) {
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === assistantId
                                            ? {
                                                  ...msg,
                                                  sources: parsed.sources,
                                                  model_used: parsed.model_used,
                                              }
                                            : msg
                                    )
                                );
                            }
                        } catch (e) {
                             console.warn("Parse error", e);
                        }
                    } else if (line.startsWith("error: ")) {
                         const errorMsg = line.slice(7);
                         throw new Error(errorMsg);
                    }
                }
            }

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantId
                        ? { ...msg, isStreaming: false }
                        : msg
                )
            );
            
            // Save assistant message to DB
            try {
                if (fullContent) {
                    await saveMessageAPI(sessionId, "assistant", fullContent);
                }
                
                if (messages.length <= 1) {
                    const newTitle = content.slice(0, 50) + (content.length > 50 ? "..." : "");
                    await updateSessionTitleAPI(sessionId, newTitle);
                    
                    setSessions(prev => prev.map(s => 
                        s.id === sessionId ? { ...s, title: newTitle } : s
                    ));
                }

            } catch (saveError) {
                console.error("Failed to save message or update title", saveError);
            }

        } catch (error: unknown) {
             // Ignore abort errors
            if (error instanceof Error && error.name === 'AbortError') {
                console.log("Stream aborted");
                return;
            }

            console.error("Stream failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Response failed.";
            toast.error(errorMessage);
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
        onSettingsChange: handleSettingsChange, // Use wrapper
    };

    if (!isLoaded) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // REMOVED: if (!userId) return null;

    return (
        <div className="flex h-[100dvh] overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block h-full">
                <AppSidebar {...sidebarProps} />
            </div>

            {/* Main Chat Area */}
            <div className="flex flex-1 flex-col min-h-0">
                {/* Mobile Header */}
                <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 md:hidden">
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
                    
                    {!userId && (
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => openSignIn()}
                            className="gap-2"
                        >
                            <LogIn className="h-4 w-4" />
                            Sign In
                        </Button>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                    <div className="mx-auto max-w-3xl">
                        {messages.length === 0 ? (
                            <div className="flex h-full min-h-[60vh] items-center justify-center">
                                <div className="text-center">
                                    <h1 className="text-4xl font-bold">Synapse</h1>
                                    <p className="mt-2 text-muted-foreground">
                                        Upload documents and start asking questions
                                    </p>

                                    {/* Session loading state */}
                                    {isSessionLoading && (
                                        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm">Connecting to server...</span>
                                        </div>
                                    )}

                                    {/* Session error with retry */}
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

                                    {/* Example prompts */}
                                    {/* Show example prompts for guests too (isSessionReady check might fail for guests, so we relax it) */}
                                    {(!userId || (isSessionReady && !isSessionLoading && !sessionError)) && (
                                        <div className="mt-8 grid gap-2 sm:grid-cols-2 text-left max-w-lg mx-auto">
                                            {EXAMPLE_PROMPTS[settings.language as "id" | "en"]?.map((prompt) => (
                                                <button
                                                    key={prompt}
                                                    onClick={() => handleSend(prompt)}
                                                    className="rounded-lg border border-border/50 p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                                                >
                                                    {prompt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <ChatMessage key={msg.id} message={msg} />
                                ))}
                                
                                {/* Regenerate Button */}
                                {!isStreaming && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
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

                {/* Input */}
                <div className="border-t border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 p-4">
                    <div className="mx-auto w-full max-w-3xl">
                        <ChatInput
                            onSend={handleSend}
                            // Enable input for guests (userId null) so they can trigger auth
                            disabled={isStreaming || (!!userId && !isSessionReady)}
                            isStreaming={isStreaming}
                            onStop={handleStop}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}