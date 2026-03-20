import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin } from "./auth";
import { seed } from "./seed";
import passport from "passport";
import bcrypt from "bcryptjs";
import { z } from "zod";

async function computeConversionInputQty(
  formulaId: number | null | undefined,
  outputQty: string,
  outputProductId: number,
): Promise<{
  inputQty: string;
  inputProductId: number;
  autoFilled: boolean;
} | null> {
  if (!formulaId) {
    const formulas = await storage.getFormulasByOutputProduct(outputProductId);
    const activeConversion = formulas.find(
      (f) => f.type === "CONVERSION" && f.active,
    );
    if (!activeConversion) return null;
    formulaId = activeConversion.id;
  }
  const formula = await storage.getFormula(formulaId);
  if (!formula || formula.type !== "CONVERSION") return null;
  const conversion = await storage.getConversionByFormulaId(formulaId);
  if (!conversion) return null;
  const outQ = parseFloat(outputQty);
  if (isNaN(outQ) || outQ <= 0) return null;

  const allProducts = await storage.getProducts();
  const outputProduct = allProducts.find((p) => p.id === outputProductId);
  let effectiveOutputQty = outQ;
  if (
    outputProduct &&
    outputProduct.unitType === "UNIT" &&
    outputProduct.packSizeQty
  ) {
    effectiveOutputQty = outQ * parseFloat(outputProduct.packSizeQty);
  }

  const ratio =
    parseFloat(conversion.ratioNumerator) /
    parseFloat(conversion.ratioDenominator);
  const computedInput = effectiveOutputQty * ratio;
  return {
    inputQty: computedInput.toFixed(4),
    inputProductId: conversion.inputProductId,
    autoFilled: true,
  };
}

async function findDataGaps(dateFrom?: string, dateTo?: string) {
  const allLineItems = await storage.getAllLineItems(dateFrom, dateTo);
  const gaps: Array<{
    lineItemId: number;
    batchCode: string;
    batchDate: string;
    outputProductName: string;
    inputProductName: string;
    outputQty: string;
    issue: string;
  }> = [];
  const allProducts = await storage.getProducts();
  const productMap = new Map(allProducts.map((p) => [p.id, p]));

  for (const li of allLineItems) {
    if (li.operationType !== "CONVERT") continue;
    const hasInputQty = li.inputQty && parseFloat(li.inputQty) > 0;
    if (!hasInputQty) {
      const outputProduct = productMap.get(li.outputProductId);
      const inputProduct = li.inputProductId
        ? productMap.get(li.inputProductId)
        : null;
      gaps.push({
        lineItemId: li.id,
        batchCode: li.batchCode,
        batchDate: li.batchDate,
        outputProductName:
          outputProduct?.name || `Product #${li.outputProductId}`,
        inputProductName: inputProduct?.name || "Unknown",
        outputQty: li.outputQty,
        issue: "CONVERSION operation with no input quantity recorded",
      });
    }
  }
  return gaps;
}

/**
 * Cumulative raw milk stock.
 * Available = SUM(all accepted intake) - SUM(all raw milk used in production)
 */
async function getCumulativeRawMilkStock(): Promise<number> {
  const allProducts = await storage.getProducts();
  const rawMilkIds = new Set(
    allProducts.filter((p) => p.category === "RAW_MILK").map((p) => p.id),
  );
  const allIntakes = await storage.getDailyIntakes();
  const allLineItems = await storage.getAllLineItems();

  const totalAccepted = allIntakes
    .filter((i) => rawMilkIds.has(i.productId))
    .reduce((acc, i) => {
      const accepted = i.acceptedQty
        ? parseFloat(i.acceptedQty)
        : parseFloat(i.qty);
      return acc + accepted;
    }, 0);

  const totalUsed = allLineItems
    .filter((li) => li.inputProductId && rawMilkIds.has(li.inputProductId))
    .reduce((acc, li) => acc + parseFloat(li.inputQty || "0"), 0);

  return Math.max(0, totalAccepted - totalUsed);
}

/**
 * FIX: Generic cumulative stock for any intermediate product.
 * Stock = SUM(produced as output) - SUM(used as input) - SUM(packed out)
 * Used for base stock gate checks before Layer 3 production.
 */
async function getCumulativeProductStock(productId: number): Promise<number> {
  const allLineItems = await storage.getAllLineItems();
  const allPackouts = await storage.getPackouts();

  const totalProduced = allLineItems
    .filter((li) => li.outputProductId === productId)
    .reduce((acc, li) => acc + parseFloat(li.outputQty), 0);

  const totalUsed = allLineItems
    .filter((li) => li.inputProductId === productId)
    .reduce((acc, li) => acc + parseFloat(li.inputQty || "0"), 0);

  const totalPacked = allPackouts
    .filter((po) => po.productId === productId)
    .reduce((acc, po) => acc + parseFloat(po.qty), 0);

  return Math.max(0, totalProduced - totalUsed - totalPacked);
}

/**
 * FIX: Get the required input product for a given output product.
 * Looks up the active CONVERSION formula for that output.
 * Returns { inputProductId, inputProductName } or null if no formula.
 */
