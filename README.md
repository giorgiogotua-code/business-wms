# DASTA - Warehouse Management System

## Overview
Full-stack warehouse management web application built with **Next.js 16**, **Supabase**, and **Tailwind CSS v4**. The entire UI is in **Georgian language** and uses **Georgian Lari** (&#8382;) as the currency. Role-based access control distinguishes between **admin** and **cashier** users.

---

## Tech Stack
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | App Router, SSR, middleware |
| React | 19.2.4 | UI framework |
| Supabase | 2.49.1 | Auth, PostgreSQL database, RLS |
| @supabase/ssr | 0.5.2 | Server-side auth with cookies |
| Tailwind CSS | 4.2.0 | Styling (v4, no tailwind.config.js) |
| shadcn/ui | latest | UI component library |
| SWR | 2.3.3 | Client-side data fetching/caching |
| xlsx | 0.18.5 | Excel import/export |
| Recharts | 2.15.0 | Interactive analytics charts |
| sonner | 1.7.1 | Toast notifications |
| lucide-react | 0.564.0 | Icons |
| jspdf | latest | PDF generation core |
| jspdf-autotable | latest | PDF table generation |
| openai | latest | AI Assistant integration |

---

## Supabase Configuration

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://npuuunfqjjanevoceftk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Database Schema (5 tables)

All tables have **Row Level Security (RLS)** enabled. Policies allow all authenticated users full CRUD access (role logic is handled in the app layer, not at the RLS level).

#### `public.categories`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | gen_random_uuid() |
| name | TEXT | UNIQUE, NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `public.products`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | gen_random_uuid() |
| name | TEXT | NOT NULL |
| category_id | UUID (FK) | REFERENCES categories(id) ON DELETE SET NULL |
| description | TEXT | nullable |
| purchase_price | NUMERIC(12,2) | DEFAULT 0 |
| sale_price | NUMERIC(12,2) | DEFAULT 0 |
| quantity | INTEGER | DEFAULT 0 |
| unit | TEXT | DEFAULT 'ცალი' (options: ცალი, კგ, ლიტრი, მეტრი) |
| low_stock_threshold | INTEGER | DEFAULT 10 |
| barcode | TEXT | UNIQUE, nullable |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

#### `public.transactions`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | gen_random_uuid() |
| product_id | UUID (FK) | REFERENCES products(id) ON DELETE CASCADE |
| type | TEXT | CHECK ('purchase' or 'sale') |
| quantity | INTEGER | NOT NULL |
| price_per_unit | NUMERIC(12,2) | NOT NULL |
| total_amount | NUMERIC(12,2) | NOT NULL |
| user_id | UUID (FK) | REFERENCES auth.users(id), nullable |
| notes | TEXT | nullable |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `public.expenses`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | gen_random_uuid() |
| description | TEXT | NOT NULL |
| amount | NUMERIC(12,2) | NOT NULL |
| user_id | UUID (FK) | REFERENCES auth.users(id), nullable |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `public.profiles`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK, FK) | REFERENCES auth.users(id) ON DELETE CASCADE |
| email | TEXT | nullable |
| full_name | TEXT | nullable |
| role | TEXT | DEFAULT 'cashier', CHECK ('admin' or 'cashier') |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### Database Trigger
- **`on_auth_user_created`**: Fires AFTER INSERT on `auth.users`. Auto-creates a row in `public.profiles` using the user's email and `raw_user_meta_data` fields (`full_name`, `role`). Runs with SECURITY DEFINER so it bypasses RLS.

