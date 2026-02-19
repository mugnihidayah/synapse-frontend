
import { pgTable, text, timestamp, uuid, pgEnum, jsonb } from 'drizzle-orm/pg-core';

// Enum for message roles
export const roleEnum = pgEnum('synapse_role', ['user', 'assistant']);

export const users = pgTable('synapse_users', {
  id: text('id').primaryKey(), // Clerk ID
  email: text('email').notNull(),
  imageUrl: text('image_url'),
  // Store settings as JSONB for flexibility
  preferences: jsonb('preferences'), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chats = pgTable('synapse_chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  // Store file metadata as JSONB array: [{ name: "doc.pdf", type: "application/pdf" }]
  files: jsonb('files').$type<{ name: string; type?: string }[]>(), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('synapse_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
  role: roleEnum('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
