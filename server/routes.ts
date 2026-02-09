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
  outputProductId: number
): Promise<{ inputQty: string; inputProductId: number; autoFilled: boolean } | null> {
  if (!formulaId) {
    const formulas = await storage.getFormulasByOutputProduct(outputProductId);
    const activeConversion = formulas.find(f => f.type === "CONVERSION" && f.active);
    if (!activeConversion) return null;
    formulaId = activeConversion.id;
  }
  const formula = await storage.getFormula(formulaId);
  if (!formula || formula.type !== "CONVERSION") return null;
  const conversion = await storage.getConversionByFormulaId(formulaId);
  if (!conversion) return null;
  const outQ = parseFloat(outputQty);
  if (isNaN(outQ) || outQ <= 0) return null;

  // For UNIT output products with pack size, convert units to volume first
  const allProducts = await storage.getProducts();
  const outputProduct = allProducts.find(p => p.id === outputProductId);
  let effectiveOutputQty = outQ;
  if (outputProduct && outputProduct.unitType === "UNIT" && outputProduct.packSizeQty) {
    effectiveOutputQty = outQ * parseFloat(outputProduct.packSizeQty);
  }

  const ratio = parseFloat(conversion.ratioNumerator) / parseFloat(conversion.ratioDenominator);
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
  const productMap = new Map(allProducts.map(p => [p.id, p]));

  for (const li of allLineItems) {
    if (li.operationType !== "CONVERT") continue;
    const hasInputQty = li.inputQty && parseFloat(li.inputQty) > 0;
    if (!hasInputQty) {
      const outputProduct = productMap.get(li.outputProductId);
      const inputProduct = li.inputProductId ? productMap.get(li.inputProductId) : null;
      gaps.push({
        lineItemId: li.id,
        batchCode: li.batchCode,
        batchDate: li.batchDate,
        outputProductName: outputProduct?.name || `Product #${li.outputProductId}`,
        inputProductName: inputProduct?.name || "Unknown",
        outputQty: li.outputQty,
        issue: "CONVERSION operation with no input quantity recorded",
      });
    }
  }
  return gaps;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  await seed();

  // --- AUTH ---
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
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
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json({ user: req.user });
  });

  // --- USERS (admin) ---
  app.get("/api/users", requireAdmin, async (_req, res) => {
    const list = await storage.getUsers();
    res.json(list.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
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

  // --- FORMULAS (with details) ---
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
      })
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
          await storage.createBlendComponent({
            formulaId: f.id,
            ...comp,
          });
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
      if (formulaUpdates.name !== undefined) allowedUpdates.name = formulaUpdates.name;
      if (formulaUpdates.outputProductId !== undefined) allowedUpdates.outputProductId = formulaUpdates.outputProductId;
      if (formulaUpdates.active !== undefined) allowedUpdates.active = formulaUpdates.active;

      if (Object.keys(allowedUpdates).length > 0) {
        await storage.updateFormula(id, allowedUpdates);
      }

      if (existing.type === "CONVERSION" && conversion) {
        const convUpdates: any = {};
        if (conversion.inputProductId !== undefined) convUpdates.inputProductId = conversion.inputProductId;
        if (conversion.ratioNumerator !== undefined) convUpdates.ratioNumerator = conversion.ratioNumerator;
        if (conversion.ratioDenominator !== undefined) convUpdates.ratioDenominator = conversion.ratioDenominator;
        if (Object.keys(convUpdates).length > 0) {
          await storage.updateConversionFormula(id, convUpdates);
        }
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
    const list = await storage.getDailyIntakes(dateFrom as string, dateTo as string);
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
    const list = await storage.getProductionBatches(dateFrom as string, dateTo as string);
    res.json(list);
  });

  app.post("/api/production/batches", requireAuth, async (req, res) => {
    const b = await storage.createProductionBatch({
      ...req.body,
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
    const list = await storage.getAllLineItems(dateFrom as string, dateTo as string);
    res.json(list);
  });

  app.get("/api/production/batches/:batchId/items", requireAuth, async (req, res) => {
    const batchId = parseInt(req.params.batchId);
    const items = await storage.getLineItemsByBatch(batchId);
    res.json(items);
  });

  app.post("/api/production/line-items", requireAuth, async (req, res) => {
    const body = { ...req.body };
    let inputAutoFilled = false;

    if (body.operationType === "CONVERT" && (!body.inputQty || body.inputQty === "")) {
      const computed = await computeConversionInputQty(body.formulaId, body.outputQty, body.outputProductId);
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
      metadataJson: inputAutoFilled ? JSON.stringify({ inputQtyAutoFilled: true }) : null,
    });
    res.status(201).json({ ...l, inputQtyAutoFilled: inputAutoFilled });
  });

  app.put("/api/production/line-items/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getLineItem(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const { outputQty, inputQty, outputProductId, inputProductId, formulaId, operationType } = req.body;
    const updates: any = {};
    if (outputQty !== undefined) updates.outputQty = outputQty;
    if (inputQty !== undefined) updates.inputQty = inputQty;
    if (outputProductId !== undefined) updates.outputProductId = outputProductId;
    if (inputProductId !== undefined) updates.inputProductId = inputProductId;
    if (formulaId !== undefined) updates.formulaId = formulaId;
    if (operationType !== undefined) updates.operationType = operationType;

    let inputAutoFilled = false;
    const effectiveOpType = operationType || existing.operationType;
    if (effectiveOpType === "CONVERT" && (!updates.inputQty || updates.inputQty === "" || updates.inputQty === null)) {
      const effectiveOutputQty = updates.outputQty || existing.outputQty;
      const effectiveOutputProductId = updates.outputProductId || existing.outputProductId;
      const effectiveFormulaId = updates.formulaId !== undefined ? updates.formulaId : existing.formulaId;
      const computed = await computeConversionInputQty(effectiveFormulaId, effectiveOutputQty, effectiveOutputProductId);
      if (computed) {
        updates.inputQty = computed.inputQty;
        if (!updates.inputProductId) updates.inputProductId = computed.inputProductId;
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
      metadataJson: inputAutoFilled ? JSON.stringify({ inputQtyAutoFilled: true }) : null,
    });
    res.json({ ...updated, inputQtyAutoFilled: inputAutoFilled });
  });

  app.delete("/api/production/line-items/:id", requireAdmin, async (req, res) => {
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
  });

  // --- BLEND ACTUAL USAGE ---
  app.get("/api/production/line-items/:id/blend-usage", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const usage = await storage.getBlendActualUsageByLineItem(id);
    res.json(usage);
  });

  app.post("/api/production/line-items/:id/blend-usage", requireAuth, async (req, res) => {
    const lineItemId = parseInt(req.params.id);
    const { components } = req.body;
    if (!Array.isArray(components)) return res.status(400).json({ error: "components array required" });

    const existingUsage = await storage.getBlendActualUsageByLineItem(lineItemId);
    if (existingUsage.length > 0 && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "DATA_ENTRY cannot update existing blend usage. Submit a change request instead." });
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
  });

  // --- PACKOUTS ---
  app.get("/api/packouts", requireAuth, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const list = await storage.getPackouts(dateFrom as string, dateTo as string);
    res.json(list);
  });

  app.post("/api/packouts", requireAuth, async (req, res) => {
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
    const { qty, productId, date, packSizeLabel, sourceProductId, sourceQtyUsed } = req.body;
    const updates: any = {};
    if (qty !== undefined) updates.qty = qty;
    if (productId !== undefined) updates.productId = productId;
    if (date !== undefined) updates.date = date;
    if (packSizeLabel !== undefined) updates.packSizeLabel = packSizeLabel;
    if (sourceProductId !== undefined) updates.sourceProductId = sourceProductId;
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
    const { qty, productId, supplierId, date, deliveredQty, acceptedQty } = req.body;
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
    const list = await storage.getChangeRequestsByUser(req.user!.id, status as string);
    res.json(list);
  });

  app.post("/api/change-requests", requireAuth, async (req, res) => {
    const { entityType, entityId, fieldName, proposedValue, currentValue, reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Reason for change is required" });
    }
    if (!entityType || !entityId || !fieldName || proposedValue === undefined) {
      return res.status(400).json({ message: "entityType, entityId, fieldName, and proposedValue are required" });
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
      if (!entity) return res.status(404).json({ message: `${entityType} #${entityId} not found` });
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
      metadataJson: JSON.stringify({ targetEntityType: cr.entityType, targetEntityId: cr.entityId }),
    });
    res.status(201).json(cr);
  });

  app.patch("/api/change-requests/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status, adminComment } = req.body;

    const existing = await storage.getChangeRequest(id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    if (existing.status !== "PENDING") return res.status(400).json({ message: "Change request already processed" });

    if (status === "APPROVED") {
      const entityUpdaters: Record<string, (eId: number, field: string, value: string) => Promise<{ old: any; updated: any } | null>> = {
        daily_intake: async (eId, field, value) => {
          const old = await storage.getDailyIntake(eId);
          if (!old) return null;
          const updated = await storage.updateDailyIntake(eId, { [field]: value });
          return { old, updated };
        },
        production_batch: async (eId, field, value) => {
          const old = await storage.getProductionBatch(eId);
          if (!old) return null;
          const updated = await storage.updateProductionBatch(eId, { [field]: value });
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
          const updated = await storage.updateBlendActualUsage(eId, { [field]: value });
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
          const updated = await storage.updateYieldTolerance(eId, { [field]: value });
          return { old, updated };
        },
      };

      const updater = entityUpdaters[existing.entityType];
      if (updater) {
        const result = await updater(existing.entityId, existing.fieldName, existing.proposedValue);
        if (!result) return res.status(404).json({ message: `${existing.entityType} #${existing.entityId} no longer exists` });

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
          reason: `Approved change request #${id}` + (adminComment ? `: ${adminComment}` : ""),
          metadataJson: JSON.stringify({ changeRequestId: id }),
        });
      }

      const cr = await storage.updateChangeRequestStatus(id, "APPROVED", req.user!.id, adminComment);

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
      const cr = await storage.updateChangeRequestStatus(id, "REJECTED", req.user!.id, adminComment);

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
        metadataJson: JSON.stringify({ rejectionReason: adminComment, originalEntityType: existing.entityType, originalEntityId: existing.entityId }),
      });

      return res.json(cr);
    }

    res.status(400).json({ message: "Invalid status. Must be APPROVED or REJECTED" });
  });

  // --- AUDIT LOG ---
  app.get("/api/events", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const list = await storage.getEvents(limit);
    res.json(list);
  });

  // --- REPORTS ---
  app.get("/api/reports/mass-balance", requireAuth, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const lineItems = await storage.getAllLineItems(dateFrom as string, dateTo as string);
    const allPackouts = await storage.getPackouts(dateFrom as string, dateTo as string);
    const allProducts = await storage.getProducts();
    const allFormulas = await storage.getFormulas();

    const balance = allProducts.map(prod => {
      const produced = lineItems
        .filter(li => li.outputProductId === prod.id)
        .reduce((acc, li) => acc + parseFloat(li.outputQty), 0);

      const consumed = lineItems
        .filter(li => li.inputProductId === prod.id)
        .reduce((acc, li) => acc + parseFloat(li.inputQty || "0"), 0);

      const packed = allPackouts
        .filter(pk => pk.productId === prod.id)
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
    }).filter(p => p.produced > 0 || p.consumed > 0 || p.packed > 0);

    res.json(balance);
  });

  app.get("/api/reports/variance", requireAuth, async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const lineItems = await storage.getAllLineItems(dateFrom as string, dateTo as string);
    const allFormulas = await storage.getFormulas();
    const allProducts = await storage.getProducts();

    const varianceData = await Promise.all(
      lineItems
        .filter(li => li.formulaId && li.inputQty)
        .map(async (li) => {
          let expectedInput = 0;
          if (li.formulaId) {
            const formula = allFormulas.find(f => f.id === li.formulaId);
            if (formula?.type === "CONVERSION") {
              const conv = await storage.getConversionByFormulaId(formula.id);
              if (conv) {
                const ratio = parseFloat(conv.ratioNumerator) / parseFloat(conv.ratioDenominator);
                expectedInput = parseFloat(li.outputQty) * ratio;
              }
            }
          }
          const actualInput = parseFloat(li.inputQty || "0");
          const variance = expectedInput > 0 ? ((actualInput - expectedInput) / expectedInput) * 100 : 0;

          return {
            lineItemId: li.id,
            batchCode: li.batchCode,
            batchDate: li.batchDate,
            outputProduct: allProducts.find(p => p.id === li.outputProductId)?.name || "",
            inputProduct: allProducts.find(p => p.id === li.inputProductId)?.name || "",
            expectedInput,
            actualInput,
            outputQty: parseFloat(li.outputQty),
            variancePercent: variance,
            varianceQty: actualInput - expectedInput,
          };
        })
    );

    res.json(varianceData);
  });

  app.get("/api/reports/daily-milk-balance", requireAuth, async (req, res) => {
    const allProducts = await storage.getProducts();
    const rawMilkProducts = allProducts.filter(p => p.category === "RAW_MILK");
    const rawMilkIds = new Set(rawMilkProducts.map(p => p.id));

    const allIntakes = await storage.getDailyIntakes();
    const allLineItems = await storage.getAllLineItems();

    const rawIntakes = allIntakes.filter(i => rawMilkIds.has(i.productId));
    const rawUsage = allLineItems.filter(li => li.inputProductId && rawMilkIds.has(li.inputProductId));

    const dateSet = new Set<string>();
    rawIntakes.forEach(i => dateSet.add(i.date));
    rawUsage.forEach(li => dateSet.add(li.batchDate));

    const dates = Array.from(dateSet).sort();

    let runningStock = 0;
    const rows = dates.map(date => {
      const intake = rawIntakes
        .filter(i => i.date === date)
        .reduce((acc, i) => acc + parseFloat(i.qty), 0);

      const used = rawUsage
        .filter(li => li.batchDate === date)
        .reduce((acc, li) => acc + parseFloat(li.inputQty || "0"), 0);

      const produced = allLineItems
        .filter(li => li.batchDate === date && li.outputProductId && rawMilkIds.has(li.inputProductId!))
        .reduce((acc, li) => acc + parseFloat(li.outputQty), 0);

      const difference = intake - used;
      runningStock += difference;

      const flag = used > intake ? "OVER_USE" : Math.abs(difference) > intake * 0.15 && intake > 0 ? "HIGH_VARIANCE" : "OK";

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
    const productMap = new Map(allProducts.map(p => [p.id, p]));

    const intakes = await storage.getDailyIntakes(dateFrom as string, dateTo as string);
    const lineItems = await storage.getAllLineItems(dateFrom as string, dateTo as string);
    const allPackouts = await storage.getPackouts(dateFrom as string, dateTo as string);
    const allFormulas = await storage.getFormulas();

    const receivingLosses: any[] = [];
    for (const intake of intakes) {
      const delivered = intake.deliveredQty ? parseFloat(intake.deliveredQty) : null;
      const accepted = intake.acceptedQty ? parseFloat(intake.acceptedQty) : parseFloat(intake.qty);
      if (delivered !== null && delivered > 0) {
        const loss = delivered - accepted;
        if (Math.abs(loss) > 0.001) {
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
    }

    const fillingProcessLosses: any[] = [];
    for (const po of allPackouts) {
      if (po.sourceProductId && po.sourceQtyUsed) {
        const sourceUsed = parseFloat(po.sourceQtyUsed);
        const packed = parseFloat(po.qty);
        const loss = sourceUsed - packed;
        if (Math.abs(loss) > 0.001) {
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
    }

    const drainingLosses: any[] = [];
    for (const li of lineItems) {
      if (li.operationType === "CONVERT" && li.inputQty && li.formulaId) {
        const formula = allFormulas.find(f => f.id === li.formulaId);
        if (formula?.type === "CONVERSION") {
          const conv = await storage.getConversionByFormulaId(formula.id);
          if (conv) {
            const ratio = parseFloat(conv.ratioNumerator) / parseFloat(conv.ratioDenominator);
            const inputQty = parseFloat(li.inputQty);
            const outputQty = parseFloat(li.outputQty);
            const expectedOutput = inputQty / ratio;
            const loss = inputQty - outputQty;
            if (Math.abs(loss) > 0.001) {
              drainingLosses.push({
                id: li.id,
                date: li.batchDate,
                batchCode: li.batchCode,
                inputProductId: li.inputProductId,
                inputProductName: productMap.get(li.inputProductId!)?.name || "",
                outputProductId: li.outputProductId,
                outputProductName: productMap.get(li.outputProductId!)?.name || "",
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
    }

    const packingMixingLosses: any[] = [];
    for (const li of lineItems) {
      if (li.operationType === "BLEND" && li.formulaId) {
        const usage = await storage.getBlendActualUsageByLineItem(li.id);
        if (usage.length > 0) {
          const totalExpected = usage.reduce((s, u) => s + (u.expectedQty ? parseFloat(u.expectedQty) : 0), 0);
          const totalActual = usage.reduce((s, u) => s + parseFloat(u.actualQty), 0);
          const loss = totalActual - totalExpected;
          const components = usage.map(u => ({
            componentProductId: u.componentProductId,
            componentName: productMap.get(u.componentProductId)?.name || "",
            expected: u.expectedQty ? parseFloat(u.expectedQty) : 0,
            actual: parseFloat(u.actualQty),
            variance: parseFloat(u.actualQty) - (u.expectedQty ? parseFloat(u.expectedQty) : 0),
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
      totalLoss: summary.receiving + summary.fillingProcess + summary.draining + summary.packingMixing,
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
    const rawMilkProducts = allProducts.filter(p => p.category === "RAW_MILK");
    const yogurtBaseProducts = allProducts.filter(p => p.name.toUpperCase().includes("YOGURT BASE"));
    const rawMilkIds = new Set(rawMilkProducts.map(p => p.id));
    const yogurtBaseIds = new Set(yogurtBaseProducts.map(p => p.id));

    const allIntakes = await storage.getDailyIntakes(dateFrom as string, dateTo as string);
    const allLineItems = await storage.getAllLineItems(dateFrom as string, dateTo as string);
    const allPackouts = await storage.getPackouts(dateFrom as string, dateTo as string);

    const rawMilkDateSet = new Set<string>();
    allIntakes.filter(i => rawMilkIds.has(i.productId)).forEach(i => rawMilkDateSet.add(i.date));
    allLineItems.filter(li => li.inputProductId && rawMilkIds.has(li.inputProductId)).forEach(li => rawMilkDateSet.add(li.batchDate));
    const rawMilkDates = Array.from(rawMilkDateSet).sort();

    let rawMilkRunningStock = 0;
    const rawMilkRows = rawMilkDates.map(date => {
      const received = allIntakes
        .filter(i => i.date === date && rawMilkIds.has(i.productId))
        .reduce((acc, i) => acc + parseFloat(i.qty), 0);
      const usedInProduction = allLineItems
        .filter(li => li.batchDate === date && li.inputProductId && rawMilkIds.has(li.inputProductId))
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
    allLineItems.filter(li => li.outputProductId && yogurtBaseIds.has(li.outputProductId)).forEach(li => yogurtBaseDateSet.add(li.batchDate));
    allLineItems.filter(li => li.inputProductId && yogurtBaseIds.has(li.inputProductId)).forEach(li => yogurtBaseDateSet.add(li.batchDate));
    allPackouts.filter(po => yogurtBaseIds.has(po.productId)).forEach(po => yogurtBaseDateSet.add(po.date));
    const yogurtBaseDates = Array.from(yogurtBaseDateSet).sort();

    let yogurtBaseRunningStock = 0;
    const yogurtBaseRows = yogurtBaseDates.map(date => {
      const produced = allLineItems
        .filter(li => li.batchDate === date && li.outputProductId && yogurtBaseIds.has(li.outputProductId))
        .reduce((acc, li) => acc + parseFloat(li.outputQty), 0);
      const usedInProduction = allLineItems
        .filter(li => li.batchDate === date && li.inputProductId && yogurtBaseIds.has(li.inputProductId))
        .reduce((acc, li) => acc + parseFloat(li.inputQty || "0"), 0);
      const packedOut = allPackouts
        .filter(po => po.date === date && yogurtBaseIds.has(po.productId))
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
      rawMilk: {
        productIds: Array.from(rawMilkIds),
        rows: rawMilkRows,
      },
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
    if (!date) return res.status(400).json({ message: "date query parameter is required" });

    const dateStr = date as string;
    const allProducts = await storage.getProducts();
    const productMap = new Map(allProducts.map(p => [p.id, p]));

    const allLineItems = await storage.getAllLineItems(dateStr, dateStr);
    const dayLineItems = allLineItems.filter(li => li.batchDate === dateStr);

    const allIntakes = await storage.getDailyIntakes(dateStr, dateStr);
    const rawMilkProducts = allProducts.filter(p => p.category === "RAW_MILK");
    const rawMilkIds = new Set(rawMilkProducts.map(p => p.id));

    const totalRawMilkReceived = allIntakes
      .filter(i => i.date === dateStr && rawMilkIds.has(i.productId))
      .reduce((acc, i) => acc + parseFloat(i.qty), 0);

    const categoryBuckets = new Map<string, { totalInputUsed: number; lineItems: any[] }>();
    for (const li of dayLineItems) {
      const outputProduct = productMap.get(li.outputProductId);
      if (!outputProduct) continue;
      const category = outputProduct.category;
      if (!categoryBuckets.has(category)) {
        categoryBuckets.set(category, { totalInputUsed: 0, lineItems: [] });
      }
      const bucket = categoryBuckets.get(category)!;
      const inputQty = parseFloat(li.inputQty || "0");
      bucket.totalInputUsed += inputQty;
      bucket.lineItems.push({
        lineItemId: li.id,
        outputProductName: outputProduct.name,
        inputProductName: li.inputProductId ? (productMap.get(li.inputProductId)?.name || "") : "",
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

    const allocations = Array.from(categoryBuckets.entries()).map(([category, bucket]) => ({
      category,
      categoryLabel: categoryLabels[category] || category,
      totalInputUsed: Math.round(bucket.totalInputUsed * 100) / 100,
      lineItems: bucket.lineItems,
    }));

    const dataGaps = await findDataGaps(dateStr, dateStr);
    res.json({
      date: dateStr,
      totalRawMilkReceived: Math.round(totalRawMilkReceived * 100) / 100,
      allocations,
      dataGaps,
    });
  });

  return httpServer;
}
