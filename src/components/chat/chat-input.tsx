import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    isStreaming?: boolean;
    onStop?: () => void;
}

export function ChatInput({ onSend, disabled, isStreaming, onStop }: ChatInputProps) {
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
        <form onSubmit={handleSubmit} className="border-t border-border px-3 py-3 sm:p-4">
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
