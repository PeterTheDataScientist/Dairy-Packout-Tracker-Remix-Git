import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import {
  users, type User, type InsertUser,
  suppliers, type Supplier, type InsertSupplier,
  products, type Product, type InsertProduct,
  formulas, type Formula, type InsertFormula,
  conversionFormulas, type ConversionFormula, type InsertConversionFormula,
  blendComponents, type BlendComponent, type InsertBlendComponent,
  dailyIntakes, type DailyIntake, type InsertDailyIntake,
  productionBatches, type ProductionBatch, type InsertProductionBatch,
  productionLineItems, type ProductionLineItem, type InsertProductionLineItem,
  packouts, type Packout, type InsertPackout,
  events, type Event, type InsertEvent,
  changeRequests, type ChangeRequest, type InsertChangeRequest,
  blendActualUsage, type BlendActualUsage, type InsertBlendActualUsage,
  yieldTolerances,
  lossThresholds, type LossThreshold, type InsertLossThreshold,
  carryForwardRequests, type CarryForwardRequest, type InsertCarryForwardRequest,
  dailyLocks, type DailyLock, type InsertDailyLock,
  adminNotifications, type AdminNotification, type InsertAdminNotification,
  customUnits, type CustomUnit, type InsertCustomUnit,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(s: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, s: Partial<InsertSupplier>): Promise<Supplier | undefined>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(p: InsertProduct): Promise<Product>;
  updateProduct(id: number, p: Partial<InsertProduct>): Promise<Product | undefined>;

  // Formulas
  getFormulas(): Promise<Formula[]>;
  getFormula(id: number): Promise<Formula | undefined>;
  createFormula(f: InsertFormula): Promise<Formula>;
  updateFormula(id: number, updates: Partial<InsertFormula>): Promise<Formula | undefined>;
  getFormulasByOutputProduct(productId: number): Promise<Formula[]>;

  // Conversion Formulas
  getConversionByFormulaId(formulaId: number): Promise<ConversionFormula | undefined>;
  createConversionFormula(c: InsertConversionFormula): Promise<ConversionFormula>;
  updateConversionFormula(formulaId: number, updates: { inputProductId?: number; ratioNumerator?: string; ratioDenominator?: string }): Promise<ConversionFormula | undefined>;

  // Blend Components
  getBlendComponentsByFormulaId(formulaId: number): Promise<BlendComponent[]>;
  createBlendComponent(b: InsertBlendComponent): Promise<BlendComponent>;
  deleteBlendComponentsByFormulaId(formulaId: number): Promise<void>;

  // Daily Intakes
  getDailyIntakes(dateFrom?: string, dateTo?: string): Promise<DailyIntake[]>;
  createDailyIntake(d: InsertDailyIntake): Promise<DailyIntake>;

  // Production Batches
  getProductionBatches(dateFrom?: string, dateTo?: string): Promise<ProductionBatch[]>;
  getProductionBatch(id: number): Promise<ProductionBatch | undefined>;
  createProductionBatch(b: InsertProductionBatch): Promise<ProductionBatch>;
  updateProductionBatch(id: number, updates: Partial<InsertProductionBatch>): Promise<ProductionBatch | undefined>;

  // Production Line Items
  getLineItemsByBatch(batchId: number): Promise<ProductionLineItem[]>;
  getLineItem(id: number): Promise<ProductionLineItem | undefined>;
  getAllLineItems(dateFrom?: string, dateTo?: string): Promise<(ProductionLineItem & { batchCode: string; batchDate: string })[]>;
  createLineItem(l: InsertProductionLineItem): Promise<ProductionLineItem>;
  updateLineItem(id: number, updates: Partial<InsertProductionLineItem>): Promise<ProductionLineItem | undefined>;
  deleteLineItem(id: number): Promise<boolean>;

  // Blend Actual Usage
  getBlendActualUsageByLineItem(lineItemId: number): Promise<BlendActualUsage[]>;
  getBlendActualUsageById(id: number): Promise<BlendActualUsage | undefined>;
  createBlendActualUsage(b: InsertBlendActualUsage): Promise<BlendActualUsage>;
  updateBlendActualUsage(id: number, updates: Partial<InsertBlendActualUsage>): Promise<BlendActualUsage | undefined>;
  deleteBlendActualUsageByLineItem(lineItemId: number): Promise<void>;

  // Packouts
  getPackouts(dateFrom?: string, dateTo?: string): Promise<Packout[]>;
  getPackout(id: number): Promise<Packout | undefined>;
  createPackout(p: InsertPackout): Promise<Packout>;
  updatePackout(id: number, updates: Partial<InsertPackout>): Promise<Packout | undefined>;
  deletePackout(id: number): Promise<boolean>;

  // Daily Intakes (update/delete)
  getDailyIntake(id: number): Promise<DailyIntake | undefined>;
  updateDailyIntake(id: number, updates: Partial<InsertDailyIntake>): Promise<DailyIntake | undefined>;
  deleteDailyIntake(id: number): Promise<boolean>;

  // Events (audit log)
  getEvents(limit?: number): Promise<Event[]>;
  createEvent(e: InsertEvent): Promise<Event>;

  // Change Requests
  getChangeRequests(status?: string): Promise<ChangeRequest[]>;
  getChangeRequestsByUser(userId: number, status?: string): Promise<ChangeRequest[]>;
  getChangeRequest(id: number): Promise<ChangeRequest | undefined>;
  createChangeRequest(c: InsertChangeRequest): Promise<ChangeRequest>;
  updateChangeRequestStatus(id: number, status: "APPROVED" | "REJECTED", adminId: number, comment?: string): Promise<ChangeRequest | undefined>;

  // Yield Tolerances
  getYieldTolerance(id: number): Promise<typeof yieldTolerances.$inferSelect | undefined>;
  updateYieldTolerance(id: number, updates: any): Promise<typeof yieldTolerances.$inferSelect | undefined>;

  // Admin Review
  adminReviewRecord(entityType: string, entityId: number, reviewedByUserId: number, adminNotes: string | null): Promise<void>;

  // Loss Thresholds
  getLossThresholds(): Promise<LossThreshold[]>;
  getLossThreshold(id: number): Promise<LossThreshold | undefined>;
  getLossThresholdByFormula(formulaId: number, stage: string): Promise<LossThreshold | undefined>;
  getGlobalLossThreshold(stage: string): Promise<LossThreshold | undefined>;
  createLossThreshold(t: InsertLossThreshold): Promise<LossThreshold>;
  updateLossThreshold(id: number, updates: Partial<InsertLossThreshold>): Promise<LossThreshold | undefined>;
  deleteLossThreshold(id: number): Promise<boolean>;

  // Carry Forward Requests
  getCarryForwardRequests(status?: string): Promise<CarryForwardRequest[]>;
  getCarryForwardRequest(id: number): Promise<CarryForwardRequest | undefined>;
  getCarryForwardByFromBatch(batchId: number): Promise<CarryForwardRequest | undefined>;
  createCarryForwardRequest(c: InsertCarryForwardRequest): Promise<CarryForwardRequest>;
  updateCarryForwardStatus(id: number, status: "APPROVED" | "REJECTED", reviewedByUserId: number, comment?: string): Promise<CarryForwardRequest | undefined>;

  // Daily Locks
  getDailyLocks(): Promise<DailyLock[]>;
  getDailyLock(date: string): Promise<DailyLock | undefined>;
  createDailyLock(l: InsertDailyLock): Promise<DailyLock>;
  deleteDailyLock(date: string): Promise<boolean>;

  // Admin Notifications
  getAdminNotifications(unreadOnly?: boolean): Promise<AdminNotification[]>;
  getAdminNotification(id: number): Promise<AdminNotification | undefined>;
  createAdminNotification(n: InsertAdminNotification): Promise<AdminNotification>;
  markNotificationRead(id: number): Promise<AdminNotification | undefined>;
  markAllNotificationsRead(): Promise<void>;
  getUnreadNotificationCount(): Promise<number>;

  // Custom Units
  getCustomUnits(): Promise<CustomUnit[]>;
  createCustomUnit(u: InsertCustomUnit): Promise<CustomUnit>;
  updateCustomUnit(id: number, updates: Partial<InsertCustomUnit>): Promise<CustomUnit | undefined>;
  deleteCustomUnit(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUsers() {
    return db.select().from(users);
  }

  // Suppliers
  async getSuppliers() {
    return db.select().from(suppliers);
  }

  async getSupplier(id: number) {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(s: InsertSupplier) {
    const [created] = await db.insert(suppliers).values(s).returning();
    return created;
  }

  async updateSupplier(id: number, s: Partial<InsertSupplier>) {
    const [updated] = await db.update(suppliers).set(s).where(eq(suppliers.id, id)).returning();
    return updated;
  }

  // Products
  async getProducts() {
    return db.select().from(products);
  }

  async getProduct(id: number) {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(p: InsertProduct) {
    const [created] = await db.insert(products).values(p).returning();
    return created;
  }

  async updateProduct(id: number, p: Partial<InsertProduct>) {
    const [updated] = await db.update(products).set(p).where(eq(products.id, id)).returning();
    return updated;
  }

  // Formulas
  async getFormulas() {
    return db.select().from(formulas).orderBy(desc(formulas.createdAt));
  }

  async getFormula(id: number) {
    const [f] = await db.select().from(formulas).where(eq(formulas.id, id));
    return f;
  }

  async createFormula(f: InsertFormula) {
    const [created] = await db.insert(formulas).values(f).returning();
    return created;
  }

  async updateFormula(id: number, updates: Partial<InsertFormula>) {
    const [updated] = await db.update(formulas).set(updates).where(eq(formulas.id, id)).returning();
    return updated;
  }

  async getFormulasByOutputProduct(productId: number) {
    return db.select().from(formulas).where(
      and(eq(formulas.outputProductId, productId), eq(formulas.active, true))
    );
  }

  // Conversion Formulas
  async getConversionByFormulaId(formulaId: number) {
    const [c] = await db.select().from(conversionFormulas).where(eq(conversionFormulas.formulaId, formulaId));
    return c;
  }

  async createConversionFormula(c: InsertConversionFormula) {
    const [created] = await db.insert(conversionFormulas).values(c).returning();
    return created;
  }

  async updateConversionFormula(formulaId: number, updates: { inputProductId?: number; ratioNumerator?: string; ratioDenominator?: string }) {
    const [updated] = await db.update(conversionFormulas).set(updates).where(eq(conversionFormulas.formulaId, formulaId)).returning();
    return updated;
  }

  // Blend Components
  async getBlendComponentsByFormulaId(formulaId: number) {
    return db.select().from(blendComponents).where(eq(blendComponents.formulaId, formulaId));
  }

  async createBlendComponent(b: InsertBlendComponent) {
    const [created] = await db.insert(blendComponents).values(b).returning();
    return created;
  }

  async deleteBlendComponentsByFormulaId(formulaId: number) {
    await db.delete(blendComponents).where(eq(blendComponents.formulaId, formulaId));
  }

  // Daily Intakes
  async getDailyIntakes(dateFrom?: string, dateTo?: string) {
    let query = db.select().from(dailyIntakes).orderBy(desc(dailyIntakes.date));
    if (dateFrom && dateTo) {
      return db.select().from(dailyIntakes)
        .where(and(gte(dailyIntakes.date, dateFrom), lte(dailyIntakes.date, dateTo)))
        .orderBy(desc(dailyIntakes.date));
    }
    return query;
  }

  async createDailyIntake(d: InsertDailyIntake) {
    const [created] = await db.insert(dailyIntakes).values(d).returning();
    return created;
  }

  // Production Batches
  async getProductionBatches(dateFrom?: string, dateTo?: string) {
    if (dateFrom && dateTo) {
      return db.select().from(productionBatches)
        .where(and(gte(productionBatches.date, dateFrom), lte(productionBatches.date, dateTo)))
        .orderBy(desc(productionBatches.date));
    }
    return db.select().from(productionBatches).orderBy(desc(productionBatches.date));
  }

  async getProductionBatch(id: number) {
    const [b] = await db.select().from(productionBatches).where(eq(productionBatches.id, id));
    return b;
  }

  async createProductionBatch(b: InsertProductionBatch) {
    const [created] = await db.insert(productionBatches).values(b).returning();
    return created;
  }

  async updateProductionBatch(id: number, updates: Partial<InsertProductionBatch>) {
    const [updated] = await db.update(productionBatches).set(updates).where(eq(productionBatches.id, id)).returning();
    return updated;
  }

  // Production Line Items
  async getLineItemsByBatch(batchId: number) {
    return db.select().from(productionLineItems).where(eq(productionLineItems.batchId, batchId));
  }

  async getAllLineItems(dateFrom?: string, dateTo?: string) {
    const baseQuery = db
      .select({
        id: productionLineItems.id,
        batchId: productionLineItems.batchId,
        operationType: productionLineItems.operationType,
        formulaId: productionLineItems.formulaId,
        inputProductId: productionLineItems.inputProductId,
        inputQty: productionLineItems.inputQty,
        outputProductId: productionLineItems.outputProductId,
        outputQty: productionLineItems.outputQty,
        unitType: productionLineItems.unitType,
        createdByUserId: productionLineItems.createdByUserId,
        createdAt: productionLineItems.createdAt,
        notes: productionLineItems.notes,
        reviewedAt: productionLineItems.reviewedAt,
        reviewedByUserId: productionLineItems.reviewedByUserId,
        adminNotes: productionLineItems.adminNotes,
        batchCode: productionBatches.batchCode,
        batchDate: productionBatches.date,
      })
      .from(productionLineItems)
      .innerJoin(productionBatches, eq(productionLineItems.batchId, productionBatches.id))
      .orderBy(desc(productionBatches.date));

    if (dateFrom && dateTo) {
      return db
        .select({
          id: productionLineItems.id,
          batchId: productionLineItems.batchId,
          operationType: productionLineItems.operationType,
          formulaId: productionLineItems.formulaId,
          inputProductId: productionLineItems.inputProductId,
          inputQty: productionLineItems.inputQty,
          outputProductId: productionLineItems.outputProductId,
          outputQty: productionLineItems.outputQty,
          unitType: productionLineItems.unitType,
          createdByUserId: productionLineItems.createdByUserId,
          createdAt: productionLineItems.createdAt,
          notes: productionLineItems.notes,
          reviewedAt: productionLineItems.reviewedAt,
          reviewedByUserId: productionLineItems.reviewedByUserId,
          adminNotes: productionLineItems.adminNotes,
          batchCode: productionBatches.batchCode,
          batchDate: productionBatches.date,
        })
        .from(productionLineItems)
        .innerJoin(productionBatches, eq(productionLineItems.batchId, productionBatches.id))
        .where(and(gte(productionBatches.date, dateFrom), lte(productionBatches.date, dateTo)))
        .orderBy(desc(productionBatches.date));
    }

    return baseQuery;
  }

  async getLineItem(id: number) {
    const [item] = await db.select().from(productionLineItems).where(eq(productionLineItems.id, id));
    return item;
  }

  async createLineItem(l: InsertProductionLineItem) {
    const [created] = await db.insert(productionLineItems).values(l).returning();
    return created;
  }

  async updateLineItem(id: number, updates: Partial<InsertProductionLineItem>) {
    const [updated] = await db.update(productionLineItems).set(updates).where(eq(productionLineItems.id, id)).returning();
    return updated;
  }

  async deleteLineItem(id: number) {
    const result = await db.delete(productionLineItems).where(eq(productionLineItems.id, id));
    return true;
  }

  // Blend Actual Usage
  async getBlendActualUsageByLineItem(lineItemId: number) {
    return db.select().from(blendActualUsage).where(eq(blendActualUsage.lineItemId, lineItemId));
  }

  async createBlendActualUsage(b: InsertBlendActualUsage) {
    const [created] = await db.insert(blendActualUsage).values(b).returning();
    return created;
  }

  async getBlendActualUsageById(id: number) {
    const [row] = await db.select().from(blendActualUsage).where(eq(blendActualUsage.id, id));
    return row;
  }

  async updateBlendActualUsage(id: number, updates: Partial<InsertBlendActualUsage>) {
    const [updated] = await db.update(blendActualUsage).set(updates).where(eq(blendActualUsage.id, id)).returning();
    return updated;
  }

  async deleteBlendActualUsageByLineItem(lineItemId: number) {
    await db.delete(blendActualUsage).where(eq(blendActualUsage.lineItemId, lineItemId));
  }

  // Packouts
  async getPackouts(dateFrom?: string, dateTo?: string) {
    if (dateFrom && dateTo) {
      return db.select().from(packouts)
        .where(and(gte(packouts.date, dateFrom), lte(packouts.date, dateTo)))
        .orderBy(desc(packouts.date));
    }
    return db.select().from(packouts).orderBy(desc(packouts.date));
  }

  async getPackout(id: number) {
    const [p] = await db.select().from(packouts).where(eq(packouts.id, id));
    return p;
  }

  async createPackout(p: InsertPackout) {
    const [created] = await db.insert(packouts).values(p).returning();
    return created;
  }

  async updatePackout(id: number, updates: Partial<InsertPackout>) {
    const [updated] = await db.update(packouts).set(updates).where(eq(packouts.id, id)).returning();
    return updated;
  }

  async deletePackout(id: number) {
    await db.delete(packouts).where(eq(packouts.id, id));
    return true;
  }

  // Daily Intakes (update/delete)
  async getDailyIntake(id: number) {
    const [d] = await db.select().from(dailyIntakes).where(eq(dailyIntakes.id, id));
    return d;
  }

  async updateDailyIntake(id: number, updates: Partial<InsertDailyIntake>) {
    const [updated] = await db.update(dailyIntakes).set(updates).where(eq(dailyIntakes.id, id)).returning();
    return updated;
  }

  async deleteDailyIntake(id: number) {
    await db.delete(dailyIntakes).where(eq(dailyIntakes.id, id));
    return true;
  }

  // Events (audit log)
  async getEvents(limit = 100) {
    return db.select().from(events).orderBy(desc(events.timestamp)).limit(limit);
  }

  async createEvent(e: InsertEvent) {
    const [created] = await db.insert(events).values(e).returning();
    return created;
  }

  // Change Requests
  async getChangeRequest(id: number) {
    const [cr] = await db.select().from(changeRequests).where(eq(changeRequests.id, id));
    return cr;
  }

  async getChangeRequests(status?: string) {
    if (status) {
      return db.select().from(changeRequests)
        .where(eq(changeRequests.status, status as any))
        .orderBy(desc(changeRequests.requestedAt));
    }
    return db.select().from(changeRequests).orderBy(desc(changeRequests.requestedAt));
  }

  async getChangeRequestsByUser(userId: number, status?: string) {
    const conditions = [eq(changeRequests.requestedByUserId, userId)];
    if (status) {
      conditions.push(eq(changeRequests.status, status as any));
    }
    return db.select().from(changeRequests)
      .where(and(...conditions))
      .orderBy(desc(changeRequests.requestedAt));
  }

  async createChangeRequest(c: InsertChangeRequest) {
    const [created] = await db.insert(changeRequests).values(c).returning();
    return created;
  }

  async updateChangeRequestStatus(id: number, status: "APPROVED" | "REJECTED", adminId: number, comment?: string) {
    const [updated] = await db.update(changeRequests).set({
      status,
      reviewedByAdminUserId: adminId,
      reviewedAt: new Date(),
      adminComment: comment || null,
    }).where(eq(changeRequests.id, id)).returning();
    return updated;
  }

  // Yield Tolerances
  async getYieldTolerance(id: number) {
    const [row] = await db.select().from(yieldTolerances).where(eq(yieldTolerances.id, id));
    return row;
  }

  async updateYieldTolerance(id: number, updates: any) {
    const [updated] = await db.update(yieldTolerances).set(updates).where(eq(yieldTolerances.id, id)).returning();
    return updated;
  }

  async adminReviewRecord(entityType: string, entityId: number, reviewedByUserId: number, adminNotes: string | null) {
    const reviewData = {
      reviewedAt: new Date(),
      reviewedByUserId,
      adminNotes,
    };
    if (entityType === "INTAKE") {
      await db.update(dailyIntakes).set(reviewData).where(eq(dailyIntakes.id, entityId));
    } else if (entityType === "LINE_ITEM") {
      await db.update(productionLineItems).set(reviewData).where(eq(productionLineItems.id, entityId));
    } else if (entityType === "PACKOUT") {
      await db.update(packouts).set(reviewData).where(eq(packouts.id, entityId));
    }
  }

  // Loss Thresholds
  async getLossThresholds() {
    return db.select().from(lossThresholds);
  }

  async getLossThreshold(id: number) {
    const [row] = await db.select().from(lossThresholds).where(eq(lossThresholds.id, id));
    return row;
  }

  async getLossThresholdByFormula(formulaId: number, stage: string) {
    const [row] = await db.select().from(lossThresholds).where(
      and(eq(lossThresholds.formulaId, formulaId), eq(lossThresholds.stage, stage as any), eq(lossThresholds.active, true))
    );
    return row;
  }

  async getGlobalLossThreshold(stage: string) {
    const [row] = await db.select().from(lossThresholds).where(
      and(eq(lossThresholds.isGlobal, true), eq(lossThresholds.stage, stage as any), eq(lossThresholds.active, true))
    );
    return row;
  }

  async createLossThreshold(t: InsertLossThreshold) {
    const [created] = await db.insert(lossThresholds).values(t).returning();
    return created;
  }

  async updateLossThreshold(id: number, updates: Partial<InsertLossThreshold>) {
    const [updated] = await db.update(lossThresholds).set(updates).where(eq(lossThresholds.id, id)).returning();
    return updated;
  }

  async deleteLossThreshold(id: number) {
    await db.delete(lossThresholds).where(eq(lossThresholds.id, id));
    return true;
  }

  // Carry Forward Requests
  async getCarryForwardRequests(status?: string) {
    if (status) {
      return db.select().from(carryForwardRequests)
        .where(eq(carryForwardRequests.status, status as any))
        .orderBy(desc(carryForwardRequests.requestedAt));
    }
    return db.select().from(carryForwardRequests).orderBy(desc(carryForwardRequests.requestedAt));
  }

  async getCarryForwardRequest(id: number) {
    const [row] = await db.select().from(carryForwardRequests).where(eq(carryForwardRequests.id, id));
    return row;
  }

  async getCarryForwardByFromBatch(batchId: number) {
    const [row] = await db.select().from(carryForwardRequests).where(eq(carryForwardRequests.fromBatchId, batchId));
    return row;
  }

  async createCarryForwardRequest(c: InsertCarryForwardRequest) {
    const [created] = await db.insert(carryForwardRequests).values(c).returning();
    return created;
  }

  async updateCarryForwardStatus(id: number, status: "APPROVED" | "REJECTED", reviewedByUserId: number, comment?: string) {
    const [updated] = await db.update(carryForwardRequests).set({
      status,
      reviewedByUserId,
      reviewedAt: new Date(),
      adminComment: comment || null,
    }).where(eq(carryForwardRequests.id, id)).returning();
    return updated;
  }

  // Daily Locks
  async getDailyLocks() {
    return db.select().from(dailyLocks);
  }

  async getDailyLock(date: string) {
    const [row] = await db.select().from(dailyLocks).where(eq(dailyLocks.date, date));
    return row;
  }

  async createDailyLock(l: InsertDailyLock) {
    const [created] = await db.insert(dailyLocks).values(l).returning();
    return created;
  }

  async deleteDailyLock(date: string) {
    await db.delete(dailyLocks).where(eq(dailyLocks.date, date));
    return true;
  }

  // Admin Notifications
  async getAdminNotifications(unreadOnly?: boolean) {
    if (unreadOnly) {
      return db.select().from(adminNotifications)
        .where(eq(adminNotifications.isRead, false))
        .orderBy(desc(adminNotifications.createdAt));
    }
    return db.select().from(adminNotifications).orderBy(desc(adminNotifications.createdAt));
  }

  async getAdminNotification(id: number) {
    const [row] = await db.select().from(adminNotifications).where(eq(adminNotifications.id, id));
    return row;
  }

  async createAdminNotification(n: InsertAdminNotification) {
    const [created] = await db.insert(adminNotifications).values(n).returning();
    return created;
  }

  async markNotificationRead(id: number) {
    const [updated] = await db.update(adminNotifications).set({ isRead: true }).where(eq(adminNotifications.id, id)).returning();
    return updated;
  }

  async markAllNotificationsRead() {
    await db.update(adminNotifications).set({ isRead: true }).where(eq(adminNotifications.isRead, false));
  }

  async getUnreadNotificationCount() {
    const result = await db.select({ count: sql<number>`count(*)` }).from(adminNotifications).where(eq(adminNotifications.isRead, false));
    return result[0]?.count ?? 0;
  }

  // Custom Units
  async getCustomUnits() {
    return db.select().from(customUnits);
  }

  async createCustomUnit(u: InsertCustomUnit) {
    const [created] = await db.insert(customUnits).values(u).returning();
    return created;
  }

  async updateCustomUnit(id: number, updates: Partial<InsertCustomUnit>) {
    const [updated] = await db.update(customUnits).set(updates).where(eq(customUnits.id, id)).returning();
    return updated;
  }

  async deleteCustomUnit(id: number) {
    await db.delete(customUnits).where(eq(customUnits.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
