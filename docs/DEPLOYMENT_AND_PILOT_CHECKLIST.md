# YoMilk — Deployment + Pilot Testing Checklist

**Version:** 1.0
**Last updated:** February 2026
**Audience:** Whoever is responsible for deploying and verifying the app before go-live

---

## Table of Contents

1. [Pre-Deploy Checks](#1-pre-deploy-checks)
2. [Security Basics](#2-security-basics)
3. [Backup Guidance](#3-backup-guidance)
4. [Pilot Test Plan (1-Day Walkthrough)](#4-pilot-test-plan-1-day-walkthrough)
5. [What Success Looks Like](#5-what-success-looks-like)
6. [Known Limitations and Future Enhancements](#6-known-limitations-and-future-enhancements)

---

## 1. Pre-Deploy Checks

Complete every item before making the app available to users.

### Database

- [ ] **PostgreSQL database is provisioned and connected**
  - The `DATABASE_URL` environment variable is set and points to a live PostgreSQL instance
  - Verify: the app starts without database connection errors in the console

- [ ] **Database schema is up to date**
  - Run `npm run db:push` to synchronise the Drizzle schema with the database
  - This creates all required tables: users, suppliers, products, formulas, conversion_formulas, blend_components, daily_intakes, production_batches, production_line_items, blend_actual_usage, packouts, events, change_requests, and the session table
  - Verify: no migration errors in the console output

- [ ] **Seed data is loaded**
  - On first start, the app automatically seeds:
    - 2 default user accounts (Admin and Data Entry Clerk)
    - Suppliers
    - 80+ products with pack sizes
    - 97 formulas (conversion and blend)
  - Verify: log in with the default Admin credentials and confirm products/formulas exist

- [ ] **Admin login works**
  - Default Admin account: `admin@yomilk.com` / `password123`
  - Default Data Entry account: `data@yomilk.com` / `password123`
  - Verify: log in as Admin → sidebar shows all pages (Products, Formulas, Approvals, Reports, etc.)
  - Verify: log in as Data Entry → sidebar shows only Dashboard, Intake, Production, Packouts, My History

- [ ] **Session store is functional**
  - Sessions are stored in PostgreSQL via `connect-pg-simple`
  - The session table is created automatically on first connection
  - Verify: log in, close the browser tab, re-open the app → still logged in

### Application

- [ ] **App starts without errors**
  - Run `npm run dev` (development) or `npm run build && npm start` (production)
  - Verify: no crash, no uncaught exceptions in the console
  - Verify: the app loads in a browser at the expected URL

- [ ] **All pages load**
  - Navigate to every page in the sidebar as Admin
  - Confirm no blank screens or JavaScript errors in the browser console

---

## 2. Security Basics

### Session Secret

- [ ] **SESSION_SECRET environment variable is set**
  - The app uses `SESSION_SECRET` to encrypt session cookies
  - If not set, it falls back to a hardcoded development key (`yomilk-secret-key-change-in-production`)
  - **For production: you MUST set a unique, random SESSION_SECRET** (at least 32 characters)
  - Set it in Replit's Secrets tab (not in code)

### Password Hashing

- [ ] **Passwords are hashed with bcryptjs**
  - All passwords are hashed with bcrypt (cost factor 10) before storage
  - The seed script hashes default passwords the same way
  - Plain-text passwords are never stored or logged
  - Verify: check the `users` table — the `password_hash` column contains bcrypt hashes (starting with `$2a$` or `$2b$`)

### Role-Based Access Control

- [ ] **Admin-only endpoints are protected**
  - The following API routes require Admin role (return 403 for Data Entry Clerk):
    - `POST/PATCH` products, suppliers
    - `POST/PUT` formulas
    - `PUT/DELETE` production line items, packouts, intakes (direct edits)
    - `PATCH` change requests (approve/reject)
    - `GET` events (audit ledger)
    - `GET` reports: loss-breakdown, running-stock, allocation
    - `GET` users list
  - Verify: log in as Data Entry Clerk, try to access `/api/users` in the browser → should return 403

- [ ] **All data endpoints require authentication**
  - Every `/api/` route (except login) requires an active session
  - Unauthenticated requests return 401
  - Verify: open a private/incognito window, try to access `/api/products` → should return 401

### Session Security

- [ ] **Sessions are server-side**
  - Session data is stored in PostgreSQL, not in the browser cookie
  - The cookie contains only the session ID
  - Sessions expire based on the cookie `maxAge` setting

---

## 3. Backup Guidance

### Replit Checkpoints (Automatic)

- Replit automatically creates checkpoints during development
- You can roll back code, chat history, and database state to any checkpoint
- This is the simplest recovery method for development and early pilot

### Database Export

To create a manual backup of the data:

**Option A: Export via SQL (full database dump)**
```bash
pg_dump "$DATABASE_URL" > backup_YYYY-MM-DD.sql
```
This creates a full SQL dump of all tables and data.

**Option B: Export specific tables as CSV**
```bash
psql "$DATABASE_URL" -c "\copy products TO 'products.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy daily_intakes TO 'intakes.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy production_line_items TO 'line_items.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy packouts TO 'packouts.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy events TO 'events.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy change_requests TO 'change_requests.csv' CSV HEADER"
```

**Option C: In-app CSV export**
- Running Stock and Allocation reports have a "Download CSV" button in the UI
- Use these for quick exports of report data

### Database Restore

**From a SQL dump:**
```bash
psql "$DATABASE_URL" < backup_YYYY-MM-DD.sql
```

**From a Replit checkpoint:**
- Use the Replit interface to select a previous checkpoint and restore

### Backup Schedule (Recommended)

| When | What | Method |
|------|------|--------|
| Daily (during pilot) | Full SQL dump | `pg_dump` command |
| Weekly (after go-live) | Full SQL dump | `pg_dump` command |
| Before any formula changes | Full SQL dump | `pg_dump` command |
| Before any schema changes | Full SQL dump + Replit checkpoint | Both |

---

## 4. Pilot Test Plan (1-Day Walkthrough)

This test simulates one full day of factory operations. Two people are needed: one acting as Admin, one acting as Data Entry Clerk.

### Preparation (10 minutes)

1. [ ] Admin logs in and confirms:
   - Products page shows products across all categories
   - Formulas page shows active conversion and blend formulas
   - Dashboard loads without errors

2. [ ] Data Entry Clerk logs in on a separate browser/device and confirms:
   - Sidebar shows only: Dashboard, Intake, Production, Packouts, My History
   - Cannot access `/products` or `/formulas` URLs directly

### Phase 1: Intake (15 minutes)

3. [ ] **Data Entry Clerk** logs a test delivery:
   - Product: RAW MILK
   - Delivered: 5,000 litres
   - Accepted: 4,800 litres
   - Verify: system shows stock qty = 4,800, receiving loss = 200 (4.2%)

4. [ ] **Admin** checks:
   - Intake page shows the new record
   - Loss column shows 200 (4.2%)

### Phase 2: Production — Conversion (15 minutes)

5. [ ] **Data Entry Clerk** logs a conversion:
   - Output: YOGURT BASE (BULK), qty = 2,000 litres
   - Verify: formula "Raw Milk to Yogurt Base" is matched (1:1 ratio)
   - Verify: expected input = 2,000L RAW MILK
   - Enter actual input: 2,100L
   - Verify: variance shows ~+5%
   - Save the record

6. [ ] **Data Entry Clerk** logs another conversion:
   - Output: YOMILK DOUBLE THICK GREEK YOGURT 20 LTR, qty = 10 units
   - Verify: output equivalent shows "10 units = 200L"
   - Verify: expected input = 400L YOGURT BASE (2:1 ratio, 200L × 2)
   - Enter actual input: 410L
   - Verify: variance shows ~+2.5%
   - Save the record

### Phase 3: Production — Blend (15 minutes)

7. [ ] **Data Entry Clerk** logs a blend operation (if applicable):
   - Select a flavoured DTY product (e.g., Strawberry DTY 500g)
   - Enter output quantity
   - Verify: component list shows DTY Base (~98.84%) and Strawberry Pulp (~1.16%)
   - Enter actual quantities for each component
   - Save the record

### Phase 4: Packout (10 minutes)

8. [ ] **Data Entry Clerk** logs a packout:
   - Product: YOMILK FRESH MILK 1 LTR, qty = 500 units
   - Source product: RAW MILK, source qty used: 520L
   - Verify: output equivalent shows "500 units = 500L"
   - Verify: filling loss displays (20L, ~3.8%)
   - Save the record

### Phase 5: Change Request Flow (15 minutes)

9. [ ] **Data Entry Clerk** opens My History:
   - Finds the intake record from step 3
   - Taps the pencil icon on the qty field
   - Proposes a new value (e.g., 4,750 instead of 4,800)
   - Enters reason: "Recounted, one drum was short"
   - Submits the Change Request

10. [ ] Verify: the intake record in My History shows a "Pending" badge on that field

11. [ ] **Admin** opens Approvals page:
    - Sees the pending Change Request
    - Reviews: current value = 4,800, proposed = 4,750, reason shown
    - **Approves** the request

12. [ ] Verify: Data Entry Clerk's My History now shows qty = 4,750, pending badge gone

13. [ ] **Data Entry Clerk** submits another Change Request (on a different field)

14. [ ] **Admin** opens Approvals and **rejects** this request with a comment

15. [ ] Verify: the original value remains unchanged in the Data Entry Clerk's view

### Phase 6: Reports (15 minutes)

16. [ ] **Admin** opens **Running Stock** report:
    - Set date range to include today
    - Verify: Raw Milk row shows received qty, used qty, and running balance
    - Verify: Yogurt Base row shows produced qty, used/packed qty, and balance
    - Check Data Gaps panel — should show any line items with missing input

17. [ ] **Admin** opens **Daily Allocation** report:
    - Set date to today
    - Verify: shows how raw milk was distributed across product categories
    - Verify: totals are consistent with what was entered

18. [ ] **Admin** opens **Loss Breakdown** report:
    - Set date range to include today
    - Verify section A (Receiving): shows the intake record with loss = 200L (updated to 250 after CR approval)
    - Verify section C (Draining): shows the production conversions with their variances
    - Verify section B (Filling): shows the packout with filling loss

### Phase 7: Audit Trail (10 minutes)

19. [ ] **Admin** checks the Event Ledger:
    - Verify: CREATE events exist for all records entered today
    - Verify: UPDATE event exists for the approved Change Request (showing old value → new value)
    - Verify: each event shows the correct actor, timestamp, entity type, and entity ID

---

## 5. What Success Looks Like

After a successful pilot day, confirm all of these:

### Loss Visibility
- [ ] **Receiving loss** is visible per intake record and in the Loss Breakdown report
- [ ] **Draining loss** (conversion variance) is visible per production line item and in the Loss Breakdown report
- [ ] **Filling loss** is visible per packout record and in the Loss Breakdown report
- [ ] **Packing/mixing loss** (blend variance) is visible per blend operation and in the Loss Breakdown report
- [ ] **Running Stock** shows a clear daily balance for raw milk and yogurt base
- [ ] An Admin can identify the largest single source of loss for the day

### Audit Trail Completeness
- [ ] Every record creation generated a CREATE event in the Event Ledger
- [ ] Every approved Change Request generated an UPDATE event with old and new values
- [ ] Every event has a timestamp, actor, and entity reference
- [ ] The auto-fill metadata flag appears on any line items where input was auto-calculated

### Change Request Enforcement
- [ ] Data Entry Clerk **cannot** directly edit saved records
- [ ] Data Entry Clerk **can** submit Change Requests with a mandatory reason
- [ ] Pending requests show a visible "Pending" overlay in My History
- [ ] Approved requests update the value and clear the overlay
- [ ] Rejected requests leave the original value unchanged
- [ ] Both approval and rejection are recorded in the Event Ledger

### Data Integrity
- [ ] Pack-size conversion works correctly for UNIT products (e.g., 10 × 20L = 200L expected)
- [ ] Formula matching is automatic — the correct formula is applied based on the output product
- [ ] Data Gaps panel flags any production records with missing input quantities
- [ ] Variance calculations are accurate (expected vs actual, accounting for pack sizes)

---

## 6. Known Limitations and Future Enhancements

### Current Limitations

| Limitation | Impact | Workaround |
|-----------|--------|------------|
| **No change-password feature** | Users cannot change their own passwords through the UI | Admin must update passwords directly in the database using a hashed value |
| **No email notifications** | Data Entry Clerks are not notified when their Change Request is approved or rejected | Admin follows up offline (in person or via messaging) |
| **No user self-registration** | New users cannot create their own accounts | Admin creates accounts directly (or via database seed) |
| **Session secret has a dev fallback** | If `SESSION_SECRET` is not set, a hardcoded fallback is used | Set `SESSION_SECRET` in Replit Secrets before production use |
| **No rate limiting on login** | No protection against brute-force login attempts | Acceptable for internal factory use with trusted users; add rate limiting if exposed to the internet |
| **Single-server architecture** | The app runs on a single Replit instance | Sufficient for a single-factory operation; horizontal scaling would require session store and load balancer changes |
| **No data export scheduling** | Backups must be triggered manually | Set a calendar reminder for regular `pg_dump` exports |
| **Reports are admin-only** | Data Entry Clerks cannot view any reports | Admin can share CSV exports or screenshots as needed |
| **No multi-factory support** | All data belongs to a single plant | Would require tenant/factory scoping in the data model for multi-site use |
| **No offline mode** | The app requires an internet connection | Users must have connectivity to enter data; enter data later if connection drops |

### Recommended Future Enhancements

1. **Change Password page** — Allow users to update their own password from the UI
2. **Notification system** — Notify Data Entry Clerks when their Change Requests are reviewed (in-app badge or email)
3. **Login rate limiting** — Add rate limiting middleware to prevent brute-force attacks
4. **Automated backups** — Schedule nightly `pg_dump` exports
5. **Print-friendly reports** — Add print stylesheets for Loss Breakdown and Running Stock reports
6. **Batch import** — Allow CSV upload for bulk intake/packout entry
7. **Dashboard alerts** — Show pending Change Request count and data gap count on the Admin dashboard
8. **Formula versioning UI** — Show formula change history and allow rollback to previous ratios
9. **Product deactivation guard** — Warn before deactivating a product that has active formulas

---

*Related documents:*
- *[Admin Guide + Ops Manual](./ADMIN_GUIDE.md)*
- *[Admin Quick Reference](./ADMIN_QUICKSTART.md)*
- *[Data Entry Clerk SOP](./DATA_ENTRY_SOP.md)*
- *[Data Entry Quick Reference](./DATA_ENTRY_QUICKSTART.md)*
