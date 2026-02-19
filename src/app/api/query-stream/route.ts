import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { saveMessage } from "@/lib/db-actions";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
        return new Response(
            JSON.stringify({ error: "session_id is required" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const body = await request.json();
    const { question, language } = body;

    // 1. Save User Message
    if (question) {
        await saveMessage(sessionId, "user", question);
    }

    // Inject language instruction into the question for the backend
    const targetLanguage = language === "id" ? "Bahasa Indonesia" : "English";
    
    const prefix = `[SYSTEM: You MUST answer the following question in ${targetLanguage}. Ignore any other language instructions.]\n\nQuestion: `;
    const suffix = `\n\n(Remember: Answer strictly in ${targetLanguage})`;
    
    // Create new body with modified question
    const backendBody = {
        ...body,
        question: prefix + question + suffix
    };

    const res = await fetch(
        `${API_URL}/api/v1/query/stream/${sessionId}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY!,
            },
            body: JSON.stringify(backendBody),
        }
    );

    if (!res.ok) {
        const error = await res.text();
        return new Response(error, { status: res.status });
    }

    const stream = new TransformStream({
        transform(chunk, controller) {
            controller.enqueue(chunk);
        },
    });

    return new Response(res.body?.pipeThrough(stream), {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}