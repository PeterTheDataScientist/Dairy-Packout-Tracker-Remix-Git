# YoMilk --- Deployment + Pilot Testing Checklist

**Version:** 1.1\
**Last updated:** February 2026\
**Audience:** Whoever is responsible for deploying and verifying the app before go-live

---

## Table of Contents

1. Pre-Deploy Checks
2. Security Basics
3. Backup Guidance
4. Pilot Test Plan (1-Day Walkthrough)
5. What Success Looks Like
6. Known Limitations and Future Enhancements

\newpage

## 1. Pre-Deploy Checks

Complete every item before making the app available to users.

### Database

- [ ] **PostgreSQL database is provisioned and connected**
  - The `DATABASE_URL` environment variable is set and points to a live PostgreSQL instance
  - Verify: the app starts without database connection errors in the console

- [ ] **Database schema is up to date**
  - Run `npm run db:push` to synchronise the Drizzle schema with the database
  - This creates all required tables: users, suppliers, products, formulas, conversion\_formulas, blend\_components, daily\_intakes, production\_batches, production\_line\_items, blend\_actual\_usage, packouts, events, change\_requests, and the session table
  - Verify: no migration errors in the console output

- [ ] **Seed data is loaded**
  - On first start, the app automatically seeds:
    - 2 default user accounts (Admin and Data Entry Clerk)
    - Suppliers
    - 80+ products with pack sizes
    - 97 formulas (conversion and blend)
  - Verify: log in with the default Admin credentials and confirm products/formulas exist

- [ ] **Admin login works**
  - Default Admin: `admin@yomilk.com` / `password123`
  - Default Data Entry: `data@yomilk.com` / `password123`
  - Verify: log in as Admin --- sidebar shows all pages
  - Verify: log in as Data Entry --- sidebar shows only Dashboard, Intake, Production, Packouts, My History

- [ ] **Session store is functional**
  - Sessions are stored in PostgreSQL via `connect-pg-simple`
  - The session table is created automatically on first connection
  - Verify: log in, close the browser tab, re-open --- still logged in

### Application

- [ ] **App starts without errors**
  - Run `npm run dev` (development) or `npm run build && npm start` (production)
  - Verify: no crash, no uncaught exceptions

- [ ] **All pages load**
  - Navigate to every page in the sidebar as Admin
  - Confirm no blank screens or JavaScript errors

\newpage

## 2. Security Basics

### Session Secret

- [ ] **SESSION\_SECRET environment variable is set**
  - The app uses `SESSION_SECRET` to encrypt session cookies
  - If not set, it falls back to a hardcoded development key
  - **For production: set a unique, random SESSION\_SECRET** (at least 32 characters)
  - Set it in Replit's Secrets tab (not in code)

### Password Hashing

- [ ] **Passwords are hashed with bcryptjs**
  - All passwords are hashed with bcrypt (cost factor 10) before storage
  - Plain-text passwords are never stored or logged
  - Verify: `password_hash` column contains bcrypt hashes (starting with `$2a$` or `$2b$`)

### Role-Based Access Control

- [ ] **Admin-only endpoints are protected** (return 403 for Data Entry Clerk):
  - POST/PATCH products, suppliers
  - POST/PUT formulas
  - PUT/DELETE production line items, packouts, intakes (direct edits)
  - PATCH change requests (approve/reject)
  - PATCH /api/admin/review (mark records as reviewed)
  - GET events (audit ledger)
  - GET reports: loss-breakdown, running-stock, allocation
  - GET users list
  - Verify: log in as Data Entry, try `/api/users` --- should return 403

- [ ] **All data endpoints require authentication**
  - Every `/api/` route (except login) requires an active session
  - Unauthenticated requests return 401

- [ ] **Data Entry Clerks cannot delete records**
  - All DELETE endpoints are admin-only
  - Frontend hides delete buttons for Data Entry users

### Session Security

- [ ] **Sessions are server-side**
  - Session data is stored in PostgreSQL, not in the browser cookie
  - The cookie contains only the session ID

\newpage

## 3. Backup Guidance

### Replit Checkpoints (Automatic)

- Replit automatically creates checkpoints during development
- You can roll back code, chat history, and database state to any checkpoint

### Database Export

**Option A --- Full database dump:**

```
pg_dump "$DATABASE_URL" > backup_YYYY-MM-DD.sql
```

**Option B --- Export specific tables as CSV:**

```
psql "$DATABASE_URL" -c "\copy products TO 'products.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy daily_intakes TO 'intakes.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy production_line_items TO 'line_items.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy packouts TO 'packouts.csv' CSV HEADER"
```

**Option C --- In-app CSV export:**

- Running Stock and Allocation reports have a "Download CSV" button

### Database Restore

**From a SQL dump:**

```
psql "$DATABASE_URL" < backup_YYYY-MM-DD.sql
```

**From a Replit checkpoint:** Use the Replit interface to restore.

### Backup Schedule (Recommended)

- **Daily (during pilot):** Full SQL dump via `pg_dump`
- **Weekly (after go-live):** Full SQL dump
- **Before formula changes:** Full SQL dump
- **Before schema changes:** Full SQL dump + Replit checkpoint

\newpage

## 4. Pilot Test Plan (1-Day Walkthrough)

Two people needed: one as Admin, one as Data Entry Clerk.

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
   - Delivered: 5,000 litres / Accepted: 4,800 litres
   - Add note: "Normal delivery, small spillage during transfer"
   - Verify: stock qty = 4,800, receiving loss = 200 (4.2%)

4. [ ] **Admin** checks:
   - Intake page shows the new record with the note
   - Admin clicks green checkmark to mark as reviewed
   - Adds admin note: "Confirmed with driver"

### Phase 2: Production --- Conversion (15 minutes)

