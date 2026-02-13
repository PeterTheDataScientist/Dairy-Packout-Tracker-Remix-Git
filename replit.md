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
- **Key Pages:** Login, Dashboard, Intake, Production, Packouts, Products (admin), Formulas (admin), Approvals (admin), Reports (admin), Running Stock (admin), Daily Allocation (admin), Loss Breakdown (admin), My History (data entry)
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
- **products** — id, name, category (enum: RAW_MILK, MILK, YOGURT, DTY, YOLAC, PROBIOTIC, CREAM_CHEESE, FETA, SMOOTHY, FRESH_CREAM, DIP, HODZEKO, CHEESE, OTHER), unitType (LITER, KG, UNIT), isIntermediate, active, packSizeQty (decimal, nullable), packSizeUnit (enum: LITER, KILOGRAM, nullable), packSizeLabel (text, nullable)
- **formulas** — id, name, type (CONVERSION | BLEND), outputProductId, inputBasis, active, version
- **conversionFormulas** — formulaId, inputProductId, ratioNumerator, ratioDenominator
- **blendComponents** — formulaId, componentProductId, fraction
- **dailyIntakes** — date, supplierId, productId, qty, deliveredQty (optional), acceptedQty (optional), unitType, notes (optional), reviewedAt, reviewedByUserId, adminNotes
- **productionBatches** / **productionLineItems** — batch tracking with operation types (CONVERT, BLEND); line items have notes, reviewedAt, reviewedByUserId, adminNotes
- **blendActualUsage** — lineItemId, componentProductId, expectedQty, actualQty (tracks per-component actual usage in BLEND operations, CASCADE delete on line item)
- **packouts** — date, productId, qty, unitType, packSizeLabel, sourceProductId (optional), sourceQtyUsed (optional), notes (optional), reviewedAt, reviewedByUserId, adminNotes
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

### Running Stock Report
Tracks daily running stock for two key material buckets:
- **Raw Milk** — daily received (from intakes) vs used (from production line item inputs), cumulative running stock
- **Yogurt Base** — daily produced (from line item outputs) vs used+packed (from line item inputs + packouts), cumulative running stock
- API endpoint: `/api/reports/running-stock` with dateFrom/dateTo query params (admin only)
- Frontend page: `/running-stock` with date range picker, charts, tables, CSV export
- Includes **Data Gaps** panel listing CONVERT line items with missing input quantities

### Daily Allocation Report
Shows how raw milk was distributed across product categories on a given day:
- Groups production line items by output product category
- Shows total input used per category with drill-down to individual operations
- API endpoint: `/api/reports/allocation?date=YYYY-MM-DD` (admin only)
- Frontend page: `/allocation` with collapsible category cards, CSV export
- Includes **Data Gaps** panel listing CONVERT line items with missing input quantities

### Production Data Integrity Guardrails
- **Auto-fill inputQty**: When creating/editing a CONVERT line item with null/empty inputQty, the server computes it from the formula ratio and outputQty. For UNIT-type output products with packSizeQty, it converts units to volume first (e.g., 34 units x 1L = 34L), then applies the formula ratio.
- **inputQtyAutoFilled flag**: Returned in POST/PUT responses when auto-fill occurs; recorded in audit event metadata.
- **Output equivalent**: Production form shows volume/weight equivalent for UNIT products (e.g., "34 units = 34L").
- **Data gaps detection**: `findDataGaps()` helper scans CONVERT line items with null/0 inputQty across a date range, surfaced in Running Stock and Allocation APIs as `dataGaps` array.

### Pack Size Tracking
Products with unitType=UNIT have optional pack size fields:
- `packSizeQty` — decimal volume/weight (e.g., 0.5 for 500ml)
- `packSizeUnit` — LITER or KILOGRAM
- `packSizeLabel` — human-readable label (e.g., "500ml", "1kg")
- Backfilled from product names using regex pattern matching (78/78 products)
- Editable in admin Products page

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