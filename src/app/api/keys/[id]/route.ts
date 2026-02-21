import { NextResponse } from "next/server";
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

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;

    try {
        const res = await fetch(`${API_URL}/api/v1/keys/${id}`, {
            method: "DELETE",
            headers: {
                "X-API-Key": API_KEY!,
            },
        });

        const body = await parseBackendBody(res);
        if (!res.ok) {
            return NextResponse.json(body, { status: res.status });
        }

        return NextResponse.json(body);
    } catch (error) {
        console.error("Delete key proxy error:", error);
        return NextResponse.json({ detail: "Failed to delete key" }, { status: 500 });
    }
}
