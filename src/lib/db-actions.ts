
import { db } from "@/db";
import { chats, messages, users } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// Ensure user exists (idempotent)
export async function ensureUser(id: string, email: string) {
  await db
    .insert(users)
    .values({ id, email })
    .onConflictDoNothing();
}

export async function createChatSession(userId: string, title: string = "New Chat", id?: string) {
  const values = { userId, title, ...(id && { id }) };
  
  const [session] = await db
    .insert(chats)
    .values(values)
    .returning();
  return session;
}

export async function getUserSessions(userId: string) {
  return await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
}

export async function getSessionMessages(chatId: string) {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt);
}

export async function saveMessage(
  chatId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown> | null
) {
  const [message] = await db
    .insert(messages)
    .values({ chatId, role, content, ...(metadata && { metadata }) })
    .returning();
    
  // Update chat updated_at
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));

  return message;
}

export async function deleteChatSession(chatId: string, userId: string) {
  // Delete directly with ownership check
  const result = await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning();

  return result.length > 0;
}

export async function updateSessionTitle(chatId: string, title: string) {
    await db
        .update(chats)
        .set({ title })
        .where(eq(chats.id, chatId));
}

export async function updateUserPreferences(userId: string, preferences: Record<string, unknown>) {
    await db
        .update(users)
        .set({ preferences })
        .where(eq(users.id, userId));
}

export async function getUserPreferences(userId: string) {
    const [user] = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, userId));

    return user?.preferences;
}

export async function addFileToSession(chatId: string, fileName: string, fileType?: string) {
    // Append to files array (JSONB)
    // Coalesce handles null case
    await db.execute(sql`
        UPDATE synapse_chats
        SET files = COALESCE(files, '[]'::jsonb) || ${JSON.stringify([{ name: fileName, type: fileType }])}::jsonb
        WHERE id = ${chatId}
    `);
}
