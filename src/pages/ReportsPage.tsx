import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import PrintButton from '@/components/PrintButton';

// Fallback for case matching outside component to avoid ReferenceError
function fromDbCatFallback(dbCat: string | undefined) {
   if (!dbCat) return 'Other';
   switch(dbCat) {
     case 'beer': return 'Beer';
     case 'soft_drink': return 'Soft Drink';
     case 'wine': return 'Wine';
     case 'whiskey': return 'Whiskey';
     case 'draft': return 'Draft';
     default: return 'Other';
   }
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [products, setProducts] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [salesBatches, setSalesBatches] = useState<any[]>([]);
  const [salesItems, setSalesItems] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [whiskeySales, setWhiskeySales] = useState<any[]>([]);
  const [whiskeyPurchases, setWhiskeyPurchases] = useState<any[]>([]);
  const [draftSales, setDraftSales] = useState<any[]>([]);
  const [draftPurchases, setDraftPurchases] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);

  const loadAll = async () => {
    setLoading(true);
    const [
      prodRes,
      stockRes,
      batchRes,
      itemsRes,
      expRes,
      costRes,
      whiskSalesRes,
      whiskPurchRes,
      draftSalesRes,
      draftPurchRes,
      purchRes,
      exchangesRes
    ] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("standing_stock").select("*"),
      supabase.from("pos_sales_batches").select("*"),
      supabase.from("pos_sale_items").select("*"),
      supabase.from("expenses").select("*"),
      supabase.from("costs").select("*"),
      supabase.from("whiskey_sales").select("*"),
      supabase.from("whiskey_purchases").select("*"),
      supabase.from("draft_sales").select("*"),
      supabase.from("draft_purchases").select("*"),
      supabase.from("purchases").select("*"),
      supabase.from("exchanges").select("*"),
    ]);

    if (prodRes.data) setProducts(prodRes.data);
    if (stockRes.data) setStock(stockRes.data);
    if (batchRes.data) setSalesBatches(batchRes.data);
    if (itemsRes.data) setSalesItems(itemsRes.data);
    if (expRes.data) setExpenses(expRes.data);
    if (costRes.data) setCosts(costRes.data);
    if (whiskSalesRes.data) setWhiskeySales(whiskSalesRes.data);
    if (whiskPurchRes.data) setWhiskeyPurchases(whiskPurchRes.data);
    if (draftSalesRes.data) setDraftSales(draftSalesRes.data);
    if (draftPurchRes.data) setDraftPurchases(draftPurchRes.data);
    if (purchRes.data) setPurchases(purchRes.data);
    if (exchangesRes.data) setExchanges(exchangesRes.data);

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const isDateInRange = (dateStr: string) => {
    if (dateFilter === 'all') return true;
    if (!dateStr) return false;
    
    // Parse the date
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'daily') {
       const itemD = new Date(itemDate);
       itemD.setHours(0,0,0,0);
       return itemD.getTime() === today.getTime();
    }
    if (dateFilter === 'weekly') {
       const weekAgo = new Date(today);
       weekAgo.setDate(weekAgo.getDate() - 7);
       return itemDate >= weekAgo;
    }
    if (dateFilter === 'monthly') {
       const monthAgo = new Date(today);
       monthAgo.setDate(monthAgo.getDate() - 30);
       return itemDate >= monthAgo;
    }
    if (dateFilter === 'custom') {
       if (!customStart || !customEnd) return true;
       const start = new Date(customStart);
       start.setHours(0,0,0,0);
       const end = new Date(customEnd);
       end.setHours(23,59,59,999);
       return itemDate >= start && itemDate <= end;
    }
    return true;
  };

  // Filter Data Arrays Based on Date
  const filteredBatches = useMemo(() => salesBatches.filter(b => isDateInRange(b.sale_date)), [salesBatches, dateFilter, customStart, customEnd]);
  const filteredWhiskSales = useMemo(() => whiskeySales.filter(w => isDateInRange(w.sale_date)), [whiskeySales, dateFilter, customStart, customEnd]);
  const filteredWhiskPurchases = useMemo(() => whiskeyPurchases.filter(w => isDateInRange(w.purchase_date)), [whiskeyPurchases, dateFilter, customStart, customEnd]);
  const filteredDraftSales = useMemo(() => draftSales.filter(d => isDateInRange(d.sale_date)), [draftSales, dateFilter, customStart, customEnd]);
  const filteredDraftPurchases = useMemo(() => draftPurchases.filter(d => isDateInRange(d.purchase_date)), [draftPurchases, dateFilter, customStart, customEnd]);
  const filteredPurchases = useMemo(() => purchases.filter(p => isDateInRange(p.purchase_date)), [purchases, dateFilter, customStart, customEnd]);
  const filteredExpenses = useMemo(() => expenses.filter(e => isDateInRange(e.expense_date)), [expenses, dateFilter, customStart, customEnd]);
  const filteredCosts = useMemo(() => costs.filter(c => isDateInRange(c.cost_date)), [costs, dateFilter, customStart, customEnd]);
  const filteredExchanges = useMemo(() => exchanges.filter(e => isDateInRange(e.exchange_date)), [exchanges, dateFilter, customStart, customEnd]);

  // Aggregate POS Items using filtered batches
  const filteredPosItems = useMemo(() => {
    const batchIds = new Set(filteredBatches.map(b => b.id));
    return salesItems.filter(i => batchIds.has(i.batch_id));
  }, [salesItems, filteredBatches]);

  // Calculations
  const calcData = useMemo(() => {
    // POS
    let posRev = 0;
    let posCost = 0;
    filteredPosItems.forEach(item => {
      const p = products.find(prod => prod.id === item.product_id);
      const qty = Number(item.quantity_sold) || 0;
      const up = Number(item.unit_price) || 0;
      const cp = p ? Number(p.cost_price) || 0 : 0;
      posRev += qty * up;
      posCost += qty * cp;
    });
    const posProfit = posRev - posCost;

    // Whiskey
    const wRev = filteredWhiskSales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
    const wCost = filteredWhiskSales.reduce((s, x) => s + (Number(x.cost_price) || 0) * (Number(x.quantity_sold) || 0), 0);
    const wProfit = wRev - wCost;
    const wPurchases = filteredWhiskPurchases.reduce((s, x) => s + (Number(x.total_price) || 0), 0);

    // Draft
    const dRev = filteredDraftSales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
    const dCost = filteredDraftSales.reduce((s, x) => s + (Number(x.cost_per_glass) || 0) * (Number(x.quantity_sold) || 0), 0);
    const dProfit = dRev - dCost;
    const dPurchases = filteredDraftPurchases.reduce((s, x) => s + ((Number(x.cost_per_bermel) || 0) * (Number(x.bermels) || 0)), 0);

    // General Purchases
    const genPurch = filteredPurchases.reduce((s, p) => s + ((Number(p.cost_price) || 0) * (Number(p.quantity) || 0)), 0);

    // Expenses & Costs
    const cashExp = filteredExpenses.filter(e => e.expense_kind === 'cash').reduce((s, e) => s + Number(e.amount || 0), 0);
    const drinkExp = filteredExpenses.filter(e => e.expense_kind === 'drink').reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalCosts = filteredCosts.reduce((s, c) => s + Number(c.amount || 0), 0);
    
    // Totals
    const totalSales = posRev + wRev + dRev;
    const totalPosCostAll = posCost + wCost + dCost;
    const totalPurchaseTotals = genPurch + wPurchases + dPurchases; // separate metric
    
    const grossProfit = totalSales - totalPosCostAll;
    const totalOpExp = cashExp + drinkExp + totalCosts;
    const netProfit = grossProfit - totalOpExp;

    return {
      posRev, posCost, posProfit,
      wRev, wCost, wProfit, wPurchases,
      dRev, dCost, dProfit, dPurchases,
      genPurch, cashExp, drinkExp, totalCosts, totalSales, totalPurchaseTotals,
      totalPosCostAll, grossProfit, totalOpExp, netProfit
    };
  }, [filteredPosItems, products, filteredWhiskSales, filteredWhiskPurchases, filteredDraftSales, filteredDraftPurchases, filteredPurchases, filteredExpenses, filteredCosts]);

  // View Helpers
  const stockInfo = useMemo(() => {
    const totalProdCount = products.length;
    const totalQty = products.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
    const stockValue = products.reduce((s, p) => s + ((Number(p.quantity) || 0) * (Number(p.cost_price) || 0)), 0);
    const standingLines = stock.length;
    const lowStock = products.filter(p => (p.quantity || 0) <= 5).length;
    return { totalProdCount, totalQty, stockValue, standingLines, lowStock };
  }, [products, stock]);

  const catChart = useMemo(() => {
    return ['Beer', 'Soft Drink', 'Wine', 'Whiskey', 'Draft'].map(cat => {
      const salesRev = filteredPosItems
         .filter(i => fromDbCatFallback(products.find(p => p.id === i.product_id)?.category) === cat)
         .reduce((s, i) => s + ((Number(i.quantity_sold)||0) * (Number(i.unit_price)||0)), 0);
      
      let extra = 0;
      if (cat === 'Whiskey') extra = calcData.wRev;
      if (cat === 'Draft') extra = calcData.dRev;

      return { name: cat, revenue: salesRev + extra };
    });
  }, [filteredPosItems, products, calcData]);

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground animate-pulse font-heading">Crunching numbers...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="module-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="module-title">Reports & Analytics</h1>
          <p className="module-subtitle">Supabase synced performance overview</p>
        </div>
        
        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-2">
            <PrintButton />

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-36 bg-background border-input border rounded-md px-3 py-2 text-sm shadow-sm">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="daily">Daily (Today)</SelectItem>
                <SelectItem value="weekly">Past 7 Days</SelectItem>
                <SelectItem value="monthly">Past 30 Days</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>
            {dateFilter === 'custom' && (
              <div className="flex gap-2">
                 <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-36" />
                 <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-36" />
              </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total Sales Revenue</p><p className="text-xl font-bold font-heading mt-1 text-primary">ETB {calcData.totalSales.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total Sales Cost</p><p className="text-xl font-bold font-heading mt-1">ETB {calcData.totalPosCostAll.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Gross Profit</p><p className="text-xl font-bold font-heading mt-1 text-success">ETB {calcData.grossProfit.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Net Profit</p><p className={`text-xl font-bold font-heading mt-1 ${calcData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>ETB {calcData.netProfit.toLocaleString()}</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card bg-primary/5 border-primary/20"><p className="text-xs font-semibold mb-2">POS SUMMARY</p>
          <div className="space-y-1"><p className="text-xs flex justify-between"><span>Revenue:</span> <span className="font-mono">ETB {calcData.posRev.toLocaleString()}</span></p><p className="text-xs text-muted-foreground flex justify-between"><span>Cost:</span> <span className="font-mono">ETB {calcData.posCost.toLocaleString()}</span></p><p className="text-xs font-bold text-success flex justify-between mt-2 pt-2 border-t border-dashed"><span>Profit:</span> <span className="font-mono">ETB {calcData.posProfit.toLocaleString()}</span></p></div>
        </div>
        <div className="kpi-card bg-[hsl(217,91%,60%)]/5 border-[hsl(217,91%,60%)]/20"><p className="text-xs font-semibold mb-2">DRAFT SUMMARY</p>
          <div className="space-y-1"><p className="text-xs flex justify-between"><span>Revenue:</span> <span className="font-mono">ETB {calcData.dRev.toLocaleString()}</span></p><p className="text-xs text-muted-foreground flex justify-between"><span>Cost:</span> <span className="font-mono">ETB {calcData.dCost.toLocaleString()}</span></p><p className="text-xs font-bold text-success flex justify-between mt-2 pt-2 border-t border-dashed"><span>Profit:</span> <span className="font-mono">ETB {calcData.dProfit.toLocaleString()}</span></p></div>
        </div>
        <div className="kpi-card bg-[hsl(38,92%,50%)]/5 border-[hsl(38,92%,50%)]/20"><p className="text-xs font-semibold mb-2">WHISKEY SUMMARY</p>
          <div className="space-y-1"><p className="text-xs flex justify-between"><span>Revenue:</span> <span className="font-mono">ETB {calcData.wRev.toLocaleString()}</span></p><p className="text-xs text-muted-foreground flex justify-between"><span>Cost:</span> <span className="font-mono">ETB {calcData.wCost.toLocaleString()}</span></p><p className="text-xs font-bold text-success flex justify-between mt-2 pt-2 border-t border-dashed"><span>Profit:</span> <span className="font-mono">ETB {calcData.wProfit.toLocaleString()}</span></p></div>
        </div>
        <div className="kpi-card"><p className="text-xs font-semibold mb-2 text-muted-foreground">PURCHASES</p>
          <div className="space-y-1"><p className="text-xs text-muted-foreground flex justify-between"><span>General:</span> <span className="font-mono">ETB {calcData.genPurch.toLocaleString()}</span></p><p className="text-xs text-muted-foreground flex justify-between"><span>Draft:</span> <span className="font-mono">ETB {calcData.dPurchases.toLocaleString()}</span></p><p className="text-xs text-muted-foreground flex justify-between"><span>Whiskey:</span> <span className="font-mono">ETB {calcData.wPurchases.toLocaleString()}</span></p><p className="text-xs font-bold flex justify-between mt-2 pt-2 border-t border-dashed"><span>Total:</span> <span className="font-mono text-primary">ETB {calcData.totalPurchaseTotals.toLocaleString()}</span></p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card bg-destructive/5 border-destructive/20"><p className="text-xs font-semibold mb-2 text-destructive">DRINK EXPENSES</p><p className="text-xl font-bold font-heading text-destructive mt-1">ETB {calcData.drinkExp.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs font-semibold mb-2 text-blue-600">CASH EXPENSES</p><p className="text-xl font-bold font-heading text-blue-600 mt-1">ETB {calcData.cashExp.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs font-semibold mb-2 text-muted-foreground">OTHER COSTS</p><p className="text-xl font-bold font-heading mt-1">ETB {calcData.totalCosts.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs font-semibold mb-2 text-muted-foreground">EXCHANGES</p><p className="text-xl font-bold font-heading mt-1">{filteredExchanges.length} Record(s)</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Inventory Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded flex flex-col justify-center items-center">
              <span className="text-xs text-muted-foreground">Unique Products</span>
              <span className="text-2xl font-bold mt-1 font-mono">{stockInfo.totalProdCount}</span>
            </div>
            <div className="p-3 bg-muted rounded flex flex-col justify-center items-center">
              <span className="text-xs text-muted-foreground">Total Units in Stock</span>
              <span className="text-2xl font-bold mt-1 font-mono">{stockInfo.totalQty}</span>
            </div>
            <div className="p-3 bg-muted rounded flex flex-col justify-center items-center">
              <span className="text-xs text-muted-foreground">Total Stock Value</span>
              <span className="text-lg font-bold mt-1 font-mono text-success">ETB {stockInfo.stockValue.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-muted rounded flex flex-col justify-center items-center">
              <span className="text-xs text-muted-foreground">Products Low Stock</span>
              <span className="text-2xl font-bold mt-1 font-mono text-destructive">{stockInfo.lowStock}</span>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-4 font-heading text-destructive flex gap-2 items-center">
            Drink Expenses Breakdown 
            <span className="bg-destructive/10 text-destructive text-[10px] px-2 py-0.5 rounded-full">{filteredExpenses.filter(e => e.expense_kind === 'drink').length} items</span>
          </h3>
           <div className="overflow-y-auto max-h-[190px] pr-2">
             {filteredExpenses.filter(e => e.expense_kind === 'drink').length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No Drink Expenses Tracked</p>
             ) : (
                <div className="space-y-2">
                  {filteredExpenses.filter(e => e.expense_kind === 'drink').map((e, index) => {
                     const pname = products.find(p => String(p.id) === String(e.product_id))?.name || 'Unknown Item';
                     return (
                        <div key={index} className="flex justify-between items-center bg-destructive/5 p-3 rounded-md border border-destructive/20 border-dashed">
                          <div>
                            <p className="font-bold text-destructive text-sm leading-tight">{pname}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Quantity: {e.quantity} · {e.expense_date}</p>
                          </div>
                          <div className="font-bold text-destructive font-mono">ETB {Number(e.amount).toLocaleString()}</div>
                        </div>
                     )
                  })}
                </div>
             )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Total Revenue by Category (POS + Draft + Whiskey)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `ETB ${v.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
