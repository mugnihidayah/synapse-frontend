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
    const { question } = body;

    // 1. Save User Message
    if (question) {
        await saveMessage(sessionId, "user", question);
    }

    // Forward request directly to backend (language is handled via body.language)
    const res = await fetch(
        `${API_URL}/api/v1/query/stream/${sessionId}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY!,
            },
            body: JSON.stringify(body),
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