### SQL Script
The full migration is at `scripts/001_create_tables.sql`. Must be run manually in Supabase SQL Editor.

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx                    # Root layout (Geist font, Toaster)
│   ├── page.tsx                      # Root redirect -> /dashboard (handles ?code= for email verification)
│   ├── globals.css                   # Tailwind v4 theme + print styles
│   ├── auth/
│   │   ├── login/page.tsx            # Login page (email/password)
│   │   ├── setup/page.tsx            # First admin account creation
│   │   ├── forgot-password/page.tsx  # Password reset request (sends email)
│   │   ├── reset-password/page.tsx   # New password form (after clicking email link)
│   │   ├── callback/route.ts         # Auth callback - exchanges code for session
│   │   └── error/page.tsx            # Auth error display
│   └── dashboard/
│       ├── layout.tsx                # Server component: checks auth, gets user role, renders DashboardShell
│       ├── page.tsx                  # Main dashboard with summary cards
│       ├── purchases/page.tsx        # Product management & stock purchases
│       ├── sales/page.tsx            # Sales interface with product selection
│       ├── inventory/page.tsx        # Inventory view with search, sort, filter, edit, delete
│       ├── accounting/page.tsx       # Accounting with 4 tabs (history, profitability, expenses, cashiers)
│       └── admin/page.tsx            # User management, create users, backup/restore
├── components/
│   ├── app-sidebar.tsx               # Collapsible dark navy sidebar with role-based nav items
│   ├── dashboard-shell.tsx           # Layout wrapper with sidebar + main content
│   ├── category-manager.tsx          # Category CRUD component (used in purchases)
│   ├── print-header.tsx              # Hidden component shown only during print
│   └── ui/                           # shadcn/ui components
├── lib/
│   ├── utils.ts                      # cn() utility
│   ├── excel.ts                      # exportToExcel() and importFromExcel() using xlsx
│   └── supabase/
│       ├── client.ts                 # Browser Supabase client (singleton)
│       ├── server.ts                 # Server Supabase client (cookies-based)
│       └── middleware.ts             # Session refresh + auth redirect logic
├── middleware.ts                      # Root middleware -> calls updateSession()
└── scripts/
    └── 001_create_tables.sql         # Database migration (run in Supabase SQL Editor)
