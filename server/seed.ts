import { db } from "./db";
import bcrypt from "bcryptjs";
import {
  users, suppliers, products, formulas,
  conversionFormulas, blendComponents
} from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seed() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  const hash = await bcrypt.hash("password123", 10);

  const [admin] = await db.insert(users).values([
    { name: "Alice Admin", email: "admin@yomilk.com", passwordHash: hash, role: "ADMIN" as const },
    { name: "Bob Brewer", email: "data@yomilk.com", passwordHash: hash, role: "DATA_ENTRY" as const },
  ]).returning();

  await db.insert(suppliers).values([
    { name: "Green Pastures Dairy", active: true },
    { name: "Mountain Fresh Farms", active: true },
    { name: "Valley Milk Co", active: true },
  ]);

  const [rawMilk] = await db.insert(products).values({ name: "Raw Milk", category: "RAW_MILK" as const, unitType: "LITER" as const, isIntermediate: true, active: true }).returning();
  const [yogurtBase] = await db.insert(products).values({ name: "Yogurt Base", category: "YOGURT" as const, unitType: "LITER" as const, isIntermediate: true, active: true }).returning();
  const [strawberryPuree] = await db.insert(products).values({ name: "Strawberry Puree", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: true, active: true }).returning();
  const [sugar] = await db.insert(products).values({ name: "Sugar", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: true, active: true }).returning();
  const [strawberryYogurt] = await db.insert(products).values({ name: "Strawberry Yogurt 500ml", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false, active: true }).returning();
  const [creamCheese] = await db.insert(products).values({ name: "Cream Cheese", category: "CREAM_CHEESE" as const, unitType: "KG" as const, isIntermediate: false, active: true }).returning();
  const [dty] = await db.insert(products).values({ name: "Drinking Yogurt (DTY)", category: "DTY" as const, unitType: "LITER" as const, isIntermediate: false, active: true }).returning();

  const [milkToYogurt] = await db.insert(formulas).values({
    name: "Milk → Yogurt Base",
    type: "CONVERSION" as const,
    outputProductId: yogurtBase.id,
    inputBasis: "PER_UNIT_OUTPUT" as const,
    active: true,
    version: 1,
  }).returning();

  await db.insert(conversionFormulas).values({
    formulaId: milkToYogurt.id,
    inputProductId: rawMilk.id,
    ratioNumerator: "1.05",
    ratioDenominator: "1",
    notes: "1.05L Milk per 1L Yogurt Base (5% loss)",
  });

  const [yogurtToDty] = await db.insert(formulas).values({
    name: "Yogurt → DTY",
    type: "CONVERSION" as const,
    outputProductId: dty.id,
    inputBasis: "PER_UNIT_OUTPUT" as const,
    active: true,
    version: 1,
  }).returning();

  await db.insert(conversionFormulas).values({
    formulaId: yogurtToDty.id,
    inputProductId: yogurtBase.id,
    ratioNumerator: "2",
    ratioDenominator: "1",
    notes: "2L Yogurt per 1L DTY (2:1 ratio)",
  });

  const [blendFormula] = await db.insert(formulas).values({
    name: "Strawberry Yogurt Blend",
    type: "BLEND" as const,
    outputProductId: strawberryYogurt.id,
    inputBasis: "PER_UNIT_OUTPUT" as const,
    active: true,
    version: 1,
  }).returning();

  await db.insert(blendComponents).values([
    { formulaId: blendFormula.id, componentProductId: yogurtBase.id, fraction: "0.85" },
    { formulaId: blendFormula.id, componentProductId: strawberryPuree.id, fraction: "0.10" },
    { formulaId: blendFormula.id, componentProductId: sugar.id, fraction: "0.05" },
  ]);

  console.log("Seed complete!");
  console.log("Admin Login:  admin@yomilk.com / password123");
  console.log("Data Entry:   data@yomilk.com / password123");
}
