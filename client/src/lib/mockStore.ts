import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Types ---

export type Role = 'ADMIN' | 'DATA_ENTRY';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
};

export type UnitType = 'LITER' | 'KG' | 'UNIT';
export type ProductCategory = 'RAW_MILK' | 'YOGURT' | 'DTY' | 'YOLAC' | 'PROBIOTIC' | 'CREAM_CHEESE' | 'FETA' | 'OTHER';

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  unitType: UnitType;
  isIntermediate: boolean;
  active: boolean;
};

export type FormulaType = 'CONVERSION' | 'BLEND';

export type Formula = {
  id: string;
  name: string;
  type: FormulaType;
  outputProductId: string;
  active: boolean;
  version: number;
  // Conversion specifics
  inputProductId?: string;
  ratioNumerator?: number;
  ratioDenominator?: number;
  // Blend specifics
  components?: BlendComponent[];
};

export type BlendComponent = {
  id: string;
  componentProductId: string;
  fraction: number; // 0..1
};

export type ProductionOperation = 'CONVERT' | 'BLEND';

export type ProductionLineItem = {
  id: string;
  batchCode: string;
  date: string;
  operationType: ProductionOperation;
  formulaId?: string;
  inputProductId?: string;
  inputQty?: number;
  expectedInputQty?: number;
  outputProductId: string;
  outputQty: number;
  variance?: number;
  notes?: string;
};

export type Packout = {
  id: string;
  date: string;
  productId: string;
  qty: number;
  unitType: UnitType;
};

// --- Initial Data ---

const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Alice Admin', email: 'alice@yomilk.com', role: 'ADMIN', avatarUrl: 'https://i.pravatar.cc/150?u=alice' },
  { id: 'u2', name: 'Bob Brewer', email: 'bob@yomilk.com', role: 'DATA_ENTRY', avatarUrl: 'https://i.pravatar.cc/150?u=bob' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Raw Milk', category: 'RAW_MILK', unitType: 'LITER', isIntermediate: true, active: true },
  { id: 'p2', name: 'Yogurt Base', category: 'YOGURT', unitType: 'LITER', isIntermediate: true, active: true },
  { id: 'p3', name: 'Strawberry Puree', category: 'OTHER', unitType: 'KG', isIntermediate: true, active: true },
  { id: 'p4', name: 'Sugar', category: 'OTHER', unitType: 'KG', isIntermediate: true, active: true },
  { id: 'p5', name: 'Strawberry Yogurt 500ml', category: 'YOGURT', unitType: 'UNIT', isIntermediate: false, active: true },
  { id: 'p6', name: 'Cream Cheese', category: 'CREAM_CHEESE', unitType: 'KG', isIntermediate: false, active: true },
];

const INITIAL_FORMULAS: Formula[] = [
  { 
    id: 'f1', name: 'Milk -> Yogurt Base', type: 'CONVERSION', outputProductId: 'p2', active: true, version: 1,
    inputProductId: 'p1', ratioNumerator: 0.95, ratioDenominator: 1 // 1L Milk -> 0.95L Yogurt
  },
  {
    id: 'f2', name: 'Strawberry Yogurt Blend', type: 'BLEND', outputProductId: 'p5', active: true, version: 1,
    components: [
      { id: 'c1', componentProductId: 'p2', fraction: 0.85 }, // 85% Yogurt
      { id: 'c2', componentProductId: 'p3', fraction: 0.10 }, // 10% Fruit
      { id: 'c3', componentProductId: 'p4', fraction: 0.05 }, // 5% Sugar
    ]
  }
];

const INITIAL_PRODUCTION: ProductionLineItem[] = [
  { 
    id: 'prod1', batchCode: 'B-20231025-001', date: '2023-10-25', operationType: 'CONVERT', 
    formulaId: 'f1', outputProductId: 'p2', outputQty: 500, inputProductId: 'p1', inputQty: 530, expectedInputQty: 526.3, variance: 0.7 
  }
];

// --- Store ---

interface AppState {
  currentUser: User;
  users: User[];
  products: Product[];
  formulas: Formula[];
  productionLog: ProductionLineItem[];
  packouts: Packout[];
  
  setUser: (user: User) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  addFormula: (formula: Formula) => void;
  addProductionRecord: (record: ProductionLineItem) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: INITIAL_USERS[0],
      users: INITIAL_USERS,
      products: INITIAL_PRODUCTS,
      formulas: INITIAL_FORMULAS,
      productionLog: INITIAL_PRODUCTION,
      packouts: [],

      setUser: (user) => set({ currentUser: user }),
      addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
      updateProduct: (updated) => set((state) => ({ 
        products: state.products.map(p => p.id === updated.id ? updated : p) 
      })),
      addFormula: (formula) => set((state) => ({ formulas: [...state.formulas, formula] })),
      addProductionRecord: (record) => set((state) => ({ 
        productionLog: [record, ...state.productionLog] 
      })),
    }),
    {
      name: 'yomilk-storage',
    }
  )
);