```

---

## Authentication Flow

1. **Login** (`/auth/login`): Email + password sign-in via `supabase.auth.signInWithPassword()`
2. **Setup** (`/auth/setup`): Creates the first admin account via `supabase.auth.signUp()` with `role: 'admin'` in user metadata
3. **Callback** (`/auth/callback`): Exchanges auth code from email verification link for a session
4. **Forgot Password** (`/auth/forgot-password`): Sends password reset email via `supabase.auth.resetPasswordForEmail()`
5. **Reset Password** (`/auth/reset-password`): User lands here from the reset email link, sets new password via `supabase.auth.updateUser()`

### Middleware Logic (`lib/supabase/middleware.ts`)
- Refreshes Supabase session on every request
- **Public paths** (no auth required): `/auth/login`, `/auth/sign-up`, `/auth/sign-up-success`, `/auth/error`, `/auth/setup`, `/auth/callback`, `/auth/forgot-password`, `/auth/reset-password`
- Root path with `?code=` parameter is also allowed (for email verification redirects)
- Unauthenticated users on protected paths -> redirect to `/auth/login`
- Authenticated users on public paths -> redirect to `/dashboard`

---

## Role-Based Access Control

### Admin (role: 'admin')
Has access to ALL pages:
- მთავარი (Dashboard)
- შესყიდვა (Purchases)
- გაყიდვა (Sales)
- ნაშთი (Inventory)
- ბუღალტერია (Accounting)
- ადმინ პანელი (Admin Panel)

Full CRUD on everything: delete, edit, add products, manage users, change roles, backup/restore.

### Cashier (role: 'cashier')
Limited access:
- მთავარი (Dashboard)
- შესყიდვა (Purchases)
- გაყიდვა (Sales)
- ნაშთი (Inventory)

Cannot access Accounting or Admin Panel. Role filtering happens in `app-sidebar.tsx` via the `roles` array on each nav item.

**Important note**: Role restrictions are currently only enforced in the **sidebar navigation** (client-side). There is NO server-side middleware protection preventing a cashier from directly navigating to `/dashboard/accounting` or `/dashboard/admin` via URL. This is a known gap (see TODO section).

---

## Page Details

### Dashboard (`/dashboard/page.tsx`)
- 6 summary cards: Products count, Total stock, Purchases total, Sales total, Balance, Low stock count
- Data fetched client-side with SWR key `"dashboard-data"`
- Loading skeleton while fetching

### Purchases (`/dashboard/purchases/page.tsx`)
- **Category management**: Inline add/delete categories (via `CategoryManager` component)
- **New product form**: Name, category (optional), barcode (optional), description, purchase price, sale price, quantity, unit (ცალი/კგ/ლიტრი/მეტრი)
- **Add stock to existing**: Select product from dropdown, enter quantity + price, automatically updates product quantity and creates a `purchase` transaction
- **Excel export**: Downloads all products as .xlsx (including barcodes)
- **Excel import**: Reads .xlsx rows and creates products + purchase transactions (supports barcode import)
- **Print**: window.print() with PrintHeader

### Sales (`/dashboard/sales/page.tsx`)
- **Category filter dropdown**: Filter products by category
- **Product selection**: Select a product, shows current stock, purchase price, and sale price
- **Quantity + price inputs**: Enter quantity and price per unit
- **Barcode Scanner**: Dedicated input for high-speed scanning. Automatically identifies and adds products to cart.
- **Auto-calculated total**: quantity * price shown as total
- **On sale**: Creates a `sale` transaction, decrements product quantity
- Validates stock availability before sale
- **Excel export** and **Print** buttons

### Inventory (`/dashboard/inventory/page.tsx`)
- **Search**: Real-time filter by product name or barcode
- **Sort**: By name (alphabetical), price (descending), stock (ascending)
- **Category filter**: Buttons showing category name + count, plus "all"
- **Low stock warning**: Yellow card showing all products below their `low_stock_threshold`
- **Product cards**: Each shows name, category, unit, purchase price, sale price, quantity with edit/delete buttons
- **Edit dialog**: Modal to edit all product fields
- **Delete**: Confirmation dialog before deleting
- **Excel export/import** and **Print**

### Accounting (`/dashboard/accounting/page.tsx`)
- **Date range filter**: "დან" (from) and "მდე" (to) date inputs
- **4 Summary cards**: Purchases total (red), Sales total (green), Other expenses (red), Balance (green/red)
- **4 Tabs**:
  1. **ისტორია (History)**: Transaction table with columns (product, type, quantity, price, total, date). Filter buttons for purchase/sale/all. Footer shows total.
  2. **მომგებიანობა (Profitability)**: Per-product analysis showing revenue, cost, profit, margin %, sorted by profit. Export to Excel.
  3. **ხარჯები (Expenses)**: Add new expenses (description + amount), delete expenses, import/export Excel. Shows total.
  4. **მოლარეები (Cashiers)**: List of all users with email, name, role, registration date.
- **Top buttons**: Excel export (transactions) and Print

### Admin Panel (`/dashboard/admin/page.tsx`)
- **3 Tabs**:
  1. **მომხმარებლები (Users)**: List all profiles with email, name, role badge, role change dropdown
  2. **შექმნა (Create)**: Form to create new users via `supabase.auth.signUp()` with full name, email, password, role
  3. **ბექაფი (Backup)**:
     - **JSON backup**: Downloads all data (categories, products, transactions, expenses, profiles) as a single JSON file
     - **Excel backup**: Downloads 3 separate .xlsx files (products, transactions, expenses)
     - **JSON restore**: Upload a JSON backup file, clears existing data, restores from backup (with FK-safe deletion order)

---

## Data Flow Patterns

### Client-Side Data Fetching
All pages use **SWR** with named keys for caching and cross-component sync:
- `"dashboard-data"` - Dashboard summary
- `"products"` - Products list (used by Purchases, Inventory, Sales)
- `"categories"` - Categories list
- `"expenses"` - Expenses list
- `"profiles"` - User profiles
- `"accounting-transactions"` - Transactions with product join
- `"accounting-profiles"` - Profiles for accounting page

After mutations, `mutate("key")` is called to refresh related data.

### Server-Side Auth
- `app/dashboard/layout.tsx` is a **Server Component** that:
  1. Creates a server Supabase client
  2. Gets the current user via `supabase.auth.getUser()`
  3. Fetches the user's profile from `public.profiles`
  4. Passes `userRole` to `DashboardShell` -> `AppSidebar`

### Supabase Clients
- **Browser** (`lib/supabase/client.ts`): Uses `createBrowserClient` from `@supabase/ssr`, singleton pattern
- **Server** (`lib/supabase/server.ts`): Uses `createServerClient` from `@supabase/ssr`, reads/writes cookies
- **Middleware** (`lib/supabase/middleware.ts`): Uses `createServerClient` with request/response cookie handling

---

## Print System
- `components/print-header.tsx`: Hidden div that becomes visible during print, shows "DASTA", page title, date/time
- `app/globals.css` has `@media print` styles that:
  - Hide sidebar, navigation, buttons (`.no-print` class)
  - Make main content full width
  - Style tables with borders for readability
  - Set A4 page with 15mm margins

---

## Excel Import/Export (`lib/excel.ts`)
- **`exportToExcel(data, filename, sheetName)`**: Takes array of objects, creates .xlsx file, triggers download
- **`importFromExcel(file)`**: Reads .xlsx/.xls/.csv file, returns array of objects (first sheet only)
- Georgian column headers are used (e.g., "სახელი", "შესყიდვის ფასი", "რაოდენობა")
- Import also supports English column names as fallback

---

## Theming

### Color Tokens (globals.css)
The app uses custom CSS variables for theming. Key colors:
- **Sidebar**: Dark navy/slate (`--sidebar: 222 47% 16%`)
- **Primary**: Blue-purple (`--primary: 224 65% 52%`)
- **Success**: Green (custom `--success` token for sales/positive values)
- **Warning**: Amber (custom `--warning` token for low stock)
- **Destructive**: Red for purchases/negative values

### Fonts
- **Geist** (sans-serif) for all text
- **Geist Mono** for monospace

---

## Known Issues & TODOs

### High Priority
1. **Server-side role protection**: Currently roles are only enforced in the sidebar (client-side). A cashier can manually navigate to `/dashboard/accounting` or `/dashboard/admin` via URL. Need to add server-side role checking in `app/dashboard/accounting/page.tsx` and `app/dashboard/admin/page.tsx` layout or page level.
2. **Email verification flow**: The Supabase email confirmation redirect URL defaults to `localhost:3000`. User must either:
   - Disable email confirmation in Supabase Dashboard (Authentication > Providers > Email > toggle off "Confirm email")
   - OR add the production URL to Supabase's Redirect URLs in Authentication > URL Configuration
3. **Transactions don't track user_id**: The `user_id` column exists in `transactions` and `expenses` tables but is not being populated when creating records. Should pass the current user's ID.

### Medium Priority
4. **Add charts/graphs**: Recharts is installed but not used. Could add:
   - Sales/purchases over time line chart on the dashboard
   - Profitability bar chart in accounting
   - Category breakdown pie chart
5. **Product images**: No image upload support. Could add Vercel Blob or Supabase Storage for product photos.
6. **Search in accounting**: Transaction history has no text search, only date and type filters.
7. **Pagination**: All pages load all data at once. For large datasets, need pagination or infinite scroll.
8. **Stock history per product**: Show a timeline of quantity changes for a specific product.

### Low Priority
9. **Dark mode toggle**: Theme tokens are set up for light mode only. Could add dark mode support with next-themes (already installed).
10. **Mobile responsiveness**: Sidebar collapses but mobile UX could be improved with a sheet/drawer pattern.
11. **Audit log**: Track who made what changes and when.
12. **Multi-currency support**: Currently hardcoded to Georgian Lari (&#8382;).
14. **Receipt printing**: Generate formatted receipt for sales, not just page print.
15. **Dashboard date range**: Dashboard summary doesn't support date filtering unlike accounting.
16. **Supplier management**: No suppliers table or tracking. Could add supplier info to purchases.
17. **Return/refund system**: No way to process returns or refunds on sales.
18. **Notification system**: No real-time alerts for low stock or other events.

### Code Quality
19. **Type safety**: Some pages use `Record<string, unknown>` type assertions instead of proper interfaces. Should clean up TypeScript types across the codebase.
20. **Error handling**: Some mutation functions don't have comprehensive error handling. Should add try/catch blocks and user-friendly error messages.
21. **Loading states**: Some forms don't show loading spinners during async operations.
22. **Form validation**: Client-side only. Should add Zod schemas for proper validation (Zod is already installed).

---

---

## Recent Features (February 2026)

### 1. RS.GE Integration (Revenue Service)
- **Waybills (ზედნადებები)**: Create, save, send, and manage shipping waybills directly from the dashboard.
- **Tax Invoices (ფაქტურები)**: Create and upload VAT tax invoices to the rs.ge portal.
- **TIN Lookup**: Automatic company name and VAT status lookup by Tax Identification Number.
- **SOAP Client**: Built-in integration with rs.ge SOAP services.
- **Sync**: Import waybill data into the accounting module for reconciliation.

### 2. Professional PDF Generation 📄
- **Template System**: Branded, professional PDF layouts for waybills and invoices.
- **Unicode Support**: Integrated **Noto Sans Georgian** for perfect Georgian character rendering.
- **Fast Download**: One-click PDF generation from any registry row.

### 3. Dashboard Visual Charts (Analytics) 📊
- **Sales & Purchase Trends**: Interactive AreaChart showing a 30-day rolling window of business activity.
- **Top Products**: BarChart visualization of the top 5 revenue-generating products.
- **Dynamic Data**: Real-time aggregation of Supabase transaction data for up-to-the-minute insights.

### 4. DASTA AI Assistant 🤖
- **Conversational Analytics**: Chat with your data ("რა არის ჩემი მოგება?")
- **Business Context**: The AI understands your products, sales trends, and stock levels.
- **Geist UI**: Floating chat interface integrated into the dashboard layout.
- **OpenAI Powered**: Uses GPT-4o-mini for fast and intelligent responses.

### 5. Barcode & SKU Support 🏷️
- **Automated Scanning**: High-speed checkout flow on the Sales page.
- **Universal Lookup**: Search by barcode in Inventory and Purchases.
- **Excel Sync**: Full barcode support for bulk data imports and exports.

---

## Recommended Future Features (v2 Roadmap)

These are major features that would transform this from a basic tool into a complete business platform. Listed by priority:

### Tier 1 -- Critical Business Value
1. **Debt & Debtor Management (CRM / ვალების მართვა)** 💸
   - Track customer debts and payment statuses.
   - Automated payment reminders (SMS/Email).
   - Detailed debtor reports and history.

3. **Dashboard Live Charts (Recharts)**
   - Sales/purchases trend line chart for last 7/30 days
   - Top 5 best-selling products bar chart
   - Profit dynamics over time
   - Recharts is already installed (`recharts: 2.15.0`), just needs implementation in `app/dashboard/page.tsx`
   - Georgian Lari (&#8382;) formatted tooltips

2. **Supplier Management Module**
   - New `suppliers` table: `id`, `name`, `phone`, `email`, `address`, `notes`, `created_at`
   - Add `supplier_id` FK to `products` and `transactions` tables
   - New page `/dashboard/suppliers` with CRUD
   - Track who supplies what, purchase history per supplier, outstanding balances
   - Supplier report in accounting

3. **Audit Log System**
   - New `audit_logs` table: `id`, `user_id`, `action` (create/update/delete), `table_name`, `record_id`, `old_data` (JSONB), `new_data` (JSONB), `created_at`
   - Database trigger or app-level logging for every mutation
   - Admin page tab to browse audit trail: who deleted what, who changed which price, who created which user
   - Filter by user, action type, date range, table

### Tier 2 -- Significant Improvement
4. **Real-time Notification System**
   - Supabase Realtime subscription for `products` table changes
   - In-app notification bell icon in sidebar header
   - Alerts: low stock reached, new sale made, new purchase, new user registered
   - `notifications` table: `id`, `user_id`, `message`, `type`, `read`, `created_at`
   - Toast + persistent notification panel

5. **Invoice / Receipt PDF Generation**
   - Auto-generate PDF invoices after each sale
   - Georgian format: seller name, buyer name (optional), date, product table, totals
   - Use `@react-pdf/renderer` or `jspdf` library
   - Print-optimized layout with business logo support
   - Option to email invoice to buyer

6. **Barcode / QR Scanner**
   - Add `barcode` field to `products` table
   - Camera-based scanning using `html5-qrcode` or `@zxing/browser`
   - Mobile-friendly: point camera at barcode to instantly find product
   - Useful in sales page for fast product lookup
   - Barcode label printing support

### Tier 3 -- Nice to Have
7. **Multi-Warehouse Support**
   - New `warehouses` table: `id`, `name`, `address`, `created_at`
   - Add `warehouse_id` to `products` and `transactions`
   - Warehouse selector in sidebar or header
   - Per-warehouse inventory view
   - Stock transfer between warehouses functionality

8. **Progressive Web App (PWA)**
   - Add `next-pwa` for service worker and offline support
   - App manifest with DASTA branding
   - Cashiers can install on phone home screen
   - Offline mode: cache product list, queue sales for sync when online
   - Push notifications for low stock alerts

9. **Smart Global Search (Cmd+K)**
   - Command palette with keyboard shortcut (Cmd+K / Ctrl+K)
   - Search across: products, transactions, users, categories
   - Quick actions: "add product", "new sale", "view inventory"
   - Use `cmdk` library (already common in shadcn/ui ecosystem)
   - Recent searches history

10. **Dark / Light Theme Toggle**
    - `next-themes` is already in the project
    - Add toggle button in sidebar footer (next to logout)
    - Dark mode CSS variables already partially supported by shadcn
    - Night shift friendly for warehouse workers
    - Persist preference in localStorage or user profile

---

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
pnpm start
```

### First-Time Setup
1. Run `scripts/001_create_tables.sql` in Supabase SQL Editor
2. In Supabase Dashboard, go to Authentication > Providers > Email and disable "Confirm email" (recommended for development)
3. Go to the app's `/auth/setup` page and create the first admin account
4. Log in at `/auth/login`

---

## Deployment
The app is deployed on **Vercel**. Environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be set in the Vercel project settings.

For production:
- Set the Site URL in Supabase Dashboard > Authentication > URL Configuration
- Add redirect URLs: `https://your-domain.vercel.app/auth/callback` and `https://your-domain.vercel.app/auth/reset-password`
