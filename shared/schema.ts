import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  decimal,
  timestamp,
  date,
  jsonb,
  pgEnum,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["ADMIN", "DATA_ENTRY"]);
export const unitTypeEnum = pgEnum("unit_type", ["LITER", "KG", "UNIT"]);
export const productCategoryEnum = pgEnum("product_category", [
  "RAW_MILK", "MILK", "YOGURT", "DTY", "YOLAC", "PROBIOTIC", "CREAM_CHEESE", "FETA", "SMOOTHY", "FRESH_CREAM", "DIP", "HODZEKO", "CHEESE", "OTHER",
]);
export const formulaTypeEnum = pgEnum("formula_type", ["CONVERSION", "BLEND"]);
export const inputBasisEnum = pgEnum("input_basis", ["PER_UNIT_OUTPUT", "PER_UNIT_INPUT"]);
export const operationTypeEnum = pgEnum("operation_type", ["CONVERT", "BLEND"]);
export const changeRequestStatusEnum = pgEnum("change_request_status", ["PENDING", "APPROVED", "REJECTED"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("DATA_ENTRY"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: productCategoryEnum("category").notNull(),
  unitType: unitTypeEnum("unit_type").notNull(),
  isIntermediate: boolean("is_intermediate").notNull().default(false),
  active: boolean("active").notNull().default(true),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const formulas = pgTable("formulas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: formulaTypeEnum("type").notNull(),
  outputProductId: integer("output_product_id").notNull().references(() => products.id),
  inputBasis: inputBasisEnum("input_basis").notNull().default("PER_UNIT_OUTPUT"),
  active: boolean("active").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFormulaSchema = createInsertSchema(formulas).omit({ id: true, createdAt: true });
export type InsertFormula = z.infer<typeof insertFormulaSchema>;
export type Formula = typeof formulas.$inferSelect;

export const conversionFormulas = pgTable("conversion_formulas", {
  id: serial("id").primaryKey(),
  formulaId: integer("formula_id").notNull().references(() => formulas.id),
  inputProductId: integer("input_product_id").notNull().references(() => products.id),
  ratioNumerator: decimal("ratio_numerator", { precision: 10, scale: 4 }).notNull(),
  ratioDenominator: decimal("ratio_denominator", { precision: 10, scale: 4 }).notNull(),
  notes: text("notes"),
});

export const insertConversionFormulaSchema = createInsertSchema(conversionFormulas).omit({ id: true });
export type InsertConversionFormula = z.infer<typeof insertConversionFormulaSchema>;
export type ConversionFormula = typeof conversionFormulas.$inferSelect;

export const blendComponents = pgTable("blend_components", {
  id: serial("id").primaryKey(),
  formulaId: integer("formula_id").notNull().references(() => formulas.id),
  componentProductId: integer("component_product_id").notNull().references(() => products.id),
  fraction: decimal("fraction", { precision: 10, scale: 6 }).notNull(),
  notes: text("notes"),
});

export const insertBlendComponentSchema = createInsertSchema(blendComponents).omit({ id: true });
export type InsertBlendComponent = z.infer<typeof insertBlendComponentSchema>;
export type BlendComponent = typeof blendComponents.$inferSelect;

export const yieldTolerances = pgTable("yield_tolerances", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  warnPercent: decimal("warn_percent", { precision: 5, scale: 2 }).notNull().default("5"),
  criticalPercent: decimal("critical_percent", { precision: 5, scale: 2 }).notNull().default("10"),
});

export const dailyIntakes = pgTable("daily_intakes", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  productId: integer("product_id").notNull().references(() => products.id),
  qty: decimal("qty", { precision: 12, scale: 4 }).notNull(),
  deliveredQty: decimal("delivered_qty", { precision: 12, scale: 4 }),
  acceptedQty: decimal("accepted_qty", { precision: 12, scale: 4 }),
  unitType: unitTypeEnum("unit_type").notNull(),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDailyIntakeSchema = createInsertSchema(dailyIntakes).omit({ id: true, createdAt: true });
export type InsertDailyIntake = z.infer<typeof insertDailyIntakeSchema>;
export type DailyIntake = typeof dailyIntakes.$inferSelect;

export const productionBatches = pgTable("production_batches", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  batchCode: text("batch_code").notNull(),
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductionBatchSchema = createInsertSchema(productionBatches).omit({ id: true, createdAt: true });
export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;
export type ProductionBatch = typeof productionBatches.$inferSelect;

export const productionLineItems = pgTable("production_line_items", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => productionBatches.id),
  operationType: operationTypeEnum("operation_type").notNull(),
  formulaId: integer("formula_id").references(() => formulas.id),
  inputProductId: integer("input_product_id").references(() => products.id),
  inputQty: decimal("input_qty", { precision: 12, scale: 4 }),
  outputProductId: integer("output_product_id").notNull().references(() => products.id),
  outputQty: decimal("output_qty", { precision: 12, scale: 4 }).notNull(),
  unitType: unitTypeEnum("unit_type").notNull(),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductionLineItemSchema = createInsertSchema(productionLineItems).omit({ id: true, createdAt: true });
export type InsertProductionLineItem = z.infer<typeof insertProductionLineItemSchema>;
export type ProductionLineItem = typeof productionLineItems.$inferSelect;

export const packouts = pgTable("packouts", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  productId: integer("product_id").notNull().references(() => products.id),
  qty: decimal("qty", { precision: 12, scale: 4 }).notNull(),
  unitType: unitTypeEnum("unit_type").notNull(),
  packSizeLabel: text("pack_size_label"),
  sourceProductId: integer("source_product_id").references(() => products.id),
  sourceQtyUsed: decimal("source_qty_used", { precision: 12, scale: 4 }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPackoutSchema = createInsertSchema(packouts).omit({ id: true, createdAt: true });
export type InsertPackout = z.infer<typeof insertPackoutSchema>;
export type Packout = typeof packouts.$inferSelect;

export const blendActualUsage = pgTable("blend_actual_usage", {
  id: serial("id").primaryKey(),
  lineItemId: integer("line_item_id").notNull().references(() => productionLineItems.id, { onDelete: "cascade" }),
  componentProductId: integer("component_product_id").notNull().references(() => products.id),
  expectedQty: decimal("expected_qty", { precision: 12, scale: 4 }),
  actualQty: decimal("actual_qty", { precision: 12, scale: 4 }).notNull(),
});

export const insertBlendActualUsageSchema = createInsertSchema(blendActualUsage).omit({ id: true });
export type InsertBlendActualUsage = z.infer<typeof insertBlendActualUsageSchema>;
export type BlendActualUsage = typeof blendActualUsage.$inferSelect;

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  actorUserId: integer("actor_user_id").notNull().references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  metadataJson: jsonb("metadata_json"),
});

export const insertEventSchema = createInsertSchema(events).omit({ id: true, timestamp: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const changeRequests = pgTable("change_requests", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  fieldName: text("field_name").notNull(),
  proposedValue: text("proposed_value").notNull(),
  currentValue: text("current_value"),
  reason: text("reason"),
  requestedByUserId: integer("requested_by_user_id").notNull().references(() => users.id),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  status: changeRequestStatusEnum("status").notNull().default("PENDING"),
  reviewedByAdminUserId: integer("reviewed_by_admin_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  adminComment: text("admin_comment"),
});

export const insertChangeRequestSchema = createInsertSchema(changeRequests).omit({
  id: true, requestedAt: true, status: true, reviewedByAdminUserId: true, reviewedAt: true, adminComment: true,
});
export type InsertChangeRequest = z.infer<typeof insertChangeRequestSchema>;
export type ChangeRequest = typeof changeRequests.$inferSelect;
