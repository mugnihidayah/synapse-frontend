import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
        return NextResponse.json(
            { error: "session_id is required" },
            { status: 400 }
        );
    }

    const body = await request.json();

    const res = await fetch(
        `${API_URL}/api/v1/query/${sessionId}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY!,
            },
            body: JSON.stringify(body),
        }
    );

    const data = await res.json();

    if (!res.ok) {
        return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
}