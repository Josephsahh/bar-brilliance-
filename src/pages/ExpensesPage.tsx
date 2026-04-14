import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import CalendarHistory from '@/components/CalendarHistory';
import PrintButton from '@/components/PrintButton';

const expenseCategories = ['operational', 'staff', 'breakage', 'wastage', 'other'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const defaultForm = {
    date: new Date().toISOString().split('T')[0],
    expenseKind: 'cash',
    category: 'operational',
    productId: '',
    quantity: '',
    amount: '',
    title: '',
    reason: '',
    approvedBy: 'Admin',
    notes: '',
    paymentMethod: 'Cash'
  };
  
  const [form, setForm] = useState(defaultForm);
  const [whiskeyInputMode, setWhiskeyInputMode] = useState<'bottle'|'cc'>('bottle');

  const isDrink = form.expenseKind === 'drink';

  let calculatedAmount = 0;
  if (isDrink && form.productId && form.quantity) {
     const p = products.find(pr => String(pr.id) === form.productId);
     if (p) {
        if (p.category === 'Whiskey' && whiskeyInputMode === 'cc') {
           calculatedAmount = Number(p.remaining_ml || 0) * Number(form.quantity);
        } else {
           calculatedAmount = Number(p.selling_price || 0) * Number(form.quantity);
        }
     }
  }

  const loadAll = async () => {
    const [expRes, prodRes] = await Promise.all([
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }).order("id", { ascending: false }),
      supabase.from("products").select("id, name, category, quantity, remaining_draft_glasses, glass_count, selling_price, remaining_ml")
    ]);
    if (expRes.error) console.error("Error loading expenses:", expRes.error);
    else setExpenses(expRes.data || []);
    
    if (prodRes.data) setProducts(prodRes.data);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const adjustStock = async (productId: string | number, qtyToAdjust: number, expNotes?: string) => {
     const p = products.find(pr => String(pr.id) === String(productId));
     if (!p || qtyToAdjust === 0) return;
     
     if (p.category === 'Draft') {
       const glassesPerBermel = Number(p.glass_count || 170);
       let currentRemaining = Number(p.remaining_draft_glasses || 0);
       let currentBermels = Number(p.quantity || 0);
       let glassesToDeduct = qtyToAdjust; 
       
       if (glassesToDeduct > 0) { // Deducting
         if (glassesToDeduct <= currentRemaining) {
            currentRemaining -= glassesToDeduct;
         } else {
            glassesToDeduct -= currentRemaining;
            const bermelsNeeded = Math.ceil(glassesToDeduct / glassesPerBermel);
            currentBermels = Math.max(0, currentBermels - bermelsNeeded);
            currentRemaining = (bermelsNeeded * glassesPerBermel) - glassesToDeduct;
         }
       } else { // Restoring
         const glassesToRestore = Math.abs(qtyToAdjust);
         currentRemaining += glassesToRestore;
         if (currentRemaining >= glassesPerBermel) {
            const freshBermels = Math.floor(currentRemaining / glassesPerBermel);
            currentBermels += freshBermels;
            currentRemaining = currentRemaining % glassesPerBermel;
         }
       }
       
       await supabase.from("products").update({
         quantity: currentBermels,
         remaining_draft_glasses: currentRemaining,
         updated_at: new Date().toISOString()
       }).eq("id", p.id);
       
     } else if (p.category === 'Whiskey') {
       const isExpCC = expNotes ? expNotes.includes('[Whiskey CC]') : (whiskeyInputMode === 'cc');
       if (!isExpCC) {
         const newQty = Math.max(0, Number(p.quantity || 0) - qtyToAdjust);
         await supabase.from("products").update({
           quantity: newQty,
           updated_at: new Date().toISOString()
         }).eq("id", p.id);
       }
     } else {
       // Standing Stock reduction for Beer, Soft Drink, Wine etc.
       const { data: ssData } = await supabase.from("standing_stock").select("current_quantity").eq("product_id", p.id).single();
       if (ssData) {
         const newQty = Math.max(0, Number(ssData.current_quantity || 0) - qtyToAdjust);
         await supabase.from("standing_stock").update({
           current_quantity: newQty,
           updated_at: new Date().toISOString()
         }).eq("product_id", p.id);
       }
     }
  };

  const handleSave = async () => {
    const finalAmount = isDrink ? calculatedAmount : Number(form.amount);
    if (!form.expenseKind || (!isDrink && !form.amount)) {
      alert("Please fill required fields (Amount required for cash expenses)");
      return;
    }
    if (isDrink && (!form.productId || Number(form.quantity) <= 0)) {
      alert("Product and valid quantity required for drink expenses.");
      return;
    }

    let finalNotes = form.notes;
    if (isDrink && form.productId) {
      const p = products.find(pr => String(pr.id) === form.productId);
      if (p && p.category === 'Whiskey') {
         finalNotes = `[Whiskey ${whiskeyInputMode === 'bottle' ? 'Bottle' : 'CC'}] ${finalNotes}`;
      }
    }

    const payload = {
      expense_date: form.date,
      expense_kind: form.expenseKind,
      category: form.category,
      title: form.title || 'Untitled Expense',
      reason: form.reason,
      amount: finalAmount,
      payment_method: form.paymentMethod,
      reference: 'Ref-'+Date.now(),
      approved_by: form.approvedBy,
      notes: finalNotes,
      product_id: isDrink ? Number(form.productId) : null,
      quantity: isDrink ? Number(form.quantity) : null
    };

    if (editId) {
      if (!isDrink) {
         const { error } = await supabase.from("expenses").update(payload).eq("id", editId);
         if (error) alert(`Failed to update expense: ${error.message}`);
      } else {
         alert("Cannot edit drink expenses directly. Please delete and recreate to ensure inventory consistency.");
         return;
      }
    } else {
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) {
        console.error("Insert error:", error);
        alert(`Failed to save expense: ${error.message}`);
        return;
      }
      if (isDrink) {
        await adjustStock(payload.product_id!, payload.quantity!);
      }
    }

    setForm(defaultForm);
    setEditId(null);
    setOpen(false);
    await loadAll();
  };

  const handleEdit = (exp: any) => {
    if (exp.expense_kind === 'drink') {
       alert("Drink expenses adjust strictly via product mapping. Please delete and log a new expense if corrections are needed.");
       return;
    }
    setEditId(String(exp.id));
    setForm({
      date: exp.expense_date,
      expenseKind: exp.expense_kind || 'cash',
      category: exp.category || 'operational',
      productId: exp.product_id ? String(exp.product_id) : '',
      quantity: exp.quantity ? String(exp.quantity) : '',
      amount: String(exp.amount),
      title: exp.title || '',
      reason: exp.reason || '',
      approvedBy: exp.approved_by || '',
      notes: exp.notes || '',
      paymentMethod: exp.payment_method || 'Cash'
    });
    setOpen(true);
  };

  const handleDelete = async (exp: any) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    // Reverse inventory if drink expense
    if (exp.expense_kind === 'drink' && exp.product_id && exp.quantity) {
       await adjustStock(exp.product_id, -Number(exp.quantity), exp.notes);
    }
    
    const { error } = await supabase.from("expenses").delete().eq("id", exp.id);
    if (error) {
      console.error("Delete error:", error);
      alert(`Failed to delete expense: ${error.message}`);
    } else {
      await loadAll();
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter(e => e.expense_date === today).reduce((s, e) => s + Number(e.amount), 0);
  const drinkLosses = expenses.filter(e => e.expense_kind === 'drink').reduce((s, e) => s + Number(e.amount), 0);
  const cashExpenses = expenses.filter(e => e.expense_kind === 'cash').reduce((s, e) => s + Number(e.amount), 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyExpenses = expenses.filter(e => new Date(e.expense_date) >= weekAgo).reduce((s, e) => s + Number(e.amount), 0);

  let filtered = expenses.filter(e => {
    if (search && !(e.title || '').toLowerCase().includes(search.toLowerCase()) && !(e.notes || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && e.expense_kind !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="module-header">
          <h1 className="module-title">Expenses</h1>
          <p className="module-subtitle">Track all business expenses. Drink expenses dynamically reduce inventory.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Today</p><p className="text-xl font-bold font-heading mt-1">ETB {todayExpenses.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">This Week</p><p className="text-xl font-bold font-heading mt-1">ETB {weeklyExpenses.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Drink Expenses</p><p className="text-xl font-bold font-heading mt-1 text-destructive">ETB {drinkLosses.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Cash Expenses</p><p className="text-xl font-bold font-heading mt-1 text-blue-600">ETB {cashExpenses.toLocaleString()}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter Kind" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Expenses</SelectItem>
            <SelectItem value="cash">Cash Expense</SelectItem>
            <SelectItem value="drink">Drink Expense</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={(val) => {
           setOpen(val);
           if (!val) {
             setEditId(null);
             setForm(defaultForm);
           }
        }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Add Expense</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit Expense' : 'Record Expense'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>Expense Kind</Label>
                <Select value={form.expenseKind} onValueChange={v => setForm(f => ({ ...f, expenseKind: v }))} disabled={!!editId}>
                  <SelectTrigger><SelectValue placeholder="Kind" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Expense</SelectItem>
                    <SelectItem value="drink">Drink Expense (Stock)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {!isDrink && (
                 <div><Label>Category</Label>
                   <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                     <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                     <SelectContent>{expenseCategories.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                   </Select>
                 </div>
              )}

              {isDrink && <>
                <div className="col-span-1 sm:col-span-2"><Label>Consumed Product</Label>
                  <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>{products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                
                {products.find(pr => String(pr.id) === form.productId)?.category === 'Whiskey' && (
                  <div className="col-span-1 sm:col-span-2"><Label>Whiskey Input Mode</Label>
                    <Select value={whiskeyInputMode} onValueChange={(v: 'bottle'|'cc') => setWhiskeyInputMode(v)}>
                      <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottle">Full Bottle</SelectItem>
                        <SelectItem value="cc">By CC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div><Label>Quantity Consumed</Label><Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              </>}

              <div className="col-span-1 sm:col-span-2">
                 <Label>Amount (ETB)</Label>
                 {isDrink ? (
                   <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mt-1 h-10 border border-border">
                     <span className="text-muted-foreground text-sm font-medium">Calculated Automatically:</span>
                     <span className="font-bold">ETB {calculatedAmount.toLocaleString()}</span>
                   </div>
                 ) : (
                   <Input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter total cost" className="mt-1" />
                 )}
              </div>
              
              <div><Label>Title / Name</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Broken glasses" /></div>
              <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
              <div><Label>Approved By</Label><Input value={form.approvedBy} onChange={e => setForm(f => ({ ...f, approvedBy: e.target.value }))} /></div>
              <div><Label>Payment Method</Label>
                 <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                     <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                     <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank">Bank</SelectItem></SelectContent>
                 </Select>
              </div>
              <div className="col-span-1 sm:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            
            {isDrink && !editId && (
              <div className="flex gap-2 items-center text-xs text-warning mt-2 bg-warning/10 p-2 rounded-lg">
                <AlertTriangle className="w-4 h-4"/> <span>Saving this will permanently subtract stock directly from the selected product logic map.</span>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setOpen(false); setEditId(null); setForm(defaultForm); }}>Cancel</Button>
              <Button onClick={handleSave}>{editId ? 'Update' : 'Save Expense'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Expense Records</TabsTrigger>
          <TabsTrigger value="calendar">Calendar History</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Kind/Cat</th><th>Item/Reason</th><th>Amount</th><th>Approved By</th><th className="w-20"></th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={6} className="text-center text-muted-foreground py-8">No expenses</td></tr> :
                  filtered.map(e => {
                    const isDrinkRow = e.expense_kind === 'drink';
                    const prodName = isDrinkRow ? products.find(p=> String(p.id) === String(e.product_id))?.name : null;
                    return (
                    <tr key={e.id}>
                      <td>{e.expense_date}</td>
                      <td>
                        <span className={`status-badge ${isDrinkRow ? 'status-danger' : 'status-neutral'} capitalize`}>
                           {e.expense_kind} {e.category ? `- ${e.category}` : ''}
                        </span>
                      </td>
                      <td>
                        <span className="font-medium">{e.title}</span> 
                        {isDrinkRow && prodName && e.quantity && <span className="text-destructive ml-2 font-bold bg-destructive/10 px-1 rounded">({prodName} ×{e.quantity})</span>}
                        {e.reason ? <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">Reason: {e.reason}</span> : null}
                      </td>
                      <td className={`font-bold ${isDrinkRow ? 'text-destructive' : ''}`}>ETB {Number(e.amount).toLocaleString()}</td>
                      <td>{e.approved_by || '—'}</td>
                      <td>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(e)}><Pencil className="w-3.5 h-3.5"/></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(e)}><Trash2 className="w-3.5 h-3.5"/></Button>
                        </div>
                      </td>
                    </tr>
                  )})}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarHistory
            data={expenses}
            dateKey="expense_date"
            title="Expense Calendar"
            renderDay={(items) => (
              <div className="space-y-2">
                <p className="text-sm font-medium">Total: ETB {items.reduce((s:any, e:any) => s + Number(e.amount), 0).toLocaleString()}</p>
                {items.map((e: any) => {
                  const isDrinkRow = e.expense_kind === 'drink';
                  const prodName = isDrinkRow ? products.find(p=> String(p.id) === String(e.product_id))?.name : null;
                  return (
                  <div key={e.id} className="bg-muted/50 rounded-lg p-2 text-sm group relative pr-16 bg-card border border-border">
                    <p className={`font-medium capitalize ${isDrinkRow ? 'text-destructive' : ''}`}>
                      {e.expense_kind} {isDrinkRow && prodName ? `· ${prodName} ×${e.quantity}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">ETB {Number(e.amount).toLocaleString()} · {e.title}</p>
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(e)}><Pencil className="w-3 h-3"/></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(e)}><Trash2 className="w-3 h-3"/></Button>
                    </div>
                  </div>
                )})}
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
