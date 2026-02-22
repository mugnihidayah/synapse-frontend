# Synapse Frontend

Synapse is a modern Retrieval-Augmented Generation (RAG) document Q&A interface.
Users upload documents, ask questions, and receive AI answers with source citations.

This repository is the frontend app. It proxies requests to the backend service:
[synapse-instant-document-insight](https://github.com/mugnihidayah/synapse-instant-document-insight).

![Synapse UI](./public/synapse-preview.png)

## What You Get

- Clerk authentication with a polished landing experience for signed-out users
- Session-based chat history (create, switch, delete sessions)
- Document upload with real upload progress (`uploading -> processing -> done/error`)
- OCR-aware ingestion status, including warning handling (for example image with no readable text)
- Streaming answers over SSE
- Source citations with side viewer and PDF preview
- Feedback and usage insights integration
- Settings panel: theme, language (EN/ID), model, temperature, OCR/table options

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Clerk (auth)
- Drizzle ORM + Postgres (Neon compatible)
- Lucide React + Sonner

## Architecture Summary

- `src/app/api/*` acts as a secure proxy between frontend and backend API
- Backend API key is stored server-side (`API_KEY`) and never exposed to browser
- User/session/message metadata is persisted in Postgres via Drizzle
- Chat responses are streamed from backend through `/api/query-stream`

## Prerequisites

- Node.js 20+
- A Postgres database URL
- A Clerk application
- Running Synapse backend API

## Environment Variables

Create `.env.local` in project root:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Backend service
API_URL="http://localhost:8000"
API_KEY="your-backend-api-key"
```

## Local Development

1. Install dependencies

```bash
npm install
```

2. Push Drizzle schema to database

```bash
npx drizzle-kit push
```

3. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # start production server
npm run lint     # run eslint
```

## Backend API Contract (Core)

The frontend expects these backend endpoints (under `API_URL`):

- `POST /api/v1/documents/sessions`
- `GET /api/v1/documents/sessions/{id}`
- `DELETE /api/v1/documents/sessions/{id}`
- `POST /api/v1/documents/upload/{session_id}`
- `POST /api/v1/query/{session_id}`
- `POST /api/v1/query/stream/{session_id}`
- `GET /api/v1/documents/supported-formats`
- `GET /api/v1/documents/{document_id}/file`

Additional insights/keys endpoints are used by the UI (`/api/v1/insights/*`, `/api/v1/keys/*`).

## Project Structure

```text
src/
  app/
    home-client.tsx
    api/
      query-stream/
      upload/
      sessions/
      messages/
      history/
      documents/[id]/file/
      insights/
      keys/
  components/
    landing/
    chat/
    sidebar/
    ui/
  db/
    schema.ts
    index.ts
  lib/
    api.ts
    db-actions.ts
    ingestion-error.ts
  types/
    index.ts
```

## Troubleshooting

- Upload shows warning like "No readable text"
  - This usually means OCR could not find text in an image.
  - It is treated as warning when possible; upload can still complete for valid files.

- `401 Unauthorized`
  - Check Clerk keys and login state.

- Upload/query fails with backend error
  - Verify `API_URL` and `API_KEY` in `.env.local`.
  - Ensure backend is running and reachable from Next.js server.

- Database errors on session/history
  - Verify `DATABASE_URL`.
  - Run `npx drizzle-kit push` again.

## Deployment Notes

Deploy on Vercel (or similar) and set all environment variables from `.env.local`.

Recommended checks before deploy:

1. `npm run lint`
2. `npm run build`

## License

MIT
