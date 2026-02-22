"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ArrowRight,
    BrainCircuit,
    CheckCircle2,
    FileStack,
    Globe2,
    Languages,
    Quote,
    Search,
    ShieldCheck,
    Sparkles,
} from "lucide-react";

interface HeroSectionProps {
    onGetStarted: () => void;
}

const FEATURE_CARDS = [
    {
        title: "Upload Any Document",
        description: "PDF and image ingestion with OCR and table extraction support.",
        icon: FileStack,
    },
    {
        title: "AI-Powered Answers",
        description: "RAG-based responses grounded in your uploaded knowledge base.",
        icon: BrainCircuit,
    },
    {
        title: "Source Verification",
        description: "Open each citation and inspect original context before trusting answers.",
        icon: ShieldCheck,
    },
    {
        title: "Multi-language",
        description: "Ask and answer in Indonesian or English with one workspace.",
        icon: Globe2,
    },
];

const FLOW_STEPS = [
    {
        title: "Upload",
        description: "Drop PDFs or images into one secure workspace.",
        icon: FileStack,
    },
    {
        title: "Ask",
        description: "Ask natural questions in English or Indonesian.",
        icon: Search,
    },
    {
        title: "Verify",
        description: "Inspect citations before you trust the answer.",
        icon: ShieldCheck,
    },
];

const TRUST_POINTS = [
    "Source-backed answers",
    "Supports OCR + tables",
    "Built for multilingual use",
];

const ASSURANCE_POINTS = [
    "Every answer links to source context",
    "Designed for internal docs and policy files",
    "Fast setup, no complex onboarding",
];

export function HeroSection({ onGetStarted }: HeroSectionProps) {
    return (
        <div className="relative min-h-dvh overflow-x-hidden bg-background">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.25),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.16),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.08),transparent_45%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.08)_1px,transparent_1px)] [background-size:42px_42px] opacity-20" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(16,185,129,0.06)_30%,transparent_60%)] animate-synapse-shimmer" />
            <div className="absolute -left-24 top-32 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl animate-synapse-float" />
            <div className="absolute -right-16 top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl [animation-delay:0.7s] animate-synapse-float" />

            <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-14 pt-16 sm:px-6 sm:pt-20 lg:px-10">
                <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
                    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            <Sparkles className="h-3.5 w-3.5" />
                            Retrieval-Augmented Document Intelligence
                        </div>

                        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                            Synapse turns your documents into{" "}
                            <span className="bg-gradient-to-r from-emerald-500 to-emerald-300 bg-clip-text text-transparent dark:from-emerald-400 dark:to-emerald-200">
                                answers you can verify
                            </span>
                        </h1>

                        <p className="mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
                            Upload internal documents, ask complex questions, and get grounded AI
                            responses with source citations that stay linked to the original context.
                        </p>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <Button
                                size="lg"
                                onClick={onGetStarted}
                                className="h-12 min-w-44 bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                                Get Started
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="h-12 min-w-40 border-emerald-500/35 bg-background/70 hover:bg-emerald-500/10"
                            >
                                <a href="#landing-features">Explore Features</a>
                            </Button>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                            {TRUST_POINTS.map((point) => (
                                <span
                                    key={point}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground dark:bg-card/45"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    {point}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="relative animate-in fade-in-0 slide-in-from-right-6 duration-700">
                        <div className="absolute -right-6 top-8 h-28 w-28 rounded-full bg-emerald-500/20 blur-2xl" />

                        <div className="rounded-3xl border border-emerald-500/25 bg-card/70 p-4 backdrop-blur-md shadow-[0_30px_60px_-45px_rgba(16,185,129,1)] sm:p-6 dark:bg-card/45">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Live Workflow
                                </p>
                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                                    RAG
                                </span>
                            </div>

                            <div className="mt-3 rounded-xl border border-border/60 bg-background/80 p-3 dark:bg-background/35">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                    Pipeline health
                                </p>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    <div className="rounded-md border border-border/60 bg-card/70 px-2 py-1.5 text-center">
                                        <p className="text-[11px] text-muted-foreground">Retrieval</p>
                                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-300">Good</p>
                                    </div>
                                    <div className="rounded-md border border-border/60 bg-card/70 px-2 py-1.5 text-center">
                                        <p className="text-[11px] text-muted-foreground">Rerank</p>
                                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-300">Stable</p>
                                    </div>
                                    <div className="rounded-md border border-border/60 bg-card/70 px-2 py-1.5 text-center">
                                        <p className="text-[11px] text-muted-foreground">Language</p>
                                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-300 inline-flex items-center gap-1">
                                            <Languages className="h-3 w-3" />
                                            EN + ID
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {FLOW_STEPS.map((step, index) => {
                                    const Icon = step.icon;
                                    return (
                                        <div key={step.title} className="flex items-start gap-3">
                                            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/35 bg-emerald-500/10 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-1.5 text-sm font-medium">
                                                    <Icon className="h-3.5 w-3.5 text-emerald-500" />
                                                    {step.title}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-5 rounded-2xl border border-border/60 bg-background/80 p-4 dark:bg-background/35">
                                <p className="text-xs text-muted-foreground">Question</p>
                                <p className="mt-1 text-sm">
                                    Which section defines the payment penalty window?
                                </p>
                                <div className="mt-3 rounded-lg border-l-2 border-emerald-500/60 bg-emerald-500/10 p-3">
                                    <p className="text-xs text-muted-foreground">Answer</p>
                                    <p className="mt-1 text-sm">
                                        The penalty window is defined in section 4.2 and starts
                                        after the 14th business day.
                                    </p>
                                    <span className="mt-2 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                                        Source: Contract_Agreement.pdf - page 12
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="landing-features" className="mt-12 sm:mt-16">
                    <div className="mb-5 max-w-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Core capabilities
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                            Designed for fast answers with verifiable sources
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                    {FEATURE_CARDS.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <article
                                key={feature.title}
                                className={cn(
                                    "group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-card/70 p-5 backdrop-blur-md dark:bg-card/45",
                                    "animate-in fade-in-0 slide-in-from-bottom-3 duration-700 hover:border-emerald-500/40 hover:shadow-[0_22px_45px_-36px_rgba(16,185,129,0.85)]"
                                )}
                                style={{ animationDelay: `${index * 90 + 140}ms` }}
                            >
                                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/75 to-transparent" />
                                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                                    <Icon className="h-5 w-5 text-emerald-600 transition-transform duration-300 group-hover:scale-110 dark:text-emerald-400" />
                                </div>
                                <h2 className="text-lg font-medium">{feature.title}</h2>
                                <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                            </article>
                        );
                    })}
                    </div>
                </section>

                <section className="mt-8 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-background/90 to-emerald-500/5 p-5 text-sm dark:from-emerald-500/15 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-3 text-muted-foreground">
                            <div className="flex items-start gap-3">
                                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                <p>
                                    Designed for trustworthy answers: every response can be traced
                                    back to source text, page, and document context.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {ASSURANCE_POINTS.map((point) => (
                                    <span
                                        key={point}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px]"
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        {point}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <Button
                            onClick={onGetStarted}
                            className="h-11 self-start bg-emerald-600 text-white hover:bg-emerald-500 sm:self-auto"
                        >
                            Start with Synapse
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
}
