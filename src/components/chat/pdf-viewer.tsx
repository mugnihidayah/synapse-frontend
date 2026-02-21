"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    documentId: string;
    initialPage: number;
}

export default function PdfViewer({ documentId, initialPage }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(initialPage || 1);
    const [scale, setScale] = useState<number>(1.0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fileUrl = `/api/documents/${documentId}/file`;

    const onDocumentLoadSuccess = useCallback(
        ({ numPages: total }: { numPages: number }) => {
            setNumPages(total);
            setLoading(false);
            if (initialPage && initialPage <= total) {
                setPageNumber(initialPage);
            }
        },
        [initialPage]
    );

    const onDocumentLoadError = useCallback((err: Error) => {
        setError(err.message);
        setLoading(false);
    }, []);

    const goToPrev = () => setPageNumber((p) => Math.max(1, p - 1));
    const goToNext = () => setPageNumber((p) => Math.min(numPages, p + 1));
    const zoomIn = () => setScale((s) => Math.min(2.0, s + 0.2));
    const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-8 text-center">
                <FileSearch className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Cannot load PDF preview</p>
                <p className="text-xs text-muted-foreground/60">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrev} disabled={pageNumber <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-20 text-center text-xs text-muted-foreground">
                        {loading ? "Loading..." : `${pageNumber} / ${numPages}`}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext} disabled={pageNumber >= numPages}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} disabled={scale <= 0.5}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="min-w-10 text-center text-xs text-muted-foreground">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} disabled={scale >= 2.0}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* PDF Page */}
            <div className="overflow-auto rounded-lg border border-border/50 bg-white dark:bg-zinc-900">
                <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                        <div className="flex items-center justify-center p-12">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        loading={
                            <div className="flex items-center justify-center p-12">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                            </div>
                        }
                    />
                </Document>
            </div>
        </div>
    );
}
