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

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const page = searchParams.get("page") || "1";
    const pageSize = searchParams.get("page_size") || "20";
    const source = searchParams.get("source");
    const search = searchParams.get("search");

    const backendUrl = new URL(`${API_URL}/api/v1/documents/sessions/${id}/documents`);
    backendUrl.searchParams.set("page", page);
    backendUrl.searchParams.set("page_size", pageSize);
    if (source) backendUrl.searchParams.set("source", source);
    if (search) backendUrl.searchParams.set("search", search);

    try {
        const res = await fetch(backendUrl.toString(), {
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
        console.error("Session documents proxy error:", error);
        return NextResponse.json(
            { detail: "Failed to fetch session documents" },
            { status: 500 }
        );
    }
}
