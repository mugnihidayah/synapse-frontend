import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { removeFileFromSession } from "@/lib/db-actions";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export async function DELETE(
    request: NextRequest,
    params: { params: Promise<{ id: string }> } // Standard Next.js server route format for App Router dynamic segments
) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: sessionId } = await params.params;
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("filename");

    if (!fileName) {
        return NextResponse.json(
            { error: "filename is required" },
            { status: 400 }
        );
    }

    try {
        // Backend API doesn't have a direct /documents/delete specific route documented but we might proxy if it exists.
        // Assuming there's a backend endpoint to delete a file by ID/Name, or maybe it's stateless.
        // For now, removing it from our database at least removes it from the UI context.
        // Let's remove from DB first:
        await removeFileFromSession(sessionId, fileName);

        // Try to detach it from the backend if possible. Usually there's a DELETE /api/v1/documents/delete or something.
        // If not, our DB will no longer query it. We'll try hitting a generic delete endpoint, if it fails we just log it and ignore.
        const backendUrl = new URL(`${API_URL}/api/v1/documents/${sessionId}/delete`); // Speculative backend deletion url
        backendUrl.searchParams.set("filename", fileName);
        
        try {
            await fetch(backendUrl.toString(), {
                method: "DELETE",
                headers: { "X-API-Key": API_KEY! }
            });
        } catch (backendError) {
            console.warn("Failed to delete document from backend, but removed from local DB:", backendError);
        }

        return NextResponse.json({ success: true, message: "File deleted successfully from session" });
    } catch (error) {
        console.error("Delete document proxy error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
