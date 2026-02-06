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
  ];

  for (const product of allProducts) {
    await db.insert(products).values({ ...product, active: true });
  }

  console.log(`Seeded ${allProducts.length} products.`);
}
