import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin } from "./auth";
import { seed } from "./seed";
import passport from "passport";
import bcrypt from "bcryptjs";
import { z } from "zod";

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
    const l = await storage.createLineItem({
      ...req.body,
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
      metadataJson: null,
    });
    res.status(201).json(l);
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

  // --- CHANGE REQUESTS ---
  app.get("/api/change-requests", requireAuth, async (req, res) => {
    const { status } = req.query;
    const list = await storage.getChangeRequests(status as string);
    res.json(list);
  });

  app.post("/api/change-requests", requireAuth, async (req, res) => {
    const cr = await storage.createChangeRequest({
      ...req.body,
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
      reason: null,
      metadataJson: null,
    });
    res.status(201).json(cr);
  });

  app.patch("/api/change-requests/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status, adminComment } = req.body;
    const cr = await storage.updateChangeRequestStatus(id, status, req.user!.id, adminComment);
    if (!cr) return res.status(404).json({ message: "Not found" });

    await storage.createEvent({
      actorUserId: req.user!.id,
      entityType: "change_request",
      entityId: id,
      action: status === "APPROVED" ? "APPROVE" : "REJECT",
      ipAddress: req.ip || null,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(cr),
      reason: adminComment || null,
      metadataJson: null,
    });
    res.json(cr);
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

  return httpServer;
}
