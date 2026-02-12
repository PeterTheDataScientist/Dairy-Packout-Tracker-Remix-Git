# YoMilk — Admin Quick Reference Card

> Print this page and keep it at your workstation.

---

## Login

| Role | Access |
|------|--------|
| **Admin** | Everything: Products, Formulas, Approvals, all Reports, Intake, Production, Packouts |
| **Data Entry Clerk** | Intake, Production, Packouts, My History only |

---

## Daily Checklist

- [ ] **Approvals** — Review and approve/reject any pending Change Requests
- [ ] **Intake** — Verify today's deliveries were logged (check receiving loss if tracked)
- [ ] **Production** — Scan for high variance items (>5%)
- [ ] **Running Stock** — Confirm raw milk and yogurt base balances make sense
- [ ] **Data Gaps** — Follow up on any production records missing input quantities

---

## Weekly Checklist

- [ ] **Running Stock** (7-day view) — Look for negative balances or unexplained drops
- [ ] **Loss Breakdown** (7-day view) — Compare total loss to previous week
- [ ] **Allocation** — Spot-check 2-3 busy days for expected distribution
- [ ] **Event Ledger** — Scan for unusual edit patterns
- [ ] **Products/Formulas** — Add new products, update ratios if processes changed

---

## Key Conversion Ratios (Configurable in Formulas Page)

| Process | Ratio | Meaning |
|---------|-------|---------|
| Raw Milk → Fresh Milk | 1:1 | Equal in, equal out |
| Raw Milk → Yogurt Base | 1:1 | Equal in, equal out |
| Raw Milk → Yolac | 1.10:1 | 10% more milk needed |
| Raw Milk → Feta | 5:1 | 5L milk per unit feta |
| Yogurt Base → DTY / Greek | 2:1 | Straining halves volume |
| Yogurt Base → Cream Cheese | 3:1 | 3L base per 1L cheese |
| Yogurt Base → Plain/Flavoured Yogurt | 1:1 | Equal in, equal out |
| DTY Blend | ~98.8% DTY Base + ~1.2% Pulp/Flavor | Per blend formula |

---

## Loss Detection — Where to Look

| Loss Type | Report | What to Check |
|-----------|--------|---------------|
| Receiving | Loss Breakdown → A | Delivered vs accepted (>5% = flag) |
| Draining | Loss Breakdown → C | Input vs output in conversions (>10% = flag) |
| Filling | Loss Breakdown → B | Source used vs packed output |
| Mixing | Loss Breakdown → D | Expected vs actual blend components |
| Balance | Running Stock | Negative stock = missing data or diversion |

---

## UNIT Product — Pack Size Math

For products in UNIT (bottles, tubs, buckets):

```
Volume = Quantity × Pack Size
Expected Input = Volume × Formula Ratio
```

Example: 10 units of 20L DTY = 200L → needs 400L Yogurt Base (2:1 ratio)

---

## When Something Looks Wrong

1. Check **Data Gaps** — is input quantity missing?
2. Check **Event Ledger** — was the record edited?
3. Check **Change Requests** — any pending corrections?
4. Check **Formulas** — is the ratio correct and active?
5. Check **Products** — is the pack size set (for UNIT products)?

---

*Full manual: [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)*
