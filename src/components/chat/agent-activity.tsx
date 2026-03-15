import { useState } from "react";
import { AgentStep } from "@/types";
import { ChevronDown, Loader2, BrainCircuit, FileSearch, CheckCircle2, MousePointerClick, Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

interface AgentActivityProps {
    steps?: AgentStep[];
    isStreaming?: boolean;
}

export function AgentActivity({ steps, isStreaming }: AgentActivityProps) {
    const [expanded, setExpanded] = useState(false);

    if (!steps || steps.length === 0) return null;

    const getIconForStep = (step: AgentStep) => {
        const typeStr = (step.step_type || "").toLowerCase();
        const contentStr = (step.content || "").toLowerCase();

        if (typeStr === "action") {
            if (step.tool_name === "retrieve") return <FileSearch className="h-4 w-4 text-blue-500" />;
            if (step.tool_name === "analyze") return <Zap className="h-4 w-4 text-purple-500" />;
            return <MousePointerClick className="h-4 w-4 text-blue-500" />;
        }
        if (typeStr === "observation") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        if (typeStr.includes("error") || contentStr.startsWith("error calling llm")) {
            return <AlertCircle className="h-4 w-4 text-destructive" />;
        }
        return <BrainCircuit className="h-4 w-4 text-indigo-500" />;
    };

    const isFinishedThinking = !isStreaming;

    return (
        <div className="mb-4 mt-2 w-full max-w-full overflow-hidden rounded-lg border border-border/50 bg-background shadow-sm">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between bg-muted/30 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                aria-expanded={expanded}
            >
                <div className="flex items-center gap-2">
                    {isStreaming ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                        <Sparkles className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium text-foreground/90">
                        {isFinishedThinking ? "Agent completed analysis" : "Agent is thinking"}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {steps.length} step{steps.length !== 1 && "s"}
                    </span>
                </div>
                <ChevronDown
                    className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")}
                />
            </button>

            {expanded && (
                <div className="flex flex-col gap-3 border-t border-border/50 p-4 bg-muted/10 text-sm">
                    {steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                            <div className="mt-0.5 shrink-0">{getIconForStep(step)}</div>
                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium capitalize text-foreground/80">
                                        {step.step_type.replace(/_/g, " ")}
                                    </span>
                                    {step.tool_name && (
                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                            {step.tool_name}
                                        </span>
                                    )}
                                </div>
                                <div className={cn(
                                    "prose prose-sm prose-invert max-w-none text-muted-foreground wrap-break-word",
                                    (step.step_type.toLowerCase().includes("error") || step.content.startsWith("Error")) && "text-destructive/90 font-medium"
                                )}>
                                    {step.step_type === "Final_answer" ? (
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm, remarkMath]} 
                                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                        >
                                            {step.content}
                                        </ReactMarkdown>
                                    ) : (
                                        step.content
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isStreaming && (
                        <div className="flex gap-3 animate-pulse">
                            <div className="mt-0.5 shrink-0"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" /></div>
                            <div className="h-4 w-32 rounded bg-muted"></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Sparkles icon is imported, but not provided from lucide-react in previous component if it was missing?
// Yes we can import Sparkles.
function Sparkles(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
    );
}
