import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Purchase, Sale, Expense, Cost, Exchange, StandingStock, WhiskeySale, WhiskeyPurchase, DraftSale, DraftPurchase } from '@/types/models';
import { sampleProducts, samplePurchases, sampleSales, sampleExpenses, sampleStandingStock } from '@/data/sampleData';

interface AppState {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  costs: Cost[];
  exchanges: Exchange[];
  standingStock: StandingStock[];
  whiskeySales: WhiskeySale[];
  whiskeyPurchases: WhiskeyPurchase[];
  draftSales: DraftSale[];
  draftPurchases: DraftPurchase[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  setCosts: React.Dispatch<React.SetStateAction<Cost[]>>;
  setExchanges: React.Dispatch<React.SetStateAction<Exchange[]>>;
  setStandingStock: React.Dispatch<React.SetStateAction<StandingStock[]>>;
  setWhiskeySales: React.Dispatch<React.SetStateAction<WhiskeySale[]>>;
  setWhiskeyPurchases: React.Dispatch<React.SetStateAction<WhiskeyPurchase[]>>;
  setDraftSales: React.Dispatch<React.SetStateAction<DraftSale[]>>;
  setDraftPurchases: React.Dispatch<React.SetStateAction<DraftPurchase[]>>;
  addProduct: (p: Product) => void;
  addPurchase: (p: Purchase) => void;
  addSale: (s: Sale) => void;
  addExpense: (e: Expense) => void;
  addCost: (c: Cost) => void;
  addExchange: (e: Exchange) => void;
  addWhiskeySale: (w: WhiskeySale) => void;
  addWhiskeyPurchase: (wp: WhiskeyPurchase) => void;
  addDraftSale: (d: DraftSale) => void;
  addDraftPurchase: (dp: DraftPurchase) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  deletePurchase: (id: string) => void;
  getNextProductCode: (category: string) => string;
  refillStanding: (productId: string, quantity: number) => void;
}

const AppContext = createContext<AppState | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => loadFromStorage('bar_products', sampleProducts));
  const [purchases, setPurchases] = useState<Purchase[]>(() => loadFromStorage('bar_purchases', samplePurchases));
  const [sales, setSales] = useState<Sale[]>(() => loadFromStorage('bar_sales', sampleSales));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadFromStorage('bar_expenses', sampleExpenses));
  const [costs, setCosts] = useState<Cost[]>(() => loadFromStorage('bar_costs', []));
  const [exchanges, setExchanges] = useState<Exchange[]>(() => loadFromStorage('bar_exchanges', []));
  const [standingStock, setStandingStock] = useState<StandingStock[]>(() => loadFromStorage('bar_standing', sampleStandingStock));
  const [whiskeySales, setWhiskeySales] = useState<WhiskeySale[]>(() => loadFromStorage('bar_whiskey_sales', []));
  const [whiskeyPurchases, setWhiskeyPurchases] = useState<WhiskeyPurchase[]>(() => loadFromStorage('bar_whiskey_purchases', []));
  const [draftSales, setDraftSales] = useState<DraftSale[]>(() => loadFromStorage('bar_draft_sales', []));
  const [draftPurchases, setDraftPurchases] = useState<DraftPurchase[]>(() => loadFromStorage('bar_draft_purchases', []));

  useEffect(() => { localStorage.setItem('bar_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('bar_purchases', JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem('bar_sales', JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem('bar_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('bar_costs', JSON.stringify(costs)); }, [costs]);
  useEffect(() => { localStorage.setItem('bar_exchanges', JSON.stringify(exchanges)); }, [exchanges]);
  useEffect(() => { localStorage.setItem('bar_standing', JSON.stringify(standingStock)); }, [standingStock]);
  useEffect(() => { localStorage.setItem('bar_whiskey_sales', JSON.stringify(whiskeySales)); }, [whiskeySales]);
  useEffect(() => { localStorage.setItem('bar_whiskey_purchases', JSON.stringify(whiskeyPurchases)); }, [whiskeyPurchases]);
  useEffect(() => { localStorage.setItem('bar_draft_sales', JSON.stringify(draftSales)); }, [draftSales]);
  useEffect(() => { localStorage.setItem('bar_draft_purchases', JSON.stringify(draftPurchases)); }, [draftPurchases]);

  const getNextProductCode = (category: string) => {
    const prefixMap: Record<string, string> = {
      'Beer': 'BEER', 'Soft Drink': 'SOFT', 'Wine': 'WINE',
      'Whiskey': 'WHSK', 'Draft': 'DRFT', 'Other': 'OTHR'
    };
    const prefix = prefixMap[category] || 'OTHR';
    const existing = products.filter(p => p.code.startsWith(prefix));
    const maxNum = existing.reduce((max, p) => {
      const num = parseInt(p.code.split('-')[1] || '0');
      return num > max ? num : max;
    }, 0);
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const addProduct = (p: Product) => setProducts(prev => [...prev, p]);

  const addPurchase = (p: Purchase) => {
    setPurchases(prev => [...prev, p]);
    setProducts(prev => prev.map(prod =>
      prod.id === p.productId
        ? { ...prod, quantity: prod.quantity + p.quantity, updatedAt: new Date().toISOString() }
        : prod
    ));
    const cost: Cost = {
      id: `cost-auto-${Date.now()}`, date: p.date, type: 'purchase',
      productId: p.productId, productName: p.productName, amount: p.totalAmount,
      notes: `Auto from purchase: ${p.productName} x${p.quantity}`, createdAt: new Date().toISOString(),
    };
    setCosts(prev => [...prev, cost]);
  };

  const addSale = (s: Sale) => {
    setSales(prev => [...prev, s]);
    s.items.forEach(item => {
      setStandingStock(prev => prev.map(ss =>
        ss.productId === item.productId ? {
          ...ss, quantitySold: ss.quantitySold + item.quantity,
          remainingStanding: ss.remainingStanding - item.quantity,
          closingStanding: ss.closingStanding - item.quantity,
          status: (ss.remainingStanding - item.quantity) < 0 ? 'negative' : (ss.remainingStanding - item.quantity) < ss.target * 0.3 ? 'low' : 'normal',
        } : ss
      ));
      setProducts(prev => prev.map(prod =>
        prod.id === item.productId ? { ...prod, quantity: prod.quantity - item.quantity } : prod
      ));
    });
  };

  const addExpense = (e: Expense) => {
    setExpenses(prev => [...prev, e]);
    if (e.productId && e.quantity) {
      setProducts(prev => prev.map(prod =>
        prod.id === e.productId ? { ...prod, quantity: prod.quantity - (e.quantity || 0) } : prod
      ));
    }
  };

  const addCost = (c: Cost) => setCosts(prev => [...prev, c]);

  const addExchange = (e: Exchange) => {
    setExchanges(prev => [...prev, e]);
    setProducts(prev => prev.map(p => {
      if (p.id === e.fromProductId) return { ...p, quantity: p.quantity - e.quantity };
      if (p.id === e.toProductId) return { ...p, quantity: p.quantity + e.quantity };
      return p;
    }));
    setStandingStock(prev => prev.map(ss =>
      ss.productId === e.toProductId ? {
        ...ss, remainingStanding: ss.remainingStanding + e.quantity,
        closingStanding: ss.closingStanding + e.quantity,
        status: (ss.remainingStanding + e.quantity) < 0 ? 'negative' : (ss.remainingStanding + e.quantity) < ss.target * 0.3 ? 'low' : 'normal',
      } : ss
    ));
  };

  const addWhiskeySale = (w: WhiskeySale) => {
    setWhiskeySales(prev => [...prev, w]);
    // Bottle sales reduce quantity; cc sales are tracked in WhiskeyPage via open bottle logic
  };

  const addWhiskeyPurchase = (wp: WhiskeyPurchase) => {
    setWhiskeyPurchases(prev => [...prev, wp]);
    setProducts(prev => prev.map(p =>
      p.id === wp.productId ? { ...p, quantity: p.quantity + wp.bottles, costPrice: wp.costPerBottle, updatedAt: new Date().toISOString() } : p
    ));
    const cost: Cost = {
      id: `cost-whsk-${Date.now()}`, date: wp.date, type: 'whiskey',
      productId: wp.productId, productName: wp.productName, amount: wp.totalAmount,
      notes: `Whiskey purchase: ${wp.productName} x${wp.bottles} bottles`, createdAt: new Date().toISOString(),
    };
    setCosts(prev => [...prev, cost]);
  };

  const addDraftSale = (d: DraftSale) => {
    setDraftSales(prev => [...prev, d]);
    // Only normal glasses affect bermel stock (not extra glasses)
    const product = products.find(p => p.id === d.productId);
    if (product) {
      setProducts(prev => prev.map(p => p.id === d.productId ? { ...p, remainingDraftGlasses: (p.remainingDraftGlasses || 0) - d.glassesSold } : p));
    }
  };

  const addDraftPurchase = (dp: DraftPurchase) => {
    setDraftPurchases(prev => [...prev, dp]);
    // Add bermels to product quantity
    setProducts(prev => prev.map(p =>
      p.id === dp.productId ? {
        ...p,
        quantity: p.quantity + dp.bermels,
        costPrice: dp.costPerBermel, // update cost price to latest
        updatedAt: new Date().toISOString(),
      } : p
    ));
    // Auto-create cost record
    const cost: Cost = {
      id: `cost-draft-${Date.now()}`, date: dp.date, type: 'draft',
      productId: dp.productId, productName: dp.productName, amount: dp.totalAmount,
      notes: `Draft purchase: ${dp.productName} x${dp.bermels} bermels`, createdAt: new Date().toISOString(),
    };
    setCosts(prev => [...prev, cost]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
  const deleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  const deletePurchase = (id: string) => setPurchases(prev => prev.filter(p => p.id !== id));

  const refillStanding = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const availableQty = Math.min(quantity, product.quantity);
    const actualRefill = availableQty > 0 ? availableQty : 0;
    const shortage = quantity - actualRefill;
    if (actualRefill > 0) {
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, quantity: p.quantity - actualRefill } : p
      ));
    }
    setStandingStock(prev => prev.map(ss => {
      if (ss.productId !== productId) return ss;
      const newRemaining = ss.remainingStanding + actualRefill;
      return {
        ...ss, refillQuantity: actualRefill, remainingStanding: newRemaining, closingStanding: newRemaining,
        status: newRemaining < 0 ? 'negative' : newRemaining < ss.target * 0.3 ? 'low' : 'normal',
        notes: shortage > 0 ? `Shortage: ${shortage} units not available in inventory` : ss.notes,
      };
    }));
  };

  return (
    <AppContext.Provider value={{
      products, purchases, sales, expenses, costs, exchanges, standingStock, whiskeySales, whiskeyPurchases, draftSales, draftPurchases,
      setProducts, setPurchases, setSales, setExpenses, setCosts, setExchanges, setStandingStock, setWhiskeySales, setWhiskeyPurchases, setDraftSales, setDraftPurchases,
      addProduct, addPurchase, addSale, addExpense, addCost, addExchange, addWhiskeySale, addWhiskeyPurchase, addDraftSale, addDraftPurchase,
      updateProduct, deleteProduct, deletePurchase, getNextProductCode, refillStanding,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
