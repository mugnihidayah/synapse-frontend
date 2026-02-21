export interface SessionCreate {
    session_id: string;
    message: string;
}

export interface SessionInfo {
    session_id: string;
    created_at: string;
    document_count: number;
    is_ready: boolean;
    ingestion_status?: "idle" | "queued" | "processing" | "ready" | "failed" | string;
    ingestion_error?: string | null;
    ingestion_started_at?: string | null;
    ingestion_completed_at?: string | null;
}

export interface DocumentUploadResponse {
    session_id: string;
    document_processed: number;
    chunks_created: number;
    files_queued?: number;
    ingestion_status?: string;
    message: string;
}

export interface SessionDocumentItem {
    chunk_id: string;
    source?: string | null;
    page?: number | null;
    section?: string | null;
    chunk_type?: string | null;
    preview: string;
}

export interface SessionDocumentsResponse {
    session_id: string;
    total: number;
    page: number;
    page_size: number;
    items: SessionDocumentItem[];
}

export interface QueryFilters {
    sources?: string[];
    source_type?: string;
    page_from?: number;
    page_to?: number;
    chunk_types?: string[];
    content_origin?: string;
}

export interface QueryRequest {
    question: string;
    language?: "id" | "en";
    model?: string;
    temperature?: number;
    top_k?: number | null;
    rerank_top_k?: number | null;
    filters?: QueryFilters | null;
    include_debug?: boolean;
    strict_grounding?: boolean;
    enable_query_rewrite?: boolean;
}

export interface QueryDebug {
    rewritten_query: string;
    retrieved_count: number;
    reranked_count: number;
    top_k_used: number;
    rerank_top_k_used: number;
    filters_applied?: Record<string, unknown> | null;
}

export interface Source {
    text: string;
    snippet?: string | null;
    score?: number;
    chunk_id?: string;
    document_id?: string;
    source?: string | null;
    page?: number | null;
    metadata?: Record<string, unknown>;
}

export interface QueryResponse {
    answer: string;
    sources: Source[];
    model_used: string;
    rewritten_query?: string | null;
    grounded?: boolean;
    grounding_score?: number;
    debug?: QueryDebug | null;
}

export interface UsageResponse {
    key_id: string;
    total_sessions: number;
    total_queries: number;
    total_documents: number;
    total_feedback: number;
    quota: {
        daily_limit: number;
        used_today: number;
        remaining_today: number;
    };
}

export interface FeedbackRequest {
    question: string;
    answer: string;
    rating: -1 | 0 | 1;
    comment?: string;
    metadata?: Record<string, unknown>;
}

export interface FeedbackResponse {
    feedback_id: string;
    session_id: string;
    rating: -1 | 0 | 1;
    created_at: string;
}

export interface ApiKeyInfo {
    key_id: string;
    name: string | null;
    rate_limit: number;
    is_active: boolean;
    created_at: string;
    last_used_at: string | null;
}

export interface CreateKeyRequest {
    name?: string | null;
    rate_limit?: number;
}

export interface CreateKeyResponse {
    api_key: string;
    key_id: string;
    name: string | null;
    rate_limit: number;
    message?: string;
}

export interface SupportedFormatsResponse {
    formats?: string[];
    max_size_mb?: number;
    [key: string]: unknown;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
    model_used?: string;
    rewritten_query?: string | null;
    grounded?: boolean;
    grounding_score?: number;
    debug?: QueryDebug | null;
    timestamp: Date;
    isStreaming?: boolean;
    feedbackRating?: -1 | 0 | 1;
}

export interface AppSettings {
    language: "id" | "en";
    model: string;
    temperature: number;
    top_k: number | null;
    rerank_top_k: number | null;
    include_debug: boolean;
    strict_grounding: boolean;
    enable_query_rewrite: boolean;
    filters: QueryFilters;
    async_mode: boolean;
    enable_ocr: boolean;
    extract_tables: boolean;
}

export interface ChatSession {
    id: string;
    sessionId?: string;
    title: string;
    messages?: ChatMessage[];
    files?: { name: string; type?: string }[];
    createdAt: string;
    updatedAt: string;
    userId?: string;
}
