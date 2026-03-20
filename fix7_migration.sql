-- ============================================================
-- YoMilk Fix 7: Mark ingredient-only products
-- Run this on your PostgreSQL database in Replit
-- ============================================================

-- Step 1: Add isIngredientOnly column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_ingredient_only BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Mark all pulps, purees, cultures as ingredient-only
-- These will NEVER appear in "What did you produce?" dropdowns
UPDATE products 
SET is_ingredient_only = true
WHERE 
  LOWER(name) LIKE '%pulp%' 
  OR LOWER(name) LIKE '%puree%'
  OR LOWER(name) LIKE '%purée%'
  OR LOWER(name) LIKE '%culture%'
  OR LOWER(name) LIKE '%strawberry pulp%'
  OR LOWER(name) LIKE '%passion fruit pulp%'
  OR LOWER(name) LIKE '%mixed berry pulp%'
  OR LOWER(name) LIKE '%raspberry pulp%'
  OR LOWER(name) LIKE '%coconut pulp%'
  OR LOWER(name) LIKE '%mango%puree%'
  OR LOWER(name) LIKE '%pina colada%'
  OR LOWER(name) LIKE '%black forest%'
  OR LOWER(name) LIKE '%choc chip%'
  OR LOWER(name) LIKE '%fruit cocktail%';

-- Step 3: Mark bulk/intermediate products (Layer 2 - storable)
-- These CAN appear as outputs but also track running stock
UPDATE products
SET is_intermediate = true
WHERE
  LOWER(name) LIKE '%20l%'
  OR LOWER(name) LIKE '%20 ltr%'
  OR LOWER(name) LIKE '%20kg%'
  OR LOWER(name) LIKE '%20 kg%'
  OR LOWER(name) LIKE '%bulk%'
  OR LOWER(name) LIKE '%plain yogurt base%'
  OR LOWER(name) LIKE '%yogurt base%'
  OR LOWER(name) LIKE '%dty base%'
  OR LOWER(name) LIKE '%smoothie base%';

-- Step 4: Verify what was changed — check results
SELECT 
  id, name, category, 
  is_intermediate, 
  is_ingredient_only
FROM products
WHERE is_intermediate = true OR is_ingredient_only = true
ORDER BY is_ingredient_only DESC, category, name;