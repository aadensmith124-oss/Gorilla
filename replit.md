# Digital Items Store

## Overview

This is a full-stack digital marketplace application for selling digital items with instant delivery. Users can browse products, add items to cart, purchase using wallet balance, and receive digital content immediately. The platform includes gambling-style games (dice, mines, daily spin) for users to win credits, an admin panel for managing products/stock/codes, and a wallet system with redeemable codes for top-ups.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: 
  - TanStack React Query for server state and caching
  - Zustand for client-side cart persistence (with localStorage)
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for game animations and page transitions
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript (ESM modules)
- **Authentication**: Passport.js with Local Strategy, session-based auth
- **Session Storage**: PostgreSQL via connect-pg-simple
- **Password Hashing**: Node crypto scrypt

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (shared between client/server)

### Key Design Patterns
- **Monorepo Structure**: Client (`client/`), Server (`server/`), and Shared (`shared/`) directories
- **API Contract**: Centralized route definitions in `shared/routes.ts` with Zod schemas for type-safe API calls
- **Storage Pattern**: `IStorage` interface in `server/storage.ts` abstracts database operations

### Data Models
- **Users**: Authentication, balance (in cents), protectedBalance (non-decayable from purchases/deposits), roles (user/admin), ban status
- **Products & Variants**: Products have multiple variants with different prices
- **Stock Items**: Individual digital items tied to variants, marked as sold when purchased
- **Orders & Order Items**: Track purchases with labeled item types (`itemType`: "product" or "card"). Product items link to variants/stock, card items link to cards table. Mixed orders (products + cards) are combined into a single order.
- **Cards**: Credit cards with masked numbers, country (auto-detected via BIN), price, first-hand status. Country dropdown on cards page is derived from existing card data. Purchased cards are marked as sold and linked to user.
- **Transactions**: Wallet history (top-ups, purchases, game wins/losses)
- **Redeem Codes**: One-time codes for adding balance
- **Announcements**: Admin-configurable site-wide messages

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Database Migrations**: Drizzle Kit with `db:push` command

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Session Store**: PostgreSQL table for Express sessions (auto-created)

### Third-Party Services
- **Forebit** (Crypto Payment Processing):
  - API Base: `https://prod-payments-api.forebit.io`
  - Auth: Bearer token via `FOREBIT_ACCESS_KEY`
  - Business ID: `FOREBIT_ACCOUNT_ID`
  - Endpoints:
    - `POST /v1/businesses/{businessId}/payments` - Create payment
    - `GET /v1/businesses/{businessId}/payments/{paymentId}` - Check status
  - Server module: `server/forebit.ts`
  - Webhook: `POST /api/webhooks/forebit`
  - Payment tracking table: `crypto_payments`
  - Flow: Create payment → redirect to Forebit checkout → webhook confirms → balance credited
- The build script includes allowlisted packages for:
  - OpenAI / Google Generative AI (AI features - not yet implemented)
  - Nodemailer (email - not yet implemented)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `express-session` / `connect-pg-simple`: Session management
- `passport` / `passport-local`: Authentication
- `zod` / `drizzle-zod`: Schema validation
- `@tanstack/react-query`: Server state management
- `zustand`: Client state (cart)
- `framer-motion`: Animations
- Full shadcn/ui component set via Radix primitives