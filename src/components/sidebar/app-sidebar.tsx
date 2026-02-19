"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Plus, Loader2, CheckCircle2, Trash2, MessageSquare, FileCode, FileImage, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsPanel } from "./settings-panel";
import { AppSettings, ChatSession } from "@/types";
import { UserButton, useAuth, useClerk } from "@clerk/nextjs";

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
}: AppSidebarProps) {
    const { userId } = useAuth();
    const { openSignIn } = useClerk();
    const [isDragging, setIsDragging] = useState(false);

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

    return (
        <div className="flex h-screen w-72 shrink-0 flex-col border-r border-border/40 bg-card/50 backdrop-blur-xl overflow-y-auto">
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

                {/* Upload Area - Only show if active session exists */}
                {currentSessionId && (
                    <div className="p-4">
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
                                accept=".pdf,.txt,.docx,.md"
                                onChange={handleFileSelect}
                                className="absolute inset-0 cursor-pointer opacity-0"
                                disabled={isUploading}
                            />
                        </div>

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
                    </div>
                )}
            </div>

            <Separator />

            {/* Footer: User & Settings */}
            <div className="p-4 space-y-4">
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