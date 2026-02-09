import { db } from "./db";
import bcrypt from "bcryptjs";
import {
  users, suppliers, products, formulas,
  conversionFormulas, blendComponents
} from "@shared/schema";

export async function seed() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    const existingProducts = await db.select().from(products);
    if (existingProducts.length === 0) {
      console.log("Users exist but no products — seeding products...");
      await seedProducts();
      return;
    }
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  const hash = await bcrypt.hash("password123", 10);

  await db.insert(users).values([
    { name: "Alice Admin", email: "admin@yomilk.com", passwordHash: hash, role: "ADMIN" as const },
    { name: "Bob Brewer", email: "data@yomilk.com", passwordHash: hash, role: "DATA_ENTRY" as const },
  ]);

  await db.insert(suppliers).values([
    { name: "Green Pastures Dairy", active: true },
    { name: "Mountain Fresh Farms", active: true },
    { name: "Valley Milk Co", active: true },
  ]);

  await seedProducts();

  console.log("Seed complete!");
  console.log("Admin Login:  admin@yomilk.com / password123");
  console.log("Data Entry:   data@yomilk.com / password123");
}

async function seedProducts() {
  const allProducts = [
    { name: "YOMILK FRESH MILK 1 LTR", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK RAW MILK 5 LTR", category: "RAW_MILK" as const, unitType: "UNIT" as const, isIntermediate: true },
    { name: "YOMILK FRESH MILK 2 LTR", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK FRESH MILK GOLD CAP BARISTA 1L", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK FRESH MILK GOLD CAP BARISTA 2L", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK FRESH MILK GOLD CAP BARISTA 5L", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK FRESH MILK 5 LTR BOTTLE-BLUE LID", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "HARRY'S FRESH MILK 2 LTR", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "HARRY'S FRESH MILK 1 LTR", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK FRESH MILK 500 ML SACHET", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "KAVA FRESH MILK 2 LTR", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "KAVA FRESH MILK 1 LTR", category: "MILK" as const, unitType: "UNIT" as const, isIntermediate: false },

    { name: "YOMILK PLAIN YOGURT BOTTLE 1L", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK BANANA YOGURT 1 LTR", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK PASSION FRUIT YOGURT 1 LTR", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK STRAWBERRY YOGURT TUB 1kg", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK COCONUT YOGURT TUB 1kg", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK VANILLA YOGURT TUB 1kg", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK GREEK YOGURT TUB 1kg", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK PASSION YOGURT TUB 1kg", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK GREEK YOGURT TUB 500g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK STRAWBERRY YOGURT TUB 500g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK VANILLA YOGURT TUB 500g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK PASSION YOGURT TUB 500g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK COCONUT YOGURT TUB 500g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK STRAWBERRY YOGURT TUB 175g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI PROBIO DRINKING YOGURT 1 LTR", category: "PROBIOTIC" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK GREEK YOGURT TUB 175g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK PASSION YOGURT TUB 175g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK MIXED BERRY YOGURT TUB 175g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK VANILLA YOGURT TUB 175g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK COCONUT YOGURT TUB 175g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK MIXED BERRY YOGURT TUB 1kg", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI PROBIO POURING 250ML", category: "PROBIOTIC" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK STRAWBERRY YOGURT 1 LTR", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK MIXED BERRY YOGURT TUB 500g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK RASPBERRY YOGURT TUB 1kg", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK RASPBERRY YOGURT TUB 500g", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK VANILLA YOGURT 1 LTR", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK STRAWBERRY YOGURT SACHET 200ML", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK 3 BERRY FRUIT SPLIT YOGURT 150G", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK PASSION FRUIT SPLIT YOGURT 150G", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK STRAWBERRY FRUIT SPLIT YOGURT 150G", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK RASPBERRY FRUIT SPLIT YOGURT 150G", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK BANANA YOGURT SACHET 200ML", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK PASSION FRUIT YOGURT SACHET 200ML", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK VANILLA YOGURT SACHET 200ML", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK BANANA YOGURT BOTTLE 250ML", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK STRAWBERRY YOGURT BOTTLE 250ML", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK PASSION FRUIT YOGURT BOTTLE 250ML", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK VANILLA YOGURT BOTTLE 250ML", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK PROBIO YOGURT TUB 1kg", category: "PROBIOTIC" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI D-THICK PROBIO YOGURT TUB 500g", category: "PROBIOTIC" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK DOUBLE THICK GREEK YOGURT 20 LTR", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },

    { name: "ZIM DELI CREAM CHEESE CUCUMBER AND DILL DIP 250g", category: "CREAM_CHEESE" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI CREAM CHEESE BLACK PEPPER DIP 250g", category: "CREAM_CHEESE" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK CREAM CHEESE 250G", category: "CREAM_CHEESE" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK CREAM CHEESE 1L", category: "CREAM_CHEESE" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI CREAM CHEESE SWEET CHILLI DIP 250g", category: "CREAM_CHEESE" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "KAVA CREAMY AVO DIP 250g", category: "CREAM_CHEESE" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "KAVA CUCUMBER AND DILL DIP 250g", category: "CREAM_CHEESE" as const, unitType: "UNIT" as const, isIntermediate: false },

    { name: "YOMILK YO' SMOOTHY STRAWBERRY 300ML", category: "SMOOTHY" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK YO' SMOOTHY PASSION FRUIT 300ML", category: "SMOOTHY" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK YO' SMOOTHY MIXED BERRY 300ML", category: "SMOOTHY" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK YO' SMOOTHY PINA COLADA 300ML", category: "SMOOTHY" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK YO' SMOOTHY MANGO 300ML", category: "SMOOTHY" as const, unitType: "UNIT" as const, isIntermediate: false },

    { name: "YOMILK YOLAC 1L BOTTLE", category: "YOLAC" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK YOLAC 2L BOTTLE", category: "YOLAC" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK YOLAC SACHET 500ML", category: "YOLAC" as const, unitType: "UNIT" as const, isIntermediate: false },

    { name: "YOMILK PLAIN FETA 220G", category: "FETA" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "YOMILK PLAIN FETA 440G", category: "FETA" as const, unitType: "UNIT" as const, isIntermediate: false },

    { name: "ZIM DELI FRESH CREAM 500ML", category: "FRESH_CREAM" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI FRESH CREAM 1L", category: "FRESH_CREAM" as const, unitType: "UNIT" as const, isIntermediate: false },

    { name: "ZIM DELI BILTONG DIP 250g", category: "DIP" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI MEXICAN CHILLI DIP 250g", category: "DIP" as const, unitType: "UNIT" as const, isIntermediate: false },
    { name: "ZIM DELI GARLIC DIP 250g", category: "DIP" as const, unitType: "UNIT" as const, isIntermediate: false },

    { name: "ZIM DELI HODZEKO BULK", category: "HODZEKO" as const, unitType: "KG" as const, isIntermediate: false },

    { name: "RAW MILK", category: "RAW_MILK" as const, unitType: "LITER" as const, isIntermediate: true },
    { name: "YOGURT BASE (BULK)", category: "YOGURT" as const, unitType: "LITER" as const, isIntermediate: false },
    { name: "YOGURT BASE 20L BUCKET", category: "YOGURT" as const, unitType: "UNIT" as const, isIntermediate: false },

    { name: "DTY BASE (BULK)", category: "DTY" as const, unitType: "LITER" as const, isIntermediate: true },
    { name: "SMOOTHIE BASE (BULK)", category: "SMOOTHY" as const, unitType: "LITER" as const, isIntermediate: true },

    { name: "STRAWBERRY PULP", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
    { name: "PASSION FRUIT PULP", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
    { name: "VANILLA FLAVOR", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
    { name: "RASPBERRY PULP", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
    { name: "MIXED BERRY PULP", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
    { name: "COCONUT PULP", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
    { name: "STRAWBERRY PUREE", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
    { name: "PASSION PUREE", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
    { name: "MIXED BERRY PUREE", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
    { name: "MANGO PUREE", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
    { name: "PINA COLADA PUREE", category: "OTHER" as const, unitType: "KG" as const, isIntermediate: false },
  ];

  for (const product of allProducts) {
    await db.insert(products).values({ ...product, active: true });
  }

  console.log(`Seeded ${allProducts.length} products.`);

  await seedFormulas();
}

async function seedFormulas() {
  const existingFormulas = await db.select().from(formulas);
  if (existingFormulas.length > 0) {
    console.log("Formulas already exist, skipping formula seed...");
    return;
  }

  const allProducts = await db.select().from(products);
  const findProduct = (name: string) => allProducts.find(p => p.name === name);

  const rawMilkPkg = findProduct("YOMILK RAW MILK 5 LTR");
  const rawMilkBulk = findProduct("RAW MILK");
  const yogurtBase = findProduct("YOGURT BASE (BULK)");
  const doubleThick = findProduct("YOMILK DOUBLE THICK GREEK YOGURT 20 LTR");
  const creamCheese = findProduct("YOMILK CREAM CHEESE 1L");
  const smoothieStrawberry = findProduct("YOMILK YO' SMOOTHY STRAWBERRY 300ML");
  const smoothiePassion = findProduct("YOMILK YO' SMOOTHY PASSION FRUIT 300ML");
  const smoothieBerry = findProduct("YOMILK YO' SMOOTHY MIXED BERRY 300ML");
  const smoothiePina = findProduct("YOMILK YO' SMOOTHY PINA COLADA 300ML");
  const smoothieMango = findProduct("YOMILK YO' SMOOTHY MANGO 300ML");
  const freshMilk = findProduct("YOMILK FRESH MILK 1 LTR");
  const yolac = findProduct("YOMILK YOLAC 1L BOTTLE");
  const feta = findProduct("YOMILK PLAIN FETA 220G");
  const hodzeko = findProduct("ZIM DELI HODZEKO BULK");
  const plainYogurt = findProduct("YOMILK PLAIN YOGURT BOTTLE 1L");
  const strawberryYogurt = findProduct("YOMILK STRAWBERRY YOGURT 1 LTR");
  const bananaYogurt = findProduct("YOMILK BANANA YOGURT 1 LTR");
  const passionYogurt = findProduct("YOMILK PASSION FRUIT YOGURT 1 LTR");
  const vanillaYogurt = findProduct("YOMILK VANILLA YOGURT 1 LTR");
  const probioYogurt = findProduct("ZIM DELI PROBIO DRINKING YOGURT 1 LTR");
  const cucumberDillDip = findProduct("ZIM DELI CREAM CHEESE CUCUMBER AND DILL DIP 250g");
  const blackPepperDip = findProduct("ZIM DELI CREAM CHEESE BLACK PEPPER DIP 250g");
  const sweetChilliDip = findProduct("ZIM DELI CREAM CHEESE SWEET CHILLI DIP 250g");
  const avoDip = findProduct("KAVA CREAMY AVO DIP 250g");
  const kavaCucumberDip = findProduct("KAVA CUCUMBER AND DILL DIP 250g");
  const biltongDip = findProduct("ZIM DELI BILTONG DIP 250g");
  const mexicanDip = findProduct("ZIM DELI MEXICAN CHILLI DIP 250g");
  const garlicDip = findProduct("ZIM DELI GARLIC DIP 250g");

  const rawMilkInput = rawMilkBulk || rawMilkPkg;
  if (!rawMilkInput || !yogurtBase) {
    console.log("Critical products not found, skipping formula seed...");
    return;
  }

  const conversionDefs: { name: string; outputId: number; inputId: number; num: number; den: number }[] = [];

  const addConversion = (name: string, output: any, input: any, num: number, den: number = 1) => {
    if (output && input) {
      conversionDefs.push({ name, outputId: output.id, inputId: input.id, num, den });
    }
  };

  addConversion("Raw Milk to Yogurt Base", yogurtBase, rawMilkInput, 1, 1);
  addConversion("Raw Milk to Fresh Milk", freshMilk, rawMilkInput, 1, 1);
  addConversion("Raw Milk to Yolac", yolac, rawMilkInput, 1.1, 1);
  addConversion("Raw Milk to Feta", feta, rawMilkInput, 5, 1);
  addConversion("Raw Milk to Hodzeko", hodzeko, rawMilkInput, 1.2, 1);

  addConversion("Yogurt Base to Double Thick Yogurt", doubleThick, yogurtBase, 2, 1);
  addConversion("Yogurt Base to Cream Cheese", creamCheese, yogurtBase, 3, 1);
  addConversion("Yogurt Base to Plain Yogurt", plainYogurt, yogurtBase, 1, 1);
  addConversion("Yogurt Base to Strawberry Yogurt", strawberryYogurt, yogurtBase, 1, 1);
  addConversion("Yogurt Base to Banana Yogurt", bananaYogurt, yogurtBase, 1, 1);
  addConversion("Yogurt Base to Passion Fruit Yogurt", passionYogurt, yogurtBase, 1, 1);
  addConversion("Yogurt Base to Vanilla Yogurt", vanillaYogurt, yogurtBase, 1, 1);
  addConversion("Yogurt Base to Probiotic Yogurt", probioYogurt, yogurtBase, 1, 1);
  const dtyBase = findProduct("DTY BASE (BULK)");
  const smoothieBase = findProduct("SMOOTHIE BASE (BULK)");
  addConversion("Yogurt Base to DTY BASE", dtyBase, yogurtBase, 2, 1);
  addConversion("Yogurt Base to SMOOTHIE BASE", smoothieBase, yogurtBase, 1, 1);

  addConversion("Cream Cheese to Cucumber & Dill Dip", cucumberDillDip, creamCheese, 1, 1);
  addConversion("Cream Cheese to Black Pepper Dip", blackPepperDip, creamCheese, 1, 1);
  addConversion("Cream Cheese to Sweet Chilli Dip", sweetChilliDip, creamCheese, 1, 1);
  addConversion("Cream Cheese to Creamy Avo Dip", avoDip, creamCheese, 1, 1);
  addConversion("Cream Cheese to Kava Cucumber Dill Dip", kavaCucumberDip, creamCheese, 1, 1);
  addConversion("Cream Cheese to Biltong Dip", biltongDip, creamCheese, 1, 1);
  addConversion("Cream Cheese to Mexican Chilli Dip", mexicanDip, creamCheese, 1, 1);
  addConversion("Cream Cheese to Garlic Dip", garlicDip, creamCheese, 1, 1);

  for (const def of conversionDefs) {
    const [formula] = await db.insert(formulas).values({
      name: def.name,
      type: "CONVERSION" as const,
      outputProductId: def.outputId,
      inputBasis: "PER_UNIT_OUTPUT" as const,
      active: true,
      version: 1,
    }).returning();

    await db.insert(conversionFormulas).values({
      formulaId: formula.id,
      inputProductId: def.inputId,
      ratioNumerator: String(def.num),
      ratioDenominator: String(def.den),
    });
  }

  console.log(`Seeded ${conversionDefs.length} conversion formulas.`);

  const strawberryPulp = findProduct("STRAWBERRY PULP");
  const passionPulp = findProduct("PASSION FRUIT PULP");
  const vanillaFlavor = findProduct("VANILLA FLAVOR");
  const raspberryPulp = findProduct("RASPBERRY PULP");
  const mixedBerryPulp = findProduct("MIXED BERRY PULP");
  const coconutPulp = findProduct("COCONUT PULP");
  const strawberryPuree = findProduct("STRAWBERRY PUREE");
  const passionPuree = findProduct("PASSION PUREE");
  const mixedBerryPuree = findProduct("MIXED BERRY PUREE");
  const mangoPuree = findProduct("MANGO PUREE");
  const pinaColadaPuree = findProduct("PINA COLADA PUREE");

  type BlendDef = { name: string; outputName: string; components: { product: any; fraction: string }[] };
  const blendDefs: BlendDef[] = [];

  const dtyFlavors: { flavor: string; pulp: any; baseFrac: string; pulpFrac: string; sizes: string[] }[] = [
    { flavor: "Strawberry", pulp: strawberryPulp, baseFrac: "0.9884", pulpFrac: "0.0116", sizes: ["175g", "500g", "1kg"] },
    { flavor: "Passion", pulp: passionPulp, baseFrac: "0.9884", pulpFrac: "0.0116", sizes: ["175g", "500g", "1kg"] },
    { flavor: "Vanilla", pulp: vanillaFlavor, baseFrac: "0.9885", pulpFrac: "0.0115", sizes: ["175g", "500g", "1kg"] },
    { flavor: "Raspberry", pulp: raspberryPulp, baseFrac: "0.9883", pulpFrac: "0.0117", sizes: ["500g", "1kg"] },
    { flavor: "Mixed Berry", pulp: mixedBerryPulp, baseFrac: "0.9884", pulpFrac: "0.0116", sizes: ["175g", "500g", "1kg"] },
    { flavor: "Coconut", pulp: coconutPulp, baseFrac: "0.9847", pulpFrac: "0.0153", sizes: ["175g", "500g", "1kg"] },
  ];

  for (const f of dtyFlavors) {
    for (const size of f.sizes) {
      const outputName = `ZIM DELI D-THICK ${f.flavor.toUpperCase()} YOGURT TUB ${size}`;
      const output = findProduct(outputName);
      if (output && dtyBase && f.pulp) {
        blendDefs.push({
          name: `${f.flavor} DTY Blend ${size}`,
          outputName,
          components: [
            { product: dtyBase, fraction: f.baseFrac },
            { product: f.pulp, fraction: f.pulpFrac },
          ],
        });
      }
    }
  }

  const smoothieFlavors: { name: string; outputName: string; puree: any }[] = [
    { name: "Strawberry Smoothie Blend", outputName: "YOMILK YO' SMOOTHY STRAWBERRY 300ML", puree: strawberryPuree },
    { name: "Passion Fruit Smoothie Blend", outputName: "YOMILK YO' SMOOTHY PASSION FRUIT 300ML", puree: passionPuree },
    { name: "Mixed Berry Smoothie Blend", outputName: "YOMILK YO' SMOOTHY MIXED BERRY 300ML", puree: mixedBerryPuree },
    { name: "Pina Colada Smoothie Blend", outputName: "YOMILK YO' SMOOTHY PINA COLADA 300ML", puree: pinaColadaPuree },
    { name: "Mango Smoothie Blend", outputName: "YOMILK YO' SMOOTHY MANGO 300ML", puree: mangoPuree },
  ];

  for (const s of smoothieFlavors) {
    const output = findProduct(s.outputName);
    if (output && smoothieBase && s.puree) {
      blendDefs.push({
        name: s.name,
        outputName: s.outputName,
        components: [
          { product: smoothieBase, fraction: "0.9888" },
          { product: s.puree, fraction: "0.0112" },
        ],
      });
    }
  }

  let blendCount = 0;
  for (const def of blendDefs) {
    const output = findProduct(def.outputName);
    if (!output) continue;
    const [formula] = await db.insert(formulas).values({
      name: def.name,
      type: "BLEND" as const,
      outputProductId: output.id,
      inputBasis: "PER_UNIT_OUTPUT" as const,
      active: true,
      version: 1,
    }).returning();

    for (const comp of def.components) {
      await db.insert(blendComponents).values({
        formulaId: formula.id,
        componentProductId: comp.product.id,
        fraction: comp.fraction,
      });
    }
    blendCount++;
  }
  console.log(`Seeded ${blendCount} blend formulas.`);
}
