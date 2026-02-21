import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

async function parseBackendBody(res: Response): Promise<unknown> {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return res.json();
    }

    const text = await res.text();
    if (!text) return {};
    return { detail: text };
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const body = await req.json();

    try {
        const res = await fetch(`${API_URL}/api/v1/insights/feedback/${id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY!,
            },
            body: JSON.stringify(body),
        });

        const payload = await parseBackendBody(res);
        if (!res.ok) {
            return NextResponse.json(payload, { status: res.status });
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Feedback proxy error:", error);
        return NextResponse.json(
            { detail: "Failed to submit feedback" },
            { status: 500 }
        );
    }
}