async function getRequiredInputForOutput(
  outputProductId: number,
): Promise<{ inputProductId: number; inputProductName: string } | null> {
  const formulas = await storage.getFormulasByOutputProduct(outputProductId);
  const allProducts = await storage.getProducts();

  // Check CONVERSION formula first
  const activeConversion = formulas.find(
    (f) => f.type === "CONVERSION" && f.active,
  );
  if (activeConversion) {
    const conversion = await storage.getConversionByFormulaId(
      activeConversion.id,
    );
    if (!conversion) return null;
    const inputProduct = allProducts.find(
      (p) => p.id === conversion.inputProductId,
    );
    if (!inputProduct) return null;
    // Only gate on intermediate/bulk products — not raw milk (already gated separately)
    if (inputProduct.category === "RAW_MILK") return null;
    return {
      inputProductId: conversion.inputProductId,
      inputProductName: inputProduct.name,
    };
  }

  // Check BLEND formula — find the intermediate component (DTY BASE, SMOOTHIE BASE etc.)
  // For blends, the required intermediate is the component that is_intermediate = true
  const activeBlend = formulas.find((f) => f.type === "BLEND" && f.active);
  if (activeBlend) {
    const components = await storage.getBlendComponentsByFormulaId(
      activeBlend.id,
    );
    // Find the intermediate component — the bulk base product
    for (const comp of components) {
      const compProduct = allProducts.find(
        (p) => p.id === comp.componentProductId,
      );
      if (
        compProduct &&
        compProduct.isIntermediate &&
        compProduct.category !== "RAW_MILK"
      ) {
        return {
          inputProductId: comp.componentProductId,
          inputProductName: compProduct.name,
        };
      }
    }
  }

  return null;
}
export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  setupAuth(app);
  await seed();

  // --- AUTH ---
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user)
        return res
          .status(401)
          .json({ message: info?.message || "Invalid credentials" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json({ user });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });
    res.json({ user: req.user });
  });

  // --- USERS (admin) ---
  app.get("/api/users", requireAdmin, async (_req, res) => {
    const list = await storage.getUsers();
    res.json(
      list.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
      })),
    );
  });

  // --- SUPPLIERS ---
  app.get("/api/suppliers", requireAuth, async (_req, res) => {
    const list = await storage.getSuppliers();
    res.json(list);
  });

  app.post("/api/suppliers", requireAdmin, async (req, res) => {
    const s = await storage.createSupplier(req.body);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "supplier",
      entityId: s.id,
      action: "CREATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(s),
      reason: null,
      metadataJson: null,
    });
    res.status(201).json(s);
  });

  app.patch("/api/suppliers/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const old = await storage.getSupplier(id);
    const s = await storage.updateSupplier(id, req.body);
    if (!s) return res.status(404).json({ message: "Not found" });
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "supplier",
      entityId: id,
      action: "UPDATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: JSON.stringify(old),
      newValue: JSON.stringify(s),
      reason: null,
      metadataJson: null,
    });
    res.json(s);
  });

  // --- PRODUCTS ---
  app.get("/api/products", requireAuth, async (_req, res) => {
    const list = await storage.getProducts();
    res.json(list);
  });

  app.post("/api/products", requireAdmin, async (req, res) => {
    const p = await storage.createProduct(req.body);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "product",
      entityId: p.id,
      action: "CREATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(p),
      reason: null,
      metadataJson: null,
    });
    res.status(201).json(p);
  });

  app.patch("/api/products/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const old = await storage.getProduct(id);
    const p = await storage.updateProduct(id, req.body);
    if (!p) return res.status(404).json({ message: "Not found" });
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "product",
      entityId: id,
      action: "UPDATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: JSON.stringify(old),
      newValue: JSON.stringify(p),
      reason: null,
      metadataJson: null,
    });
    res.json(p);
  });

  // --- FORMULAS ---
  app.get("/api/formulas", requireAuth, async (_req, res) => {
    const list = await storage.getFormulas();
    const enriched = await Promise.all(
      list.map(async (f) => {
        if (f.type === "CONVERSION") {
          const conversion = await storage.getConversionByFormulaId(f.id);
          return { ...f, conversion };
        } else {
          const components = await storage.getBlendComponentsByFormulaId(f.id);
          return { ...f, components };
        }
      }),
    );
    res.json(enriched);
  });

  app.get("/api/formulas/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const f = await storage.getFormula(id);
    if (!f) return res.status(404).json({ message: "Not found" });
    if (f.type === "CONVERSION") {
      const conversion = await storage.getConversionByFormulaId(f.id);
      return res.json({ ...f, conversion });
    } else {
      const components = await storage.getBlendComponentsByFormulaId(f.id);
      return res.json({ ...f, components });
    }
  });

  app.post("/api/formulas", requireAdmin, async (req, res) => {
    try {
      const { conversion, components, ...formulaData } = req.body;
      const f = await storage.createFormula(formulaData);
      if (f.type === "CONVERSION" && conversion) {
        await storage.createConversionFormula({
          formulaId: f.id,
          ...conversion,
        });
      }
      if (f.type === "BLEND" && components) {
        for (const comp of components) {
          await storage.createBlendComponent({ formulaId: f.id, ...comp });
        }
      }
      await storage.createEvent({
        actorUserId: req.user!.id,
        entityType: "formula",
        entityId: f.id,
        action: "CREATE",
        ipAddress: req.ip || null,
        fieldName: null,
        oldValue: null,
        newValue: JSON.stringify(req.body),
        reason: null,
        metadataJson: null,
      });
      res.status(201).json(f);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/formulas/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getFormula(id);
      if (!existing) return res.status(404).json({ error: "Not found" });
      const { conversion, components, ...formulaUpdates } = req.body;
      const allowedUpdates: any = {};
      if (formulaUpdates.name !== undefined)
        allowedUpdates.name = formulaUpdates.name;
      if (formulaUpdates.outputProductId !== undefined)
        allowedUpdates.outputProductId = formulaUpdates.outputProductId;
      if (formulaUpdates.active !== undefined)
        allowedUpdates.active = formulaUpdates.active;
      if (Object.keys(allowedUpdates).length > 0)
        await storage.updateFormula(id, allowedUpdates);
      if (existing.type === "CONVERSION" && conversion) {
        const convUpdates: any = {};
        if (conversion.inputProductId !== undefined)
          convUpdates.inputProductId = conversion.inputProductId;
        if (conversion.ratioNumerator !== undefined)
          convUpdates.ratioNumerator = conversion.ratioNumerator;
        if (conversion.ratioDenominator !== undefined)
          convUpdates.ratioDenominator = conversion.ratioDenominator;
        if (Object.keys(convUpdates).length > 0)
          await storage.updateConversionFormula(id, convUpdates);
      }
      if (existing.type === "BLEND" && components) {
        await storage.deleteBlendComponentsByFormulaId(id);
        for (const comp of components) {
          await storage.createBlendComponent({ formulaId: id, ...comp });
        }
      }
      const updated = await storage.getFormula(id);
      await storage.createEvent({
        actorUserId: req.user!.id,
        entityType: "formula",
        entityId: id,
        action: "UPDATE",
        ipAddress: req.ip || null,
        fieldName: null,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(req.body),
        reason: null,
        metadataJson: null,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // --- DAILY INTAKES ---
  app.get("/api/intakes", requireAuth, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const list = await storage.getDailyIntakes(
      dateFrom as string,
      dateTo as string,
    );
    res.json(list);
  });

  app.post("/api/intakes", requireAuth, async (req, res) => {
    const d = await storage.createDailyIntake({
      ...req.body,
      createdByUserId: req.user!.id,
    });
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "daily_intake",
      entityId: d.id,
      action: "CREATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(d),
      reason: null,
      metadataJson: null,
    });
    res.status(201).json(d);
  });

  // --- PRODUCTION BATCHES ---
  app.get("/api/production/batches", requireAuth, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const list = await storage.getProductionBatches(
      dateFrom as string,
      dateTo as string,
    );
    res.json(list);
  });

  app.post("/api/production/batches", requireAuth, async (req, res) => {
    const date = req.body.date;
    const lock = await storage.getDailyLock(date);
    if (lock)
      return res
        .status(403)
        .json({ message: "This day has been locked by admin." });

    // Do NOT block batch creation on raw milk stock.
    // A batch may be for intermediate processing (e.g. Yogurt Base → DTY Base)
    // which doesn't require fresh raw milk intake today.
    // Per-product input stock checks happen at the line-item level.

    const existingBatches = await storage.getProductionBatches(date, date);
    const batchSequence = existingBatches.length + 1;
    const b = await storage.createProductionBatch({
      ...req.body,
      batchSequence,
      createdByUserId: req.user!.id,
    });
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "production_batch",
      entityId: b.id,
      action: "CREATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(b),
      reason: null,
      metadataJson: null,
    });
    res.status(201).json(b);
  });

  // --- PRODUCTION LINE ITEMS ---
  app.get("/api/production/line-items", requireAuth, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const list = await storage.getAllLineItems(
      dateFrom as string,
      dateTo as string,
    );
    res.json(list);
  });

  app.get(
    "/api/production/batches/:batchId/items",
    requireAuth,
    async (req, res) => {
      const batchId = parseInt(req.params.batchId);
      const items = await storage.getLineItemsByBatch(batchId);
      res.json(items);
    },
  );

  app.post("/api/production/line-items", requireAuth, async (req, res) => {
    const body = { ...req.body };
    let inputAutoFilled = false;

    // FIX: Base stock gate — check Layer 2 intermediate stock before allowing Layer 3 production.
    // Admins can always proceed (they may be correcting historical data).
    // DATA_ENTRY clerks are blocked if the required base product has no stock.
    if (req.user!.role === "DATA_ENTRY" && body.operationType === "CONVERT") {
      const requiredInput = await getRequiredInputForOutput(
        body.outputProductId,
      );
      if (requiredInput) {
        const baseStock = await getCumulativeProductStock(
          requiredInput.inputProductId,
        );
        if (baseStock <= 0) {
          return res.status(400).json({
            message: `No ${requiredInput.inputProductName} in stock. Please produce ${requiredInput.inputProductName} first before recording this product.`,
            missingBase: requiredInput.inputProductName,
            availableStock: 0,
          });
        }
      }
    }

    if (
      body.operationType === "CONVERT" &&
      (!body.inputQty || body.inputQty === "")
    ) {
      const computed = await computeConversionInputQty(
        body.formulaId,
        body.outputQty,
        body.outputProductId,
      );
      if (computed) {
        body.inputQty = computed.inputQty;
        body.inputProductId = body.inputProductId || computed.inputProductId;
        inputAutoFilled = true;
      }
    }

    const l = await storage.createLineItem({
      ...body,
      createdByUserId: req.user!.id,
    });
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "production_line_item",
      entityId: l.id,
      action: "CREATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(l),
      reason: null,
      metadataJson: inputAutoFilled
        ? JSON.stringify({ inputQtyAutoFilled: true })
        : null,
    });
    res.status(201).json({ ...l, inputQtyAutoFilled: inputAutoFilled });
  });

  app.put("/api/production/line-items/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getLineItem(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const {
      outputQty,
      inputQty,
      outputProductId,
      inputProductId,
      formulaId,
      operationType,
    } = req.body;
    const updates: any = {};
    if (outputQty !== undefined) updates.outputQty = outputQty;
    if (inputQty !== undefined) updates.inputQty = inputQty;
    if (outputProductId !== undefined)
      updates.outputProductId = outputProductId;
    if (inputProductId !== undefined) updates.inputProductId = inputProductId;
    if (formulaId !== undefined) updates.formulaId = formulaId;
    if (operationType !== undefined) updates.operationType = operationType;

    let inputAutoFilled = false;
    const effectiveOpType = operationType || existing.operationType;
    if (
      effectiveOpType === "CONVERT" &&
      (!updates.inputQty ||
        updates.inputQty === "" ||
        updates.inputQty === null)
    ) {
      const effectiveOutputQty = updates.outputQty || existing.outputQty;
      const effectiveOutputProductId =
        updates.outputProductId || existing.outputProductId;
      const effectiveFormulaId =
        updates.formulaId !== undefined
          ? updates.formulaId
          : existing.formulaId;
      const computed = await computeConversionInputQty(
        effectiveFormulaId,
        effectiveOutputQty,
        effectiveOutputProductId,
      );
      if (computed) {
        updates.inputQty = computed.inputQty;
        if (!updates.inputProductId)
          updates.inputProductId = computed.inputProductId;
        inputAutoFilled = true;
      }
    }

    const updated = await storage.updateLineItem(id, updates);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "production_line_item",
      entityId: id,
      action: "UPDATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
      reason: null,
      metadataJson: inputAutoFilled
        ? JSON.stringify({ inputQtyAutoFilled: true })
        : null,
    });
    res.json({ ...updated, inputQtyAutoFilled: inputAutoFilled });
  });

  app.delete(
    "/api/production/line-items/:id",
    requireAdmin,
    async (req, res) => {
      const id = parseInt(req.params.id);
      const existing = await storage.getLineItem(id);
      if (!existing) return res.status(404).json({ error: "Not found" });
      await storage.deleteLineItem(id);
      await storage.createEvent({
        actorUserId: req.user!.id,
        entityType: "production_line_item",
        entityId: id,
        action: "DELETE",
        ipAddress: req.ip || null,
        fieldName: null,
        oldValue: JSON.stringify(existing),
        newValue: null,
        reason: null,
        metadataJson: null,
      });
      res.json({ success: true });
    },
  );

  // --- BLEND ACTUAL USAGE ---
  app.get(
    "/api/production/line-items/:id/blend-usage",
    requireAuth,
    async (req, res) => {
      const id = parseInt(req.params.id);
      const usage = await storage.getBlendActualUsageByLineItem(id);
      res.json(usage);
    },
  );

  app.post(
    "/api/production/line-items/:id/blend-usage",
    requireAuth,
    async (req, res) => {
      const lineItemId = parseInt(req.params.id);
      const { components } = req.body;
      if (!Array.isArray(components))
        return res.status(400).json({ error: "components array required" });
      const existingUsage =
        await storage.getBlendActualUsageByLineItem(lineItemId);
      if (existingUsage.length > 0 && req.user!.role !== "ADMIN") {
        return res.status(403).json({
          error:
            "DATA_ENTRY cannot update existing blend usage. Submit a change request instead.",
        });
      }
      await storage.deleteBlendActualUsageByLineItem(lineItemId);
      const results = [];
      for (const comp of components) {
        const created = await storage.createBlendActualUsage({
          lineItemId,
          componentProductId: comp.componentProductId,
          expectedQty: comp.expectedQty || null,
          actualQty: comp.actualQty,
        });
        results.push(created);
      }
      res.json(results);
    },
  );

  // --- FIX: INTERMEDIATE STOCK BALANCES ---
  // Returns stock for products that are used as INPUTS in other production records.
  // These are the true base/bulk products (Plain Yogurt Base, DTY Base, etc.)
  // Excludes finished consumer packs, raw milk, and pulp/puree ingredients.
  app.get("/api/stock/intermediates", requireAuth, async (_req, res) => {
    const allProducts = await storage.getProducts();
    const allLineItems = await storage.getAllLineItems();
    const allPackouts = await storage.getPackouts();

    // Only include products that appear as an INPUT in at least one production line item
    // This identifies true intermediate/bulk products (bases that get converted further)
    // Products used as inputs OR whose name suggests they are bulk/base products
    const usedAsInputIds = new Set([
      ...allLineItems
        .filter((li) => li.inputProductId !== null)
        .map((li) => li.inputProductId as number),
      ...allProducts
        .filter((p) => {
          const name = p.name.toUpperCase();
          return (
            name.includes("BASE") ||
            name.includes("BULK") ||
            (name.includes("PROBIO") &&
              !name.includes("TUB") &&
              !name.includes("ML"))
          );
        })
        .map((p) => p.id),
    ]);

    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    const stockItems = await Promise.all(
      Array.from(usedAsInputIds)
        .map((pid) => productMap.get(pid))
        .filter((p): p is NonNullable<typeof p> => {
          if (!p) return false;
          // Exclude raw milk (has its own banner) and pulp/puree
          if (p.category === "RAW_MILK") return false;
          const name = p.name.toUpperCase();
          if (
            name.includes("PULP") ||
            name.includes("PUREE") ||
            name.includes("PURÉE")
          )
            return false;
          return true;
        })
        .map(async (p) => {
          const produced = allLineItems
            .filter((li) => li.outputProductId === p.id)
            .reduce((acc, li) => acc + parseFloat(li.outputQty), 0);

          const used = allLineItems
            .filter((li) => li.inputProductId === p.id)
            .reduce((acc, li) => acc + parseFloat(li.inputQty || "0"), 0);

          const packed = allPackouts
            .filter((po) => po.productId === p.id)
            .reduce((acc, po) => acc + parseFloat(po.qty), 0);

          const stock = produced - used - packed;

          return {
            productId: p.id,
            productName: p.name,
            category: p.category,
            unitType: p.unitType,
            produced: Math.round(produced * 100) / 100,
            used: Math.round(used * 100) / 100,
            packed: Math.round(packed * 100) / 100,
            stock: Math.round(stock * 100) / 100,
          };
        }),
    );

    // Sort by stock descending so highest stock shows first
    const active = stockItems
      .filter((s) => s.produced > 0)
      .sort((a, b) => b.stock - a.stock);

    res.json(active);
  });
  // --- PACKOUTS ---
  app.get("/api/packouts", requireAuth, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const list = await storage.getPackouts(
      dateFrom as string,
      dateTo as string,
    );
    res.json(list);
  });

  app.post("/api/packouts", requireAuth, async (req, res) => {
    const date = req.body.date;
    const lock = await storage.getDailyLock(date);
    if (lock)
      return res
        .status(403)
        .json({ message: "This day has been locked by admin." });
    const batches = await storage.getProductionBatches(date, date);
    if (batches.length === 0)
      return res.status(400).json({
        message:
          "No production batches recorded for this date. Please complete production first.",
      });
    const p = await storage.createPackout({
      ...req.body,
      createdByUserId: req.user!.id,
    });
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "packout",
      entityId: p.id,
      action: "CREATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(p),
      reason: null,
      metadataJson: null,
    });
    res.status(201).json(p);
  });

  app.put("/api/packouts/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPackout(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const {
      qty,
      productId,
      date,
      packSizeLabel,
      sourceProductId,
      sourceQtyUsed,
    } = req.body;
    const updates: any = {};
    if (qty !== undefined) updates.qty = qty;
    if (productId !== undefined) updates.productId = productId;
    if (date !== undefined) updates.date = date;
    if (packSizeLabel !== undefined) updates.packSizeLabel = packSizeLabel;
    if (sourceProductId !== undefined)
      updates.sourceProductId = sourceProductId;
    if (sourceQtyUsed !== undefined) updates.sourceQtyUsed = sourceQtyUsed;
    const updated = await storage.updatePackout(id, updates);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "packout",
      entityId: id,
      action: "UPDATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
      reason: null,
      metadataJson: null,
    });
    res.json(updated);
  });

  app.delete("/api/packouts/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getPackout(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    await storage.deletePackout(id);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "packout",
      entityId: id,
      action: "DELETE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: JSON.stringify(existing),
      newValue: null,
      reason: null,
      metadataJson: null,
    });
    res.json({ success: true });
  });

  // --- DAILY INTAKES (edit/delete) ---
  app.put("/api/intakes/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getDailyIntake(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const { qty, productId, supplierId, date, deliveredQty, acceptedQty } =
      req.body;
    const updates: any = {};
    if (qty !== undefined) updates.qty = qty;
    if (productId !== undefined) updates.productId = productId;
    if (supplierId !== undefined) updates.supplierId = supplierId;
    if (date !== undefined) updates.date = date;
    if (deliveredQty !== undefined) updates.deliveredQty = deliveredQty;
    if (acceptedQty !== undefined) updates.acceptedQty = acceptedQty;
    const updated = await storage.updateDailyIntake(id, updates);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "daily_intake",
      entityId: id,
      action: "UPDATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
      reason: null,
      metadataJson: null,
    });
    res.json(updated);
  });

  app.delete("/api/intakes/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getDailyIntake(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    await storage.deleteDailyIntake(id);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "daily_intake",
      entityId: id,
      action: "DELETE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: JSON.stringify(existing),
      newValue: null,
      reason: null,
      metadataJson: null,
    });
    res.json({ success: true });
  });

  // --- CHANGE REQUESTS ---
  app.get("/api/change-requests", requireAuth, async (req, res) => {
    const { status } = req.query;
    const list = await storage.getChangeRequests(status as string);
    res.json(list);
  });

  app.get("/api/my-change-requests", requireAuth, async (req, res) => {
    const { status } = req.query;
    const list = await storage.getChangeRequestsByUser(
      req.user!.id,
      status as string,
    );
    res.json(list);
  });

  app.post("/api/change-requests", requireAuth, async (req, res) => {
    const {
      entityType,
      entityId,
      fieldName,
      proposedValue,
      currentValue,
      reason,
    } = req.body;
    if (!reason || !reason.trim())
      return res.status(400).json({ message: "Reason for change is required" });
    if (!entityType || !entityId || !fieldName || proposedValue === undefined) {
      return res.status(400).json({
        message:
          "entityType, entityId, fieldName, and proposedValue are required",
      });
    }
    const entityLookup: Record<string, (id: number) => Promise<any>> = {
      daily_intake: (id) => storage.getDailyIntake(id),
      production_batch: (id) => storage.getProductionBatch(id),
      production_line_item: (id) => storage.getLineItem(id),
      blend_actual_usage: (id) => storage.getBlendActualUsageById(id),
      packout: (id) => storage.getPackout(id),
      supplier: (id) => storage.getSupplier(id),
      product: (id) => storage.getProduct(id),
      formula: (id) => storage.getFormula(id),
      yield_tolerance: (id) => storage.getYieldTolerance(id),
    };
    const lookupFn = entityLookup[entityType];
    if (lookupFn) {
      const entity = await lookupFn(parseInt(entityId));
      if (!entity)
        return res
          .status(404)
          .json({ message: `${entityType} #${entityId} not found` });
    }
    const cr = await storage.createChangeRequest({
      entityType,
      entityId: parseInt(entityId),
      fieldName,
      proposedValue: String(proposedValue),
      currentValue: currentValue != null ? String(currentValue) : null,
      reason: reason.trim(),
      requestedByUserId: req.user!.id,
    });
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "change_request",
      entityId: cr.id,
      action: "CREATE",
      ipAddress: req.ip || null,
      fieldName: cr.fieldName,
      oldValue: cr.currentValue,
      newValue: cr.proposedValue,
      reason: cr.reason,
      metadataJson: JSON.stringify({
        targetEntityType: cr.entityType,
        targetEntityId: cr.entityId,
      }),
    });
    res.status(201).json(cr);
  });

  app.patch("/api/change-requests/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status, adminComment } = req.body;
    const existing = await storage.getChangeRequest(id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    if (existing.status !== "PENDING")
      return res
        .status(400)
        .json({ message: "Change request already processed" });

    if (status === "APPROVED") {
      const entityUpdaters: Record<
        string,
        (
          eId: number,
          field: string,
          value: string,
        ) => Promise<{ old: any; updated: any } | null>
      > = {
        daily_intake: async (eId, field, value) => {
          const old = await storage.getDailyIntake(eId);
          if (!old) return null;
          const updated = await storage.updateDailyIntake(eId, {
            [field]: value,
          });
          return { old, updated };
        },
        production_batch: async (eId, field, value) => {
          const old = await storage.getProductionBatch(eId);
          if (!old) return null;
          const updated = await storage.updateProductionBatch(eId, {
            [field]: value,
          });
          return { old, updated };
        },
        production_line_item: async (eId, field, value) => {
          const old = await storage.getLineItem(eId);
          if (!old) return null;
          const updated = await storage.updateLineItem(eId, { [field]: value });
          return { old, updated };
        },
        blend_actual_usage: async (eId, field, value) => {
          const old = await storage.getBlendActualUsageById(eId);
          if (!old) return null;
          const updated = await storage.updateBlendActualUsage(eId, {
            [field]: value,
          });
          return { old, updated };
        },
        packout: async (eId, field, value) => {
          const old = await storage.getPackout(eId);
          if (!old) return null;
          const updated = await storage.updatePackout(eId, { [field]: value });
          return { old, updated };
        },
        supplier: async (eId, field, value) => {
          const old = await storage.getSupplier(eId);
          if (!old) return null;
          const updated = await storage.updateSupplier(eId, { [field]: value });
          return { old, updated };
        },
        product: async (eId, field, value) => {
          const old = await storage.getProduct(eId);
          if (!old) return null;
          const updated = await storage.updateProduct(eId, { [field]: value });
          return { old, updated };
        },
        formula: async (eId, field, value) => {
          const old = await storage.getFormula(eId);
          if (!old) return null;
          const updated = await storage.updateFormula(eId, { [field]: value });
          return { old, updated };
        },
        yield_tolerance: async (eId, field, value) => {
          const old = await storage.getYieldTolerance(eId);
          if (!old) return null;
          const updated = await storage.updateYieldTolerance(eId, {
            [field]: value,
          });
          return { old, updated };
        },
      };
      const updater = entityUpdaters[existing.entityType];
      if (updater) {
        const result = await updater(
          existing.entityId,
          existing.fieldName,
          existing.proposedValue,
        );
        if (!result)
          return res.status(404).json({
            message: `${existing.entityType} #${existing.entityId} no longer exists`,
          });
        const oldVal = (result.old as any)[existing.fieldName];
        const newVal = (result.updated as any)[existing.fieldName];
        await storage.createEvent({
          actorUserId: req.user!.id,
          entityType: existing.entityType,
          entityId: existing.entityId,
          action: "UPDATE",
          ipAddress: req.ip || null,
          fieldName: existing.fieldName,
          oldValue: oldVal != null ? String(oldVal) : null,
          newValue: newVal != null ? String(newVal) : null,
          reason:
            `Approved change request #${id}` +
            (adminComment ? `: ${adminComment}` : ""),
          metadataJson: JSON.stringify({ changeRequestId: id }),
        });
      }
      const cr = await storage.updateChangeRequestStatus(
        id,
        "APPROVED",
        req.user!.id,
        adminComment,
      );
      await storage.createEvent({
        actorUserId: req.user!.id,
        entityType: "change_request",
        entityId: id,
        action: "APPROVE",
        ipAddress: req.ip || null,
        fieldName: null,
        oldValue: "PENDING",
        newValue: "APPROVED",
        reason: adminComment || null,
        metadataJson: null,
      });
      return res.json(cr);
    }

    if (status === "REJECTED") {
      const cr = await storage.updateChangeRequestStatus(
        id,
        "REJECTED",
        req.user!.id,
        adminComment,
      );
      await storage.createEvent({
        actorUserId: req.user!.id,
        entityType: "change_request",
        entityId: id,
        action: "REJECT",
        ipAddress: req.ip || null,
        fieldName: null,
        oldValue: "PENDING",
        newValue: "REJECTED",
        reason: adminComment || null,
        metadataJson: JSON.stringify({
          rejectionReason: adminComment,
          originalEntityType: existing.entityType,
          originalEntityId: existing.entityId,
        }),
      });
      return res.json(cr);
    }

    res
      .status(400)
      .json({ message: "Invalid status. Must be APPROVED or REJECTED" });
  });

  // --- ADMIN REVIEW ---
  app.patch(
    "/api/admin/review",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { entityType, entityId, adminNotes } = req.body;
      if (!entityType || !entityId)
        return res
          .status(400)
          .json({ message: "entityType and entityId are required" });
      if (!["INTAKE", "LINE_ITEM", "PACKOUT"].includes(entityType))
        return res.status(400).json({
          message: "entityType must be INTAKE, LINE_ITEM, or PACKOUT",
        });
      await storage.adminReviewRecord(
        entityType,
        entityId,
        req.user!.id,
        adminNotes || null,
      );
      await storage.createEvent({
        actorUserId: req.user!.id,
        entityType,
        entityId,
        action: "REVIEW",
        ipAddress: req.ip || null,
        fieldName: "adminNotes",
        oldValue: null,
        newValue: adminNotes || null,
        reason: null,
        metadataJson: null,
      });
      res.json({ success: true });
    },
  );

  // --- AUDIT LOG ---
  app.get("/api/events", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const list = await storage.getEvents(limit);
    res.json(list);
  });

  // --- REPORTS ---
  app.get("/api/reports/mass-balance", requireAuth, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const lineItems = await storage.getAllLineItems(
      dateFrom as string,
      dateTo as string,
    );
    const allPackouts = await storage.getPackouts(
      dateFrom as string,
      dateTo as string,
    );
    const allProducts = await storage.getProducts();
    const balance = allProducts
      .map((prod) => {
        const produced = lineItems
          .filter((li) => li.outputProductId === prod.id)
          .reduce((acc, li) => acc + parseFloat(li.outputQty), 0);
        const consumed = lineItems
          .filter((li) => li.inputProductId === prod.id)
          .reduce((acc, li) => acc + parseFloat(li.inputQty || "0"), 0);
        const packed = allPackouts
          .filter((pk) => pk.productId === prod.id)
          .reduce((acc, pk) => acc + parseFloat(pk.qty), 0);
        return {
          productId: prod.id,
          productName: prod.name,
          unitType: prod.unitType,
          produced,
          consumed,
          packed,
          theoreticalStock: produced - consumed - packed,
        };
      })
      .filter((p) => p.produced > 0 || p.consumed > 0 || p.packed > 0);
    res.json(balance);
  });

  app.get("/api/reports/variance", requireAuth, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const lineItems = await storage.getAllLineItems(
      dateFrom as string,
      dateTo as string,
    );
    const allFormulas = await storage.getFormulas();
    const allProducts = await storage.getProducts();
    const varianceData = await Promise.all(
      lineItems
        .filter((li) => li.formulaId && li.inputQty)
        .map(async (li) => {
          let expectedInput = 0;
          if (li.formulaId) {
            const formula = allFormulas.find((f) => f.id === li.formulaId);
            if (formula?.type === "CONVERSION") {
              const conv = await storage.getConversionByFormulaId(formula.id);
              if (conv) {
                const ratio =
                  parseFloat(conv.ratioNumerator) /
                  parseFloat(conv.ratioDenominator);
                expectedInput = parseFloat(li.outputQty) * ratio;
              }
            }
          }
          const actualInput = parseFloat(li.inputQty || "0");
          const variance =
            expectedInput > 0
              ? ((actualInput - expectedInput) / expectedInput) * 100
              : 0;
          return {
            lineItemId: li.id,
            batchCode: li.batchCode,
            batchDate: li.batchDate,
            outputProduct:
              allProducts.find((p) => p.id === li.outputProductId)?.name || "",
            inputProduct:
              allProducts.find((p) => p.id === li.inputProductId)?.name || "",
            expectedInput,
            actualInput,
            outputQty: parseFloat(li.outputQty),
            variancePercent: variance,
            varianceQty: actualInput - expectedInput,
          };
        }),
    );
    res.json(varianceData);
  });

  app.get("/api/reports/daily-milk-balance", requireAuth, async (req, res) => {
    const allProducts = await storage.getProducts();
    const rawMilkIds = new Set(
      allProducts.filter((p) => p.category === "RAW_MILK").map((p) => p.id),
    );
    const allIntakes = await storage.getDailyIntakes();
    const allLineItems = await storage.getAllLineItems();
    const rawIntakes = allIntakes.filter((i) => rawMilkIds.has(i.productId));
    const rawUsage = allLineItems.filter(
      (li) => li.inputProductId && rawMilkIds.has(li.inputProductId),
    );
    const dateSet = new Set<string>();
    rawIntakes.forEach((i) => dateSet.add(i.date));
    rawUsage.forEach((li) => dateSet.add(li.batchDate));
    const dates = Array.from(dateSet).sort();
    let runningStock = 0;
    const rows = dates.map((date) => {
      const intake = rawIntakes
        .filter((i) => i.date === date)
        .reduce((acc, i) => acc + parseFloat(i.qty), 0);
      const used = rawUsage
        .filter((li) => li.batchDate === date)
        .reduce((acc, li) => acc + parseFloat(li.inputQty || "0"), 0);
      const produced = allLineItems
        .filter(
          (li) =>
            li.batchDate === date &&
            li.outputProductId &&
            rawMilkIds.has(li.inputProductId!),
        )
        .reduce((acc, li) => acc + parseFloat(li.outputQty), 0);
      const difference = intake - used;
      runningStock += difference;
      const flag =
        used > intake
          ? "OVER_USE"
          : Math.abs(difference) > intake * 0.15 && intake > 0
            ? "HIGH_VARIANCE"
            : "OK";
      return {
        date,
        intake: Math.round(intake * 100) / 100,
        used: Math.round(used * 100) / 100,
        produced: Math.round(produced * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        runningStock: Math.round(runningStock * 100) / 100,
        flag,
      };
    });
    res.json(rows.reverse());
  });

  app.get("/api/reports/loss-breakdown", requireAdmin, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const allProducts = await storage.getProducts();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const intakes = await storage.getDailyIntakes(
      dateFrom as string,
      dateTo as string,
    );
    const lineItems = await storage.getAllLineItems(
      dateFrom as string,
      dateTo as string,
    );
    const allPackouts = await storage.getPackouts(
      dateFrom as string,
      dateTo as string,
    );
    const allFormulas = await storage.getFormulas();

    const receivingLosses: any[] = [];
    for (const intake of intakes) {
      const delivered = intake.deliveredQty
        ? parseFloat(intake.deliveredQty)
        : null;
      const accepted = intake.acceptedQty
        ? parseFloat(intake.acceptedQty)
        : parseFloat(intake.qty);
      if (delivered !== null && delivered > 0) {
        const loss = delivered - accepted;
        if (Math.abs(loss) > 0.001)
          receivingLosses.push({
            id: intake.id,
            date: intake.date,
            productId: intake.productId,
            productName: productMap.get(intake.productId)?.name || "",
            delivered,
            accepted,
            loss,
            lossPercent: (loss / delivered) * 100,
          });
      }
    }

    const fillingProcessLosses: any[] = [];
    for (const po of allPackouts) {
      if (po.sourceProductId && po.sourceQtyUsed) {
        const sourceUsed = parseFloat(po.sourceQtyUsed);
        const packed = parseFloat(po.qty);
        const loss = sourceUsed - packed;
        if (Math.abs(loss) > 0.001)
          fillingProcessLosses.push({
            id: po.id,
            date: po.date,
            productId: po.productId,
            productName: productMap.get(po.productId)?.name || "",
            sourceProductId: po.sourceProductId,
            sourceProductName: productMap.get(po.sourceProductId)?.name || "",
            sourceUsed,
            packed,
            loss,
            lossPercent: sourceUsed > 0 ? (loss / sourceUsed) * 100 : 0,
          });
      }
    }

    const drainingLosses: any[] = [];
    for (const li of lineItems) {
      if (li.operationType === "CONVERT" && li.inputQty && li.formulaId) {
        const formula = allFormulas.find((f) => f.id === li.formulaId);
        if (formula?.type === "CONVERSION") {
          const conv = await storage.getConversionByFormulaId(formula.id);
          if (conv) {
            const ratio =
              parseFloat(conv.ratioNumerator) /
              parseFloat(conv.ratioDenominator);
            const inputQty = parseFloat(li.inputQty);
            const outputQty = parseFloat(li.outputQty);
            const expectedOutput = inputQty / ratio;
            const loss = inputQty - outputQty;
            if (Math.abs(loss) > 0.001)
              drainingLosses.push({
                id: li.id,
                date: li.batchDate,
                batchCode: li.batchCode,
                inputProductId: li.inputProductId,
                inputProductName:
                  productMap.get(li.inputProductId!)?.name || "",
                outputProductId: li.outputProductId,
                outputProductName:
                  productMap.get(li.outputProductId!)?.name || "",
                inputQty,
                outputQty,
                expectedOutput,
                loss,
                lossPercent: inputQty > 0 ? (loss / inputQty) * 100 : 0,
              });
          }
        }
      }
    }

    const packingMixingLosses: any[] = [];
    for (const li of lineItems) {
      if (li.operationType === "BLEND" && li.formulaId) {
        const usage = await storage.getBlendActualUsageByLineItem(li.id);
        if (usage.length > 0) {
          const totalExpected = usage.reduce(
            (s, u) => s + (u.expectedQty ? parseFloat(u.expectedQty) : 0),
            0,
          );
          const totalActual = usage.reduce(
            (s, u) => s + parseFloat(u.actualQty),
            0,
          );
          const loss = totalActual - totalExpected;
          const components = usage.map((u) => ({
            componentProductId: u.componentProductId,
            componentName: productMap.get(u.componentProductId)?.name || "",
            expected: u.expectedQty ? parseFloat(u.expectedQty) : 0,
            actual: parseFloat(u.actualQty),
            variance:
              parseFloat(u.actualQty) -
              (u.expectedQty ? parseFloat(u.expectedQty) : 0),
          }));
          packingMixingLosses.push({
            id: li.id,
            date: li.batchDate,
            batchCode: li.batchCode,
            outputProductId: li.outputProductId,
            outputProductName: productMap.get(li.outputProductId!)?.name || "",
            outputQty: parseFloat(li.outputQty),
            totalExpected,
            totalActual,
            loss,
            lossPercent: totalExpected > 0 ? (loss / totalExpected) * 100 : 0,
            components,
          });
        }
      }
    }

    const summary = {
      receiving: receivingLosses.reduce((s, l) => s + l.loss, 0),
      fillingProcess: fillingProcessLosses.reduce((s, l) => s + l.loss, 0),
      draining: drainingLosses.reduce((s, l) => s + l.loss, 0),
      packingMixing: packingMixingLosses.reduce((s, l) => s + l.loss, 0),
    };
    res.json({
      summary,
      totalLoss:
        summary.receiving +
        summary.fillingProcess +
        summary.draining +
        summary.packingMixing,
      receiving: receivingLosses,
      fillingProcess: fillingProcessLosses,
      draining: drainingLosses,
      packingMixing: packingMixingLosses,
    });
  });

  // --- RUNNING STOCK REPORT ---
  app.get("/api/reports/running-stock", requireAdmin, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const allProducts = await storage.getProducts();
    const rawMilkProducts = allProducts.filter(
      (p) => p.category === "RAW_MILK",
    );
    const yogurtBaseProducts = allProducts.filter((p) =>
      p.name.toUpperCase().includes("YOGURT BASE"),
    );
    const rawMilkIds = new Set(rawMilkProducts.map((p) => p.id));
    const yogurtBaseIds = new Set(yogurtBaseProducts.map((p) => p.id));
    const allIntakes = await storage.getDailyIntakes(
      dateFrom as string,
      dateTo as string,
    );
    const allLineItems = await storage.getAllLineItems(
      dateFrom as string,
      dateTo as string,
    );
    const allPackouts = await storage.getPackouts(
      dateFrom as string,
      dateTo as string,
    );

    const rawMilkDateSet = new Set<string>();
    allIntakes
      .filter((i) => rawMilkIds.has(i.productId))
      .forEach((i) => rawMilkDateSet.add(i.date));
    allLineItems
      .filter((li) => li.inputProductId && rawMilkIds.has(li.inputProductId))
      .forEach((li) => rawMilkDateSet.add(li.batchDate));
    const rawMilkDates = Array.from(rawMilkDateSet).sort();
    let rawMilkRunningStock = 0;
    const rawMilkRows = rawMilkDates.map((date) => {
      const received = allIntakes
        .filter((i) => i.date === date && rawMilkIds.has(i.productId))
        .reduce((acc, i) => acc + parseFloat(i.qty), 0);
      const usedInProduction = allLineItems
        .filter(
          (li) =>
            li.batchDate === date &&
            li.inputProductId &&
            rawMilkIds.has(li.inputProductId),
        )
        .reduce((acc, li) => acc + parseFloat(li.inputQty || "0"), 0);
      const difference = received - usedInProduction;
      rawMilkRunningStock += difference;
      return {
        date,
        received: Math.round(received * 100) / 100,
        usedInProduction: Math.round(usedInProduction * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        runningStock: Math.round(rawMilkRunningStock * 100) / 100,
      };
    });

    const yogurtBaseDateSet = new Set<string>();
    allLineItems
      .filter(
        (li) => li.outputProductId && yogurtBaseIds.has(li.outputProductId),
      )
      .forEach((li) => yogurtBaseDateSet.add(li.batchDate));
    allLineItems
      .filter((li) => li.inputProductId && yogurtBaseIds.has(li.inputProductId))
      .forEach((li) => yogurtBaseDateSet.add(li.batchDate));
    allPackouts
      .filter((po) => yogurtBaseIds.has(po.productId))
      .forEach((po) => yogurtBaseDateSet.add(po.date));
    const yogurtBaseDates = Array.from(yogurtBaseDateSet).sort();
    let yogurtBaseRunningStock = 0;
    const yogurtBaseRows = yogurtBaseDates.map((date) => {
      const produced = allLineItems
        .filter(
          (li) =>
            li.batchDate === date &&
            li.outputProductId &&
            yogurtBaseIds.has(li.outputProductId),
        )
        .reduce((acc, li) => acc + parseFloat(li.outputQty), 0);
      const usedInProduction = allLineItems
        .filter(
          (li) =>
            li.batchDate === date &&
            li.inputProductId &&
            yogurtBaseIds.has(li.inputProductId),
        )
        .reduce((acc, li) => acc + parseFloat(li.inputQty || "0"), 0);
      const packedOut = allPackouts
        .filter((po) => po.date === date && yogurtBaseIds.has(po.productId))
        .reduce((acc, po) => acc + parseFloat(po.qty), 0);
      const difference = produced - usedInProduction - packedOut;
      yogurtBaseRunningStock += difference;
      return {
        date,
        produced: Math.round(produced * 100) / 100,
        usedInProduction: Math.round(usedInProduction * 100) / 100,
        packedOut: Math.round(packedOut * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        runningStock: Math.round(yogurtBaseRunningStock * 100) / 100,
      };
    });

    const dataGaps = await findDataGaps(dateFrom as string, dateTo as string);
    res.json({
      rawMilk: { productIds: Array.from(rawMilkIds), rows: rawMilkRows },
      yogurtBase: {
        productIds: Array.from(yogurtBaseIds),
        rows: yogurtBaseRows,
      },
      dataGaps,
    });
  });

  // --- DAILY ALLOCATION REPORT ---
  app.get("/api/reports/allocation", requireAdmin, async (req, res) => {
    const { date } = req.query;
    if (!date)
      return res
        .status(400)
        .json({ message: "date query parameter is required" });
    const dateStr = date as string;
    const allProducts = await storage.getProducts();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const allLineItems = await storage.getAllLineItems(dateStr, dateStr);
    const dayLineItems = allLineItems.filter((li) => li.batchDate === dateStr);
    const allIntakes = await storage.getDailyIntakes(dateStr, dateStr);
    const rawMilkIds = new Set(
      allProducts.filter((p) => p.category === "RAW_MILK").map((p) => p.id),
    );
    const totalRawMilkReceived = allIntakes
      .filter((i) => i.date === dateStr && rawMilkIds.has(i.productId))
      .reduce((acc, i) => acc + parseFloat(i.qty), 0);
    const categoryBuckets = new Map<
      string,
      { totalInputUsed: number; lineItems: any[] }
    >();
    for (const li of dayLineItems) {
      const outputProduct = productMap.get(li.outputProductId);
      if (!outputProduct) continue;
      const category = outputProduct.category;
      if (!categoryBuckets.has(category))
        categoryBuckets.set(category, { totalInputUsed: 0, lineItems: [] });
      const bucket = categoryBuckets.get(category)!;
      const inputQty = parseFloat(li.inputQty || "0");
      bucket.totalInputUsed += inputQty;
      bucket.lineItems.push({
        lineItemId: li.id,
        outputProductName: outputProduct.name,
        inputProductName: li.inputProductId
          ? productMap.get(li.inputProductId)?.name || ""
          : "",
        inputQty: Math.round(inputQty * 100) / 100,
        outputQty: Math.round(parseFloat(li.outputQty) * 100) / 100,
      });
    }
    const categoryLabels: Record<string, string> = {
      RAW_MILK: "Raw Milk",
      MILK: "Milk",
      YOGURT: "Yogurt",
      DTY: "DTY",
      YOLAC: "Yolac",
      PROBIOTIC: "Probiotic",
      CREAM_CHEESE: "Cream Cheese",
      FETA: "Feta",
      SMOOTHY: "Smoothy",
      FRESH_CREAM: "Fresh Cream",
      DIP: "Dip",
      HODZEKO: "Hodzeko",
      CHEESE: "Cheese",
      OTHER: "Other",
    };
    const allocations = Array.from(categoryBuckets.entries()).map(
      ([category, bucket]) => ({
        category,
        categoryLabel: categoryLabels[category] || category,
        totalInputUsed: Math.round(bucket.totalInputUsed * 100) / 100,
        lineItems: bucket.lineItems,
      }),
    );
    const dataGaps = await findDataGaps(dateStr, dateStr);
    res.json({
      date: dateStr,
      totalRawMilkReceived: Math.round(totalRawMilkReceived * 100) / 100,
      allocations,
      dataGaps,
    });
  });

  // --- SEQUENTIAL WORKFLOW CHECK ---
  app.get("/api/workflow/check", requireAuth, async (req, res) => {
    const { date, step } = req.query;
    if (!date || !step)
      return res.status(400).json({ message: "date and step are required" });
    const dateStr = date as string;
    const lock = await storage.getDailyLock(dateStr);
    if (lock)
      return res.json({
        allowed: false,
        reason: "This day has been locked by admin. No changes allowed.",
      });

    if (step === "production") {
      const availableStock = await getCumulativeRawMilkStock();
      if (availableStock <= 0) {
        return res.json({
          allowed: false,
          reason:
            "No raw milk available in stock. Please record a milk intake before starting production.",
          availableStock: 0,
        });
      }
      return res.json({
        allowed: true,
        availableStock: Math.round(availableStock * 100) / 100,
      });
    }

    if (step === "packout") {
      const batches = await storage.getProductionBatches(dateStr, dateStr);
      if (batches.length === 0)
        return res.json({
          allowed: false,
          reason:
            "No production batches recorded for this date. Please complete production first.",
        });
      return res.json({ allowed: true });
    }

    return res.json({ allowed: true });
  });

  // --- LOSS THRESHOLDS ---
  app.get("/api/loss-thresholds", requireAdmin, async (_req, res) => {
    res.json(await storage.getLossThresholds());
  });
  app.post("/api/loss-thresholds", requireAdmin, async (req, res) => {
    const t = await storage.createLossThreshold(req.body);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "loss_threshold",
      entityId: t.id,
      action: "CREATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(t),
      reason: null,
      metadataJson: null,
    });
    res.status(201).json(t);
  });
  app.patch("/api/loss-thresholds/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const old = await storage.getLossThreshold(id);
    if (!old) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateLossThreshold(id, req.body);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "loss_threshold",
      entityId: id,
      action: "UPDATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: JSON.stringify(old),
      newValue: JSON.stringify(updated),
      reason: null,
      metadataJson: null,
    });
    res.json(updated);
  });
  app.delete("/api/loss-thresholds/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteLossThreshold(id);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "loss_threshold",
      entityId: id,
      action: "DELETE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: null,
      reason: null,
      metadataJson: null,
    });
    res.json({ success: true });
  });

  // --- CARRY FORWARD REQUESTS ---
  app.get("/api/carry-forward", requireAuth, async (req, res) => {
    const { status } = req.query;
    res.json(await storage.getCarryForwardRequests(status as string));
  });
  app.post("/api/carry-forward", requireAuth, async (req, res) => {
    const cf = await storage.createCarryForwardRequest({
      ...req.body,
      requestedByUserId: req.user!.id,
    });
    await storage.createAdminNotification({
      type: "CARRY_FORWARD_REQUEST",
      title: "Carry-Forward Request",
      message: `Carry-forward of ${cf.amountLitres}L requested from batch #${cf.fromBatchId}`,
      entityType: "carry_forward_request",
      entityId: cf.id,
      severity: "info",
      metadata: JSON.stringify({
        fromBatchId: cf.fromBatchId,
        amount: cf.amountLitres,
      }),
    });
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "carry_forward_request",
      entityId: cf.id,
      action: "CREATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(cf),
      reason: null,
      metadataJson: null,
    });
    res.status(201).json(cf);
  });
  app.patch("/api/carry-forward/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status, adminComment } = req.body;
    if (!["APPROVED", "REJECTED"].includes(status))
      return res
        .status(400)
        .json({ message: "Status must be APPROVED or REJECTED" });
    const existing = await storage.getCarryForwardRequest(id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    if (existing.status !== "PENDING")
      return res.status(400).json({ message: "Already processed" });
    const updated = await storage.updateCarryForwardStatus(
      id,
      status,
      req.user!.id,
      adminComment,
    );
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "carry_forward_request",
      entityId: id,
      action: status === "APPROVED" ? "APPROVE" : "REJECT",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: "PENDING",
      newValue: status,
      reason: adminComment || null,
      metadataJson: null,
    });
    res.json(updated);
  });
  app.get(
    "/api/carry-forward/batch/:batchId",
    requireAuth,
    async (req, res) => {
      const cf = await storage.getCarryForwardByFromBatch(
        parseInt(req.params.batchId),
      );
      res.json(cf || null);
    },
  );

  // --- DAILY LOCKS ---
  app.get("/api/daily-locks", requireAuth, async (_req, res) => {
    res.json(await storage.getDailyLocks());
  });
  app.get("/api/daily-locks/:date", requireAuth, async (req, res) => {
    res.json((await storage.getDailyLock(req.params.date)) || null);
  });
  app.post("/api/daily-locks", requireAdmin, async (req, res) => {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: "date is required" });
    const existing = await storage.getDailyLock(date);
    if (existing)
      return res.status(400).json({ message: "This date is already locked" });
    const lock = await storage.createDailyLock({
      date,
      lockedByUserId: req.user!.id,
    });
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "daily_lock",
      entityId: lock.id,
      action: "CREATE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(lock),
      reason: null,
      metadataJson: null,
    });
    res.status(201).json(lock);
  });
  app.delete("/api/daily-locks/:date", requireAdmin, async (req, res) => {
    const existing = await storage.getDailyLock(req.params.date);
    if (!existing)
      return res.status(404).json({ message: "No lock found for this date" });
    await storage.deleteDailyLock(req.params.date);
    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "daily_lock",
      entityId: existing.id,
      action: "DELETE",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: JSON.stringify(existing),
      newValue: null,
      reason: null,
      metadataJson: null,
    });
    res.json({ success: true });
  });

  // --- ADMIN NOTIFICATIONS ---
  app.get("/api/notifications", requireAdmin, async (req, res) => {
    res.json(await storage.getAdminNotifications(req.query.unread === "true"));
  });
  app.get("/api/notifications/count", requireAdmin, async (_req, res) => {
    res.json({ count: await storage.getUnreadNotificationCount() });
  });
  app.patch("/api/notifications/:id/read", requireAdmin, async (req, res) => {
    const updated = await storage.markNotificationRead(parseInt(req.params.id));
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });
  app.post(
    "/api/notifications/mark-all-read",
    requireAdmin,
    async (_req, res) => {
      await storage.markAllNotificationsRead();
      res.json({ success: true });
    },
  );

  // --- CUSTOM UNITS ---
  app.get("/api/custom-units", requireAuth, async (_req, res) => {
    res.json(await storage.getCustomUnits());
  });
  app.post("/api/custom-units", requireAdmin, async (req, res) => {
    res.status(201).json(await storage.createCustomUnit(req.body));
  });
  app.patch("/api/custom-units/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateCustomUnit(
      parseInt(req.params.id),
      req.body,
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });
  app.delete("/api/custom-units/:id", requireAdmin, async (req, res) => {
    await storage.deleteCustomUnit(parseInt(req.params.id));
    res.json({ success: true });
  });

  // --- REMAINING MILK TRACKING ---
  app.patch(
    "/api/production/batches/:id/remaining",
    requireAuth,
    async (req, res) => {
      const id = parseInt(req.params.id);
      const batch = await storage.getProductionBatch(id);
      if (!batch) return res.status(404).json({ message: "Batch not found" });
      const { remainingRawMilk } = req.body;
      const cumulativeAvailable = await getCumulativeRawMilkStock();
      const systemCalculatedRemaining = cumulativeAvailable.toFixed(4);
      const updated = await storage.updateProductionBatch(id, {
        remainingRawMilk,
        systemCalculatedRemaining,
      });
      const clerkRemaining = parseFloat(remainingRawMilk);
      const systemRemaining = parseFloat(systemCalculatedRemaining);
      if (Math.abs(clerkRemaining - systemRemaining) > 0.5) {
        const variancePercent =
          systemRemaining > 0
            ? (
                ((clerkRemaining - systemRemaining) / systemRemaining) *
                100
              ).toFixed(1)
            : "N/A";
        await storage.createAdminNotification({
          type: "UNUSUAL_LOSS",
          title: "Remaining Milk Variance",
          message: `Batch ${batch.batchCode}: Clerk reported ${clerkRemaining}L remaining, system calculated ${systemRemaining}L (${variancePercent}% variance)`,
          entityType: "production_batch",
          entityId: id,
          severity:
            Math.abs(clerkRemaining - systemRemaining) > 5
              ? "critical"
              : "warning",
          metadata: JSON.stringify({
            clerkRemaining,
            systemRemaining,
            variancePercent,
          }),
        });
      }
      await storage.createEvent({
        actorUserId: req.user!.id,
        entityType: "production_batch",
        entityId: id,
        action: "UPDATE_REMAINING",
        ipAddress: req.ip || null,
        fieldName: "remainingRawMilk",
        oldValue: batch.remainingRawMilk || null,
        newValue: remainingRawMilk,
        reason: null,
        metadataJson: JSON.stringify({ systemCalculatedRemaining }),
      });
      res.json(updated);
    },
  );

  // --- LOSS THRESHOLD CHECK ---
  app.post("/api/check-loss-threshold", requireAuth, async (req, res) => {
    const { formulaId, stage, lossPercent, entityType, entityId, details } =
      req.body;
    if (!stage || lossPercent === undefined)
      return res
        .status(400)
        .json({ message: "stage and lossPercent required" });
    let threshold = formulaId
      ? await storage.getLossThresholdByFormula(formulaId, stage)
      : null;
    if (!threshold) threshold = await storage.getGlobalLossThreshold(stage);
    if (threshold) {
      const min = parseFloat(threshold.minLossPercent);
      const max = parseFloat(threshold.maxLossPercent);
      const loss = Math.abs(parseFloat(lossPercent));
      if (loss > max) {
        await storage.createAdminNotification({
          type: "THRESHOLD_BREACH",
          title: `Loss Threshold Exceeded (${stage})`,
          message: `${details || "Production"}: ${loss.toFixed(1)}% loss exceeds maximum ${max}% threshold`,
          entityType: entityType || "production_line_item",
          entityId: entityId || 0,
          severity: "critical",
          metadata: JSON.stringify({
            formulaId,
            stage,
            lossPercent: loss,
            threshold: { min, max },
          }),
        });
        return res.json({
          breached: true,
          severity: "critical",
          message: `Loss of ${loss.toFixed(1)}% exceeds maximum threshold of ${max}%`,
        });
      }
      if (loss > min && loss <= max)
        return res.json({
          breached: false,
          severity: "warning",
          message: `Loss of ${loss.toFixed(1)}% is within warning range (${min}%-${max}%)`,
        });
    }
    res.json({ breached: false, severity: "ok" });
  });

  // --- DASHBOARD KPI STATS ---
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .split("T")[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000)
      .toISOString()
      .split("T")[0];
    const [
      intakesThisWeek,
      intakesLastWeek,
      lineItemsThisWeek,
      lineItemsLastWeek,
      packoutsThisWeek,
      packoutsLastWeek,
    ] = await Promise.all([
      storage.getDailyIntakes(weekAgo, today),
      storage.getDailyIntakes(twoWeeksAgo, weekAgo),
      storage.getAllLineItems(weekAgo, today),
      storage.getAllLineItems(twoWeeksAgo, weekAgo),
      storage.getPackouts(weekAgo, today),
      storage.getPackouts(twoWeeksAgo, weekAgo),
    ]);
    const totalIntakeThisWeek = intakesThisWeek.reduce(
      (s, i) => s + parseFloat(i.qty),
      0,
    );
    const totalIntakeLastWeek = intakesLastWeek.reduce(
      (s, i) => s + parseFloat(i.qty),
      0,
    );
    const totalOutputThisWeek = lineItemsThisWeek.reduce(
      (s, l) => s + parseFloat(l.outputQty),
      0,
    );
    const totalOutputLastWeek = lineItemsLastWeek.reduce(
      (s, l) => s + parseFloat(l.outputQty),
      0,
    );
    const totalPackedThisWeek = packoutsThisWeek.reduce(
      (s, p) => s + parseFloat(p.qty),
      0,
    );
    const totalPackedLastWeek = packoutsLastWeek.reduce(
      (s, p) => s + parseFloat(p.qty),
      0,
    );
    const [
      allLineItems,
      allPackouts,
      allIntakes,
      pendingCRs,
      pendingCFs,
      todayIntakes,
      todayLineItems,
      todayPackouts,
    ] = await Promise.all([
      storage.getAllLineItems(),
      storage.getPackouts(),
      storage.getDailyIntakes(),
      storage.getChangeRequests("PENDING"),
      storage.getCarryForwardRequests("PENDING"),
      storage.getDailyIntakes(today, today),
      storage.getAllLineItems(today, today),
      storage.getPackouts(today, today),
    ]);
    const trendPct = (c: number, p: number) =>
      p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100;
    res.json({
      today: {
        intake: todayIntakes.reduce((s, i) => s + parseFloat(i.qty), 0),
        production: todayLineItems.reduce(
          (s, l) => s + parseFloat(l.outputQty),
          0,
        ),
        packed: todayPackouts.reduce((s, p) => s + parseFloat(p.qty), 0),
      },
      thisWeek: {
        intake: totalIntakeThisWeek,
        production: totalOutputThisWeek,
        packed: totalPackedThisWeek,
      },
      trends: {
        intake: trendPct(totalIntakeThisWeek, totalIntakeLastWeek),
        production: trendPct(totalOutputThisWeek, totalOutputLastWeek),
        packed: trendPct(totalPackedThisWeek, totalPackedLastWeek),
      },
      unreviewed: {
        production: allLineItems.filter((l) => !l.reviewedAt).length,
        packouts: allPackouts.filter((p) => !p.reviewedAt).length,
        intakes: allIntakes.filter((i) => !i.reviewedAt).length,
      },
      pending: {
        changeRequests: pendingCRs.length,
        carryForwards: pendingCFs.length,
      },
    });
  });

  // --- ENHANCED MASS BALANCE ---
  app.get(
    "/api/reports/mass-balance-enhanced",
    requireAdmin,
    async (req, res) => {
      const { dateFrom, dateTo } = req.query;
      const df =
        (dateFrom as string) ||
        new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const dt = (dateTo as string) || new Date().toISOString().split("T")[0];
      const allProducts = await storage.getProducts();
      const rawMilkIds = new Set(
        allProducts.filter((p) => p.category === "RAW_MILK").map((p) => p.id),
      );
      const productMap = new Map(allProducts.map((p) => [p.id, p]));
      const intakes = await storage.getDailyIntakes(df, dt);
      const lineItems = await storage.getAllLineItems(df, dt);
      const packs = await storage.getPackouts(df, dt);
      const milkIn = intakes
        .filter((i) => rawMilkIds.has(i.productId))
        .reduce((s, i) => s + parseFloat(i.qty), 0);
      const receivingLoss = intakes
        .filter((i) => i.deliveredQty && i.acceptedQty)
        .reduce(
          (s, i) =>
            s + (parseFloat(i.deliveredQty!) - parseFloat(i.acceptedQty!)),
          0,
        );
      const productionInputUsed = lineItems
        .filter(
          (l) =>
            l.inputQty && l.inputProductId && rawMilkIds.has(l.inputProductId),
        )
        .reduce((s, l) => s + parseFloat(l.inputQty!), 0);
      const productionOutput = lineItems.reduce(
        (s, l) => s + parseFloat(l.outputQty),
        0,
      );
      const productionLoss = productionInputUsed - productionOutput;
      const totalPacked = packs.reduce((s, p) => s + parseFloat(p.qty), 0);
      const packingLoss = packs
        .filter((p) => p.sourceQtyUsed)
        .reduce(
          (s, p) => s + (parseFloat(p.sourceQtyUsed!) - parseFloat(p.qty)),
          0,
        );
      const categoryBreakdown: Record<
        string,
        { produced: number; packed: number }
      > = {};
      for (const li of lineItems) {
        const cat = productMap.get(li.outputProductId)?.category || "OTHER";
        if (!categoryBreakdown[cat])
          categoryBreakdown[cat] = { produced: 0, packed: 0 };
        categoryBreakdown[cat].produced += parseFloat(li.outputQty);
      }
      for (const p of packs) {
        const cat = productMap.get(p.productId)?.category || "OTHER";
        if (!categoryBreakdown[cat])
          categoryBreakdown[cat] = { produced: 0, packed: 0 };
        categoryBreakdown[cat].packed += parseFloat(p.qty);
      }
      res.json({
        dateFrom: df,
        dateTo: dt,
        milkIn,
        receivingLoss,
        productionInputUsed,
        productionOutput,
        productionLoss,
        totalPacked,
        packingLoss,
        totalLoss: receivingLoss + productionLoss + packingLoss,
        lossPercent:
          milkIn > 0
            ? ((receivingLoss + productionLoss + packingLoss) / milkIn) * 100
            : 0,
        categoryBreakdown,
      });
    },
  );

  // --- DAILY SUMMARY ---
  app.get("/api/reports/daily-summary", requireAdmin, async (req, res) => {
    const date =
      (req.query.date as string) || new Date().toISOString().split("T")[0];
    const allProducts = await storage.getProducts();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const rawMilkIds = new Set(
      allProducts.filter((p) => p.category === "RAW_MILK").map((p) => p.id),
    );
    const [intakes, lineItems, packs, batches, lock, notifications] =
      await Promise.all([
        storage.getDailyIntakes(date, date),
        storage.getAllLineItems(date, date),
        storage.getPackouts(date, date),
        storage.getProductionBatches(date, date),
        storage.getDailyLock(date),
        storage.getAdminNotifications(),
      ]);
    const dayNotifications = notifications.filter(
      (n) => new Date(n.createdAt).toISOString().split("T")[0] === date,
    );
    const totalIntake = intakes
      .filter((i) => rawMilkIds.has(i.productId))
      .reduce((s, i) => s + parseFloat(i.qty), 0);
    const totalProduced = lineItems.reduce(
      (s, l) => s + parseFloat(l.outputQty),
      0,
    );
    const totalPacked = packs.reduce((s, p) => s + parseFloat(p.qty), 0);
    const unreviewedItems =
      lineItems.filter((l) => !l.reviewedAt).length +
      packs.filter((p) => !p.reviewedAt).length +
      intakes.filter((i) => !i.reviewedAt).length;
    const productionByCategory: Record<string, { qty: number; items: number }> =
      {};
    for (const li of lineItems) {
      const cat = productMap.get(li.outputProductId)?.category || "OTHER";
      if (!productionByCategory[cat])
        productionByCategory[cat] = { qty: 0, items: 0 };
      productionByCategory[cat].qty += parseFloat(li.outputQty);
      productionByCategory[cat].items++;
    }
    res.json({
      date,
      isLocked: !!lock,
      totalIntake,
      totalProduced,
      totalPacked,
      batchCount: batches.length,
      unreviewedItems,
      alerts: dayNotifications.length,
      alertDetails: dayNotifications.map((n) => ({
        type: n.type,
        title: n.title,
        message: n.message,
        severity: n.severity,
      })),
      productionByCategory,
      intakeDetails: intakes.map((i) => ({
        supplier: i.supplierId,
        product: productMap.get(i.productId)?.name || "Unknown",
        qty: parseFloat(i.qty),
        deliveredQty: i.deliveredQty ? parseFloat(i.deliveredQty) : null,
        acceptedQty: i.acceptedQty ? parseFloat(i.acceptedQty) : null,
      })),
      packoutDetails: packs.map((p) => ({
        product: productMap.get(p.productId)?.name || "Unknown",
        qty: parseFloat(p.qty),
        packSize: p.packSizeLabel,
      })),
    });
  });

  // --- USER MANAGEMENT ---
  app.post("/api/users", requireAdmin, async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    const existing = await storage.getUserByEmail(email);
    if (existing)
      return res.status(409).json({ message: "Email already in use" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
      name,
      email,
      passwordHash,
      role: role || "DATA_ENTRY",
      active: true,
    });
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    });
  });
  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const updates: any = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.role) updates.role = req.body.role;
    if (typeof req.body.active === "boolean") updates.active = req.body.active;
    const updated = await storage.updateUser(id, updates);
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      active: updated.active,
    });
  });
  app.post("/api/users/:id/reset-password", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await storage.updateUser(id, { passwordHash });
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Password reset successfully" });
  });

  // --- AUDIT LOG SEARCH ---
  app.get("/api/events/search", requireAdmin, async (req, res) => {
    const {
      entityType,
      action,
      userId,
      dateFrom,
      dateTo,
      limit: limitStr,
    } = req.query;
    const limit = limitStr ? parseInt(limitStr as string) : 100;
    let allEvents = await storage.getEvents(500);
    if (entityType)
      allEvents = allEvents.filter((e) => e.entityType === entityType);
    if (action) allEvents = allEvents.filter((e) => e.action === action);
    if (userId)
      allEvents = allEvents.filter(
        (e) => e.actorUserId === parseInt(userId as string),
      );
    if (dateFrom)
      allEvents = allEvents.filter(
        (e) => new Date(e.timestamp) >= new Date(dateFrom as string),
      );
    if (dateTo) {
      const dt = new Date(dateTo as string);
      dt.setDate(dt.getDate() + 1);
      allEvents = allEvents.filter((e) => new Date(e.timestamp) < dt);
    }
    const usersList = await storage.getUsers();
    const userMap = new Map(usersList.map((u) => [u.id, u.name]));
    res.json(
      allEvents.slice(0, limit).map((e) => ({
        ...e,
        actorName: userMap.get(e.actorUserId) || "Unknown",
      })),
    );
  });

  // --- SUPPLIER SCORECARD ---
  app.get("/api/reports/supplier-scorecard", requireAdmin, async (req, res) => {
    const suppliersList = await storage.getSuppliers();
    const allIntakesForScorecard = await storage.getDailyIntakes();
    const scorecards = suppliersList.map((s) => {
      const deliveries = allIntakesForScorecard.filter(
        (i) => i.supplierId === s.id,
      );
      const totalDeliveries = deliveries.length;
      const totalQty = deliveries.reduce(
        (sum, d) => sum + parseFloat(d.qty),
        0,
      );
      let totalDeliveredQty = 0,
        totalAcceptedQty = 0,
        deliveriesWithLoss = 0;
      for (const d of deliveries) {
        if (d.deliveredQty) totalDeliveredQty += parseFloat(d.deliveredQty);
        if (d.acceptedQty) totalAcceptedQty += parseFloat(d.acceptedQty);
        if (
          d.deliveredQty &&
          d.acceptedQty &&
          parseFloat(d.deliveredQty) > parseFloat(d.acceptedQty)
        )
          deliveriesWithLoss++;
      }
      return {
        id: s.id,
        name: s.name,
        active: s.active,
        totalDeliveries,
        totalQty,
        avgDeliveryQty: totalDeliveries > 0 ? totalQty / totalDeliveries : 0,
        receivingLossPercent:
          totalDeliveredQty > 0
            ? ((totalDeliveredQty - totalAcceptedQty) / totalDeliveredQty) * 100
            : 0,
        lossFrequencyPercent:
          totalDeliveries > 0
            ? (deliveriesWithLoss / totalDeliveries) * 100
            : 0,
        deliveryDays: new Set(deliveries.map((d) => d.date)).size,
      };
    });
    res.json(scorecards);
  });

  // --- YIELD TRENDS ---
  app.get("/api/reports/yield-trends", requireAdmin, async (req, res) => {
    const allLineItemsForTrends = await storage.getAllLineItems();
    const allFormulas = await storage.getFormulas();
    const allProducts = await storage.getProducts();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const weeklyData: Record<
      string,
      Record<number, { totalInput: number; totalOutput: number; count: number }>
    > = {};
    for (const li of allLineItemsForTrends) {
      if (li.operationType !== "CONVERT" || !li.inputQty || !li.formulaId)
        continue;
      const date = new Date(li.batchDate);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      if (!weeklyData[weekKey]) weeklyData[weekKey] = {};
      if (!weeklyData[weekKey][li.formulaId])
        weeklyData[weekKey][li.formulaId] = {
          totalInput: 0,
          totalOutput: 0,
          count: 0,
        };
      weeklyData[weekKey][li.formulaId].totalInput += parseFloat(li.inputQty);
      weeklyData[weekKey][li.formulaId].totalOutput += parseFloat(li.outputQty);
      weeklyData[weekKey][li.formulaId].count++;
    }
    const trends = allFormulas
      .filter((f) => f.type === "CONVERSION" && f.active)
      .map((f) => {
        const outputProduct = productMap.get(f.outputProductId);
        const weeks = Object.entries(weeklyData)
          .filter(([_, data]) => data[f.id])
          .map(([week, data]) => {
            const d = data[f.id];
            return {
              week,
              yieldPercent:
                d.totalInput > 0 ? (d.totalOutput / d.totalInput) * 100 : 0,
              batchCount: d.count,
              totalInput: d.totalInput,
              totalOutput: d.totalOutput,
            };
          })
          .sort((a, b) => a.week.localeCompare(b.week));
        return {
          formulaId: f.id,
          formulaName: f.name,
          outputProduct: outputProduct?.name || "Unknown",
          weeks,
        };
      })
      .filter((t) => t.weeks.length > 0);
    res.json(trends);
  });

  // --- ACTIVITY LOG ---
  app.get("/api/reports/activity-log", requireAdmin, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const df = (dateFrom as string) || new Date().toISOString().split("T")[0];
    const dt = (dateTo as string) || new Date().toISOString().split("T")[0];
    const [allUsers, intakes, lineItems, packoutsForLog, eventsForLog] =
      await Promise.all([
        storage.getUsers(),
        storage.getDailyIntakes(df, dt),
        storage.getAllLineItems(df, dt),
        storage.getPackouts(df, dt),
        storage.getEvents(1000),
      ]);
    const filteredEvents = eventsForLog.filter((e) => {
      const eDate = new Date(e.timestamp).toISOString().split("T")[0];
      return eDate >= df && eDate <= dt;
    });
    res.json(
      allUsers.map((u) => {
        const userEvents = filteredEvents.filter((e) => e.actorUserId === u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          intakesCreated: intakes.filter((i) => i.createdByUserId === u.id)
            .length,
          batchesCreated: lineItems.filter((l) => l.createdByUserId === u.id)
            .length,
          packoutsCreated: packoutsForLog.filter(
            (p) => p.createdByUserId === u.id,
          ).length,
          totalRecords:
            intakes.filter((i) => i.createdByUserId === u.id).length +
            lineItems.filter((l) => l.createdByUserId === u.id).length +
            packoutsForLog.filter((p) => p.createdByUserId === u.id).length,
          totalEvents: userEvents.length,
          lastActivity: userEvents.length > 0 ? userEvents[0].timestamp : null,
        };
      }),
    );
  });

  // --- PHOTO UPLOAD ---
  app.post(
    "/api/production/batches/:id/photo",
    requireAuth,
    async (req, res) => {
      const id = parseInt(req.params.id);
      const batch = await storage.getProductionBatch(id);
      if (!batch) return res.status(404).json({ message: "Batch not found" });
      const { photoData } = req.body;
      if (!photoData)
        return res.status(400).json({ message: "No photo data provided" });
      const fs = await import("fs");
      const path = await import("path");
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir))
        fs.mkdirSync(uploadsDir, { recursive: true });
      const fileName = `batch-${id}-${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(
        filePath,
        photoData.replace(/^data:image\/\w+;base64,/, ""),
        "base64",
      );
      await storage.updateProductionBatch(id, {
        photoUrl: `/uploads/${fileName}`,
      });
      res.json({ photoUrl: `/uploads/${fileName}` });
    },
  );

  // --- BATCH TEMPLATES ---
  app.get("/api/production/templates", requireAuth, async (req, res) => {
    const targetDate =
      (req.query.date as string) ||
      new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const lineItems = await storage.getAllLineItems(targetDate, targetDate);
    const allProducts = await storage.getProducts();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    res.json(
      lineItems.map((li) => ({
        outputProductId: li.outputProductId,
        outputProductName:
          productMap.get(li.outputProductId)?.name || "Unknown",
        outputQty: li.outputQty,
        inputProductId: li.inputProductId,
        inputProductName: li.inputProductId
          ? productMap.get(li.inputProductId)?.name || "Unknown"
          : null,
        operationType: li.operationType,
        formulaId: li.formulaId,
        batchCode: li.batchCode,
      })),
    );
  });

  // --- STATIC UPLOADS ---
  const expressModule = await import("express");
  const pathModule = await import("path");
  app.use(
    "/uploads",
    expressModule.default.static(pathModule.join(process.cwd(), "uploads")),
  );

  return httpServer;
}
