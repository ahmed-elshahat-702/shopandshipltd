# API and Server Actions

The application heavily utilizes Next.js Server Actions for data fetching and mutations, avoiding traditional API routes for internal operations.

## Server Actions (`app/actions/`)

Server actions securely interact with the Supabase database using the server client (`utils/supabase/server.ts`).

### `auth.ts`
Handles authentication workflows:
- Login, Registration, Logout.
- Password resets.
- Profile updates.

### `cart.ts`
Manages the server-side representation of the shopping cart (if synced to DB) or validates cart data during checkout.

### `merchant.ts`
Handles operations specific to merchants:
- Creating and updating products.
- Managing inventory.
- Retrieving merchant analytics and sales data.
- Handling order fulfillment status updates.

### `admin.ts`
Handles administrative tasks:
- Managing user roles.
- Approving/Rejecting Merchant KYC applications.
- Platform-wide analytics.
- Managing product categories and system configurations.

### `orders.ts`
Handles the core e-commerce flow:
- Creating new orders.
- Updating order status (pending, processing, shipped, delivered).
- Processing payments (interacting with the wallet system).

### `chat.ts`
Manages the real-time chat functionality:
- Creating chat sessions.
- Sending messages.
- Retrieving chat history.

## API Routes (`app/api/`)

Traditional API routes are primarily used for external integrations or webhooks where Server Actions are not suitable.

- `app/api/auth/`: Used for Supabase Auth callbacks (e.g., OAuth, email verification links).

## Database Functions (RPCs)
In addition to Server Actions, complex operations are often encapsulated in PostgreSQL Stored Procedures (RPCs) defined in `scripts/init-supabase.sql` and called via the Supabase client. This ensures data integrity and reduces network overhead for multi-step transactions (e.g., processing an order payment involving wallet deductions and commission calculations).
