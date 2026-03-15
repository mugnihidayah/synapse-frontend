<div align="center">

# Synapse Frontend

### Instant Document Insights - Client Application

[![CI](https://github.com/mugnihidayah/synapse-frontend/workflows/CI/badge.svg)](https://github.com/mugnihidayah/synapse-frontend/actions)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**A modern, responsive Next.js frontend for Retrieval-Augmented Generation (RAG) document Q&A and Agentic Workflows.**

[Features](#features) • [Quick Start](#quick-start) • [Environment Variables](#environment-variables) • [Tech Stack](#tech-stack)

Backend API Repo: [mugnihidayah/synapse-instant-document-insight](https://github.com/mugnihidayah/synapse-instant-document-insight)

Backend API Space: [mugnihidayah-synapse-rag-api.hf.space/docs](https://mugnihidayah-synapse-rag-api.hf.space/docs)

</div>

---

![Synapse UI](./public/synapse-preview.png)

![Synapse UI 2](./public/synapse-preview-2.png)

## Features

- **Agentic RAG Ready**: Toggle ReAct-style agent orchestrator to perform multi-step deductive reasoning directly from the chat input. View thought/action/observation streams in real time.
- **Real-Time Streaming**: Server-Sent Events (SSE) stream parser for instant feedback during LLM generation.
- **Multimodal Upload UX**: Drag-and-drop document upload (PDF, DOCX, TXT, Images) with non-blocking, optimistic UI updates and background polling.
- **Interactive Citations**: Source citations map to a side PDF viewer, allowing users to verify LLM answers immediately.
- **Session Management**: Session-based chat history, rename, delete, and switch sessions with instant optimistic UI.
- **Secure Authentication**: Clerk authentication integrated with a polished landing experience for signed-out users.
- **Postgres Database**: Local user/session/message metadata is persisted in Postgres via Drizzle ORM.
- **Settings Panel**: Customize theme (Dark/Light), language, model selection, temperature, and OCR/table extraction options on the fly.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- A Postgres database URL (e.g., [Neon](https://neon.tech/), local Postgres)
- A [Clerk](https://clerk.com/) application for authentication
- Running [Synapse Backend API](https://github.com/mugnihidayah/synapse-instant-document-insight)

### Local Development

```bash
git clone https://github.com/mugnihidayah/synapse-frontend.git
cd synapse-frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Push Drizzle schema to your database
npx drizzle-kit push

# Start the development server
npm run dev
```

Open `http://localhost:3000` to view the application.

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Backend Service
# URL must point to your synapse-instant-document-insight backend instance
API_URL="http://localhost:8000"
API_KEY="your-backend-api-key"
```

---

## Architecture Summary

- **BFF (Backend for Frontend)**: `src/app/api/*` Next.js Route Handlers act as a secure proxy between the browser and the Python backend API.
- **API Key Security**: The `API_KEY` for the backend is stored server-side and never exposed to the browser.
- **Streaming Pipeline**: Chat responses and agent steps are streamed from the backend through `/api/query-stream` back to the UI.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Library**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Auth**: Clerk
- **Database**: Drizzle ORM + PostgreSQL
- **Icons & Toast**: Lucide React + Sonner

---

## Available Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # start production server
npm run lint     # run eslint
```

---

## Backend API Contract

The frontend relies on these core endpoints exposed by the Python backend (`API_URL`):

- `POST /api/v1/documents/sessions`
- `GET /api/v1/documents/sessions/{id}`
- `DELETE /api/v1/documents/sessions/{id}`
- `POST /api/v1/documents/upload/{session_id}`
- `POST /api/v1/query/{session_id}`
- `POST /api/v1/query/stream/{session_id}`
- `GET /api/v1/documents/supported-formats`
- `GET /api/v1/documents/{document_id}/file`

---

## Deployment Notes

Deploy easily on **Vercel** or any Node.js hosting. Ensure all environment variables from `.env.local` are set in your production environment.

Recommended checks before deploy:

```bash
npm run lint
npm run build
```

---

## License

[MIT](LICENSE)
