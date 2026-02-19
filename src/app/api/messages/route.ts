import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { saveMessage } from "@/lib/db-actions";

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { sessionId, role, content } = await req.json();

    if (!sessionId || !role || !content) {
        return new NextResponse("Missing required fields", { status: 400 });
    }

    try {
        const message = await saveMessage(sessionId, role, content);
        return NextResponse.json(message);
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
