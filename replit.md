# RULF.CC — Digital Marketplace

## What This Is

A dark-themed digital marketplace for selling digital items (accounts, keys, subscriptions, etc.) with stock-based instant delivery. Built with React + Express + PostgreSQL.

**Live at:** rulf.cc

---

## Features

- **Shop** — product listings with variants and stock counts
- **Cart** — add items, choose payment method, checkout
- **Wallet** — top up balance with redeemable codes, spend on orders
- **CashApp Payments** — user sends CashApp with a generated note (`snack-XXXX`); admin manually confirms via Paid/Unpaid buttons; stock delivered on confirmation
- **Stock System** — admin pre-loads text items per variant; each purchase pulls one item off the stack
- **Admin Dashboard** — manage products, variants, stock, orders, users, redeem codes, announcements
- **Payment Method Toggles** — admin can show/hide Wallet, CashApp, Crypto, Telegram Stars per customer
- **Games** — dice, mines, daily spin (for earning credits)
- **Profile** — order history with delivery content, balance history
- **Dark theme** — `#090a0c` base, primary amber/orange, CashApp green `#00D632`

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query, Zustand, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL (Drizzle ORM) |
| Auth | Passport.js (local strategy), express-session, connect-pg-simple |
| Payments | CashApp (manual), Crypto via Forebit API, Telegram Stars |

---

## Setup After Remix

### 1. Database

The Replit PostgreSQL database is already configured. On first run the app automatically creates:
- All schema tables via Drizzle (`npm run db:push`)
- The `session` table (created in `server/index.ts` on startup)

**Run schema push after any schema change:**
```
npm run db:push
```

### 2. Environment Variables

Set these in the Replit **Secrets** panel:

| Secret | Required | Description |
|---|---|---|
| `DATABASE_URL` | Auto-set | Set automatically when you create a Replit DB |
| `SESSION_SECRET` | Recommended | Random string for signing session cookies. Defaults to a placeholder if missing. |
| `FOREBIT_ACCESS_KEY` | Optional | API key for Forebit crypto payment processing |
| `FOREBIT_ACCOUNT_ID` | Optional | Business ID for Forebit |
| `TELEGRAM_BOT_TOKEN` | Optional | For Telegram Stars payment integration |

### 3. Admin Account

Admin accounts are granted based on email address. Open `server/auth.ts` and update the admin emails list:

```typescript
const adminEmails = ["your@email.com", "another@email.com"];
```

Register on the site with one of those emails — you'll automatically be granted admin role.

### 4. CashApp Setup (Admin Panel → Integrations)

1. Go to **Admin → Integrations**
2. Under **CashApp Settings**, enter your `$CashTag` and click Save
3. Toggle CashApp ON in the Payment Methods section
4. Users will now see CashApp as a checkout option

### 5. Adding Stock (Admin Panel → Products)

1. Create a product and add variants (with prices in cents, e.g. `500` = $5.00)
2. Click the variant to open the stock panel
3. Paste your stock items — each item separated by a **blank line** (`\n\n`)
4. Items are delivered one-by-one per order

### 6. Creating Redeem Codes (Admin Panel → Codes)

1. Go to **Admin → Codes**
2. Enter a code and amount in cents
3. Users can redeem codes on the Profile page to add wallet balance

---

## CashApp Order Flow

1. Customer adds items to cart, selects CashApp, clicks Purchase
2. A modal shows: generated note (`snack-XXXX`), your $cashtag, exact amount
3. Customer sends CashApp with the note
4. Admin sees the order in **Orders** tab with **Paid** (green) and **Unpaid** (red) buttons
5. **Paid** → stock items are reserved and delivered to the user automatically
6. **Unpaid** → order marked as unpaid (status: `waiting_payment`)
7. Orders with CashApp payment are never auto-cancelled (they wait up to 4 hours)

---

## Order Status Reference

| Status | Meaning |
|---|---|
| `pending` | CashApp order placed, awaiting admin confirmation |
| `waiting_payment` | Admin marked as unpaid |
| `fulfilled` | Wallet order paid, items assigned |
| `delivering` | CashApp order confirmed by admin, stock delivered |
| `refunded` | Order refunded to wallet |

---

## Key Files

| File | Purpose |
|---|---|
| `shared/schema.ts` | Database schema (Drizzle ORM) — single source of truth |
| `server/routes.ts` | All API routes |
| `server/storage.ts` | Database operations (IStorage interface) |
| `server/auth.ts` | Authentication setup, admin email list |
| `server/index.ts` | Server startup, session table auto-creation |
| `client/src/pages/AdminPage.tsx` | Full admin dashboard |
| `client/src/pages/CartPage.tsx` | Checkout with CashApp + Wallet |
| `client/src/pages/ProfilePageFix.tsx` | User profile, orders, balance |
| `client/src/pages/ShopPage.tsx` | Product listings |
| `client/src/App.tsx` | Routes, global polling |

---

## Development

The workflow `Start application` runs `npm run dev` which starts both the Express backend and Vite frontend on port 5000.

```
npm run dev        # Start dev server
npm run db:push    # Push schema changes to database
npm run build      # Build for production
```

---

## System Architecture

### Frontend
- React 18 + TypeScript, Wouter for routing
- TanStack Query for all server state/caching
- Zustand for cart persistence (localStorage)
- shadcn/ui components + Tailwind CSS
- Framer Motion for game animations

### Backend
- Express 5, TypeScript (ESM modules)
- Passport.js local strategy, session-based auth
- PostgreSQL sessions via connect-pg-simple
- Drizzle ORM, drizzle-zod for validation

### Data Models
- **Users** — auth, balance (cents), role (user/admin), ban status
- **Products + Variants** — products have multiple variants with prices
- **Stock Items** — text items per variant, pulled on purchase (`isSold: true`)
- **Orders + OrderItems** — track purchases; orderItems link to stockItems
- **Transactions** — wallet history (top-ups, purchases, game wins/losses)
- **Redeem Codes** — one-time codes for wallet top-up
- **Site Settings** — key/value store for CashApp tag, payment method toggles, announcements
- **Crypto Payments** — Forebit payment tracking

### Build System
- Dev: Vite HMR proxied through Express
- Prod: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`

### User Preferences
Preferred communication style: Simple, everyday language.
