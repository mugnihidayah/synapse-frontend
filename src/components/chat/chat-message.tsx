"use client";

import { useState } from "react";
import { ChatMessage as ChatMessageType } from "@/types";
import { cn } from "@/lib/utils";
import { Bot, User, Copy, Check, Download } from "lucide-react";
import { SourceCards } from "./source-cards";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.min.css";

interface ChatMessageProps {
    message: ChatMessageType;
}

function ThinkingDots() {
    return (
        <div className="flex items-center gap-1 py-2">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
        </div>
    );
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([message.content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `synapse-response-${message.id}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const isThinking = !isUser && message.isStreaming && message.content === "";

    return (
        <div
            className={cn(
                "group relative flex gap-3 px-3 py-6 sm:gap-4 sm:px-6",
                isUser ? "bg-transparent" : "bg-muted/20"
            )}
        >
            <div
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-emerald-600 text-white"
                )}
            >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                        {isUser ? "You" : "Synapse"}
                    </p>
                    <span className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                        }).format(new Date(message.timestamp))}
                    </span>
                </div>

                {isThinking ? (
                    <ThinkingDots />
                ) : (
                    <div className="prose prose-invert w-full max-w-full break-words prose-p:leading-7 prose-headings:mb-3 prose-headings:mt-6 prose-li:my-1 prose-ul:my-2 prose-ol:my-2">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]} 
                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                            components={{
                                table: ({ ...props }) => (
                                    <div className="my-4 block w-full max-w-[calc(100vw-6rem)] overflow-x-auto rounded-lg border border-border/50 bg-card/30">
                                        <table {...props} className="w-full min-w-[500px]" />
                                    </div>
                                ),
                                pre: ({ ...props }) => (
                                    <div className="my-3 block w-full max-w-[calc(100vw-6rem)] overflow-x-auto rounded-lg bg-black/40">
                                        <pre {...props} className="p-4 min-w-full" />
                                    </div>
                                ),
                                code: ({ ...props }) => (
                                    <code {...props} className="break-words px-1 py-0.5 rounded-sm bg-muted/50 font-mono text-sm" />
                                )
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                        {message.isStreaming && (
                            <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary" />
                        )}
                    </div>
                )}

                {message.sources && <SourceCards sources={message.sources} />}
            </div>

            {/* Actions - only for assistant messages with content */}
            {!isUser && message.content && !message.isStreaming && (
                <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        onClick={handleCopy}
                        className="rounded-md p-1.5 text-muted-foreground/50 hover:bg-muted hover:text-foreground"
                        title="Copy response"
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="rounded-md p-1.5 text-muted-foreground/50 hover:bg-muted hover:text-foreground"
                        title="Download as Markdown"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}