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

  // Production Line Items
  getLineItemsByBatch(batchId: number): Promise<ProductionLineItem[]>;
  getLineItem(id: number): Promise<ProductionLineItem | undefined>;
  getAllLineItems(dateFrom?: string, dateTo?: string): Promise<(ProductionLineItem & { batchCode: string; batchDate: string })[]>;
  createLineItem(l: InsertProductionLineItem): Promise<ProductionLineItem>;
  updateLineItem(id: number, updates: Partial<InsertProductionLineItem>): Promise<ProductionLineItem | undefined>;
  deleteLineItem(id: number): Promise<boolean>;

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
  createChangeRequest(c: InsertChangeRequest): Promise<ChangeRequest>;
  updateChangeRequestStatus(id: number, status: "APPROVED" | "REJECTED", adminId: number, comment?: string): Promise<ChangeRequest | undefined>;
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
  async getChangeRequests(status?: string) {
    if (status) {
      return db.select().from(changeRequests)
        .where(eq(changeRequests.status, status as any))
        .orderBy(desc(changeRequests.requestedAt));
    }
    return db.select().from(changeRequests).orderBy(desc(changeRequests.requestedAt));
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
}

export const storage = new DatabaseStorage();
