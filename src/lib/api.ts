import {
    ApiKeyInfo,
    AppSettings,
    ChatSession,
    CreateKeyRequest,
    CreateKeyResponse,
    DocumentUploadResponse,
    FeedbackRequest,
    FeedbackResponse,
    QueryRequest,
    QueryResponse,
    SessionCreate,
    SessionDocumentsResponse,
    SessionInfo,
    SupportedFormatsResponse,
    UsageResponse,
} from "@/types";

export class ApiError extends Error {
    status: number;
    details?: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}

function pickErrorMessage(payload: unknown, fallback: string): string {
    if (!payload) return fallback;
    if (typeof payload === "string") return payload;

    if (typeof payload === "object") {
        const data = payload as Record<string, unknown>;
        const detail = data.detail;
        const error = data.error;
        const message = data.message;

        if (typeof detail === "string" && detail.trim()) return detail;
        if (typeof error === "string" && error.trim()) return error;
        if (typeof message === "string" && message.trim()) return message;
    }

    return fallback;
}

async function parseResponse<T>(res: Response, fallbackError: string): Promise<T> {
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    const payload: unknown = isJson ? await res.json() : await res.text();

    if (!res.ok) {
        throw new ApiError(pickErrorMessage(payload, fallbackError), res.status, payload);
    }

    return payload as T;
}

export async function createSession(): Promise<SessionCreate> {
    const res = await fetch("/api/sessions", { method: "POST" });
    return parseResponse<SessionCreate>(res, "Failed to create session");
}

export async function getSessionInfoAPI(id: string): Promise<SessionInfo> {
    const res = await fetch(`/api/sessions/${id}`, { cache: "no-store" });
    return parseResponse<SessionInfo>(res, "Failed to fetch session info");
}

export async function deleteSessionAPI(id: string) {
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    return parseResponse<{ success: boolean }>(res, "Failed to delete session");
}

interface UploadOptions {
    async_mode?: boolean;
    enable_ocr?: boolean;
    extract_tables?: boolean;
}

export async function uploadFiles(
    sessionId: string,
    files: File[],
    options?: UploadOptions,
    onProgress?: (percent: number) => void
): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append("files", file);
    });

    const fileNames = files.map((file) => file.name).join(",");
    const fileTypes = files.map((file) => file.type).join(",");

    const url = new URL(`/api/upload`, window.location.origin);
    url.searchParams.set("session_id", sessionId);
    if (typeof options?.async_mode === "boolean") {
        url.searchParams.set("async_mode", String(options.async_mode));
    }
    if (typeof options?.enable_ocr === "boolean") {
        url.searchParams.set("enable_ocr", String(options.enable_ocr));
    }
    if (typeof options?.extract_tables === "boolean") {
        url.searchParams.set("extract_tables", String(options.extract_tables));
    }

    return new Promise<DocumentUploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url.pathname + url.search, true);
        xhr.setRequestHeader("x-file-names", encodeURIComponent(fileNames));
        xhr.setRequestHeader("x-file-types", encodeURIComponent(fileTypes));

        onProgress?.(0);

        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable || !onProgress) return;
            const percent = Math.max(
                0,
                Math.min(99, Math.round((event.loaded / event.total) * 100))
            );
            onProgress(percent);
        };

        xhr.onload = () => {
            onProgress?.(100);

            const contentType = xhr.getResponseHeader("content-type") || "";
            const rawText = xhr.responseText || "";
            const isJson = contentType.includes("application/json");
            let payload: unknown = rawText;
            if (isJson && rawText) {
                try {
                    payload = JSON.parse(rawText);
                } catch {
                    payload = rawText;
                }
            }

            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new ApiError(pickErrorMessage(payload, "Upload failed"), xhr.status, payload));
                return;
            }

            resolve(payload as DocumentUploadResponse);
        };

        xhr.onerror = () => {
            reject(new ApiError("Upload failed", xhr.status || 0));
        };

        xhr.onabort = () => {
            reject(new ApiError("Upload canceled", xhr.status || 0));
        };

        xhr.send(formData);
    });
}

