import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.API_URL;

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
        const res = await fetch(`${API_URL}/api/v1/documents/supported-formats`, {
            method: "GET",
            cache: "no-store",
        });

        const body = await parseBackendBody(res);
        if (!res.ok) {
            return NextResponse.json(body, { status: res.status });
        }

        return NextResponse.json(body);
    } catch (error) {
        console.error("Supported formats proxy error:", error);
        return NextResponse.json(
            { detail: "Failed to fetch supported formats" },
            { status: 500 }
        );
    }
}
