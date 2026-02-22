import { cn } from "@/lib/utils";

const BUBBLE_WIDTHS = ["w-[72%]", "w-[58%]", "w-[80%]", "w-[62%]", "w-[76%]"];

export function MessageSkeleton() {
    return (
        <div className="space-y-4 px-3 py-6 sm:px-6 animate-in fade-in-0 duration-300">
            {BUBBLE_WIDTHS.map((width, index) => {
                const isAssistant = index % 2 === 0;

                return (
                    <div
                        key={index}
                        className={cn("flex w-full", isAssistant ? "justify-start" : "justify-end")}
                    >
                        <div
                            className={cn(
                                "flex items-start gap-3",
                                isAssistant ? "max-w-[92%]" : "max-w-[82%] flex-row-reverse"
                            )}
                        >
                            {isAssistant && (
                                <div className="h-8 w-8 shrink-0 rounded-full bg-muted animate-pulse" />
                            )}
                            <div
                                className={cn(
                                    "rounded-2xl bg-muted/70 animate-pulse p-4",
                                    width
                                )}
                            >
                                <div className="h-3 w-24 rounded bg-muted-foreground/20" />
                                <div className="mt-3 h-3 w-full rounded bg-muted-foreground/20" />
                                <div className="mt-2 h-3 w-[82%] rounded bg-muted-foreground/20" />
                                {isAssistant && (
                                    <div className="mt-4 flex gap-2">
                                        <div className="h-8 w-24 rounded-lg bg-muted-foreground/15" />
                                        <div className="h-8 w-20 rounded-lg bg-muted-foreground/15" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
