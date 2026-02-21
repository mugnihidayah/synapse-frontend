import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteChatSession, updateSessionTitle } from "@/lib/db-actions";

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

    try {
        const res = await fetch(`${API_URL}/api/v1/documents/sessions/${id}`, {
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
        console.error("Session info proxy error:", error);
        return NextResponse.json(
            { detail: "Failed to fetch session info" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const { title } = await req.json();

    if (!title) {
        return new NextResponse("Title is required", { status: 400 });
    }

    try {
        await updateSessionTitle(id, title);
        return NextResponse.json({ success: true });
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;

    let backendDeleted = false;
    let backendStatus = 0;

    try {
        const res = await fetch(`${API_URL}/api/v1/documents/sessions/${id}`, {
            method: "DELETE",
            headers: {
                "X-API-Key": API_KEY!,
            },
        });

        backendStatus = res.status;

        // Treat 404 as recoverable: session may already expire in backend,
        // but we still cleanup local DB session.
        if (!res.ok && res.status !== 404) {
            const body = await parseBackendBody(res);
            return NextResponse.json(body, { status: res.status });
        }

        backendDeleted = res.ok;
    } catch (error) {
        console.error("Backend session delete failed:", error);
    }

    try {
        const localDeleted = await deleteChatSession(id, userId);
        if (!localDeleted) {
            return NextResponse.json(
                { detail: "Not Found or Forbidden" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            backendDeleted,
            backendStatus,
            message: "Session deleted",
        });
    } catch (error) {
        console.error("Local session delete failed:", error);
        return NextResponse.json(
            { detail: "Failed to delete session locally" },
            { status: 500 }
        );
    }
}