5. [ ] **Data Entry Clerk** logs a conversion:
   - Output: YOGURT BASE (BULK), qty = 2,000 litres
   - Enter actual input: 2,100L
   - Add note: "Valve slightly leaking"
   - Verify: variance shows ~+5%

6. [ ] **Data Entry Clerk** logs another conversion:
   - Output: YOMILK DOUBLE THICK GREEK YOGURT 20 LTR, qty = 10 units
   - Verify: output equivalent shows "10 units = 200L"
   - Enter actual input: 410L

### Phase 3: Production --- Blend (15 minutes)

7. [ ] **Data Entry Clerk** logs a blend operation (if applicable):
   - Select a flavoured DTY product
   - Enter output quantity
   - Verify: component list shows correct fractions
   - Enter actual quantities for each component

### Phase 4: Packout (10 minutes)

8. [ ] **Data Entry Clerk** logs a packout:
   - Product: YOMILK FRESH MILK 1 LTR, qty = 500 units
   - Source product: RAW MILK, source qty used: 520L
   - Verify: output equivalent and filling loss display

### Phase 5: Change Request Flow (15 minutes)

9. [ ] **Data Entry Clerk** opens My History:
   - Finds the intake record
   - Taps the pencil icon on the qty field
   - Proposes a new value (e.g., 4,750 instead of 4,800)
   - Enters reason: "Recounted, one drum was short"

10. [ ] Verify: the intake shows a "Pending" badge on that field

11. [ ] **Admin** opens Approvals page:
    - Sees the pending Change Request
    - **Approves** the request

12. [ ] Verify: Data Entry Clerk's My History now shows qty = 4,750

13. [ ] **Data Entry Clerk** submits another Change Request

14. [ ] **Admin** opens Approvals and **rejects** this request with a comment

15. [ ] Verify: the original value remains unchanged

### Phase 6: Reports (15 minutes)

16. [ ] **Admin** opens **Running Stock** report:
    - Set date range to include today
    - Verify: Raw Milk and Yogurt Base rows show correct balances
    - Check Data Gaps panel

17. [ ] **Admin** opens **Daily Allocation** report:
    - Set date to today
    - Verify: shows how raw milk was distributed

18. [ ] **Admin** opens **Loss Breakdown** report:
    - Verify all 4 loss categories are present

### Phase 7: Audit Trail (10 minutes)

19. [ ] **Admin** checks the Event Ledger:
    - CREATE events for all records
    - UPDATE event for the approved Change Request
    - REVIEW events for admin-reviewed records

\newpage

## 5. What Success Looks Like

### Loss Visibility

- [ ] Receiving loss is visible per intake and in Loss Breakdown
- [ ] Draining loss (conversion variance) is visible per line item and in Loss Breakdown
- [ ] Filling loss is visible per packout and in Loss Breakdown
- [ ] Packing/mixing loss (blend variance) is visible per blend and in Loss Breakdown
- [ ] Running Stock shows clear daily balance for raw milk and yogurt base

### Audit Trail Completeness

- [ ] Every creation generated a CREATE event
- [ ] Every approved Change Request generated an UPDATE event
- [ ] Every admin review generated a REVIEW event
- [ ] Every event has timestamp, actor, and entity reference

### Change Request Enforcement

- [ ] Data Entry Clerk cannot directly edit saved records
- [ ] Data Entry Clerk can submit Change Requests with a mandatory reason
- [ ] Data Entry Clerk cannot delete records
- [ ] Pending requests show a visible "Pending" overlay
- [ ] Approved requests update the value and clear the overlay
- [ ] Rejected requests leave the original value unchanged

### Operational Notes

- [ ] Data Entry Clerks can add notes when creating records
- [ ] Admin can see notes in table views
- [ ] Admin can mark records as reviewed with optional admin notes
- [ ] Review actions are logged in the audit trail

### Data Integrity

- [ ] Pack-size conversion works for UNIT products
- [ ] Formula matching is automatic
- [ ] Data Gaps panel flags records with missing input
- [ ] Variance calculations are accurate

\newpage

## 6. Known Limitations and Future Enhancements

### Current Limitations

- **No change-password feature** --- Admin must update passwords directly in the database
- **No email notifications** --- Admin follows up offline about Change Request decisions
- **No user self-registration** --- Admin creates accounts directly
- **Session secret has a dev fallback** --- Set `SESSION_SECRET` in Secrets before production
- **No rate limiting on login** --- Acceptable for internal factory use
- **Single-server architecture** --- Sufficient for single-factory operation
- **No data export scheduling** --- Set a calendar reminder for `pg_dump`
- **Reports are admin-only** --- Admin can share CSV exports as needed
- **No multi-factory support** --- Would require tenant scoping for multi-site
- **No offline mode** --- Requires internet connection

### Recommended Future Enhancements

1. **Change Password page** --- Allow users to update their own password
2. **Notification system** --- Notify clerks when Change Requests are reviewed
3. **Login rate limiting** --- Prevent brute-force attacks
4. **Automated backups** --- Schedule nightly `pg_dump` exports
5. **Print-friendly reports** --- Add print stylesheets
6. **Batch import** --- Allow CSV upload for bulk data entry
7. **Dashboard alerts** --- Show pending CR count and data gap count
8. **Formula versioning UI** --- Show change history and allow rollback
9. **Product deactivation guard** --- Warn before deactivating products with active formulas

---

*Related documents:*

- [Admin Guide + Ops Manual](./ADMIN_GUIDE.md)
- [Admin Quick Reference](./ADMIN_QUICKSTART.md)
- [Data Entry Clerk SOP](./DATA_ENTRY_SOP.md)
- [Data Entry Quick Reference](./DATA_ENTRY_QUICKSTART.md)
