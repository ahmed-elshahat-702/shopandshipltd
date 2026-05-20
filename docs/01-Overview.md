# Project Overview & Architecture

## Introduction
Shop & Ship LED is a sophisticated dropshipping platform built to handle multi-role interactions including Customers, Merchants, and Admins. The platform provides a full e-commerce experience including product discovery, shopping cart, checkout, merchant dashboards, admin management, and a real-time chat system.

## Tech Stack
- **Framework**: Next.js 16.2.1 (App Router)
- **Database & Backend as a Service**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Styling**: Tailwind CSS 4, shadcn/ui, Radix UI
- **State Management**: Zustand
- **Internationalization (i18n)**: next-intl (English and Arabic support)
- **Animations**: Framer Motion
- **Testing**: Vitest, Testing Library

## High-Level Architecture
The application follows a standard Next.js App Router architecture with a strong reliance on Server Actions for data mutation and Supabase for backend services.

- **Frontend (Client/Server Components)**: The UI is a mix of React Server Components (RSC) for performance and SEO, and Client Components for interactivity. `shadcn/ui` provides the foundational UI components.
- **Backend (Server Actions)**: Business logic and direct database interactions are handled via Next.js Server Actions (`app/actions/`).
- **Database (Supabase PostgreSQL)**: Stores all application data. It heavily utilizes PostgreSQL features like Triggers, Stored Procedures (RPCs), and Row Level Security (RLS) policies to enforce business logic and security at the database layer.
- **Authentication (Supabase Auth)**: Handles user registration, login, and session management. Tied directly to the `profiles` and `merchant_profiles` tables for role management.

## Directory Structure
- `app/`: Next.js App Router root.
  - `[locale]/`: Localized routes for i18n support.
    - `(auth)/`: Authentication routes (login, register, etc.).
    - `(public)/`: Publicly accessible routes (home, products, cart).
    - `admin/`: Admin dashboard routes.
    - `merchant/`: Merchant dashboard routes.
  - `actions/`: Next.js Server Actions for data fetching and mutations.
  - `api/`: API routes (e.g., auth callbacks).
- `components/`: Reusable React components organized by feature (ui, auth, merchant, admin, chat).
- `hooks/`: Custom React hooks.
- `i18n/`: Configuration for `next-intl`.
- `lib/`: Utility functions and Zustand stores (`lib/store/`).
- `messages/`: Translation JSON files (`ar.json`, `en.json`).
- `scripts/`: Initialization scripts, importantly `init-supabase.sql` for the database schema.
- `utils/supabase/`: Supabase client initialization for different environments (client, server, admin, proxy).
