# Core Systems and Logic

## 1. Authentication & Role-Based Access Control (RBAC)
Authentication is powered by Supabase Auth. The platform supports multiple roles: `customer`, `merchant`, `admin`, and `superadmin`.

- **Roles & Profiles**: When a user signs up, a trigger (`handle_new_user`) automatically creates a record in the `profiles` table. The `role` column in `profiles` determines their access level. Merchants have an additional `merchant_profiles` record containing business details.
- **Middleware Security**: The Next.js middleware (`proxy.ts` and `utils/supabase/proxy.ts`) intercepts requests and checks the user's role against the requested path (e.g., preventing a `customer` from accessing `/merchant/...`).
- **Row Level Security (RLS)**: Supabase RLS policies are extensively used to ensure users can only read/write data they own or have permission to access at the database level.

## 2. Wallet & Financial System
A complex wallet system handles transactions between customers, merchants, and the platform.

- **Tables**: `wallet` and `wallet_transactions`.
- **Transaction Types**: Recharge, withdrawal, order payment, refund, commission.
- **Automated Commissions**: A database trigger (`hold_order_commission` and related functions) automatically calculates the platform's commission based on the `merchant_levels` table. When an order is completed, the commission is deducted, and the remaining amount is credited to the merchant's wallet.

## 3. Merchant System
Merchants manage their stores, products, and view analytics.

- **Tiered System**: Merchants are assigned a level (`merchant_levels`) which dictates their commission rate and maximum allowed products.
- **KYC**: A Know Your Customer (KYC) status (`pending`, `approved`, `rejected`) is tracked in `merchant_profiles`.
- **Dashboards**: The Merchant Dashboard (`app/[locale]/merchant/`) provides insights into sales, inventory management, and order fulfillment.

## 4. Internationalization (i18n)
The application is fully localized in English and Arabic using `next-intl`.

- **Configuration**: Defined in `i18n/routing.ts` and `i18n/request.ts`.
- **Routing**: All pages are nested under a `[locale]` dynamic segment.
- **Translations**: JSON files in the `messages/` directory (`en.json`, `ar.json`) hold the translation strings.
- **Middleware**: The `next-intl` middleware determines the user's locale based on preferences or URL and handles redirects.

## 5. State Management
Client-side state is managed using Zustand, organized in `lib/store/`.

- `useAuthStore.ts`: Manages the current authenticated user's profile and role globally.
- `useCartStore.ts`: Handles shopping cart logic (adding/removing items, updating quantities, calculating totals).
- `useWishlistStore.ts` & `useFavoritesStore.ts`: Manages user wishlists and favorite merchants.
- `useMerchantStore.ts` & `useAdminStore.ts`: Store specific data for those respective dashboards.

## 6. Real-time Chat System
A chat system allows communication between customers and merchants/support.

- **Tables**: `chats`, `chat_participants`, `messages`.
- **Real-time Updates**: Likely uses Supabase Realtime to broadcast new messages to connected clients.
