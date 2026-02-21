import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
    title: "Synapse - Advanced RAG Interface",
    description: "Next-generation interface for RAG systems",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider>
            <html lang="en" suppressHydrationWarning>
                <body className="antialiased">
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {children}
                        <Toaster position="top-center" richColors />
                    </ThemeProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
