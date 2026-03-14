"use client";

import { AppSettings } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { useState } from "react";

interface SettingsModalProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
}

export function SettingsModal({ settings, onSettingsChange }: SettingsModalProps) {
    const { theme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);

    const updateSettings = (next: Partial<AppSettings>) => {
        onSettingsChange({ ...settings, ...next });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-10 px-2 font-normal"
                >
                    <Settings className="h-4 w-4" />
                    Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Settings
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Theme */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Appearance
                        </label>
                        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                            {[
                                { value: "light", icon: Sun, label: "Light" },
                                { value: "dark", icon: Moon, label: "Dark" },
                                { value: "system", icon: Laptop, label: "System" },
                            ].map(({ value, icon: Icon, label }) => (
                                <Button
                                    key={value}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setTheme(value)}
                                    className={cn(
                                        "h-10 flex-1 rounded-md px-2 gap-2",
                                        theme === value && "bg-background shadow-sm"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="sr-only sm:not-sr-only sm:text-xs">{label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Language
                        </label>
                        <Select
                            value={settings.language}
                            onValueChange={(value: "id" | "en") =>
                                updateSettings({ language: value })
                            }
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="id">Bahasa Indonesia</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Model */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Model
                        </label>
                        <Select
                            value={settings.model}
                            onValueChange={(value: string) =>
                                updateSettings({ model: value })
                            }
                        >
                            <SelectTrigger className="h-10 truncate">
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
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Temperature
                            </label>
                            <span className="text-sm text-muted-foreground">
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
                            className="py-2"
                        />
                    </div>

                    {/* Upload Options */}
                    <div className="space-y-3 rounded-md border p-4">
                        <p className="text-sm font-medium">Upload Options</p>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.async_mode}
                                    onChange={(e) => updateSettings({ async_mode: e.target.checked })}
                                    className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                                />
                                Async ingestion
                            </label>
                            <label className="flex items-center gap-3 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.enable_ocr}
                                    onChange={(e) => updateSettings({ enable_ocr: e.target.checked })}
                                    className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                                />
                                Enable OCR
                            </label>
                            <label className="flex items-center gap-3 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.extract_tables}
                                    onChange={(e) => updateSettings({ extract_tables: e.target.checked })}
                                    className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                                />
                                Extract tables
                            </label>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
