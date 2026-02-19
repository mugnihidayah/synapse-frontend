// sesion types
export interface SessionCreate {
    session_id: string;
    message: string;
}

export interface SessionInfo {
    session_id: string;
    created_at: string;
    document_count: number;
    is_ready: boolean;
}

// document types
export interface DocumentUploadResponse {
    session_id: string;
    document_processed: number;
    chunks_created: number;
    message: string;
}

// query types
export interface QueryRequest {
    question: string;
    language?: "id" | "en";
    model?: string;
    temperature?: number;
}

export interface QueryResponse {
    answer: string;
    sources: Source[];
    model_used: string;
}

export interface Source {
    text: string;
    metadata: {
        source: string;
        page?: number;
    };
}

//  chat ui types
export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
    model_used?: string;
    timestamp: Date;
    isStreaming?: boolean;
}

//  settings types
export interface AppSettings {
    language: "id" | "en";
    model: string;
    temperature: number;
}

// stored session for localStorage / DB
export interface ChatSession {
    id: string; // UUID
    sessionId?: string; // Legacy
    title: string;
    messages?: ChatMessage[];
    files?: { name: string; type?: string }[];
    createdAt: string; // Date string
    updatedAt: string; // Date string
    userId?: string;
}