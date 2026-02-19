import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createChatSession, ensureUser } from "@/lib/db-actions";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export async function POST() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // 1. Create session in Python Backend
        const res = await fetch(`${API_URL}/api/v1/documents/sessions`, {
            method: "POST",
            headers: {
                "X-API-Key": API_KEY!,
            },
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        // 2. Ensure user exists in our DB
        const email = user.emailAddresses[0]?.emailAddress || "unknown";
        await ensureUser(userId, email);

        // 3. Save session to our DB (sync ID)
        await createChatSession(userId, "New Chat", data.session_id);

        return NextResponse.json(data);
    } catch (error) {
        console.error("Session creation error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}