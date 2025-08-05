# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🧠 Project Summary

**MyFutureSelf** is a SaaS journaling + vision board platform designed to help users reflect on their lives and visualize their ideal future self.

The app enables:
- AI-enhanced journaling and summarization
- Vision board creation using user-uploaded media
- Mood tracking and entry categorization
- Seamless onboarding for Free and Pro users

**Tech Pillars**:
- 🖥️ Polished Apple-inspired UX (Steve Jobs quality bar)
- ⚡ Fast, low-friction user flows
- 🎯 Self-serve SaaS onboarding
- 🔐 Secure Supabase auth + RLS
- 📈 Subscription-based monetization with Stripe

---

## 💻 Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Run linter**: `npm run lint`
- **Preview production build**: `npm run preview`
- **Install dependencies**: `npm install`

---

## ⚙️ High-Level Architecture

This is a **React + TypeScript** web application built with **Vite**, using the following stack:

### 🧩 Frontend Stack
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v7
- **Styling**: Tailwind CSS with PostCSS
- **State Management**: React hooks and local state
- **Icons**: Lucide React
- **Charts**: Recharts

### 🛠️ Backend Infrastructure
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **Payment Processing**: Stripe integration
- **AI Integration**: OpenAI API (for summarizing journals) & Claude (coming)
- **Edge Functions**: Supabase Edge Functions (Deno) for Stripe webhooks
- **Email**: SendGrid (for onboarding and transactional emails)

---

## 🧱 Key Architecture Patterns

### 🔐 1. Authentication Flow
- Supabase Auth handles user registration/login
- Auth state is managed globally in `AppRouter.tsx`
- Protected routes enforced via `PrivateRoute.tsx`

### 🗄️ 2. Database Schema (see `/supabase/migrations/`)
- `journal_entries`: User-generated journal entries
- `moodboards`: Vision board data stored as JSONB
- `subscriptions`: Stripe subscription info
- `social_integrations`: External service connections
- **RLS policies** prevent cross-user data access

### 🧩 3. Component Architecture
- **Pages** live in `/app/pages/` and handle layout + logic
- **Features** and reusable components are organized in `/app/components/`
- **Shared UI** in `/app/components/Shared/`
- Types are defined in `/app/types/index.ts`

### 💳 4. Stripe Integration
- Checkout via `Stripe.js` redirect
- Webhooks handled by `supabase/functions/stripe-webhook/index.ts`
- Subscription state is mirrored in local DB

### ⚙️ 5. Environment Variables

**Frontend (Client-side):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Backend/Edge Functions (Server-side):**
- `OPENAI_API_KEY` - OpenAI API key (server-side only)
- `STRIPE_SECRET_KEY` - Stripe secret key (server-side only)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (served securely via Edge Function)
- `SERVICE_ROLE_KEY` - Supabase service role key
- `PROJECT_URL` - Supabase project URL

---

## 🧭 Key Files to Understand

| File | Purpose |
|------|---------|
| `app/AppRouter.tsx` | Central routing config + auth gate logic |
| `app/lib/supabase.ts` | Supabase client instance |
| `app/types/index.ts` | Core TypeScript interfaces and types |
| `supabase/functions/stripe-webhook/index.ts` | Stripe webhook logic |
| `app/pages/` | Page-level components tied to routes |
| `app/components/Shared/` | Global UI components |
| `.CLAUDE.md` | Used to guide Claude’s coding behavior |

---

## 📈 Business Goals

- Launch with a $9/mo Pro plan → increase to $15
- Self-serve onboarding → zero sales touch
- Viral flywheel via journaling, vision boards, and shareable insights
- Scalable to 100K+ users with minimal support burden
- Long-term roadmap includes gamification, AI coaches, and analytics dashboard