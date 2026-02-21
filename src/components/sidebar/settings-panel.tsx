"use client";

import { AppSettings } from "@/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Settings, Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SettingsPanelProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
    const { theme, setTheme } = useTheme();

    const updateSettings = (next: Partial<AppSettings>) => {
        onSettingsChange({ ...settings, ...next });
    };

    const toNumberOrNull = (raw: string) => {
        if (!raw.trim()) return null;
        const parsed = Number(raw);
        return Number.isNaN(parsed) ? null : parsed;
    };

    const parseCsv = (raw: string): string[] => {
        return raw
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    };

    return (
        <div className="space-y-6 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
                <Settings className="h-4 w-4" />
                Settings
            </div>

            {/* Theme */}
            <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Appearance</label>
                <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                    {[
                        { value: "light", icon: Sun },
                        { value: "dark", icon: Moon },
                        { value: "system", icon: Laptop },
                    ].map(({ value, icon: Icon }) => (
                        <Button
                            key={value}
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme(value)}
                            className={cn(
                                "h-7 flex-1 rounded-md px-2",
                                theme === value && "bg-background shadow-sm"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                        </Button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {/* Language */}
                <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Language</label>
                    <Select
                        value={settings.language}
                        onValueChange={(value: "id" | "en") =>
                            updateSettings({ language: value })
                        }
                    >
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="id">Bahasa Indonesia</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Model</label>
                    <Select
                        value={settings.model}
                        onValueChange={(value: string) =>
                            updateSettings({ model: value })
                        }
                    >
                        <SelectTrigger className="h-8 text-xs truncate">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="llama-3.3-70b-versatile">
                                Llama 3.3 70B
                            </SelectItem>
                            <SelectItem value="moonshotai/kimi-k2-instruct-0905">
                                Kimi K2 Instruct
                            </SelectItem>
                            <SelectItem value="meta-llama/llama-4-scout-17b-16e-instruct">
                                Llama 4 Scout 17B
                            </SelectItem>
                            <SelectItem value="openai/gpt-oss-120b">
                                GPT OSS 120B
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Temperature */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Temperature</label>
                        <span className="text-xs text-muted-foreground">
                            {settings.temperature.toFixed(1)}
                        </span>
                    </div>
                    <Slider
                        value={[settings.temperature]}
                        onValueChange={([value]) =>
                            updateSettings({ temperature: value })
                        }
                        min={0}
                        max={1}
                        step={0.1}
                        className="py-1"
                    />
                </div>

                {/* Retrieval */}
                <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                        Top K (optional)
                    </label>
                    <Input
                        type="number"
                        min={1}
                        max={50}
                        value={settings.top_k ?? ""}
                        onChange={(e) =>
                            updateSettings({ top_k: toNumberOrNull(e.target.value) })
                        }
                        className="h-8 text-xs"
                        placeholder="Auto"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                        Rerank Top K (optional)
                    </label>
                    <Input
                        type="number"
                        min={1}
                        max={20}
                        value={settings.rerank_top_k ?? ""}
                        onChange={(e) =>
                            updateSettings({ rerank_top_k: toNumberOrNull(e.target.value) })
                        }
                        className="h-8 text-xs"
                        placeholder="Auto"
                    />
                </div>

                <div className="space-y-2 rounded-md border border-border/50 p-3">
                    <label className="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={settings.include_debug}
                            onChange={(e) => updateSettings({ include_debug: e.target.checked })}
                        />
                        Include retrieval debug
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={settings.strict_grounding}
                            onChange={(e) =>
                                updateSettings({ strict_grounding: e.target.checked })
                            }
                        />
                        Strict grounding fallback
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={settings.enable_query_rewrite}
                            onChange={(e) =>
                                updateSettings({ enable_query_rewrite: e.target.checked })
                            }
                        />
                        Enable query rewrite
                    </label>
                </div>

                {/* Query Filters */}
                <div className="space-y-2 rounded-md border border-border/50 p-3">
                    <p className="text-xs font-medium text-foreground">Query Filters</p>

                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Sources (CSV)</label>
                        <Input
                            value={settings.filters.sources?.join(", ") || ""}
                            onChange={(e) =>
                                updateSettings({
                                    filters: {
                                        ...settings.filters,
                                        sources: parseCsv(e.target.value),
                                    },
                                })
                            }
                            className="h-8 text-xs"
                            placeholder="report.pdf, appendix.docx"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Source Type</label>
                        <Input
                            value={settings.filters.source_type || ""}
                            onChange={(e) =>
                                updateSettings({
                                    filters: {
                                        ...settings.filters,
                                        source_type: e.target.value || undefined,
                                    },
                                })
                            }
                            className="h-8 text-xs"
                            placeholder="pdf / txt / docx"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Page From</label>
                            <Input
                                type="number"
                                min={1}
                                value={settings.filters.page_from ?? ""}
                                onChange={(e) =>
                                    updateSettings({
                                        filters: {
                                            ...settings.filters,
                                            page_from:
                                                toNumberOrNull(e.target.value) ?? undefined,
                                        },
                                    })
                                }
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Page To</label>
                            <Input
                                type="number"
                                min={1}
                                value={settings.filters.page_to ?? ""}
                                onChange={(e) =>
                                    updateSettings({
                                        filters: {
                                            ...settings.filters,
                                            page_to:
                                                toNumberOrNull(e.target.value) ?? undefined,
                                        },
                                    })
                                }
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Chunk Types (CSV)</label>
                        <Input
                            value={settings.filters.chunk_types?.join(", ") || ""}
                            onChange={(e) =>
                                updateSettings({
                                    filters: {
                                        ...settings.filters,
                                        chunk_types: parseCsv(e.target.value),
                                    },
                                })
                            }
                            className="h-8 text-xs"
                            placeholder="content, table"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Content Origin</label>
                        <Input
                            value={settings.filters.content_origin || ""}
                            onChange={(e) =>
                                updateSettings({
                                    filters: {
                                        ...settings.filters,
                                        content_origin: e.target.value || undefined,
                                    },
                                })
                            }
                            className="h-8 text-xs"
                            placeholder="text / ocr / text+ocr / table"
                        />
                    </div>
                </div>

                {/* Upload options */}
                <div className="space-y-2 rounded-md border border-border/50 p-3">
                    <p className="text-xs font-medium text-foreground">Upload Options</p>
                    <label className="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={settings.async_mode}
                            onChange={(e) => updateSettings({ async_mode: e.target.checked })}
                        />
                        Async ingestion
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={settings.enable_ocr}
                            onChange={(e) => updateSettings({ enable_ocr: e.target.checked })}
                        />
                        Enable OCR
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={settings.extract_tables}
                            onChange={(e) => updateSettings({ extract_tables: e.target.checked })}
                        />
                        Extract tables
                    </label>
                </div>
            </div>
        </div>
    );
}