export async function getSessionDocumentsAPI(
    sessionId: string,
    options?: {
        page?: number;
        page_size?: number;
        source?: string;
        search?: string;
    }
): Promise<SessionDocumentsResponse> {
    const params = new URLSearchParams();
    params.set("page", String(options?.page ?? 1));
    params.set("page_size", String(options?.page_size ?? 20));
    if (options?.source) params.set("source", options.source);
    if (options?.search) params.set("search", options.search);

    const res = await fetch(`/api/sessions/${sessionId}/documents?${params.toString()}`, {
        cache: "no-store",
    });
    return parseResponse<SessionDocumentsResponse>(res, "Failed to fetch documents");
}

export async function getSupportedFormatsAPI(): Promise<SupportedFormatsResponse> {
    const res = await fetch("/api/supported-formats", { cache: "no-store" });
    return parseResponse<SupportedFormatsResponse>(res, "Failed to fetch supported formats");
}

export async function queryDocuments(
    sessionId: string,
    request: QueryRequest
): Promise<QueryResponse> {
    const res = await fetch(`/api/query?session_id=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });

    return parseResponse<QueryResponse>(res, "Failed to query documents");
}

export async function queryStream(
    sessionId: string,
    request: QueryRequest,
    signal?: AbortSignal
): Promise<Response> {
    const res = await fetch(`/api/query-stream?session_id=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal,
    });

    if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
            ? await res.json()
            : await res.text();
        throw new ApiError(pickErrorMessage(payload, "Failed to start stream"), res.status, payload);
    }

    return res;
}

export async function getHistory() {
    const res = await fetch("/api/history");
    return parseResponse<ChatSession[]>(res, "Failed to fetch history");
}

export async function getSessionMessagesAPI(id: string) {
    const res = await fetch(`/api/history/${id}`);
    return parseResponse<
        { id: string; role: "user" | "assistant"; content: string; metadata?: Record<string, unknown> | null; createdAt: string }[]
    >(res, "Failed to fetch session messages");
}

export async function saveMessageAPI(
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    metadata?: Record<string, unknown> | null
) {
    const res = await fetch(`/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, role, content, metadata }),
    });

    return parseResponse(res, "Failed to save message");
}

export async function updateSessionTitleAPI(sessionId: string, title: string) {
    const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
    });

    return parseResponse(res, "Failed to update session title");
}

export async function getPreferencesAPI() {
    const res = await fetch("/api/user/preferences");
    return parseResponse<Partial<AppSettings>>(res, "Failed to fetch preferences");
}

export async function updatePreferencesAPI(preferences: Partial<AppSettings>) {
    const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
    });
    return parseResponse(res, "Failed to update preferences");
}

export async function getUsageInsightsAPI(): Promise<UsageResponse> {
    const res = await fetch("/api/insights/usage", { cache: "no-store" });
    return parseResponse<UsageResponse>(res, "Failed to fetch usage insights");
}

export async function submitFeedbackAPI(
    sessionId: string,
    request: FeedbackRequest
): Promise<FeedbackResponse> {
    const res = await fetch(`/api/insights/feedback/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });

    return parseResponse<FeedbackResponse>(res, "Failed to submit feedback");
}

export async function exportSessionAPI(
    sessionId: string,
    format: "markdown" | "json" = "markdown"
): Promise<{ blob: Blob; filename: string; contentType: string }> {
    const res = await fetch(`/api/insights/export/${sessionId}?format=${format}`);
    if (!res.ok) {
        const text = await res.text();
        throw new ApiError(text || "Failed to export session", res.status, text);
    }

    const contentType =
        res.headers.get("content-type") ||
        (format === "json" ? "application/json" : "text/markdown");
    const disposition = res.headers.get("content-disposition") || "";
    const fallback = `session-${sessionId}.${format === "json" ? "json" : "md"}`;

    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] || fallback;

    return {
        blob: await res.blob(),
        filename,
        contentType,
    };
}

export async function getApiKeysAPI(): Promise<ApiKeyInfo[]> {
    const res = await fetch("/api/keys", { cache: "no-store" });
    return parseResponse<ApiKeyInfo[]>(res, "Failed to fetch API keys");
}

export async function createApiKeyAPI(
    payload: CreateKeyRequest
): Promise<CreateKeyResponse> {
    const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    return parseResponse<CreateKeyResponse>(res, "Failed to create API key");
}

export async function deleteApiKeyAPI(id: string) {
    const res = await fetch(`/api/keys/${id}`, {
        method: "DELETE",
    });

    return parseResponse<{ message: string }>(res, "Failed to delete API key");
}
