import { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleItem } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, Printer, RotateCcw, CalendarDays, AlertTriangle, Pencil, Eye } from 'lucide-react';
import CalendarHistory from '@/components/CalendarHistory';
import PrintButton from '@/components/PrintButton';

interface BulkRow {
  productId: string;
  quantity: string;
}

export default function POSPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [standingStock, setStandingStock] = useState<any[]>([]);

  const loadAll = async () => {
    const [prodRes, batchRes, itemsRes, standingRes, expRes] = await Promise.all([
      supabase.from("products").select("*").order("id", { ascending: true }),
      supabase.from("pos_sales_batches").select("*").order("sale_date", { ascending: false }).order("id", { ascending: false }),
      supabase.from("pos_sale_items").select("*"),
      supabase.from("standing_stock").select("*"),
      supabase.from("expenses").select("*").eq("expense_kind", "drink")
    ]);

    if (prodRes.data) setProducts(prodRes.data);
    if (standingRes.data) setStandingStock(standingRes.data);

    if (batchRes.data && itemsRes.data) {
      const mappedSales = batchRes.data.map(b => {
        const items = itemsRes.data.filter(i => i.batch_id === b.id).map(i => {
           const p = prodRes.data?.find(pr => pr.id === i.product_id);
           return {
             id: String(i.id),
             productId: String(i.product_id), // ensuring string compat
             productName: p?.name || 'Unknown',
             quantity: i.quantity_sold,
             unitPrice: i.unit_price,
             costPrice: i.cost_price,
             total: i.quantity_sold * i.unit_price,
             profit: (i.unit_price - i.cost_price) * i.quantity_sold
           };
        });
        const subtotal = items.reduce((sum, i) => sum + i.total, 0);
        const totalCostCalc = items.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0);
        return {
          id: String(b.id),
          date: b.sale_date,
          time: new Date(b.created_at).toTimeString().slice(0, 5),
          receiptNo: `RCP-${b.id}`,
          items,
          subtotal: subtotal,
          total: subtotal,
          totalCost: totalCostCalc,
          totalProfit: subtotal - totalCostCalc,
          cashier: b.cashier || 'Admin',
          notes: b.notes || '',
        };
      });
      
      let finalSales = mappedSales;
      
      if (expRes.data) {
        const expenseSales = expRes.data.map((e: any) => {
           const p = prodRes.data?.find(pr => pr.id === e.product_id);
           if (!p) return null;
           
           return {
             id: `exp-${e.id}`,
             date: e.expense_date,
             time: new Date(e.created_at).toTimeString().slice(0, 5),
             receiptNo: `EXP-${e.id}`,
             items: [{
               id: `expi-${e.id}`,
               productId: String(e.product_id),
               productName: p?.name || 'Unknown',
               quantity: e.quantity,
               quantityText: e.notes?.includes('[Whiskey CC]') ? `${e.quantity} cc` : `${e.quantity}`,
               unitPrice: e.amount / (e.quantity || 1),
               costPrice: p?.cost_price || 0,
               total: e.amount,
               profit: 0
             }],
             subtotal: 0,
             total: 0, 
             totalCost: 0,
             totalProfit: 0,
             cashier: e.approved_by || 'Admin',
             notes: e.reason || 'Drink Expense',
             createdAt: e.created_at,
             isExpense: true,
             expenseAmount: e.amount
           };
        }).filter(Boolean);
        
        finalSales = [...mappedSales, ...expenseSales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      
      setSales(finalSales);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const saleable = products.filter(p => (p.is_active !== false) && p.category !== 'Draft' && p.category !== 'Whiskey');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().split('T')[0];

  const [saleDate, setSaleDate] = useState(defaultDate);
  const [cashier, setCashier] = useState('Admin');
  const [rows, setRows] = useState<BulkRow[]>([
    { productId: '', quantity: '' },
    { productId: '', quantity: '' },
    { productId: '', quantity: '' },
  ]);

  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const selectedDateLabel = useMemo(() => {
    const d = new Date(saleDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [saleDate]);

  const addRow = () => setRows(prev => [...prev, { productId: '', quantity: '' }]);
  const updateRow = (i: number, field: keyof BulkRow, value: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };
  const removeRow = (i: number) => {
    setRows(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  };
  const resetRows = () => {
    setRows([{ productId: '', quantity: '' }, { productId: '', quantity: '' }, { productId: '', quantity: '' }]);
    setEditingSaleId(null);
  };

  const getStandingQty = (productId: string) => {
    const ss = standingStock.find(s => String(s.product_id) === String(productId));
    return ss ? Number(ss.current_quantity || 0) : 0;
  };

  const summary = useMemo(() => {
    let totalProducts = 0, totalQty = 0, totalSales = 0, totalCost = 0;
    rows.forEach(r => {
      const p = products.find(pr => String(pr.id) === String(r.productId));
      const qty = Number(r.quantity || 0);
      if (p && qty > 0) {
        totalProducts++;
        totalQty += qty;
        totalSales += qty * Number(p.selling_price || 0);
        totalCost += qty * Number(p.cost_price || 0);
      }
    });
    return { totalProducts, totalQty, totalSales, totalCost, totalProfit: totalSales - totalCost };
  }, [rows, products]);

  const hasValidationError = useMemo(() => {
    return rows.some(r => {
      if (!r.productId || !r.quantity) return false;
      const qty = Number(r.quantity);
      if (qty <= 0) return false;
      const p = products.find(pr => String(pr.id) === String(r.productId));
      const ss = standingStock.find(s => String(s.product_id) === String(r.productId));
      const standingTarget = ss ? Number(ss.target_quantity ?? p?.standing_target ?? 0) : 0;
      const maxQty = standingTarget > 0 ? standingTarget : Number(p?.quantity || 0);
      return qty > maxQty;
    });
  }, [rows, products, standingStock]);

  const saveBulkEntry = async () => {
    const validRows = rows.filter(r => r.productId && Number(r.quantity) > 0);
    if (validRows.length === 0) return;

    let subtotal = 0;
    let totalCost = 0;
    
    // items array for ui local logic simulation if needed, but we save directly
    const itemsToInsert = validRows.map(r => {
      const p = products.find(pr => String(pr.id) === r.productId);
      const qty = Number(r.quantity);
      const sp = Number(p?.selling_price || 0);
      const cp = Number(p?.cost_price || 0);
      subtotal += qty * sp;
      totalCost += qty * cp;
      return {
        product_id: Number(r.productId),
        quantity_sold: qty,
        unit_price: sp,
        cost_price: cp
      };
    });

    const totalProfit = subtotal - totalCost;

    if (editingSaleId) {
      // For edit, deduct old standing stock back, calculate new
       const oldSale = sales.find(s => s.id === editingSaleId);
       if (oldSale) {
         for (const oldItem of oldSale.items) {
           const ss = standingStock.find(s => String(s.product_id) === String(oldItem.productId));
           const p = products.find(pr => String(pr.id) === String(oldItem.productId));
           if (ss) {
             const newTarget = Number(ss.target_quantity ?? p?.standing_target ?? 0) + oldItem.quantity;

             await supabase.from("standing_stock").update({
               target_quantity: newTarget,
             }).eq("product_id", oldItem.productId);

             if (p) {
               await supabase.from("products").update({
                 standing_target: newTarget,
               }).eq("id", oldItem.productId);
             }
           } else if (p) {
             await supabase.from("products").update({
               quantity: Number(p.quantity || 0) + oldItem.quantity,
             }).eq("id", oldItem.productId);
           }
         }
       }
       
       await supabase.from("pos_sale_items").delete().eq("batch_id", Number(editingSaleId));
       const { error: upErr } = await supabase.from("pos_sales_batches").update({
         sale_date: saleDate, cashier
       }).eq("id", Number(editingSaleId));
       
       if (!upErr) {
           await supabase.from("pos_sale_items").insert(itemsToInsert.map(i => ({...i, batch_id: Number(editingSaleId)})));
       }
    } else {
      // New Sale
      const { data: batch, error: batchErr } = await supabase.from("pos_sales_batches").insert({
        sale_date: saleDate,
        cashier: cashier,
        created_at: new Date().toISOString()
      }).select().single();

      if (!batchErr && batch) {
         // Create items array mapping to DB schema names
         const itemsFinal = itemsToInsert.map(i => ({
           batch_id: batch.id,
           product_id: i.product_id,
           quantity_sold: i.quantity_sold,
           unit_price: i.unit_price,
           cost_price: i.cost_price,
           created_at: new Date().toISOString()
         }));
         await supabase.from("pos_sale_items").insert(itemsFinal);
      } else {
         console.error("Batch save err", batchErr);
         alert("Failed to save batch: " + (batchErr?.message || "Unknown error"));
         return;
      }
    }

    // Apply standing stock vs inventory deductions
    for (const item of itemsToInsert) {
       const ss = standingStock.find(s => String(s.product_id) === String(item.product_id));
       const p = products.find(pr => String(pr.id) === String(item.product_id));
       let qtyToDeduct = item.quantity_sold;
       let newStandingTarget = ss ? Number(ss.target_quantity ?? p?.standing_target ?? 0) : 0;
       let newStoreQty = p ? Number(p.quantity || 0) : 0;

       const productUpdates: any = {};
       let productNeedsUpdate = false;

       if (ss && newStandingTarget > 0) {
         const deductFromFridge = Math.min(newStandingTarget, qtyToDeduct);
         newStandingTarget -= deductFromFridge;
         qtyToDeduct -= deductFromFridge;
         
         await supabase.from("standing_stock").update({
           target_quantity: newStandingTarget,
         }).eq("product_id", item.product_id);
         
         productUpdates.standing_target = newStandingTarget;
         productNeedsUpdate = true;
       }
       
       if (qtyToDeduct > 0 && p) {
         newStoreQty -= qtyToDeduct;
         productUpdates.quantity = newStoreQty;
         productNeedsUpdate = true;
       }
       
       if (productNeedsUpdate && p) {
         await supabase.from("products").update(productUpdates).eq("id", item.product_id);
       }
    }

    setEditingSaleId(null);
    resetRows();
    await loadAll();
  };

  const editSale = (sale: any) => {
    if (sale.isExpense) {
      alert("Cannot edit an expense entry from the sales view. Please use the Expenses page.");
      return;
    }
    setEditingSaleId(sale.id);
    setSaleDate(sale.date);
    setCashier(sale.cashier);
    setRows(sale.items.map((item: any) => ({ productId: item.productId, quantity: String(item.quantity) })));
  };

  const deleteSale = async (sale: any) => {
    if (sale.isExpense) {
      alert("Cannot delete an expense entry from the sales view. Please use the Expenses page.");
      return;
    }
    // Reverse standing stock or inventory
    for (const item of sale.items) {
       const ss = standingStock.find(s => String(s.product_id) === String(item.productId));
       const p = products.find(pr => String(pr.id) === String(item.productId));
       if (ss) {
         const newTarget = Number(ss.target_quantity ?? p?.standing_target ?? 0) + item.quantity;
         await supabase.from("standing_stock").update({
           target_quantity: newTarget,
         }).eq("product_id", item.productId);

         if (p) {
           await supabase.from("products").update({
             standing_target: newTarget,
           }).eq("id", item.productId);
         }
       } else if (p) {
         await supabase.from("products").update({
           quantity: Number(p.quantity || 0) + item.quantity,
         }).eq("id", item.productId);
       }
    }
    // Delete batch, items cascade usually but we explicitly delete to be safe
    await supabase.from("pos_sale_items").delete().eq("batch_id", Number(sale.id));
    await supabase.from("pos_sales_batches").delete().eq("id", Number(sale.id));
    await loadAll();
  };

  const selectedDateSales = sales.filter(s => s.date === saleDate);
  const selectedRevenue = selectedDateSales.reduce((s, sale) => s + sale.total, 0);
  const selectedProfit = selectedDateSales.reduce((s, sale) => s + sale.totalProfit, 0);
  const selectedItemsSold = selectedDateSales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0);

  const allItemsForDate = selectedDateSales.flatMap(s => s.items);
  const printTotalSales = allItemsForDate.reduce((s, i) => s + i.total, 0);
  const printTotalCost = allItemsForDate.reduce((s, i) => s + i.costPrice * i.quantity, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="module-header">
          <h1 className="module-title">Point of Sale</h1>
          <p className="module-subtitle">End-of-day bulk entry · Deducts from standing stock</p>
        </div>
        <div className="flex gap-2 items-center">
          <PrintButton />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={resetRows}>
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
          <Button size="sm" className="gap-1.5" onClick={saveBulkEntry}
            disabled={!rows.some(r => r.productId && Number(r.quantity) > 0) || hasValidationError}>
            <Save className="w-4 h-4" /> Save Entries
          </Button>
        </div>
      </div>



      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Sales ({saleDate})</p><p className="text-xl font-bold font-heading mt-1">ETB {selectedRevenue.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Items Sold</p><p className="text-xl font-bold font-heading mt-1">{selectedItemsSold}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Profit</p><p className="text-xl font-bold font-heading mt-1 text-success">ETB {selectedProfit.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Entries</p><p className="text-xl font-bold font-heading mt-1">{selectedDateSales.length}</p></div>
      </div>

      <Tabs defaultValue="bulk" className="w-full">
        <TabsList>
          <TabsTrigger value="bulk">Bulk Daily Entry</TabsTrigger>
          <TabsTrigger value="calendar">Calendar History</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 kpi-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold font-heading">
                  {editingSaleId ? '✏️ Editing Saved Entry' : 'Enter Sold Quantities'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Sale Date</Label><Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} /></div>
                <div><Label>Cashier</Label><Input value={cashier} onChange={e => setCashier(e.target.value)} /></div>
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 rounded-lg px-3 py-2">
                <CalendarDays className="w-3 h-3 shrink-0" />
                Recording sales for: <strong>{selectedDateLabel}</strong>
                {saleDate === defaultDate && <span className="ml-1">(yesterday — default)</span>}
              </p>

              <div className="overflow-x-auto border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-24">Category</TableHead>
                      <TableHead className="w-24 text-right">Available</TableHead>
                      <TableHead className="w-28">Qty Sold</TableHead>
                      <TableHead className="w-28 text-right">Unit Price</TableHead>
                      <TableHead className="w-32 text-right">Line Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => {
                      const p = products.find(pr => String(pr.id) === String(row.productId));
                      const qty = Number(row.quantity || 0);
                      const ss = standingStock.find(s => String(s.product_id) === String(row.productId));
                      const standingTarget = ss ? Number(ss.target_quantity ?? p?.standing_target ?? 0) : 0;
                      const hasStandingStock = standingTarget > 0;
                      const availableQty = hasStandingStock ? standingTarget : Number(p?.quantity || 0);
                      const sourceLabel = row.productId ? (hasStandingStock ? 'Standing' : 'Store') : '';
                      const maxQty = availableQty;
                      const isOverLimit = qty > maxQty;

                      const lineTotal = p && qty > 0 ? qty * Number(p.selling_price || 0) : 0;
                      const isNeg = hasStandingStock && standingTarget < 0;
                      const isLow = hasStandingStock && standingTarget > 0 && standingTarget < ((p?.standing_target || 0) || 0) * 0.3;
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell>
                            <select
                              value={row.productId}
                              onChange={e => updateRow(i, 'productId', e.target.value)}
                              className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-sm"
                            >
                              <option value="">Select product</option>
                              {saleable.map(pr => (
                                <option key={pr.id} value={String(pr.id)}>{pr.code} — {pr.name}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p?.category || '—'}</TableCell>
                          <TableCell className={`text-right text-sm font-medium ${isNeg ? 'text-destructive' : isLow ? 'text-warning' : ''}`}>
                            {row.productId ? (
                              <div className="flex flex-col items-end leading-tight">
                                <span>{availableQty} {isNeg && <AlertTriangle className="w-3 h-3 inline ml-1" />}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">{sourceLabel}</span>
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <Input
                                type="number" min="0" placeholder="0"
                                value={row.quantity}
                                onChange={e => updateRow(i, 'quantity', e.target.value)}
                                className={`h-8 pr-6 ${isOverLimit ? 'border-destructive focus-visible:ring-destructive text-destructive' : ''}`}
                              />
                              {isOverLimit && (
                                <AlertTriangle className="w-3.5 h-3.5 text-destructive absolute right-2 top-1/2 -translate-y-1/2" />
                              )}
                            </div>
                            {isOverLimit && <p className="text-[10px] text-destructive mt-0.5">Max {maxQty}</p>}
                          </TableCell>
                          <TableCell className="text-right text-sm">{p ? `ETB ${Number(p.selling_price || 0).toLocaleString()}` : '—'}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {lineTotal > 0 ? `ETB ${lineTotal.toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(i)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={addRow}>
                  <Plus className="w-3 h-3" /> Add Row
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetRows}>Reset All</Button>
                  <Button size="sm" className="gap-1" onClick={saveBulkEntry}
                    disabled={!rows.some(r => r.productId && Number(r.quantity) > 0) || hasValidationError}>
                    <Save className="w-3 h-3" /> Save All
                  </Button>
                </div>
              </div>
            </div>

            {/* Summary sidebar */}
            <div className="kpi-card h-fit lg:sticky lg:top-20 space-y-4">
              <h3 className="text-sm font-semibold font-heading">Entry Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Date</span><span className="font-medium">{saleDate}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Products</span><span className="font-medium">{summary.totalProducts}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Qty Sold</span><span className="font-medium">{summary.totalQty}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Sales</span><span className="font-medium">ETB {summary.totalSales.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Cost</span><span className="font-medium">ETB {summary.totalCost.toLocaleString()}</span></div>
                <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                  <span>Profit</span><span className="text-success">ETB {summary.totalProfit.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={resetRows} className="gap-1 w-full"><RotateCcw className="w-3 h-3" /> Reset</Button>
                <Button size="sm" onClick={saveBulkEntry} className="gap-1 w-full"
                  disabled={!rows.some(r => r.productId && Number(r.quantity) > 0) || hasValidationError}>
                  <Save className="w-3 h-3" /> Save
                </Button>
                <PrintButton className="w-full" />
              </div>

              {selectedDateSales.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Saved for {saleDate}:</p>
                  {selectedDateSales.map(s => (
                    <div key={s.id} className="bg-muted/50 rounded-lg p-2 text-xs mb-1.5">
                      <p className="font-medium">{s.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')}</p>
                      <p className="text-muted-foreground">ETB {s.total.toLocaleString()} · {s.time}</p>
                      <div className="flex gap-1 mt-1">
                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => editSale(s)}>
                          <Pencil className="w-2.5 h-2.5 mr-0.5" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-destructive" onClick={() => deleteSale(s)}>
                          <Trash2 className="w-2.5 h-2.5 mr-0.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarHistory
            data={sales}
            dateKey="date"
            title="Sales Calendar"
            renderDay={(items) => (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-sm font-bold">ETB {items.reduce((s, sale) => s + sale.total, 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Profit</p>
                    <p className="text-sm font-bold text-success">ETB {items.reduce((s, sale) => s + sale.totalProfit, 0).toLocaleString()}</p>
                  </div>
                </div>
                {items.map((s: any) => (
                  <div key={s.id} className={`bg-muted/50 rounded-lg p-3 text-sm ${s.isExpense ? 'border border-destructive/50 bg-destructive/5' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className={`font-medium ${s.isExpense ? 'text-destructive' : ''}`}>{s.receiptNo} · {s.time} {s.isExpense && '(Expense)'}</p>
                      <div className="flex gap-1">
                        {!s.isExpense && (
                          <>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setViewSale(s)}>
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => editSale(s)}>
                              <Pencil className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={() => deleteSale(s)}>
                              <Trash2 className="w-3 h-3 mr-1" /> Delete
                            </Button>
                            <PrintButton className="h-6 px-2 text-xs" />
                          </>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs ${s.isExpense ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {s.items.map((i: any) => `${i.productName} ×${i.quantityText || i.quantity}`).join(', ')}
                    </p>
                    <p className={`text-xs font-medium mt-1 ${s.isExpense ? 'text-destructive font-bold' : ''}`}>
                      {s.isExpense ? `Expense Value: ETB ${s.expenseAmount?.toLocaleString()}` : `Total: ETB ${s.total.toLocaleString()}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* View Sale Dialog */}
      <Dialog open={!!viewSale} onOpenChange={() => setViewSale(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Sale Details — {viewSale?.receiptNo}</DialogTitle></DialogHeader>
          {viewSale && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Date:</span> {viewSale.date}</div>
                <div><span className="text-muted-foreground">Time:</span> {viewSale.time}</div>
                <div><span className="text-muted-foreground">Cashier:</span> {viewSale.cashier}</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewSale.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">ETB {item.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">ETB {item.total.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t border-border pt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span>Total Sales</span><span className="font-medium">ETB {viewSale.total.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Total Cost</span><span>ETB {viewSale.totalCost.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold"><span>Profit</span><span className="text-success">ETB {viewSale.totalProfit.toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
