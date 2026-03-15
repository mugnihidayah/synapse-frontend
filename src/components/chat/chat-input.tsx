import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Square, Sparkles, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    isStreaming?: boolean;
    onStop?: () => void;
    agentMode?: boolean;
    onAgentModeChange?: (mode: boolean) => void;
}

export function ChatInput({ onSend, disabled, isStreaming, onStop, agentMode, onAgentModeChange }: ChatInputProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }, [input]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="border-t border-border px-3 py-3 sm:p-4 bg-background">
            {onAgentModeChange && (
                <div className="mb-2 flex items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onAgentModeChange(!agentMode)}
                        className={cn(
                            "h-8 gap-1.5 rounded-full px-3 text-xs font-medium transition-all shadow-sm",
                            agentMode 
                                ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border border-primary/20" 
                                : "text-muted-foreground hover:bg-muted border border-transparent"
                        )}
                    >
                        {agentMode ? (
                            <Sparkles className="h-3.5 w-3.5" />
                        ) : (
                            <Bot className="h-3.5 w-3.5" />
                        )}
                        Agentic Mode: {agentMode ? "On" : "Off"}
                    </Button>
                </div>
            )}
            <div className="flex items-end gap-2 sm:gap-2.5">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your documents..."
                    disabled={disabled && !isStreaming}
                    rows={1}
                    className="min-h-11 flex-1 resize-none rounded-lg border border-input bg-background px-3.5 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 sm:text-sm"
                />
                {isStreaming ? (
                    <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={onStop}
                        className="h-11 w-11 shrink-0"
                    >
                        <Square className="h-4 w-4 fill-current" />
                    </Button>
                ) : (
                    <Button
                        type="submit"
                        size="icon"
                        disabled={disabled || !input.trim()}
                        className="h-11 w-11 shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </form>
    );
}
