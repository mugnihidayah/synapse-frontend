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

export async function GET() {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const res = await fetch(`${API_URL}/api/v1/keys/`, {
            method: "GET",
            headers: {
                "X-API-Key": API_KEY!,
            },
            cache: "no-store",
        });

        const body = await parseBackendBody(res);
        if (!res.ok) {
            return NextResponse.json(body, { status: res.status });
        }

        return NextResponse.json(body);
    } catch (error) {
        console.error("Get keys proxy error:", error);
        return NextResponse.json({ detail: "Failed to fetch keys" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();

    try {
        const res = await fetch(`${API_URL}/api/v1/keys/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const payload = await parseBackendBody(res);
        if (!res.ok) {
            return NextResponse.json(payload, { status: res.status });
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Create key proxy error:", error);
        return NextResponse.json({ detail: "Failed to create key" }, { status: 500 });
    }
}
