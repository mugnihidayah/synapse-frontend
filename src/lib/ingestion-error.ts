import {
    DocumentUploadResponse,
    IngestionFileResult,
    IngestionWarning,
    SessionInfo,
} from "@/types";

export interface IngestionErrorInfo {
    kind:
        | "ocr_no_text"
        | "no_usable_documents"
        | "unsupported_format"
        | "file_too_large"
        | "ocr_engine_unavailable"
        | "ingestion_internal_error"
        | "generic";
    severity: "warning" | "error";
    title: string;
    description: string;
    hint?: string;
}

type IngestionErrorInput =
    | string
    | null
    | undefined
    | Partial<
          Pick<
              SessionInfo,
              | "ingestion_error"
              | "ingestion_error_code"
              | "ingestion_error_severity"
              | "ingestion_warnings"
              | "file_results"
          > &
              Pick<
                  DocumentUploadResponse,
                  "message" | "error_code" | "severity" | "file_results"
              >
      >;

interface IngestionErrorCandidate {
    message?: string | null;
    code?: string | null;
    severity?: string | null;
    filename?: string | null;
}

function extractFilename(raw: string): string | null {
    const quoted = raw.match(/filename['"]?\s*:\s*['"]([^'"]+)['"]/i);
    if (quoted?.[1]) return quoted[1];

    const fallback = raw.match(/file\s*[:=]\s*['"]([^'"]+)['"]/i);
    if (fallback?.[1]) return fallback[1];

    return null;
}

function isOcrNoTextError(raw: string): boolean {
    const normalized = raw.toLowerCase();
    return (
        normalized.includes("no readable text") ||
        normalized.includes("no extractable text") ||
        normalized.includes("no text could be extracted from image") ||
        normalized.includes("no text extracted from image") ||
        (normalized.includes("image") &&
            (normalized.includes("could not extract text") ||
                normalized.includes("couldn't extract text") ||
                normalized.includes("unable to extract text") ||
                (normalized.includes("ocr") && normalized.includes("no text"))))
    );
}

function normalizeCode(code?: string | null): string {
    return (code || "").trim().toUpperCase();
}

function resolveSeverity(code: string, severity?: string | null): "warning" | "error" {
    const normalized = (severity || "").trim().toLowerCase();
    if (normalized === "warning" || normalized === "error") return normalized;
    if (code === "OCR_NO_TEXT") return "warning";
    return "error";
}

function buildInfoFromCode(
    code: string,
    message?: string | null,
    filename?: string | null,
    explicitSeverity?: string | null
): IngestionErrorInfo {
    const severity = resolveSeverity(code, explicitSeverity);
    const fileLabel = filename ? `"${filename}"` : "the uploaded file";

    switch (code) {
        case "OCR_NO_TEXT":
            return {
                kind: "ocr_no_text",
                severity: "warning",
                title: "Image has no extractable text",
                description: `No readable text was found in ${fileLabel}.`,
                hint: "Upload a clearer document image or use PDF/TXT/DOCX files.",
            };
        case "NO_USABLE_DOCUMENTS":
            return {
                kind: "no_usable_documents",
                severity,
                title: "No usable documents found",
                description:
                    message?.trim() ||
                    "None of the uploaded files could be converted into searchable text.",
                hint: "Upload files that contain readable text.",
            };
        case "UNSUPPORTED_FORMAT":
            return {
                kind: "unsupported_format",
                severity,
                title: "Unsupported file format",
                description: message?.trim() || `The format of ${fileLabel} is not supported.`,
                hint: "Use supported formats such as PDF, TXT, DOCX, or text-based images.",
            };
        case "FILE_TOO_LARGE":
            return {
                kind: "file_too_large",
                severity,
                title: "File too large",
                description: message?.trim() || `${fileLabel} exceeds the upload size limit.`,
                hint: "Compress the file or split it into smaller documents.",
            };
        case "OCR_ENGINE_UNAVAILABLE":
            return {
                kind: "ocr_engine_unavailable",
                severity,
                title: "OCR service unavailable",
                description: message?.trim() || "OCR is temporarily unavailable.",
                hint: "Try again later or upload a text-based document.",
            };
        case "INGESTION_INTERNAL_ERROR":
            return {
                kind: "ingestion_internal_error",
                severity,
                title: "Ingestion service error",
                description: message?.trim() || "The document processing service encountered an error.",
                hint: "Please retry in a moment.",
            };
        default:
            return {
                kind: "generic",
                severity,
                title: "Ingestion failed",
                description: message?.trim() || "The document could not be processed.",
                hint: "Try uploading the file again or use a different format.",
            };
    }
}

function fromMessage(
    message?: string | null,
    explicitSeverity?: string | null
): IngestionErrorInfo | null {
    const clean = (message || "").trim();
    if (!clean) return null;
    const normalizedSeverity = (explicitSeverity || "").trim().toLowerCase();

    if (isOcrNoTextError(clean)) {
        const fileName = extractFilename(clean);
        return buildInfoFromCode("OCR_NO_TEXT", clean, fileName, "warning");
    }

    if (normalizedSeverity === "warning") {
        return {
            kind: "generic",
            severity: "warning",
            title: "Processed with warning",
            description: clean,
            hint: "Some files may not contain readable text.",
        };
    }

    return {
        kind: "generic",
        severity: "error",
        title: "Ingestion failed",
        description: clean,
        hint: "Try uploading the document again.",
    };
}

function pickWarning(warnings?: IngestionWarning[] | null): IngestionErrorCandidate | null {
    if (!Array.isArray(warnings) || warnings.length === 0) return null;
    const preferred =
        warnings.find((item) => normalizeCode(item.error_code) === "OCR_NO_TEXT") || warnings[0];
    return {
        message: preferred.message || null,
        code: preferred.error_code || null,
        severity: preferred.severity || null,
        filename: preferred.filename || null,
    };
}

function pickFileIssue(fileResults?: IngestionFileResult[] | null): IngestionErrorCandidate | null {
    if (!Array.isArray(fileResults) || fileResults.length === 0) return null;

    const warningMatch =
        fileResults.find((item) => normalizeCode(item.error_code) === "OCR_NO_TEXT") ||
        fileResults.find((item) => String(item.status).toLowerCase() === "warning") ||
        fileResults.find((item) => String(item.severity).toLowerCase() === "warning");

    if (warningMatch) {
        return {
            message: warningMatch.message || null,
            code: warningMatch.error_code || null,
            severity: warningMatch.severity || "warning",
            filename: warningMatch.filename || null,
        };
    }

    const failedMatch = fileResults.find(
        (item) =>
            String(item.status).toLowerCase() === "failed" ||
            String(item.severity).toLowerCase() === "error" ||
            !!item.error_code
    );

    if (!failedMatch) return null;
    return {
        message: failedMatch.message || null,
        code: failedMatch.error_code || null,
        severity: failedMatch.severity || "error",
        filename: failedMatch.filename || null,
    };
}

function toCandidate(input: IngestionErrorInput): IngestionErrorCandidate | null {
    if (typeof input === "string" || input == null) {
        return { message: input || null };
    }

    const warningCandidate = pickWarning(input.ingestion_warnings);
    if (warningCandidate) return warningCandidate;

    const fileCandidate = pickFileIssue(input.file_results);
    if (fileCandidate) return fileCandidate;

    return {
        message: input.ingestion_error || input.message || null,
        code: input.ingestion_error_code || input.error_code || null,
        severity: input.ingestion_error_severity || input.severity || null,
        filename: null,
    };
}

export function formatIngestionError(input?: IngestionErrorInput): IngestionErrorInfo {
    const candidate = toCandidate(input ?? null);

    if (!candidate) {
        return {
            kind: "generic",
            severity: "error",
            title: "Ingestion failed",
            description: "The document could not be processed.",
            hint: "Try uploading the file again or use a different format.",
        };
    }

    const code = normalizeCode(candidate.code);
    if (code) {
        return buildInfoFromCode(code, candidate.message, candidate.filename, candidate.severity);
    }

    const normalizedSeverity = (candidate.severity || "").trim().toLowerCase();
    const fallbackSeverity: "warning" | "error" =
        normalizedSeverity === "warning" ? "warning" : "error";

    return (
        fromMessage(candidate.message, candidate.severity) || {
            kind: "generic",
            severity: fallbackSeverity,
            title: fallbackSeverity === "warning" ? "Processed with warning" : "Ingestion failed",
            description:
                fallbackSeverity === "warning"
                    ? "Some files were processed with warnings."
                    : "The document could not be processed.",
            hint:
                fallbackSeverity === "warning"
                    ? "You can continue with the processed documents."
                    : "Try uploading the file again or use a different format.",
        }
    );
}

export function formatIngestionDescription(input?: IngestionErrorInput): string {
    const info = formatIngestionError(input);
    return info.hint ? `${info.description} ${info.hint}` : info.description;
}
