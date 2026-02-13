# YoMilk — Data Entry Clerk Standard Operating Procedure (SOP)

**Version:** 1.0
**Last updated:** February 2026
**Audience:** Data Entry Clerks (factory floor staff)

---

## Table of Contents

1. [Your Role](#1-your-role)
2. [Logging In](#2-logging-in)
3. [The Sidebar — Where Everything Is](#3-the-sidebar--where-everything-is)
4. [How to Log an Intake (Delivery)](#4-how-to-log-an-intake-delivery)
5. [How to Record Production](#5-how-to-record-production)
6. [How to Log a Packout](#6-how-to-log-a-packout)
7. [Adding Operational Notes](#7-adding-operational-notes)
8. [Using Search Dropdowns](#8-using-search-dropdowns)
9. [Understanding Expected vs Actual and Variance](#9-understanding-expected-vs-actual-and-variance)
10. [How to Request an Edit (Change Request)](#10-how-to-request-an-edit-change-request)
11. [Do and Don't List](#11-do-and-dont-list)
12. [End-of-Day Checklist](#12-end-of-day-checklist)

---

## 1. Your Role

You enter data about what happens on the factory floor each day:

- **Intake** — milk and materials arriving from suppliers
- **Production** — what was made (yogurt, cheese, milk, etc.)
- **Packout** — finished goods going to the warehouse

You enter the numbers. The system does the math. An Admin reviews everything.

**What you CAN do:**
- Log intakes, production, and packouts
- Add optional notes when creating records
- View your own history
- Request corrections to records you entered

**What you CANNOT do:**
- Delete records — only Admins can delete
- Change products or formulas
- View reports
- Approve your own corrections

---

## 2. Logging In

1. Open the app on your phone or computer
2. Type your **email** and **password**
3. Tap **"Sign In"**

If you forget your password, ask an Admin to reset it.

[Screenshot: Login Screen]

---

## 3. The Sidebar — Where Everything Is

Tap the menu icon (three lines) on your phone to open the sidebar.

You will see these pages:

| Page | What it's for |
|------|---------------|
| **Dashboard** | Overview of today's numbers |
| **Intake** | Log deliveries from suppliers |
| **Production** | Record what was manufactured |
| **Packouts** | Record finished goods packed |
| **My History** | See everything you entered + request edits |

[Screenshot: Data Entry Clerk Sidebar]

---

## 4. How to Log an Intake (Delivery)

Use this when a supplier delivers raw materials (usually milk).

### Steps:

1. Tap **Intake** in the sidebar
2. Tap **"Log Delivery"**
3. Set the **date** (today is already selected)
4. Pick the **supplier** from the dropdown
5. Pick the **product** (e.g., RAW MILK)
6. Enter the **quantity**

[Screenshot: Intake Form — Basic Fields]

### If you want to track receiving loss (recommended):

7. Scroll down to **"Receiving Loss Tracking"**
8. Enter **"Delivered by Supplier"** — the quantity on the truck
9. Enter **"Accepted into Stock"** — the quantity you actually accepted
10. The stock quantity is set automatically to the accepted amount
11. You will see the loss amount and percentage

[Screenshot: Intake Form — Receiving Loss Section]

12. Tap **"Save"**

### Example:

- Supplier delivered: 6,000 litres
- You accepted: 5,000 litres (rejected 1,000 due to quality)
- System records: stock = 5,000L, loss = 1,000L (16.7%)

---

## 5. How to Record Production

Use this when the plant converts or blends materials into products.

### Steps:

1. Tap **Production** in the sidebar
2. Tap **"New Line Item"**
3. Pick the **output product** — what was made
4. Enter the **output quantity** — how many units/litres/kg

[Screenshot: Production Form — Output Fields]

5. The system shows:
   - Which formula is being used
   - The **expected input** (how much material should have been used)
   - For products in units (bottles, tubs): the **volume equivalent**

6. Enter the **actual input quantity** — how much material was really used
7. The system shows the **variance** (see Section 8)

[Screenshot: Production Form — Expected vs Actual]

8. For **blend** operations: enter the actual quantity of each ingredient used

9. Tap **"Save"**

### What does "Output Equivalent" mean?

For products packed in bottles or tubs, the system converts units to volume.

**Example:**
- You made 10 buckets of "Double Thick Greek Yogurt 20 LTR"
- Each bucket = 20 litres
- Output equivalent = 10 × 20 = 200 litres
- The formula needs 2 litres of yogurt base per 1 litre of DTY
- So expected input = 200 × 2 = **400 litres of Yogurt Base**

You do not need to calculate this yourself. The system does it for you.

---

## 6. How to Log a Packout

Use this when finished goods are packed and moved to the warehouse or dispatch.

### Steps:

1. Tap **Packouts** in the sidebar
2. Tap **"Log Packout"**
3. Set the **date**
4. Pick the **product**
5. Enter the **quantity** packed

[Screenshot: Packout Form — Basic Fields]

### If you want to track filling loss (optional):

6. Scroll down to **"Filling Loss Tracking"**
7. Pick the **source product** (the bulk material that was used)
8. Enter the **source quantity used** (total amount consumed, not per unit)
9. The system shows filling loss if more was used than packed

[Screenshot: Packout Form — Filling Loss Section]

10. Tap **"Save Record"**

### Tip: Source Quantity

The form shows a suggested source quantity based on the product's pack size. This is just a starting point. Enter the actual amount that was used.

**Example:**
- You packed 100 bottles of "Fresh Milk 1 LTR" (= 100 litres)
- You used 105 litres of raw milk from the bulk tank
- Source quantity used = 105
- Filling loss = 5L (4.8%)

---

## 7. Adding Operational Notes

When creating any record (intake, production, or packout), you can add an optional **note** to explain what happened. Notes are helpful for recording context that the numbers alone don't capture.

### When to add a note:

- When there was an unusual event (spillage, equipment issue, partial delivery)
- When variance is higher than normal and you know why
- When something needs Admin attention

### Example notes:

- "Spillage during transfer ~20L"
- "Valve issue caused extra loss"
- "Supplier delivered late, partial load — rest expected tomorrow"
- "Scale re-calibrated mid-shift, readings before 10am may be slightly off"

### Important rules about notes:

- Notes are **optional** — you don't have to add one every time
- Once saved, notes **cannot be edited** directly — you must submit a Change Request to change a note, just like any other field
- Admins can see your notes in the tables and may review them
- You **cannot delete records** — if you entered something by mistake, submit a Change Request or ask an Admin

---

## 8. Using Search Dropdowns

Many fields use a **search dropdown** instead of a plain list. This makes it faster to find what you need.

### How to use:

1. Tap the dropdown field
2. A search box appears at the top
3. **Start typing** the name of what you're looking for
4. The list filters as you type
5. Tap the item you want

[Screenshot: Search Dropdown in Action]

### Tips:

- You don't need to type the full name — a few letters is enough
- Products are sorted **A to Z** so you can scroll to find them
- Suppliers are also sorted **A to Z**
- If you can't find a product, it may be inactive — ask an Admin

---

## 9. Understanding Expected vs Actual and Variance

When you enter a production record, the system compares what you used to what the formula expected.

### What the numbers mean:

| Term | What it means |
|------|---------------|
| **Expected Input** | How much material the formula says you should need |
| **Actual Input** | How much material you actually used (you enter this) |
| **Variance** | The percentage difference between expected and actual |

### Reading the variance:

- **0%** — Perfect match. You used exactly what was expected.
- **+5%** — You used 5% more than expected. Some material was lost in the process.
- **-3%** — You used 3% less than expected. Unusual — double-check your measurement.
- **+15% or higher** — Something may be wrong. Check measurements and tell your supervisor.

### What to do:

- A small variance (under 5%) is normal for dairy production
- A large variance (over 10%) should be reported to your supervisor
- **Do not change the actual number to match the expected number.** Always enter what was really used.

---

## 10. How to Request an Edit (Change Request)

Once you save a record, you **cannot** directly change it. This is for security.

If you made a mistake, you request a correction. An Admin will review it.

### Steps:

1. Tap **"My History"** in the sidebar
2. Find the record you need to fix
3. Tap the **pencil icon** next to the value you want to change

[Screenshot: My History — Edit Icon on a Record]

4. A form appears showing:
   - The **current value** (what's saved now)
   - A field for the **proposed value** (what it should be)
   - A field for the **reason** (required — explain why)

[Screenshot: Change Request Form]

5. Enter the correct value
6. Type the reason (e.g., "Misread the scale, actual was 450 not 540")
7. Tap **"Submit"**

### What happens next:

- Your request goes to **PENDING** status
- A yellow **"Pending"** badge appears on that value in your history
- The **database value does NOT change yet**
- The record still shows the original number everywhere (in reports, in other views)

### When the Admin reviews:

- **If approved:** The value is updated to your proposed number. The pending badge disappears.
- **If rejected:** The original value stays. Nothing changes in the system. The Admin will follow up with you offline to explain why.

### Important:

- You can only have **one pending request** per field at a time
- You must provide a reason — requests without a reason cannot be submitted
- You can see all your pending requests on the **My History** page

[Screenshot: My History — Record with Pending Overlay]

---

## 11. Do and Don't List

### DO:

- **DO** enter the actual number from the scale, meter, or count
- **DO** enter data the same day it happens (don't let it pile up)
- **DO** select the correct date — especially if entering yesterday's data
- **DO** double-check the product name before saving (similar names exist)
- **DO** enter both delivered and accepted quantities for intake when you can
- **DO** use the search box in dropdowns to find products quickly
- **DO** submit a Change Request immediately when you spot a mistake
- **DO** write a clear reason when requesting a correction
- **DO** ask your supervisor if you're unsure which product to select
- **DO** ask your supervisor if the variance is over 10%

### DON'T:

- **DON'T** guess a number — if you don't know, ask or leave it for now
- **DON'T** change the actual input to match the expected input — enter the real number
- **DON'T** enter data for a product you're not sure about — ask first
- **DON'T** enter the same delivery or production batch twice
- **DON'T** ignore a large variance — report it to your supervisor
- **DON'T** share your login with other staff — each person needs their own account
- **DON'T** try to enter zero as a quantity to "clear" a mistake — use a Change Request instead
- **DON'T** worry about formulas or expected values — the system handles those; just enter what actually happened

---

## 12. End-of-Day Checklist

Before you finish your shift, go through this list:

### Intake
- [ ] All deliveries received today are logged
- [ ] Delivered and accepted quantities are entered (if available)
- [ ] Correct supplier is selected for each delivery
- [ ] Correct date is set (should be today's date)

### Production
- [ ] All batches made today are recorded
- [ ] Output quantities match what was actually produced
- [ ] Actual input quantities are entered (not left blank)
- [ ] Any large variances (>10%) have been reported to supervisor

### Packout
- [ ] All packing done today is logged
- [ ] Quantities match the actual pack count
- [ ] Source quantities are entered where possible

### Corrections
- [ ] Any mistakes noticed have been submitted as Change Requests
- [ ] Reasons are written clearly for any pending requests

### Final check
- [ ] Open **My History** — does everything look right?
- [ ] No records are missing for today?
- [ ] Log out if you're on a shared device

[Screenshot: My History — End of Day View]

---

*If something doesn't look right or you need help, ask an Admin. For the full system manual, see [ADMIN_GUIDE.md](./ADMIN_GUIDE.md).*
