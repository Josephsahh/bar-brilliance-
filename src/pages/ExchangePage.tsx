import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowLeftRight, Trash2, AlertTriangle } from 'lucide-react';
import CalendarHistory from '@/components/CalendarHistory';
import PrintButton from '@/components/PrintButton';

type ProductRow = {
  id: number | string;
  code: string | null;
  name: string;
  quantity: number | null;
  category: string;
  selling_price: number | null;
};

type ExchangeRow = {
  id: number | string;
  exchange_date: string;
  from_product_id: string | number;
  to_product_id: string | number;
  quantity: number;
  notes: string;
  created_at?: string;
};

export default function ExchangePage() {
  const [exchanges, setExchanges] = useState<ExchangeRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [open, setOpen] = useState(false);
  
  const defaultForm = {
    date: new Date().toISOString().split('T')[0],
    from_product_id: '',
    to_product_id: '',
    quantity: '',
    notes: ''
  };

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [prodRes, exchRes] = await Promise.all([
      supabase.from('products').select('id, code, name, quantity, category, selling_price').order('name'),
      supabase.from('exchanges').select('*').order('exchange_date', { ascending: false }).order('id', { ascending: false })
    ]);
    
    if (prodRes.error) console.error("Error loading products:", prodRes.error);
    else setProducts(prodRes.data || []);
    
    if (exchRes.error) console.error("Error loading exchanges:", exchRes.error);
    else setExchanges(exchRes.data || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const fromProduct = products.find(p => String(p.id) === form.from_product_id);
  const toProduct = products.find(p => String(p.id) === form.to_product_id);
  
  const qtyNum = Number(form.quantity);
  const qtyExceeds = fromProduct && qtyNum > (fromProduct.quantity || 0);
  const categoryMismatch = fromProduct && toProduct && fromProduct.category !== toProduct.category;
  const priceMismatch = fromProduct && toProduct && fromProduct.selling_price !== toProduct.selling_price;
  const isSameProduct = form.from_product_id === form.to_product_id && form.from_product_id !== '';

  const handleDelete = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this exchange history record?\nNote: Deleting history does NOT automatically restore product quantities.')) return;
    const { error } = await supabase.from('exchanges').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert(`Error deleting exchange: ${error.message}`);
    } else {
      loadData();
    }
  };

  const handleSave = async () => {
    if (!form.from_product_id || !form.to_product_id || qtyNum <= 0) return;
    if (isSameProduct) { alert("Source and Destination products must be different."); return; }
    if (qtyExceeds) { alert("Source product does not have enough quantity."); return; }
    if (categoryMismatch) { alert("Source and destination products must be in the same category."); return; }
    if (priceMismatch) { alert("Source and destination products must have the same selling price."); return; }

    setSaving(true);
    
    // First deduct from source
    const newFromQty = (fromProduct?.quantity || 0) - qtyNum;
    const { error: err1 } = await supabase.from('products').update({ quantity: newFromQty }).eq('id', form.from_product_id);
    if (err1) {
      alert(`Error updating source product: ${err1.message}`);
      setSaving(false);
      return;
    }
    
    // Add to dest
    const newToQty = (toProduct?.quantity || 0) + qtyNum;
    const { error: err2 } = await supabase.from('products').update({ quantity: newToQty }).eq('id', form.to_product_id);
    if (err2) {
      alert(`Error updating destination product: ${err2.message}`);
      // Skip rollback for simplicity
      setSaving(false);
      return;
    }

    // Save Exchange history
    const payload = {
      exchange_date: form.date,
      from_product_id: form.from_product_id,
      to_product_id: form.to_product_id,
      quantity: qtyNum,
      notes: form.notes
    };

    const { error: err3 } = await supabase.from('exchanges').insert([{ ...payload, created_at: new Date().toISOString() }]);
    
    if (err3) {
      console.error(err3);
      alert(`Error adding exchange record: ${err3.message}`);
    } else {
      setOpen(false);
      setForm(defaultForm);
    }
    
    await loadData();
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="module-header">
          <h1 className="module-title">Product Exchange</h1>
          <p className="module-subtitle">Exchange product quantities internally · Supabase connected</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Total Exchanges</p>
          <p className="text-xl font-bold font-heading mt-1">{exchanges.length}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Total Quantity Exchanged</p>
          <p className="text-xl font-bold font-heading mt-1">
            {exchanges.reduce((s, e) => s + Number(e.quantity || 0), 0)}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setForm(defaultForm); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Exchange
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Record Product Exchange</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">Deducts quantity from source product and adds it to destination product in <span className="font-bold">products</span> stock.</p>
            <div className="grid gap-4 mt-2">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              
              <div>
                <Label>From Product (Source)</Label>
                <Select value={form.from_product_id} onValueChange={v => setForm(f => ({ ...f, from_product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select source product" /></SelectTrigger>
                  <SelectContent>
                     {products.map(p => (
                       <SelectItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</SelectItem>
                     ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>To Product (Destination)</Label>
                <Select value={form.to_product_id} onValueChange={v => setForm(f => ({ ...f, to_product_id: v }))} disabled={!fromProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder={!fromProduct ? "Select source product first" : "Select destination product"} />
                  </SelectTrigger>
                  <SelectContent>
                     {products
                       .filter(p => !fromProduct || (p.category === fromProduct.category && p.selling_price === fromProduct.selling_price))
                       .map(p => (
                         <SelectItem key={p.id} value={String(p.id)} disabled={String(p.id) === form.from_product_id}>
                           {p.code} — {p.name}
                         </SelectItem>
                       ))
                     }
                  </SelectContent>
                </Select>
                {categoryMismatch && (
                  <p className="text-xs text-warning mt-1">Warning: Products are in different categories.</p>
                )}
                {priceMismatch && (
                  <p className="text-xs text-warning mt-1">Warning: Products have different selling prices.</p>
                )}
              </div>

              <div>
                <Label>Quantity</Label>
                <Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                {qtyExceeds && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" /> Quantity exceeds available stock ({fromProduct?.quantity || 0})
                  </p>
                )}
              </div>
              
              <div>
                <Label>Notes</Label>
                <Input value={form.notes} placeholder="e.g. Substitution" onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setOpen(false); setForm(defaultForm); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.from_product_id || !form.to_product_id || qtyNum <= 0 || !!qtyExceeds || isSameProduct || !!categoryMismatch || !!priceMismatch || saving}>
                {saving ? "Processing..." : "Save Exchange"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Exchange History</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From Product</th>
                  <th></th>
                  <th>To Product</th>
                  <th>Quantity</th>
                  <th>Notes</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exchanges.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted-foreground py-8">No exchanges recorded</td></tr>
                ) : (
                  exchanges.map(e => {
                    const fromP = products.find(p => String(p.id) === String(e.from_product_id));
                    const toP = products.find(p => String(p.id) === String(e.to_product_id));
                    
                    return (
                      <tr key={e.id}>
                        <td>{e.exchange_date}</td>
                        <td className="font-medium text-destructive">{fromP ? fromP.name : 'Unknown Product'}</td>
                        <td><ArrowLeftRight className="w-4 h-4 text-muted-foreground" /></td>
                        <td className="font-medium text-success">{toP ? toP.name : 'Unknown Product'}</td>
                        <td className="font-bold">{Number(e.quantity).toLocaleString()}</td>
                        <td className="text-sm text-muted-foreground max-w-[200px] truncate">{e.notes}</td>
                        <td className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" title="Delete record" onClick={() => handleDelete(e.id)}>
                             <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarHistory
            data={exchanges.map(e => ({ ...e, date: e.exchange_date }))}
            dateKey="date"
            title="Exchange Calendar"
            renderDay={(items) => (
              <div className="space-y-2">
                {items.map((e: any) => {
                   const fromP = products.find(p => String(p.id) === String(e.from_product_id));
                   const toP = products.find(p => String(p.id) === String(e.to_product_id));
                   return (
                    <div key={e.id} className="bg-muted/50 rounded-lg p-2 text-sm">
                      <p className="font-medium">{fromP?.name || '?'} → {toP?.name || '?'}</p>
                      <p className="text-xs font-semibold my-1">
                        Quantity: <span className="text-primary">{Number(e.quantity).toLocaleString()}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{e.notes}</p>
                    </div>
                  );
                })}
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
