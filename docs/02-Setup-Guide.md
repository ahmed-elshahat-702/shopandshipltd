# Setup & Installation Guide

## Prerequisites

- Node.js (v20+ recommended)
- pnpm (package manager)
- Supabase CLI (optional, but recommended for local database development)
- Git

## 1. Clone the Repository

```bash
git clone <repository-url>
cd shop_ship_led
```

## 2. Install Dependencies

```bash
pnpm install
```

## 3. Environment Variables

Rename `.env.example` to `.env.local` and add the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Other configurations (if applicable)
# e.g., STRIPE_SECRET_KEY
```

## 4. Database Setup (Supabase)

You need to set up the database schema, roles, and initial data.

**Option A: Using Supabase CLI (Local Development)**

1. Initialize Supabase: `pnpm supabase init`
2. Start local Supabase: `pnpm supabase start`
3. The local database will usually apply migrations automatically, but you can manually execute the init script.
4. Run the SQL script located at `scripts/init-supabase.sql` in your Supabase SQL Editor to create the schema, tables, triggers, and functions.
5. (Optional) Run `scripts/add-superadmin.sql` to create an initial superadmin user.

**Option B: Hosted Supabase**

1. Create a new project on Supabase.
2. Go to the SQL Editor in the Supabase Dashboard.
3. Copy the contents of `scripts/init-supabase.sql` and run it.

## 5. Running the Application

Start the development server:

```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`.

## Scripts Available

- `pnpm run dev`: Starts the Next.js development server.
- `pnpm run build`: Builds the application for production.
- `pnpm run start`: Starts the production server.
- `pnpm run lint`: Runs ESLint.
- `pnpm run check-i18n`: Checks for missing translations.
- `pnpm run test`: Runs Vitest tests.
