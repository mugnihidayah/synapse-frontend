# Synapse - Advanced RAG Interface

Synapse is a next-generation chat interface for Retrieval-Augmented Generation (RAG) systems. Built with modern web technologies, it provides a seamless, production-grade experience for interacting with AI models and documents.

![Synapse UI](/public/synapse-preview.png)

## 🚀 Key Features

### 🧠 Advanced AI Interaction
- **Real-time Streaming**: Fluid response generation with "Thinking" indicators.
- **RAG Capabilities**: Upload documents (PDF, DOCX, TXT, MD) and chat with them.
- **Model Control**: Customize Model (Llama-3, etc.), Temperature, and Output Language.

### 🔐 Secure & Persistent
- **Fullstack Auth**: Secure authentication via **Clerk** (Sign In, Sign Up, User Profile).
- **Cloud Database**: Chat history and user preferences persisted in **Neon (PostgreSQL)** via **Drizzle ORM**.
- **Session Management**: Create, delete, and switch between multiple chat sessions securely.

### ✨ Polished UX
- **Public Landing Page**: Guests can view the UI and type prompts; authentication is triggered only on action.
- **Smart Logic**: Auto-titling of new chats based on context.
- **Responsive**: Fully optimized for Desktop and Mobile.
- **Theming**: Dark/Light mode support.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
- **Database**: [Neon](https://neon.tech/) (Serverless Postgres)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [Clerk](https://clerk.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## ⚡ Getting Started

### Prerequisites
- Node.js 18+
- A Neon Database project
- A Clerk application
- A running Python RAG Backend (compatible API)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/synapse-frontend.git
cd synapse-frontend
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory:

```env
# Database (Neon)
DATABASE_URL="postgresql://user:password@ep-xyz.region.aws.neon.tech/synapse?sslmode=require"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Backend API (Python RAG Service)
API_URL="http://localhost:8000"
API_KEY="your-backend-api-key"
```

### 3. Database Setup
Push the schema to your Neon database:

```bash
npm run db:push
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting.

## 📂 Project Structure

```
src/
├── app/              # Next.js App Router pages & API routes
│   ├── api/          # Backend API (Sessions, Messages, Upload)
│   ├── layout.tsx    # Root layout with Providers
│   └── page.tsx      # Main Chat Interface
├── components/       # React Components
│   ├── chat/         # Chat bubbles, Input, etc.
│   ├── sidebar/      # App Sidebar, History, Settings
│   └── ui/           # Shadcn UI primitives
├── db/               # Database Configuration
│   ├── schema.ts     # Drizzle Schema (Users, Chats, Messages)
│   └── index.ts      # DB Connection
├── lib/              # Utilities & API Clients
│   ├── api.ts        # Frontend API definitions
│   └── db-actions.ts # Server-side DB operations
└── types/            # TypeScript Interfaces
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
