
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserSessions } from "@/lib/db-actions";

export async function GET() {
    const { userId } = await auth();

    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const sessions = await getUserSessions(userId);
        return NextResponse.json(sessions);
    } catch (error) {
        console.error("Failed to fetch history:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
