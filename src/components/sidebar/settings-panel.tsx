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

interface SettingsPanelProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
    const { theme, setTheme } = useTheme();

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
                            onSettingsChange({ ...settings, language: value })
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
                            onSettingsChange({ ...settings, model: value })
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
                            onSettingsChange({ ...settings, temperature: value })
                        }
                        min={0}
                        max={1}
                        step={0.1}
                        className="py-1"
                    />
                </div>
            </div>
        </div>
    );
}