import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") === "json" ? "json" : "markdown";

    try {
        const res = await fetch(
            `${API_URL}/api/v1/insights/export/${id}?format=${format}`,
            {
                method: "GET",
                headers: {
                    "X-API-Key": API_KEY!,
                },
            }
        );

        if (!res.ok) {
            const errorText = await res.text();
            return NextResponse.json(
                { detail: errorText || "Export failed" },
                { status: res.status }
            );
        }

        const body = await res.text();
        const contentType =
            res.headers.get("content-type") ||
            (format === "json" ? "application/json" : "text/markdown");
        const contentDisposition =
            res.headers.get("content-disposition") ||
            `attachment; filename=session-${id}.${format === "json" ? "json" : "md"}`;

        return new Response(body, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": contentDisposition,
            },
        });
    } catch (error) {
        console.error("Export proxy error:", error);
        return NextResponse.json(
            { detail: "Failed to export session" },
            { status: 500 }
        );
    }
}
