export type Category = 'Beer' | 'Soft Drink' | 'Wine' | 'Whiskey' | 'Draft' | 'Other';
export type ExpenseType = 'drink' | 'cash' | 'operational' | 'staff' | 'breakage' | 'wastage' | 'other';
export type CostType = 'purchase' | 'transport' | 'supplier' | 'draft' | 'whiskey' | 'preparation' | 'other';
export type SaleType = 'bottle' | 'glass' | 'cc' | 'ml';
export type UserRole = 'admin' | 'cashier' | 'storekeeper' | 'manager';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: Category;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  standingTarget: number;
  bottleSize?: number; // ml for whiskey
  glassCount?: number; // glasses per bermel for draft
  remainingMl?: number; // for whiskey partial
  remainingDraftGlasses?: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  date: string;
  supplier: string;
  productId: string;
  productCode: string;
  productName: string;
  category: Category;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  totalAmount: number;
  notes: string;
  status: 'completed' | 'pending';
  createdAt: string;
}

export interface StandingStock {
  id: string;
  date: string;
  productId: string;
  productCode: string;
  productName: string;
  openingStanding: number;
  quantitySold: number;
  remainingStanding: number;
  refillQuantity: number;
  closingStanding: number;
  target: number;
  notes: string;
  status: 'normal' | 'low' | 'negative';
}

export interface Sale {
  id: string;
  date: string;
  time: string;
  receiptNo: string;
  items: SaleItem[];
  subtotal: number;
  total: number;
  totalCost: number;
  totalProfit: number;
  cashier: string;
  notes: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  total: number;
  profit: number;
}

export interface WhiskeySale {
  id: string;
  date: string;
  productId: string;
  productName: string;
  saleType: 'bottle' | 'cc';
  bottlesSold: number;
  ccSold: number;
  extraCcSold: number;
  total: number;
  cost: number;
  profit: number;
  cashier: string;
  notes: string;
  createdAt: string;
}

export interface WhiskeyPurchase {
  id: string;
  date: string;
  productId: string;
  productName: string;
  bottles: number;
  costPerBottle: number;
  totalAmount: number;
  supplier: string;
  notes: string;
  createdAt: string;
}

export interface DraftSale {
  id: string;
  date: string;
  productId: string;
  productName: string;
  glassesSold: number;
  extraGlassesSold: number;
  pricePerGlass: number;
  total: number;
  cost: number;
  profit: number;
  cashier: string;
  notes: string;
  createdAt: string;
}

export interface DraftPurchase {
  id: string;
  date: string;
  productId: string;
  productName: string;
  bermels: number;
  costPerBermel: number;
  totalAmount: number;
  supplier: string;
  notes: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  type: ExpenseType;
  category: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  amount: number;
  reason: string;
  approvedBy: string;
  notes: string;
  createdAt: string;
}

export interface Cost {
  id: string;
  date: string;
  type: CostType;
  productId?: string;
  productName?: string;
  amount: number;
  notes: string;
  createdAt: string;
}

export interface Exchange {
  id: string;
  date: string;
  fromProductId: string;
  fromProductName: string;
  toProductId: string;
  toProductName: string;
  quantity: number;
  reason: string;
  approvedBy: string;
  notes: string;
  status: 'completed' | 'pending';
  createdAt: string;
}

export type LoanType = 'borrow_in' | 'lend_out';
export type LoanStatus = 'open' | 'returned' | 'paid' | 'partial';
export type SettlementType = 'payment' | 'exchange';

export interface LoanTransaction {
  id: string;
  loan_date: string;
  loan_type: LoanType;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  person_name: string;
  status: LoanStatus;
  settlement_type?: SettlementType | null;
  payment_method?: string | null;
  receipt_url?: string | null;
  returned_quantity: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LoanReturn {
  id: string;
  loan_transaction_id: string;
  return_date: string;
  settlement_type: SettlementType;
  quantity?: number;
  amount?: number;
  payment_method?: string | null;
  receipt_url?: string | null;
  notes: string;
  created_at: string;
}
