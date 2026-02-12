# YoMilk Production & Packout Tracking — Admin Guide + Ops Manual

**Version:** 1.0  
**Last updated:** February 2026  
**Audience:** Plant Admins, Operations Managers

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Roles and Permissions](#2-roles-and-permissions)
3. [Logging In and Switching Accounts](#3-logging-in-and-switching-accounts)
4. [Products](#4-products)
5. [Formulas — Conversion vs Blend](#5-formulas--conversion-vs-blend)
6. [Daily Operations: Intake](#6-daily-operations-intake)
7. [Daily Operations: Production](#7-daily-operations-production)
8. [Daily Operations: Packout](#8-daily-operations-packout)
9. [Data Integrity Guardrails](#9-data-integrity-guardrails)
10. [Auditing: Event Ledger and Change Requests](#10-auditing-event-ledger-and-change-requests)
11. [Reports](#11-reports)
12. [How to Detect Losses and Theft Patterns](#12-how-to-detect-losses-and-theft-patterns)
13. [Known Ratio Assumptions (Current Formulas)](#13-known-ratio-assumptions-current-formulas)
14. [Daily Admin Routine](#14-daily-admin-routine)
15. [Weekly Admin Routine](#15-weekly-admin-routine)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. System Overview

YoMilk Production & Packout Tracking replaces spreadsheet-based production tracking with a database-backed system. It tracks the full dairy production lifecycle:

```
Milk Intake (from suppliers)
    → Production Batches (conversions & blends)
        → Finished Goods Packout (into inventory)
```

The system:

- Manages **80+ products** across **13 categories** (Raw Milk, Milk, Yogurt, DTY, Yolac, Probiotic, Cream Cheese, Feta, Smoothy, Fresh Cream, Dip, Hodzeko, Other)
- Applies **97 formulas** (conversion and blend) to calculate expected vs actual yields
- Flags variances so you can spot waste, theft, or process issues
- Maintains an **immutable audit ledger** — every change is recorded
- Enforces an **approval workflow** for post-save edits by Data Entry Clerks

[Screenshot: Dashboard Overview]

---

## 2. Roles and Permissions

The system has exactly two roles:

### Admin
- Full access to everything
- Can create, edit, and delete products, formulas, and suppliers
- Can view and approve/reject Change Requests
- Can access all reports (Running Stock, Allocation, Loss Breakdown)
- Can view the full Event Ledger (audit trail)
- Can manage user accounts

### Data Entry Clerk
- Can log Intake deliveries, Production batches, and Packouts
- Can view their own entry history ("My History" page)
- **Cannot** edit records after saving — must submit a Change Request
- **Cannot** access admin-only pages: Products, Formulas, Approvals, Reports, Running Stock, Allocation, Loss Breakdown
- **Cannot** manage users or suppliers

**Why two roles?** Separation of duties. The people entering data on the factory floor should not be able to alter formulas or approve their own corrections. This creates accountability.

[Screenshot: Admin Sidebar vs Data Entry Sidebar]

---

## 3. Logging In and Switching Accounts

### How to log in
1. Go to the app URL
2. Enter your email and password
3. Click "Sign In"

### Switching between accounts
When switching from one account to another (e.g., from a Data Entry session to an Admin session on a shared terminal):

1. Click **Logout** in the sidebar
2. Log in with the other account's credentials
3. The sidebar and available pages update **immediately** — no page refresh needed

**Technical note:** The system clears all cached data on both logout and login, ensuring the new user sees only what their role permits.

---

## 4. Products

### What is a product?
Every item the plant handles — raw materials, intermediate products, and finished goods — is a "product" in the system. Each product has:

| Field | Purpose |
|-------|---------|
| **Name** | Full product name (e.g., "YOMILK FRESH MILK 1 LTR") |
| **Category** | One of 13 categories (RAW_MILK, MILK, YOGURT, DTY, etc.) |
| **Unit Type** | How it's measured: LITER, KG, or UNIT |
| **Is Intermediate** | Whether it's an intermediate product (like Yogurt Base) not sold directly |
| **Active** | Whether the product appears in dropdowns |
| **Pack Size** | For UNIT products only: the volume/weight per unit (e.g., 1L, 500ml, 20L) |

### Pack Size — Why It Matters

Products measured in UNIT (bottles, tubs, buckets) need a pack size so the system can convert between units and volume. For example:

- "YOMILK DOUBLE THICK GREEK YOGURT 20 LTR" → 1 unit = 20 litres
- "YOMILK FRESH MILK 1 LTR" → 1 unit = 1 litre
- "YOMILK CREAM CHEESE 250G" → 1 unit = 0.25 kg

This conversion is critical for accurate yield calculations (see Section 9).

### How to manage products
1. Go to **Products** in the sidebar (Admin only)
2. To add a product, click **"Add Product"**
3. Fill in name, category, unit type
4. If unit type is UNIT, enter the pack size (quantity + unit: LITER or KILOGRAM)
5. Click **Save**

To deactivate a product (stop it appearing in dropdowns), toggle its Active status.

[Screenshot: Products Page]

---

## 5. Formulas — Conversion vs Blend

Formulas tell the system how much input is needed to produce a given output. There are two types:

### Conversion Formulas

A conversion transforms **one input** into **one output** using a ratio.

**How the ratio works:**
- Ratio is expressed as **Input : Output** (numerator : denominator)
- A ratio of **2:1** means you need **2 litres of input** to make **1 litre of output**
- A ratio of **1:1** means equal input and output
- A ratio of **1.1:1** means you need **1.1 litres** to make **1 litre**

**Example:** Yogurt Base to Double Thick Greek Yogurt has a 2:1 ratio. To make 100L of Double Thick, you need 200L of Yogurt Base (because straining removes whey).

### Blend Formulas

A blend combines **multiple inputs** by percentage to create one output.

**How fractions work:**
- Each component has a fraction (decimal between 0 and 1)
- All fractions must add up to 1.0 (100%)
- The system calculates the expected quantity of each component

**Example:** Strawberry DTY Blend = 98.84% DTY Base + 1.16% Strawberry Pulp. To make 100kg, you need 98.84kg DTY Base and 1.16kg Strawberry Pulp.

### How formulas are applied

When a Data Entry Clerk enters a production record:

1. They select the **output product** and enter the **output quantity**
2. The system automatically finds the matching active formula
3. For CONVERSION: it calculates the expected input quantity
4. For BLEND: it calculates the expected quantity of each component
5. The clerk enters the **actual** input/component quantities
6. The system shows the **variance** (difference between expected and actual)

### What happens when formulas are changed

- **Existing records are NOT retroactively changed.** Each record stores the actual values at the time of entry.
- The formula version is tracked. If you update a ratio, only new records use the new ratio.
- **Old reports remain accurate** because they use the stored values, not the current formula.
- To change a formula: go to **Formulas** page → find the formula → edit the ratio or fractions → save.

[Screenshot: Formula Builder]

---

## 6. Daily Operations: Intake

Intake records raw material deliveries from suppliers.

### How to log a delivery
1. Go to **Intake** in the sidebar
2. Click **"Log Delivery"**
3. Select the **date**, **supplier**, and **product** (e.g., RAW MILK)
4. Enter the **quantity**

### Receiving Loss Tracking (optional but recommended)

If you track how much the supplier delivered vs how much you accepted after inspection:

1. In the delivery form, enter **"Delivered by Supplier"** (truck quantity)
2. Enter **"Accepted into Stock"** (what you actually accepted)
3. The system automatically:
   - Sets stock quantity = accepted quantity (not delivered)
   - Shows the receiving loss amount and percentage
   - Example: Delivered 6,000L, Accepted 5,000L → Loss = 1,000L (16.7%)

**Why track this?** Receiving loss reveals supplier quality issues, damaged deliveries, or short-counts. It's the first point where product can "disappear."

[Screenshot: Intake Form with Receiving Loss]

---

## 7. Daily Operations: Production

Production records what was manufactured during the day.

### How to log production
1. Go to **Production** in the sidebar
2. Click **"New Line Item"**
3. Select the **output product** (what was made)
4. Enter the **output quantity** (how many units/litres/kg were produced)
5. The system shows:
   - The matched formula and expected input
   - For UNIT products: the volume equivalent (e.g., "10 units = 200L")
6. Enter the **actual input quantity** used
7. The system shows the **variance percentage**:
   - 0% = perfect match
   - Positive = used more input than expected (waste/loss)
   - Negative = used less than expected (unlikely, may indicate measurement error)
8. For BLEND operations: enter the actual quantity of each component used
9. Click **Save**

### Understanding the Production Display

| Field | What it shows |
|-------|---------------|
| Output Qty | How much finished product was made |
| Output Equivalent | For UNIT products: the total volume (qty × pack size) |
| Expected Input | What the formula says you should need |
| Actual Input | What was actually used |
| Variance | Percentage over/under the expected amount |

[Screenshot: Production Form with Conversion Calculation]

---

## 8. Daily Operations: Packout

Packout records finished goods leaving production and entering inventory (warehouse/dispatch).

### How to log a packout
1. Go to **Packouts** in the sidebar
2. Click **"Log Packout"**
3. Select the **product** and enter the **quantity**
4. Optionally set the **pack size label** (auto-filled from product settings)
5. Optionally track **filling loss**:
   - Select the **source product** (the bulk material used)
   - Enter the **source quantity used** (total volume/weight consumed)
   - The system calculates filling loss if source used > output equivalent

### Output Equivalent in Packouts

For UNIT products, the packout form shows the volume equivalent. This helps when entering the source quantity:

- Example: 100 units of "YOMILK FRESH MILK 1 LTR" = 100L
- Example: 10 units of "YOMILK DOUBLE THICK GREEK YOGURT 20 LTR" = 200L

The source quantity field shows a suggestion based on this equivalent.

[Screenshot: Packout Form with Filling Loss]

---

## 9. Data Integrity Guardrails

The system has several built-in safeguards to maintain data quality.

### 9.1 Pack-Size Conversion Logic

**Problem:** When a product is measured in UNIT (e.g., bottles) but the formula input is in LITER, a straight comparison would be meaningless (10 units ≠ 10 litres).

**Solution:** For UNIT products with a pack size defined, the system automatically converts:

```
Effective Output = Output Qty × Pack Size
Expected Input = Effective Output × Formula Ratio
```

**Example:**
- Product: YOMILK DOUBLE THICK GREEK YOGURT 20 LTR (packSizeQty = 20L)
- Output: 10 units
- Effective output: 10 × 20 = 200L
- Formula ratio: 2:1 (Yogurt Base to DTY)
- Expected input: 200 × 2 = **400L Yogurt Base**

Without pack-size conversion, the system would incorrectly calculate 10 × 2 = 20L.

### 9.2 Auto-Fill Input Quantity

**What it does:** When a production line item is saved with no input quantity, the server automatically calculates it from the formula ratio and output quantity (accounting for pack sizes).

**Why:** Prevents blank input quantities from distorting reports. If the clerk doesn't know the exact input, the system fills in the theoretical amount.

**How you know it happened:** The system marks the record with an `inputQtyAutoFilled` flag. This is visible in the audit trail.

### 9.3 Data Gaps Panels

**What:** The Running Stock and Daily Allocation reports include a "Data Gaps" panel at the bottom. This lists any CONVERSION line items that have missing or zero input quantities.

**Why:** Missing input quantities mean the reports can't accurately calculate how much raw material was consumed. Data gaps = blind spots.

**What to do:** When you see data gaps, either:
- Ask the Data Entry Clerk to submit a Change Request with the correct input quantity
- If the auto-fill value is acceptable, no action needed

[Screenshot: Data Gaps Panel in Running Stock Report]

### 9.4 Unit Mismatch Warnings

**What:** When a formula's input product has a different unit type than the output product (e.g., input in LITER, output in UNIT), the system shows a warning on the Production form.

**Exception:** If the output product has a pack size defined, the warning is **suppressed** because the system can handle the conversion automatically (see 9.1).

**When the warning appears:** Only when there's a genuine unit mismatch with no pack-size information to resolve it. This usually means the product's pack size needs to be configured.

---

## 10. Auditing: Event Ledger and Change Requests

### 10.1 The Event Ledger

Every significant action in the system creates an immutable event record. Events **cannot be deleted or modified** — they are permanent.

Each event records:

| Field | What it captures |
|-------|------------------|
| Timestamp | When the action occurred |
| Actor | Which user performed the action |
| Entity Type | What was affected (intake, production, packout, product, formula) |
| Entity ID | The specific record's ID |
| Action | What happened (CREATE, UPDATE, DELETE) |
| Field Name | Which field was changed (for updates) |
| Old Value | The previous value |
| New Value | The new value |
| Reason | Why the change was made (if provided) |
| IP Address | The user's IP address |
| Metadata | Additional context (e.g., inputQtyAutoFilled flag) |

**Why this matters:** The event ledger is your forensic tool. If numbers don't add up, you can trace exactly who changed what and when.

### 10.2 Change Requests (Post-Save Edits)

**The problem:** Data Entry Clerks sometimes make mistakes. But allowing unrestricted editing would undermine the audit trail.

**The solution:** Change Requests.

**How it works:**

1. A Data Entry Clerk saves a record (intake, production, or packout)
2. They realize they made an error
3. They submit a **Change Request** specifying:
   - Which record and field they want to change
   - The proposed new value
   - A reason for the change
4. The request goes to **PENDING** status
5. An Admin reviews it on the **Approvals** page
6. The Admin can:
   - **Approve** — the change is applied and logged in the event ledger
   - **Reject** — the change is not applied; the Admin can add a comment explaining why
7. Either way, the outcome is permanently recorded

**Admin workflow:**
1. Go to **Approvals** in the sidebar
2. Review pending requests
3. Check the current value vs proposed value
4. Approve or reject with an optional comment

[Screenshot: Approvals Page]

---

## 11. Reports

All reports are Admin-only.

### 11.1 Running Stock Report

**What it shows:** Daily running stock for two key material buckets:

- **Raw Milk** — daily received (from intakes) vs used (in production), with cumulative running stock
- **Yogurt Base** — daily produced (from production) vs used + packed, with cumulative running stock

**How to use:**
1. Go to **Running Stock** in the sidebar
2. Select a date range
3. View the daily table and chart
4. Check the **Data Gaps** panel for any records with missing input quantities

**What to look for:**
- Running stock going negative = more was used than received (data entry error or unreported intake)
- Large jumps = check if a delivery was double-entered

[Screenshot: Running Stock Report]

### 11.2 Daily Allocation Report

**What it shows:** How raw milk was distributed across product categories on a given day.

**How to use:**
1. Go to **Allocation** in the sidebar
2. Select a date
3. Expand each category card to see individual operations
4. Export to CSV for spreadsheet analysis

**What to look for:**
- Whether allocation percentages match your production plan
- Categories consuming more raw milk than expected

[Screenshot: Daily Allocation Report]

### 11.3 Loss Breakdown Report

**What it shows:** Four categories of loss across the production process:

| Loss Category | What it measures | Source |
|---------------|------------------|--------|
| **A. Receiving Loss** | Delivered vs accepted at intake | Intake records (deliveredQty vs acceptedQty) |
| **B. Filling/Process Loss** | Source material used vs packed output | Packout records (sourceQtyUsed vs qty) |
| **C. Draining Loss** | Input vs output in CONVERSION operations | Production line items (inputQty vs outputQty) |
| **D. Packing/Mixing Loss** | Expected vs actual component usage in BLEND operations | Blend actual usage records |

**How to use:**
1. Go to **Loss Breakdown** in the sidebar
2. Select a date range
3. Review each loss category
4. Drill down into individual records

[Screenshot: Loss Breakdown Report]

---

## 12. How to Detect Losses and Theft Patterns

### The Four-Layer Loss Model

The system tracks loss at four points in the production chain. Each point is a potential location for waste, error, or theft.

### Layer A: Receiving Loss (Intake)

**What to check:** Loss Breakdown report → Receiving section

**Red flags:**
- Consistently high loss percentages from a specific supplier (>5% is unusual for liquid milk)
- Loss percentage that varies wildly day-to-day from the same supplier
- Delivered quantities that don't match supplier invoices

**Pattern — Possible short-delivery:**
A supplier consistently delivers 5-10% less than invoiced. Check receiving loss trends over 2-4 weeks by supplier.

### Layer B: Draining Loss (Production — Conversion)

**What to check:** Loss Breakdown report → Draining section, and Running Stock report

**Red flags:**
- Conversion operations where actual input is significantly higher than expected (>10% variance)
- Running stock decreasing faster than production records explain
- Specific products consistently showing high input variance

**Pattern — Possible pilferage during production:**
Raw milk or yogurt base "disappearing" between intake and production. Compare:
1. Running Stock → Raw Milk: total received vs total used
2. If the gap exceeds normal processing loss (typically 2-5%), investigate

### Layer C: Filling/Process Loss (Packout)

**What to check:** Loss Breakdown report → Filling/Process section

**Red flags:**
- Source quantity used is much higher than the output equivalent
- Consistent filling loss on specific products or specific days/shifts

**Pattern — Possible over-pouring or diversion:**
If 100L of yogurt base is consumed but only 90L worth of finished goods are packed, 10L is unaccounted for.

### Layer D: Packing/Mixing Loss (Blend Operations)

**What to check:** Loss Breakdown report → Packing/Mixing section

**Red flags:**
- Actual component usage consistently exceeds expected amounts
- Specific components (e.g., fruit pulp, flavoring) showing higher-than-expected usage

### Cross-Checking with Allocation

Use the **Daily Allocation** report to verify that raw milk distribution matches your production plan:
1. Open Allocation for a suspicious day
2. Check: does the raw milk allocated to each category match what was planned?
3. If a category consumed more than planned, drill into the individual operations

### Cross-Checking with Running Stock

The **Running Stock** report is your primary balance sheet:
1. Open Running Stock for a week
2. Check: does raw milk running stock track logically? (received - used = balance)
3. Check: does yogurt base running stock track logically? (produced - used - packed = balance)
4. Negative balances or large unexplained drops are immediate red flags

### Investigation Checklist

When you spot an anomaly:

1. **Check the Event Ledger** — was the record edited after initial entry?
2. **Check Change Requests** — were any corrections submitted and approved?
3. **Check Data Gaps** — is the variance caused by missing input data?
4. **Cross-reference intake** — was the raw material actually received?
5. **Cross-reference packout** — were finished goods actually dispatched?
6. **Compare shifts/days** — does the anomaly correlate with specific work patterns?

---

## 13. Known Ratio Assumptions (Current Formulas)

The following conversion ratios are currently configured. **All ratios are configurable** in the Formulas page and can be updated by an Admin at any time.

### Raw Milk Conversions (Input: RAW MILK → Output)

| Output Product | Ratio (Input:Output) | Meaning |
|----------------|----------------------|---------|
| Yogurt Base (Bulk) | 1:1 | 1L raw milk → 1L yogurt base |
| Yogurt Base 20L Bucket | 1:1 | 1L raw milk → 1L yogurt base (bucket format) |
| Fresh Milk (all sizes: 500ml, 1L, 2L, 5L) | 1:1 | 1L raw milk → 1L fresh milk |
| Barista Milk (all sizes: 1L, 2L, 5L) | 1:1 | 1L raw milk → 1L barista milk |
| Yolac (all sizes: 500ml, 1L, 2L) | 1.10:1 | 1.1L raw milk → 1L yolac |
| Feta (220g, 440g) | 5:1 | 5L raw milk → 1 unit feta |

### Yogurt Base Conversions (Input: YOGURT BASE → Output)

| Output Product | Ratio (Input:Output) | Meaning |
|----------------|----------------------|---------|
| Plain/Flavoured Yogurt (1L, 250ml, 200ml sachets, 150g splits) | 1:1 | 1L yogurt base → 1L yogurt |
| Double Thick Greek Yogurt (175g, 500g, 1kg, 20L) | 2:1 | 2L yogurt base → 1L DTY (straining removes whey) |
| DTY Base (Bulk) | 2:1 | 2L yogurt base → 1L DTY base |
| Smoothie Base (Bulk) | 1:1 | 1L yogurt base → 1L smoothie base |
| Cream Cheese (250g, 1L) | 3:1 | 3L yogurt base → 1L cream cheese |
| Probiotic Yogurt (250ml, 500g, 1kg, 1L) | 1:1 | 1L yogurt base → 1L probiotic |

### Cream Cheese Conversions (Input: CREAM CHEESE 1L → Output)

| Output Product | Ratio (Input:Output) | Meaning |
|----------------|----------------------|---------|
| All Dips (Cucumber & Dill, Black Pepper, Sweet Chilli, Avo, Biltong, Mexican Chilli, Garlic) | 1:1 | 1L cream cheese → 1 unit dip (250g) |

### DTY Blend Formulas (Input: DTY BASE + Pulp/Flavor → Output)

| Output Product | DTY Base % | Pulp/Flavor % |
|----------------|------------|----------------|
| Strawberry DTY (175g, 500g, 1kg) | 98.84% | 1.16% Strawberry Pulp |
| Passion DTY (175g, 500g, 1kg) | 98.84% | 1.16% Passion Fruit Pulp |
| Vanilla DTY (175g, 500g, 1kg) | 98.85% | 1.15% Vanilla Flavor |
| Raspberry DTY (500g, 1kg) | 98.83% | 1.17% Raspberry Pulp |
| Mixed Berry DTY (175g, 500g, 1kg) | 98.84% | 1.16% Mixed Berry Pulp |
| Coconut DTY (175g) | 98.47% | 1.53% Coconut Pulp |

> **Note:** These ratios are based on current production practice. If production processes change (e.g., different straining times, new ingredient sources), update the formulas in the system to keep yield calculations accurate.

---

## 14. Daily Admin Routine

Perform these checks every working day, ideally at end of day or start of next day:

### Morning (5 minutes)

1. **Check Approvals page** — are there pending Change Requests?
   - Review each request: does the reason make sense? Is the proposed value reasonable?
   - Approve or reject with a brief comment

2. **Quick scan of yesterday's data:**
   - Open **Intake** — verify deliveries match expected supplier schedule
   - Open **Production** — scan for any line items with high variance (>5%)
   - Open **Packouts** — verify packout quantities are in expected range

### End of Day (10 minutes)

3. **Running Stock check:**
   - Open **Running Stock** for today
   - Verify raw milk balance: received today - used today = reasonable
   - Verify yogurt base balance: produced today - used/packed today = reasonable
   - Check **Data Gaps** panel — follow up on any missing input quantities

4. **Loss Breakdown spot-check:**
   - Open **Loss Breakdown** for today
   - Check receiving loss — anything over 5%?
   - Check draining loss — any conversion with >10% variance?

---

## 15. Weekly Admin Routine

Perform these checks once per week (suggested: Monday morning for previous week).

### Weekly Review (20-30 minutes)

1. **Running Stock — full week view:**
   - Set date range to the previous 7 days
   - Review the trend chart: is raw milk stock tracking smoothly?
   - Look for any days with negative balance (= data issue)
   - Export to CSV if needed for management reporting

2. **Loss Breakdown — full week view:**
   - Set date range to the previous 7 days
   - Review total loss by category
   - Compare to previous weeks — are losses trending up or down?
   - Identify any single-day spikes

3. **Allocation — spot-check 2-3 days:**
   - Pick the busiest production days
   - Check allocation percentages match the production plan
   - Flag any categories with unexpected raw milk consumption

4. **Event Ledger review:**
   - Scan recent events for anything unusual
   - Look for bulk edits, unusual timestamps, or patterns of corrections

5. **Product and Formula maintenance:**
   - Are any new products needed? Add them with correct pack sizes
   - Are any formulas outdated? Update ratios based on actual production data
   - Deactivate any products no longer in production

---

## 16. Troubleshooting

### "A Data Entry Clerk says they can't see admin pages"

**Expected behavior.** Data Entry Clerks do not have access to Products, Formulas, Approvals, Reports, Running Stock, Allocation, or Loss Breakdown. This is by design.

If they need to see data, either:
- Share a CSV export from the relevant report
- Temporarily log them in with admin credentials (not recommended for production use)

### "The Production form shows the wrong expected input"

Check in this order:
1. **Is the formula correct?** Go to Formulas page and verify the ratio for this product
2. **Is the pack size set?** If the output product is measured in UNIT, ensure its pack size is configured in Products page
3. **Is the right formula active?** Only active formulas are matched. Check there isn't an old/inactive formula interfering

### "Running Stock shows negative balance"

This means more was used than received. Common causes:
1. **Missing intake record** — a delivery wasn't logged
2. **Double-counted production** — a production record was entered twice
3. **Data gap** — production line items have missing input quantities (check Data Gaps panel)

### "A Change Request was approved but the value didn't update"

1. Check the Event Ledger for the approval event
2. Refresh the page (the cached data may be stale)
3. If the value still shows the old amount, check whether a subsequent Change Request overwrote it

### "The formula doesn't match for a product"

The system auto-matches formulas by output product. If no formula appears:
1. Go to **Formulas** page
2. Check that an active formula exists with this product as its output
3. If the formula exists but is inactive, activate it
4. If multiple formulas exist for the same output, only the first active one is used

### "Unit mismatch warning appears"

This warning appears when the formula's input unit (e.g., LITER) differs from the output unit (e.g., UNIT) and the output product has no pack size configured.

**Fix:** Go to **Products** → find the output product → set its pack size (quantity + unit). Once pack size is set, the warning disappears and the system converts automatically.

### "Data Gaps panel shows records"

Data gaps are production records where the input quantity is missing or zero. This can happen when:
1. The Data Entry Clerk left the input field empty
2. The auto-fill feature couldn't determine the input (e.g., no matching formula)

**Fix:** Ask the clerk to submit a Change Request with the correct input quantity, or verify the auto-filled value is acceptable.

### "Packout source quantity suggestion seems wrong"

The suggestion is based on the output equivalent (qty × pack size). It's a starting point, not a requirement. The clerk should enter the actual source quantity used, which may differ due to process loss.

### "Numbers in reports don't match my spreadsheet"

1. Check the date range — ensure both systems are looking at the same period
2. Check for data gaps — missing input quantities affect Running Stock and Allocation calculations
3. Check unit types — the system tracks in LITER, KG, and UNIT. Ensure your spreadsheet uses the same units
4. Check for pending Change Requests — unapproved corrections may explain discrepancies

---

*End of Admin Guide. For quick daily reference, see [ADMIN_QUICKSTART.md](./ADMIN_QUICKSTART.md).*
