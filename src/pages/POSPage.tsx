import React, { useState, useMemo, useRef, useEffect, Fragment } from 'react';
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
            profit: (i.unit_price - i.cost_price) * i.quantity_sold,
            deducted_from_standing: i.deducted_from_standing || 0,
            deducted_from_store: i.deducted_from_store || 0
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

    if (prodRes.data) {
      setProducts(prodRes.data);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const saleable = useMemo(() => products.filter(p => {
    const cat = (p.category || '').toLowerCase();
    return (p.is_active !== false) && cat !== 'draft' && cat !== 'whiskey';
  }), [products]);

  const groupedSaleable = useMemo(() => {
    const groups: Record<string, any[]> = {
      'Beer': [],
      'Wine': [],
      'Soft Drink': [],
      'Other': []
    };

    const sorted = [...saleable].sort((a, b) => Number(a.code || 0) - Number(b.code || 0));

    sorted.forEach(p => {
      const cat = (p.category || '').toLowerCase();
      if (cat === 'beer') groups['Beer'].push(p);
      else if (cat === 'wine') groups['Wine'].push(p);
      else if (cat === 'soft_drink') groups['Soft Drink'].push(p);
      else groups['Other'].push(p);
    });

    return groups;
  }, [saleable]);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().split('T')[0];

  const [saleDate, setSaleDate] = useState(defaultDate);
  const [cashier, setCashier] = useState('Admin');
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const selectedDateLabel = useMemo(() => {
    const d = new Date(saleDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [saleDate]);

  const updateQty = (productId: string, value: string) => {
    setQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const resetRows = () => {
    setQuantities({});
    setEditingSaleId(null);
  };

  const hasEntries = useMemo(() => {
    return Object.values(quantities).some(v => Number(v) > 0);
  }, [quantities]);

  const getStandingQty = (productId: string) => {
    const ss = standingStock.find(s => String(s.product_id) === String(productId));
    return ss ? Number(ss.current_quantity || 0) : 0;
  };

  const summary = useMemo(() => {
    let totalProducts = 0, totalQty = 0, totalSales = 0, totalCost = 0;
    Object.entries(quantities).forEach(([productId, qtyStr]) => {
      const qty = Number(qtyStr || 0);
      if (qty > 0) {
        const p = products.find(pr => String(pr.id) === productId);
        if (p) {
          totalProducts++;
          totalQty += qty;
          totalSales += qty * Number(p.selling_price || 0);
          totalCost += qty * Number(p.cost_price || 0);
        }
      }
    });
    return { totalProducts, totalQty, totalSales, totalCost, totalProfit: totalSales - totalCost };
  }, [quantities, products]);

  const hasValidationError = useMemo(() => {
    return Object.entries(quantities).some(([productId, qtyStr]) => {
      const qty = Number(qtyStr);
      if (qty <= 0) return false;
      const p = products.find(pr => String(pr.id) === productId);
      const maxQty = Number(p?.quantity || 0);
      return qty > maxQty;
    });
  }, [quantities, products]);

  const saveBulkEntry = async () => {
    const validKeys = Object.keys(quantities).filter(id => Number(quantities[id]) > 0);

    if (validKeys.length === 0) {
      if (editingSaleId) {
        try {
          const oldSale = sales.find(s => s.id === editingSaleId);
          if (oldSale) await deleteSale(oldSale);
          resetRows();
        } catch (e) {
          // Error is handled in deleteSale
        }
      }
      return;
    }

    let subtotal = 0;
    let totalCost = 0;

    const itemsToInsert = validKeys.map(productId => {
      const p = products.find(pr => String(pr.id) === productId);
      const qty = Number(quantities[productId]);
      const sp = Number(p?.selling_price || 0);
      const cp = Number(p?.cost_price || 0);
      subtotal += qty * sp;
      totalCost += qty * cp;
      return {
        product_id: Number(productId),
        quantity_sold: qty,
        unit_price: sp,
        cost_price: cp
      };
    });

    let batchId = Number(editingSaleId);

    if (editingSaleId) {
      await supabase.from("pos_sale_items").delete().eq("batch_id", Number(editingSaleId));
      await supabase.from("pos_sales_batches").update({
        sale_date: saleDate, cashier
      }).eq("id", Number(editingSaleId));
    } else {
      const { data: batch, error: batchErr } = await supabase.from("pos_sales_batches").insert({
        sale_date: saleDate,
        cashier: cashier,
        created_at: new Date().toISOString()
      }).select().single();

      if (!batchErr && batch) {
        batchId = batch.id;
      } else {
        console.error("Batch save err", batchErr);
        alert("Failed to save batch: " + (batchErr?.message || "Unknown error"));
        return;
      }
    }

    const productDeltas: Record<string, number> = {};

    if (editingSaleId) {
      const oldSale = sales.find(s => s.id === editingSaleId);
      if (oldSale) {
        for (const oldItem of oldSale.items) {
          productDeltas[oldItem.productId] = (productDeltas[oldItem.productId] || 0) + Number(oldItem.quantity);
        }
      }
    }

    for (const newItem of itemsToInsert) {
      productDeltas[newItem.product_id] = (productDeltas[newItem.product_id] || 0) - Number(newItem.quantity_sold);
    }

    for (const [productId, delta] of Object.entries(productDeltas)) {
      if (delta === 0) continue;

      const ss = standingStock.find(s => String(s.product_id) === String(productId));
      const p = products.find(pr => String(pr.id) === String(productId));

      if (ss) {
        const newCurrent = Number(ss.current_quantity || 0) + delta;
        await supabase.from("standing_stock").update({
          current_quantity: newCurrent,
        }).eq("product_id", productId);
        ss.current_quantity = newCurrent;
      }

      if (p) {
        const newTotal = Number(p.quantity || 0) + delta;
        await supabase.from("products").update({ quantity: newTotal }).eq("id", productId);
        p.quantity = newTotal;
      }
    }

    const itemsFinal = itemsToInsert.map(item => ({
      batch_id: batchId,
      product_id: item.product_id,
      quantity_sold: item.quantity_sold,
      unit_price: item.unit_price,
      cost_price: item.cost_price,
      deducted_from_standing: item.quantity_sold,
      deducted_from_store: 0,
      created_at: new Date().toISOString()
    }));

    await supabase.from("pos_sale_items").insert(itemsFinal);

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
    const qs: Record<string, string> = {};
    sale.items.forEach((item: any) => {
      qs[item.productId] = String(item.quantity);
    });
    setQuantities(qs);
  };

  const deleteSale = async (sale: any) => {
    try {
      if (sale.isExpense) {
        alert("Cannot delete an expense entry from the sales view. Please use the Expenses page.");
        return;
      }

      if (!window.confirm("Are you sure you want to completely undo this sale? The quantity will be returned to store inventory and the record will be deleted.")) {
        return;
      }

      for (const item of sale.items) {
        const p = products.find(pr => String(pr.id) === String(item.productId));
        const oldQuantity = Number(item.quantity) || 0;

        if (p && oldQuantity > 0) {
          const { error: pErr } = await supabase.from("products").update({
            quantity: Number(p.quantity || 0) + oldQuantity,
          }).eq("id", item.productId);
          if (pErr) throw new Error("Store stock reversal failed: " + pErr.message);
        }
      }

      const { data: iData, error: itemsErr } = await supabase.from("pos_sale_items").delete().eq("batch_id", Number(sale.id)).select();
      if (itemsErr) throw new Error("Batch items delete failed: " + itemsErr.message);

      const { data: bData, error: batchErr } = await supabase.from("pos_sales_batches").delete().eq("id", Number(sale.id)).select();
      if (batchErr) throw new Error("Batch delete failed: " + batchErr.message);

      if (!bData || bData.length === 0) {
        throw new Error("UNDO BLOCKED: Database refused to delete the save entry. Please run the provided SQL script in Supabase to allow DELETE operations.");
      }

      if (editingSaleId === sale.id) {
        setEditingSaleId(null);
        resetRows();
      }

      await loadAll();
    } catch (err: any) {
      console.error("Undo Sale Error:", err);
      alert("Failed to undo sale: " + (err.message || "Unknown error"));
    }
  };

  const selectedDateSales = sales.filter(s => s.date === saleDate);
  const selectedRevenue = selectedDateSales.reduce((s, sale) => s + sale.total, 0);
  const selectedProfit = selectedDateSales.reduce((s, sale) => s + sale.totalProfit, 0);
  const selectedItemsSold = selectedDateSales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0);

  const allItemsForDate = selectedDateSales.flatMap(s => s.items);
  const printTotalSales = allItemsForDate.reduce((s, i) => s + i.total, 0);
  const printTotalCost = allItemsForDate.reduce((s, i) => s + i.costPrice * i.quantity, 0);

  const printableItemsForDate = useMemo(() => {
    return selectedDateSales.flatMap(s =>
      s.items.map((i: any) => {
        const p = products.find(pr => String(pr.id) === String(i.productId));
        return {
          ...i,
          batchId: s.receiptNo,
          productCode: p?.code || '-',
          category: (p?.category || '').replace('_', ' ')
        };
      })
    );
  }, [selectedDateSales, products]);

  return (
    <div className="space-y-6 animate-fade-in print:bg-white print:p-0 print:space-y-0">
      <div className="print:hidden space-y-6">
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
              disabled={(!hasEntries && !editingSaleId) || hasValidationError}>
              <Save className="w-4 h-4" /> {editingSaleId ? "Save Changes" : "Save Entries"}
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
                      {Object.entries(groupedSaleable).map(([groupName, items]) => {
                        if (items.length === 0) return null;
                        return (
                          <Fragment key={groupName}>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableCell colSpan={8} className="font-bold font-heading text-primary py-2 px-4 shadow-sm">
                                {groupName} Options
                              </TableCell>
                            </TableRow>
                            {items.map(p => {
                              const qtyStr = quantities[p.id] || '';
                              const qty = Number(qtyStr);
                              const ss = standingStock.find(s => String(s.product_id) === String(p.id));
                              const standingCurrent = Number(ss?.current_quantity ?? 0);

                              const availableQty = Number(p.quantity || 0);
                              const maxQty = availableQty;
                              const isOverLimit = qty > maxQty;

                              const lineTotal = qty > 0 ? qty * Number(p.selling_price || 0) : 0;
                              const isNeg = standingCurrent < 0;

                              return (
                                <TableRow key={p.id}>
                                  <TableCell className="text-muted-foreground text-xs font-mono">{p.code}</TableCell>
                                  <TableCell className="font-medium">{p.name}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground capitalize">{String(p.category || '').replace('_', ' ')}</TableCell>
                                  <TableCell className={`text-right text-sm font-medium`}>
                                    <div className="flex flex-col items-end leading-tight">
                                      <span>{availableQty}</span>
                                      <span className="text-[10px] text-muted-foreground font-normal">Total Stock</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="relative">
                                      <Input
                                        type="number" min="0" placeholder="0"
                                        value={qtyStr}
                                        onChange={e => updateQty(p.id, e.target.value)}
                                        onFocus={e => e.target.select()}
                                        className={`h-8 pr-6 max-w-[100px] ${isOverLimit ? 'border-destructive focus-visible:ring-destructive text-destructive' : ''}`}
                                      />
                                      {isOverLimit && (
                                        <AlertTriangle className="w-3.5 h-3.5 text-destructive absolute right-2 top-1/2 -translate-y-1/2" />
                                      )}
                                    </div>
                                    {isOverLimit && <p className="text-[10px] text-destructive mt-0.5 whitespace-nowrap" style={{ width: 80 }}>Max {maxQty}</p>}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">{`ETB ${Number(p.selling_price || 0).toLocaleString()}`}</TableCell>
                                  <TableCell className="text-right text-sm font-medium">
                                    {lineTotal > 0 ? `ETB ${lineTotal.toLocaleString()}` : <span className="text-muted/30">—</span>}
                                  </TableCell>
                                  <TableCell>
                                    {qty > 0 && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(p.id, '')}>
                                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <div className="flex gap-2">
                    {editingSaleId ? (
                      <>
                        <Button variant="destructive" size="sm" onClick={async () => {
                          const old = sales.find(s => s.id === editingSaleId);
                          if (old) {
                            try {
                              await deleteSale(old);
                            } catch (e) { }
                          }
                        }}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Undo Entire Sale
                        </Button>
                        <Button variant="outline" size="sm" onClick={resetRows}>Cancel Edit</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={resetRows}>Clear All Quantities</Button>
                    )}
                    <Button size="sm" className="gap-1" onClick={saveBulkEntry}
                      disabled={(!hasEntries && !editingSaleId) || hasValidationError}>
                      <Save className="w-3 h-3" /> {editingSaleId ? "Save Changes" : "Save Entries"}
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
                    disabled={(!hasEntries && !editingSaleId) || hasValidationError}>
                    <Save className="w-3 h-3" /> {editingSaleId ? "Save Changes" : "Save"}
                  </Button>
                  <PrintButton className="w-full" />
                </div>

                {selectedDateSales.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Saved for {saleDate}:</p>
                    {selectedDateSales.map(s => (
                      <div key={s.id} className="bg-muted/50 rounded-lg p-2 text-xs mb-1.5">
                        <p className="font-medium">{s.items.map((i: any) => `${i.productName} ×${i.quantity}`).join(', ')}</p>
                        <p className="text-muted-foreground">ETB {s.total.toLocaleString()} · {s.time}</p>
                        <div className="flex gap-1 mt-1">
                          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => editSale(s)}>
                            <Pencil className="w-2.5 h-2.5 mr-0.5" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-destructive" onClick={() => deleteSale(s)}>
                            <RotateCcw className="w-2.5 h-2.5 mr-0.5" /> Undo
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
                                <RotateCcw className="w-3 h-3 mr-1" /> Undo Sale
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

      {/* Printable Bulk Sales Form */}
      <div className="hidden print:block text-black bg-white w-full h-full pb-8 max-w-[800px] mx-auto print:absolute print:top-0 print:left-0 print:w-[100vw] print:m-0" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h2 className="text-xl font-bold tracking-widest uppercase mb-1" style={{ fontFamily: 'auto' }}>St. Mary Bar</h2>
          <h1 className="text-3xl font-bold tracking-wider mb-2" style={{ fontFamily: 'auto' }}>Daily Sales Report</h1>
        </div>

        <div className="flex justify-between mb-8 text-sm">
          <div>
            <p className="mb-1"><span className="font-bold">Sale Date:</span> {saleDate}</p>
            <p><span className="font-bold">Printed On:</span> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="mb-1"><span className="font-bold">Cashier:</span> {cashier}</p>
            <p><span className="font-bold">Total Entries:</span> {selectedDateSales.length}</p>
          </div>
        </div>

        <table className="w-full border-collapse border border-gray-800 text-xs mb-8 print-table">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-800 p-1 text-left w-8">#</th>
              <th className="border border-gray-800 p-1 text-left w-20">Batch ID</th>
              <th className="border border-gray-800 p-1 text-left w-16">Code</th>
              <th className="border border-gray-800 p-1 text-left">Product Name</th>
              <th className="border border-gray-800 p-1 text-left w-20">Category</th>
              <th className="border border-gray-800 p-1 text-right w-16">Qty Sold</th>
              <th className="border border-gray-800 p-1 text-right w-20">Unit Price</th>
              <th className="border border-gray-800 p-1 text-right w-20">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {printableItemsForDate.map((item, idx) => (
              <tr key={`print-${idx}`} className="border-b border-gray-800 bg-white">
                <td className="border border-gray-800 p-1 text-left text-black">{idx + 1}</td>
                <td className="border border-gray-800 p-1 text-left text-black">{item.batchId}</td>
                <td className="border border-gray-800 p-1 text-left text-black">{item.productCode}</td>
                <td className="border border-gray-800 p-1 text-left font-semibold text-black">{item.productName}</td>
                <td className="border border-gray-800 p-1 text-left capitalize text-black">{item.category}</td>
                <td className="border border-gray-800 p-1 text-right text-black">{item.quantity}</td>
                <td className="border border-gray-800 p-1 text-right text-black">{item.unitPrice.toLocaleString()}</td>
                <td className="border border-gray-800 p-1 text-right text-black font-bold">{item.total.toLocaleString()}</td>
              </tr>
            ))}
            {printableItemsForDate.length === 0 && (
              <tr>
                <td colSpan={8} className="border border-gray-800 p-4 text-center text-gray-500 bg-white">
                  No finalized sales recorded for this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="ml-auto w-1/2">
          <table className="w-full border-collapse border border-gray-800 text-sm print-table">
            <tbody>
              <tr className="border-b border-gray-800 bg-white">
                <td className="p-2 font-bold bg-gray-100 border-r border-gray-800 text-black">Total Sales</td>
                <td className="p-2 text-right font-bold w-32 text-black">ETB {printTotalSales.toLocaleString()}</td>
              </tr>
              <tr className="border-b border-gray-800 bg-white">
                <td className="p-2 font-bold bg-gray-100 border-r border-gray-800 text-black">Total Cost</td>
                <td className="p-2 text-right w-32 text-black">ETB {printTotalCost.toLocaleString()}</td>
              </tr>
              <tr className="bg-white">
                <td className="p-2 font-bold bg-gray-100 border-r border-gray-800 text-black">Total Profit</td>
                <td className="p-2 text-right font-bold w-32 text-black">ETB {(printTotalSales - printTotalCost).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-16 flex justify-between">
          <div className="w-48 border-t border-black text-center pt-2 text-xs font-bold uppercase text-black">
            Prepared By
          </div>
          <div className="w-48 border-t border-black text-center pt-2 text-xs font-bold uppercase text-black">
            Authorized Signature
          </div>
        </div>
      </div>
    </div>
  );
}
