import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id: documentId } = await params;

    const res = await fetch(
        `${API_URL}/api/v1/documents/${documentId}/file`,
        {
            headers: {
                "X-API-Key": API_KEY!,
            },
        }
    );

    if (!res.ok) {
        const error = await res.text();
        return new Response(error, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = res.headers.get("content-disposition") || "";

    return new Response(res.body, {
        headers: {
            "Content-Type": contentType,
            ...(contentDisposition && { "Content-Disposition": contentDisposition }),
            "Cache-Control": "private, max-age=3600",
        },
    });
}
