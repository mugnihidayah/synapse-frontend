import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { addFileToSession } from "@/lib/db-actions";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    const asyncMode = searchParams.get("async_mode");
    const enableOcr = searchParams.get("enable_ocr");
    const extractTables = searchParams.get("extract_tables");

    if (!sessionId) {
        return NextResponse.json(
            { error: "session_id is required" },
            { status: 400 }
        );
    }

    const backendUrl = new URL(`${API_URL}/api/v1/documents/upload/${sessionId}`);
    if (asyncMode !== null) backendUrl.searchParams.set("async_mode", asyncMode);
    if (enableOcr !== null) backendUrl.searchParams.set("enable_ocr", enableOcr);
    if (extractTables !== null) backendUrl.searchParams.set("extract_tables", extractTables);

    // Pass the request stream directly to the backend to avoid buffering (Double Upload)
    // We must forward the Content-Type header which contains the boundary for multipart/form-data
    const contentType = request.headers.get("content-type");

    try {
        const res = await fetch(
            backendUrl.toString(),
            {
                method: "POST",
                headers: {
                    ...(contentType && { "Content-Type": contentType }),
                    "X-API-Key": API_KEY!,
                },
                body: request.body,
                // @ts-expect-error - duplex is required for streaming bodies in Node environment standard fetch
                duplex: "half", 
            }
        );

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }
        
        // Save file info to DB
        // We expect client to send x-file-names and x-file-types headers (comma separated, url encoded)
        const fileNamesHeader = request.headers.get("x-file-names");
        const fileTypesHeader = request.headers.get("x-file-types");

        if (fileNamesHeader) {
            const fileNames = decodeURIComponent(fileNamesHeader).split(",");
            const fileTypes = fileTypesHeader ? decodeURIComponent(fileTypesHeader).split(",") : [];

            // Add each file to session
            for (let i = 0; i < fileNames.length; i++) {
                const fileName = fileNames[i];
                const fileType = fileTypes[i] || "application/octet-stream";
                if (fileName) {
                    await addFileToSession(sessionId, fileName, fileType);
                }
            }
        } else {
            // Fallback if headers missing (shouldn't happen with updated client)
            const fileName = data.filename || `Document_${Date.now()}`;
            await addFileToSession(sessionId, fileName, "application/octet-stream");
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Upload proxy error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
