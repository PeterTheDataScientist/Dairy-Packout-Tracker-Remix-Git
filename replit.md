# YoMilk - Production & Packout Tracking System

## Overview

YoMilk is a production and packout tracking web application for a dairy business. It replaces spreadsheet-based tracking with a proper database-backed system featuring configurable products, dynamic formula-driven yield calculations, audit trails, and role-based access control.

The app tracks the full dairy production lifecycle: milk intake from suppliers → production batches (conversions and blends) → finished goods packout. It calculates expected vs actual yields using admin-configurable formulas, flags variances, and maintains an immutable audit ledger. Any post-save edits go through an admin approval workflow (Change Requests).

**Default credentials (seeded):**
- Admin: `admin@yomilk.com` / `password123`
- Data Entry: `data@yomilk.com` / `password123`

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript, bundled by Vite
- **Routing:** Wouter (lightweight client-side router)
- **State/Data Fetching:** TanStack React Query for server state management. API calls go through a centralized `apiRequest` helper in `client/src/lib/queryClient.ts`
- **UI Components:** shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS v4 (using `@tailwindcss/vite` plugin)
- **Charts:** Recharts for variance and mass balance visualizations
- **Auth Context:** Custom React context in `client/src/lib/auth.tsx` wrapping session-based auth
- **Key Pages:** Login, Dashboard, Intake, Production, Packouts, Products (admin), Formulas (admin), Approvals (admin), Reports (admin), My History (data entry)
- **Path aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime:** Node.js with TypeScript (tsx for dev, esbuild for production builds)
- **Framework:** Express.js with JSON body parsing
- **Authentication:** Passport.js with Local Strategy, express-session with PostgreSQL session store (`connect-pg-simple`)
- **Password Hashing:** bcryptjs
- **Authorization:** Two roles only — `ADMIN` and `DATA_ENTRY`. Middleware functions `requireAuth` and `requireAdmin` in `server/auth.ts`
- **API Pattern:** RESTful JSON API under `/api/` prefix. Routes defined in `server/routes.ts`
- **Storage Layer:** `server/storage.ts` defines an `IStorage` interface with a database-backed implementation using Drizzle ORM
- **Database Seeding:** `server/seed.ts` creates default users, suppliers, products, and sample formulas on first run

### Data Layer
- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Schema:** Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions with Zod validation schemas via `drizzle-zod`
- **Database:** PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- **Migrations:** Drizzle Kit with `drizzle-kit push` command (`npm run db:push`)
- **Session Store:** PostgreSQL via `connect-pg-simple` (auto-creates table)

### Data Model (Key Tables)
- **users** — id, name, email, passwordHash, role (ADMIN | DATA_ENTRY)
- **suppliers** — id, name, active
- **products** — id, name, category (enum: RAW_MILK, YOGURT, DTY, YOLAC, PROBIOTIC, CREAM_CHEESE, FETA, OTHER), unitType (LITER, KG, UNIT), isIntermediate, active
- **formulas** — id, name, type (CONVERSION | BLEND), outputProductId, inputBasis, active, version
- **conversionFormulas** — formulaId, inputProductId, ratioNumerator, ratioDenominator
- **blendComponents** — formulaId, componentProductId, fraction
- **dailyIntakes** — date, supplierId, productId, qty, deliveredQty (optional), acceptedQty (optional), unitType
- **productionBatches** / **productionLineItems** — batch tracking with operation types (CONVERT, BLEND)
- **blendActualUsage** — lineItemId, componentProductId, expectedQty, actualQty (tracks per-component actual usage in BLEND operations, CASCADE delete on line item)
- **packouts** — date, productId, qty, unitType, packSizeLabel, sourceProductId (optional), sourceQtyUsed (optional)
- **events** — immutable audit ledger (actorUserId, entityType, entityId, action, fieldName, oldValue, newValue)
- **changeRequests** — edit approval workflow (PENDING, APPROVED, REJECTED status)

### Loss Breakdown System
Four loss categories tracked through the production process:
- **A. Receiving Loss** — delivered vs accepted quantity at intake (from dailyIntakes.deliveredQty/acceptedQty)
- **B. Filling/Process Loss** — source material used vs packed output (from packouts.sourceQtyUsed vs qty)
- **C. Draining Loss** — input vs output in CONVERSION operations (from productionLineItems)
- **D. Packing/Mixing Loss** — expected vs actual component usage in BLEND operations (from blendActualUsage)
- API endpoint: `/api/reports/loss-breakdown` with dateFrom/dateTo query params
- Frontend page: `/loss-breakdown` (mobile-first collapsible card design)

### Formula Engine
Two configurable formula types, both managed through admin UI:
1. **CONVERSION** — transforms one input product to one output product with a ratio (e.g., milk → yogurt base at 1.1:1)
2. **BLEND** — combines multiple component products by fraction to create an output (e.g., 70% yogurt base + 20% strawberry puree + 10% sugar → strawberry yogurt)

Formulas drive expected yield calculations. The Production page computes expected vs actual input quantities and shows variance percentages.

### Build System
- **Development:** `npm run dev` starts Express server with Vite dev middleware (HMR via `server/vite.ts`)
- **Production Build:** `npm run build` runs `script/build.ts` which builds the React client with Vite and bundles the server with esbuild into `dist/`
- **Production Start:** `npm start` serves the built app from `dist/`

## External Dependencies

### Database
- **PostgreSQL** — Primary data store. Required. Connected via `DATABASE_URL` environment variable. Used for both application data (via Drizzle ORM) and session storage (via `connect-pg-simple`).

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** — ORM and migration tooling for PostgreSQL
- **express** + **express-session** — HTTP server and session management
- **passport** + **passport-local** — Authentication
- **bcryptjs** — Password hashing
- **connect-pg-simple** — PostgreSQL session store
- **@tanstack/react-query** — Client-side data fetching and caching
- **recharts** — Charting library for reports
- **wouter** — Client-side routing
- **zod** + **drizzle-zod** — Schema validation
- **date-fns** — Date formatting utilities
- **shadcn/ui** components (Radix UI primitives) — Full suite of UI components
- **zustand** — Listed as dependency (mockStore.ts exists but primary data flow uses React Query against the real API)

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required)
- `SESSION_SECRET` — Session encryption key (defaults to a dev fallback, should be set in production)