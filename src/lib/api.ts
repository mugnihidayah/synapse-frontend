import { SessionCreate, DocumentUploadResponse, QueryRequest, QueryResponse, AppSettings } from "@/types";

export async function createSession(): Promise<SessionCreate> {
    const res = await fetch("/api/sessions", { method: "POST" });

    if (!res.ok) {
        throw new Error("Failed to create session");
    }

    return res.json();
}

export async function uploadFiles(sessionId: string, files: File[]): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append("files", file);
    });

    // Send file names in a header for DB persistence (simple solution for now)
    // Note: robust solution would be parsing response from backend or multipart on server
    const fileNames = files.map(f => f.name).join(",");
    const fileTypes = files.map(f => f.type).join(",");

    const res = await fetch(`/api/upload?session_id=${sessionId}`, {
        method: "POST",
        body: formData,
        headers: {
            "x-file-names": encodeURIComponent(fileNames),
            "x-file-types": encodeURIComponent(fileTypes),
             // "Content-Type" is set automatically with boundary by fetch for FormData
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${errorText}`);
    }

    return res.json();
}

export async function queryDocuments(
    sessionId: string,
    request: QueryRequest
): Promise<QueryResponse> {
    const res = await fetch(
        `/api/query?session_id=${sessionId}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        }
    );

    if (!res.ok) {
        throw new Error("Failed to query documents");
    }

    return res.json();
}

export async function queryStream(
    sessionId: string,
    request: QueryRequest,
    signal?: AbortSignal
): Promise<Response> {
    const res = await fetch(
        `/api/query-stream?session_id=${sessionId}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
            signal,
        }
    );

    if (!res.ok) {
        throw new Error("Failed to start stream");
    }

    return res;
}

export async function getHistory() {
    const res = await fetch("/api/history");
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
}

export async function getSessionMessagesAPI(id: string) {
    const res = await fetch(`/api/history/${id}`);
    if (!res.ok) throw new Error("Failed to fetch session");
    return res.json();
}

export async function deleteSessionAPI(id: string) {
    const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete session");
    return res.json();
}

export async function saveMessageAPI(sessionId: string, role: "user" | "assistant", content: string) {
    const res = await fetch(`/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, role, content }),
    });
    if (!res.ok) throw new Error("Failed to save message");
    return res.json();
}

export async function updateSessionTitleAPI(sessionId: string, title: string) {
    const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to update session title");
    return res.json();
}

export async function getPreferencesAPI() {
    const res = await fetch("/api/user/preferences");
    if (!res.ok) throw new Error("Failed to fetch preferences");
    return res.json();
}

export async function updatePreferencesAPI(preferences: Partial<AppSettings>) {
    const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
    });
    if (!res.ok) throw new Error("Failed to update preferences");
    return res.json();
}