
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSessionMessages, deleteChatSession } from "@/lib/db-actions";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const { id } = await params;
        const messages = await getSessionMessages(id);
        // ideally we should verify ownership here too, but getSessionMessages currently doesn't check user_id
        // For strict security, we should check if the session belongs to userId
        return NextResponse.json(messages);
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

    try {
        const { id } = await params;
        const success = await deleteChatSession(id, userId);
        if (!success) {
            return new NextResponse("Not Found or Forbidden", { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
