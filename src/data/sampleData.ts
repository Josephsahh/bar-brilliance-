import { Product, Purchase, Sale, Expense, StandingStock } from '@/types/models';

const now = new Date().toISOString();
const today = new Date().toISOString().split('T')[0];

export const sampleProducts: Product[] = [
  { id: 'p1', code: 'BEER-001', name: 'Dashen Beer', category: 'Beer', unit: 'Bottle', costPrice: 25, sellingPrice: 45, quantity: 480, reorderLevel: 50, standingTarget: 300, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p2', code: 'BEER-002', name: 'Habesha Beer', category: 'Beer', unit: 'Bottle', costPrice: 25, sellingPrice: 45, quantity: 350, reorderLevel: 50, standingTarget: 200, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p3', code: 'BEER-003', name: 'Heineken Beer', category: 'Beer', unit: 'Bottle', costPrice: 40, sellingPrice: 70, quantity: 200, reorderLevel: 30, standingTarget: 100, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p4', code: 'BEER-004', name: 'St George Beer', category: 'Beer', unit: 'Bottle', costPrice: 22, sellingPrice: 40, quantity: 300, reorderLevel: 40, standingTarget: 150, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p5', code: 'SOFT-001', name: 'Coca Cola', category: 'Soft Drink', unit: 'Bottle', costPrice: 15, sellingPrice: 30, quantity: 400, reorderLevel: 60, standingTarget: 200, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p6', code: 'SOFT-002', name: 'Fanta', category: 'Soft Drink', unit: 'Bottle', costPrice: 15, sellingPrice: 30, quantity: 350, reorderLevel: 60, standingTarget: 180, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p7', code: 'SOFT-003', name: 'Sprite', category: 'Soft Drink', unit: 'Bottle', costPrice: 15, sellingPrice: 30, quantity: 280, reorderLevel: 50, standingTarget: 150, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p8', code: 'SOFT-004', name: 'Water', category: 'Soft Drink', unit: 'Bottle', costPrice: 8, sellingPrice: 20, quantity: 500, reorderLevel: 80, standingTarget: 250, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p9', code: 'WINE-001', name: 'Red Wine', category: 'Wine', unit: 'Bottle', costPrice: 150, sellingPrice: 300, quantity: 40, reorderLevel: 10, standingTarget: 15, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p10', code: 'WINE-002', name: 'White Wine', category: 'Wine', unit: 'Bottle', costPrice: 130, sellingPrice: 280, quantity: 35, reorderLevel: 10, standingTarget: 12, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p11', code: 'WHSK-001', name: 'Johnnie Walker', category: 'Whiskey', unit: 'Bottle', costPrice: 800, sellingPrice: 1500, quantity: 15, reorderLevel: 5, standingTarget: 5, bottleSize: 750, remainingMl: 750, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p12', code: 'WHSK-002', name: 'Chivas', category: 'Whiskey', unit: 'Bottle', costPrice: 1200, sellingPrice: 2200, quantity: 10, reorderLevel: 3, standingTarget: 3, bottleSize: 750, remainingMl: 500, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p13', code: 'WHSK-003', name: "Ballantine's", category: 'Whiskey', unit: 'Bottle', costPrice: 600, sellingPrice: 1100, quantity: 12, reorderLevel: 4, standingTarget: 4, bottleSize: 750, remainingMl: 750, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p14', code: 'DRFT-001', name: 'Draft Beer Standard', category: 'Draft', unit: 'Bermel', costPrice: 1800, sellingPrice: 25, quantity: 8, reorderLevel: 2, standingTarget: 3, glassCount: 125, remainingDraftGlasses: 125, status: 'active', createdAt: now, updatedAt: now },
  { id: 'p15', code: 'DRFT-002', name: 'Draft Beer Premium', category: 'Draft', unit: 'Bermel', costPrice: 2500, sellingPrice: 35, quantity: 5, reorderLevel: 2, standingTarget: 2, glassCount: 130, remainingDraftGlasses: 90, status: 'active', createdAt: now, updatedAt: now },
];

export const samplePurchases: Purchase[] = [
  { id: 'pu1', date: today, supplier: 'BGI Ethiopia', productId: 'p1', productCode: 'BEER-001', productName: 'Dashen Beer', category: 'Beer', quantity: 240, unit: 'Bottle', costPrice: 25, sellingPrice: 45, totalAmount: 6000, notes: 'Monthly restock', status: 'completed', createdAt: now },
  { id: 'pu2', date: today, supplier: 'Habesha Breweries', productId: 'p2', productCode: 'BEER-002', productName: 'Habesha Beer', category: 'Beer', quantity: 120, unit: 'Bottle', costPrice: 25, sellingPrice: 45, totalAmount: 3000, notes: '', status: 'completed', createdAt: now },
  { id: 'pu3', date: today, supplier: 'Coca Cola Ethiopia', productId: 'p5', productCode: 'SOFT-001', productName: 'Coca Cola', category: 'Soft Drink', quantity: 200, unit: 'Bottle', costPrice: 15, sellingPrice: 30, totalAmount: 3000, notes: 'Weekly order', status: 'completed', createdAt: now },
];

export const sampleSales: Sale[] = [
  {
    id: 's1', date: today, time: '14:30', receiptNo: 'RCP-001',
    items: [
      { id: 'si1', productId: 'p1', productCode: 'BEER-001', productName: 'Dashen Beer', quantity: 5, unitPrice: 45, costPrice: 25, total: 225, profit: 100 },
      { id: 'si2', productId: 'p5', productCode: 'SOFT-001', productName: 'Coca Cola', quantity: 3, unitPrice: 30, costPrice: 15, total: 90, profit: 45 },
    ],
    subtotal: 315, total: 315, totalCost: 170, totalProfit: 145, cashier: 'Admin', notes: '', createdAt: now
  },
  {
    id: 's2', date: today, time: '16:45', receiptNo: 'RCP-002',
    items: [
      { id: 'si3', productId: 'p3', productCode: 'BEER-003', productName: 'Heineken Beer', quantity: 2, unitPrice: 70, costPrice: 40, total: 140, profit: 60 },
      { id: 'si4', productId: 'p8', productCode: 'SOFT-004', productName: 'Water', quantity: 4, unitPrice: 20, costPrice: 8, total: 80, profit: 48 },
    ],
    subtotal: 220, total: 220, totalCost: 112, totalProfit: 108, cashier: 'Admin', notes: '', createdAt: now
  },
];

export const sampleExpenses: Expense[] = [
  { id: 'e1', date: today, type: 'breakage', category: 'Beer', productId: 'p1', productName: 'Dashen Beer', quantity: 3, amount: 75, reason: 'Dropped during stocking', approvedBy: 'Manager', notes: '', createdAt: now },
  { id: 'e2', date: today, type: 'cash', category: 'Utilities', amount: 500, reason: 'Electricity bill', approvedBy: 'Admin', notes: 'Monthly', createdAt: now },
];

export const sampleStandingStock: StandingStock[] = sampleProducts
  .filter(p => p.category !== 'Draft')
  .map(p => ({
    id: `ss-${p.id}`,
    date: today,
    productId: p.id,
    productCode: p.code,
    productName: p.name,
    openingStanding: Math.min(p.standingTarget, p.quantity),
    quantitySold: Math.floor(Math.random() * 30),
    remainingStanding: 0,
    refillQuantity: 0,
    closingStanding: 0,
    target: p.standingTarget,
    notes: '',
    status: 'normal' as const,
  })).map(ss => {
    const remaining = ss.openingStanding - ss.quantitySold;
    const refillNeeded = Math.max(0, ss.target - remaining);
    return {
      ...ss,
      remainingStanding: remaining,
      refillQuantity: refillNeeded,
      closingStanding: remaining,
      status: remaining < 0 ? 'negative' as const : remaining < ss.target * 0.3 ? 'low' as const : 'normal' as const,
    };
  });
